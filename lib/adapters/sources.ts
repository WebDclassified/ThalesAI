import type { CollectionRequest, CollectionResult, PlanField, RecordData, SourceRef } from '../types';
import { fieldKind, primaryField } from '../plan-fields';

/**
 * Real live source adapters — free, keyless public APIs.
 *
 * Every record produced here is REAL data from the named public API, with the
 * canonical source URL attached as evidence. Mapping is done per-field against
 * the plan's own field keys, so any reasonable prompt yields a coherent dataset.
 * All fetches are time-boxed and carry a proper User-Agent (required by these
 * APIs). No user-supplied URLs are ever fetched, so there is no SSRF surface.
 */

const UA = 'ThalesAI-DataIntelligence/1.0 (hackathon prototype)';
const FETCH_TIMEOUT_MS = 15_000;

export async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value).trim();
}

function moneyFromUnknown(...candidates: unknown[]): number | '' {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c >= 0) return c;
    if (typeof c === 'string' && c.trim()) {
      const num = Number(c.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return '';
}

function isoDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const epoch = Number(raw);
  if (Number.isFinite(epoch) && epoch > 1_000_000_000) {
    return new Date(epoch * 1000).toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function ensureUrl(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function scopeOf(datasetId: string): string {
  return datasetId.replace(/^ds_/, '') || 'default';
}

/* ---------- canonical-key mapping: adapter vocabulary -> plan fields ---------- */

export function canonicalMapKey(key: string): string {
  const k = key.toLowerCase();
  if (/company|organization|organisation|employer/.test(k)) return 'company';
  if (/project/.test(k)) return 'name';
  if (/(^|_)(name|title|position|job_?title|project_?name)$/.test(k)) {
    return k.startsWith('job') || k.includes('title') || k.includes('position') ? 'title' : 'name';
  }
  if (/(maintainer|founder|owner|contact|author|recruiter)/.test(k)) return 'person';
  if (/(salary|compensation|amount|funding|budget|price|market_?cap|revenue|worth)/.test(k)) return 'money';
  if (/(city|location|place|region|area|based)/.test(k)) return 'location';
  if (/(employment|job_?type|contract|schedule|type|category|industry|segment|round|stage|focus)/.test(k)) return 'category';
  if (/(date|posted|deadline|founded|updated|published|closing)/.test(k)) return 'date';
  if (/(e-?mail)/.test(k)) return 'email';
  if (/(link|url|website|domain|site|homepage)/.test(k)) return 'url';
  if (/(stars?|count|number|reach|headcount|employees|quantity|score|change)/.test(k)) return 'number';
  if (/(description|summary|about|notes|requirements|skills|tags)/.test(k)) return 'description';
  return 'generic';
}

/**
 * Fills the plan's fields from an adapter's canonical value pool. The plan drives
 * the record's shape; the adapter drives the truth.
 */
export function projectFields(
  canonical: Record<string, string | number | string[]>,
  fields: PlanField[],
): Record<string, string | number | string[]> {
  const out: Record<string, string | number | string[]> = {};
  for (const field of fields) {
    if (field.key === 'source') continue;
    const kind = fieldKind(field);
    const value = canonical[canonicalMapKey(field.key)] ?? canonical[field.key] ?? '';
    let projected: string | number | string[] = typeof value === 'string' ? value : value;

    if (kind === 'money') projected = moneyFromUnknown(value);
    else if (kind === 'number') {
      const num = typeof value === 'number' ? value : Number(text(value).replace(/[^0-9.-]/g, ''));
      projected = Number.isFinite(num) && text(value) !== '' ? num : '';
    } else if (kind === 'url') projected = ensureUrl(value);
    else if (kind === 'date') projected = isoDate(value);
    else if (kind === 'list' && typeof value === 'string') projected = value ? value.split(/[,;]\s*/) : [];
    out[field.key] = projected;
  }
  return out;
}

function makeLiveRecord(args: {
  request: CollectionRequest;
  index: number;
  provider: string;
  providerLabel: string;
  sourceUrl: string;
  sourceTitle: string;
  canonical: Record<string, string | number | string[]>;
}): RecordData {
  const { request, canonical } = args;
  const fields = projectFields(canonical, request.plan.fields);
  const primary = primaryField(request.plan.fields);
  const title =
    text(primary ? fields[primary.key] : '') ||
    text(canonical.title) ||
    text(canonical.name) ||
    'Untitled record';

  const now = new Date().toISOString();
  const evidence: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    const value = Array.isArray(v) ? v.join('; ') : String(v);
    if (value) evidence[k] = value;
  }

  const ref: SourceRef = {
    id: `src_${args.provider}_${args.index}`,
    name: args.providerLabel,
    url: args.sourceUrl,
    title: args.sourceTitle,
    provider: args.provider,
    fetchedAt: now,
    evidence,
  };

  return {
    id: `rec_${scopeOf(request.datasetId)}_${args.provider}_${args.index + 1}`,
    datasetId: request.datasetId,
    title,
    fields,
    canonicalKey: '',
    confidence: 0.85,
    status: 'valid',
    sources: [ref],
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------------- jobs: Arbeitnow + RemoteOK (real postings) ---------------- */

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  remote?: boolean;
  url?: string;
  location?: string;
  job_types?: string[];
  tags?: string[];
  created_at?: number | string;
};

type RemoteOkJob = {
  slug?: string;
  position?: string;
  company_name?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
  url?: string;
  date?: string;
};

/** Extracts a topic keyword from the requirement to filter live listings. */
export function extractTopicWords(text: string): string[] {
  const stop = new Set([
    'find', 'collect', 'get', 'list', 'gather', 'include', 'with', 'that', 'and', 'the',
    'openings', 'opening', 'jobs', 'job', 'positions', 'position', 'roles', 'role',
    'remote', 'europe', 'european', 'india', 'usa', 'germany', 'developer', 'engineers',
    'engineer', 'companies', 'company', 'startups', 'startup', 'every', 'record', 'source',
    'amount', 'value', 'city', 'website', 'link', 'data', 'need', 'business',
  ]);
  return [...new Set(text.split(/[^a-z0-9+#]+/).filter((w) => w.length > 2 && !stop.has(w)))];
}

/** Matches a posting against the requirement's topic words (title, tags or description). */
function matchesTopic(haystack: string, topicWords: string[]): boolean {
  if (!topicWords.length) return true;
  const hay = haystack.toLowerCase();
  return topicWords.some((w) => hay.includes(w));
}

function salaryFromTitle(title: string): number | '' {
  const match = title.match(/([\d.,]{3,})\s?(?:€|EUR|\$|£)\s?(?:-|–|to|bis)\s?([\d.,]{3,})|([\d.,]{3,})\s?(?:€|EUR|k\b)/i);
  const raw = match?.[1] ?? match?.[3];
  if (!raw) return '';
  const num = Number(raw.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : '';
}

function jobTypeLabel(jobs: string[] | undefined): string {
  const first = (jobs ?? [])[0];
  if (!first) return '';
  return first.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Collects REAL job postings from two free job-board APIs and merges the results. */
export async function collectJobs(request: CollectionRequest): Promise<CollectionResult> {
  const promptText = `${request.plan.targetEntity} ${request.plan.objective}`.toLowerCase();
  const topicWords = extractTopicWords(promptText);

  const [arbeitnow, remoteok] = await Promise.allSettled([
    fetchJson('https://www.arbeitnow.com/api/job-board-api') as Promise<{ data?: ArbeitnowJob[] }>,
    fetchJson('https://remoteok.com/api', {
      'User-Agent': 'Mozilla/5.0 (compatible; ThalesAI-Demo/1.0)',
    }) as Promise<RemoteOkJob[]>,
  ]);

  const settled = [arbeitnow, remoteok];
  const failures = settled.filter((r) => r.status === 'rejected');
  if (failures.length === 2) {
    const reason = failures[0].reason;
    throw new Error(`Live job sources unavailable (${String(reason instanceof Error ? reason.message : reason).slice(0, 120)})`);
  }

  const records: RecordData[] = [];
  const sourcesUsed = new Set<string>();

  if (arbeitnow.status === 'fulfilled') {
    const jobs = (arbeitnow.value.data ?? []).filter((j) => j.title && j.slug);
    const matching = jobs.filter((j) =>
      matchesTopic(`${j.title} ${(j.tags ?? []).join(' ')} ${j.company_name ?? ''}`, topicWords),
    );
    // Relevance over volume: an off-topic listing is worse than a smaller dataset.
    const chosen = (topicWords.length ? matching : jobs).slice(0, request.targetRecords);
    for (const [i, job] of chosen.entries()) {
      const sourceUrl = job.url || `https://www.arbeitnow.com/view/${job.slug}`;
      records.push(
        makeLiveRecord({
          request,
          index: i,
          provider: 'arbeitnow',
          providerLabel: 'Arbeitnow Job Board',
          sourceUrl,
          sourceTitle: `Arbeitnow — ${job.company_name || 'employer'}: ${job.title!.slice(0, 80)}`,
          canonical: {
            title: job.title || '',
            company: job.company_name || '',
            location: job.remote ? 'Remote (Germany)' : job.location || '',
            money: salaryFromTitle(job.title || ''),
            category: jobTypeLabel(job.job_types),
            date: isoDate(job.created_at),
            url: sourceUrl,
            description: (job.tags ?? []).join(', '),
          },
        }),
      );
      sourcesUsed.add('Arbeitnow Job Board');
    }
  }

  if (remoteok.status === 'fulfilled') {
    const jobs = (Array.isArray(remoteok.value) ? remoteok.value : []).filter(
      (j) => j && j.position && j.slug,
    );
    const matching = jobs.filter((j) =>
      matchesTopic(`${j.position} ${(j.tags ?? []).join(' ')} ${j.company_name ?? ''}`, topicWords),
    );
    const chosen = (topicWords.length ? matching : jobs).slice(0, request.targetRecords);
    for (const [i, job] of chosen.entries()) {
      const sourceUrl = job.url || `https://remoteok.com/remote-jobs/${job.slug}`;
      // RemoteOK uses 0 as "undisclosed" — never surface that as a real salary.
      const salary =
        typeof job.salary_min === 'number' &&
        typeof job.salary_max === 'number' &&
        job.salary_max > 0 &&
        job.salary_max >= job.salary_min
          ? Math.round((job.salary_min + job.salary_max) / 2)
          : moneyFromUnknown(
              typeof job.salary_min === 'number' && job.salary_min > 0 ? job.salary_min : '',
              typeof job.salary_max === 'number' && job.salary_max > 0 ? job.salary_max : '',
            );
      records.push(
        makeLiveRecord({
          request,
          index: 1000 + i,
          provider: 'remoteok',
          providerLabel: 'RemoteOK',
          sourceUrl,
          sourceTitle: `RemoteOK — ${job.company_name || 'company'}: ${job.position!.slice(0, 80)}`,
          canonical: {
            title: job.position || '',
            company: job.company_name || '',
            location: job.location || 'Remote',
            money: salary,
            category: 'Remote',
            date: isoDate(job.date),
            url: sourceUrl,
            description: (job.tags ?? []).slice(0, 8).join(', '),
          },
        }),
      );
      sourcesUsed.add('RemoteOK');
    }
  }

  return { records, discovered: records.length, sourcesUsed: [...sourcesUsed] };
}

/* ---------------- sponsors / projects: GitHub search (real repositories) ---------------- */

type GitHubRepo = {
  full_name?: string;
  owner?: { login?: string };
  description?: string | null;
  html_url?: string;
  stargazers_count?: number;
  topics?: string[];
  pushed_at?: string;
};

export function githubTopicFrom(text: string): string {
  const known = [
    'react', 'vue', 'angular', 'svelte', 'node', 'nodejs', 'python', 'django', 'rust', 'golang',
    'typescript', 'javascript', 'machine-learning', 'deep-learning', 'ai', 'llm', 'kubernetes',
    'docker', 'devops', 'fintech', 'blockchain', 'web3', 'security', 'database', 'flutter',
    'android', 'ios', 'gamedev', 'nlp', 'open-source',
  ];
  const words = text.toLowerCase().split(/[^a-z0-9+-]+/);
  for (const word of words) {
    if (known.includes(word)) return word === 'go' ? 'golang' : word;
  }
  return 'open-source';
}

/** Collects REAL high-star open-source projects (sponsor opportunities) from GitHub. */
export async function collectGitHubSponsors(request: CollectionRequest): Promise<CollectionResult> {
  const text = `${request.plan.targetEntity} ${request.plan.objective}`.toLowerCase();
  const topic = githubTopicFrom(text);
  const url =
    'https://api.github.com/search/repositories' +
    `?q=topic:${encodeURIComponent(topic)}+stars:%3E300&sort=stars&order=desc&per_page=25`;
  const payload = (await fetchJson(url, { Accept: 'application/vnd.github+json' })) as {
    items?: GitHubRepo[];
  };
  const repos = (payload.items ?? []).filter((r) => r.full_name && r.html_url);
  if (!repos.length) throw new Error(`No GitHub repositories matched topic "${topic}".`);

  const records = repos.map((repo, i) =>
    makeLiveRecord({
      request,
      index: 2000 + i,
      provider: 'github',
      providerLabel: 'GitHub Search',
      sourceUrl: repo.html_url || '',
      sourceTitle: `GitHub — ${repo.full_name}`,
      canonical: {
        title: repo.full_name || '',
        person: repo.owner?.login || '',
        description: (repo.description || '').slice(0, 200),
        number: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : '',
        url: repo.html_url || '',
        date: isoDate(repo.pushed_at),
        category: (repo.topics ?? []).slice(0, 4).join(', '),
      },
    }),
  );

  return { records, discovered: records.length, sourcesUsed: ['GitHub Search'] };
}

/* ---------------- market data: CoinGecko (real prices) ---------------- */

type CoinGeckoCoin = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  last_updated?: string;
};

/** Collects REAL cryptocurrency market data from CoinGecko's public endpoint. */
export async function collectMarketData(request: CollectionRequest): Promise<CollectionResult> {
  const url =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1';
  const payload = (await fetchJson(url)) as CoinGeckoCoin[];
  const coins = (Array.isArray(payload) ? payload : []).filter(
    (c) => c.name && typeof c.current_price === 'number',
  );
  if (!coins.length) throw new Error('CoinGecko returned no market data.');

  const records = coins.map((coin, i) =>
    makeLiveRecord({
      request,
      index: 3000 + i,
      provider: 'coingecko',
      providerLabel: 'CoinGecko Market Data',
      sourceUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
      sourceTitle: `CoinGecko — ${coin.name} market snapshot`,
      canonical: {
        title: coin.name || '',
        company: (coin.symbol || '').toUpperCase(),
        money: typeof coin.current_price === 'number' ? coin.current_price : '',
        number:
          typeof coin.price_change_percentage_24h === 'number'
            ? Math.round(coin.price_change_percentage_24h * 100) / 100
            : '',
        date: isoDate(coin.last_updated),
        description: coin.market_cap ? `Market cap $${coin.market_cap.toLocaleString('en-US')}` : '',
        url: `https://www.coingecko.com/en/coins/${coin.id}`,
      },
    }),
  );

  return { records, discovered: records.length, sourcesUsed: ['CoinGecko Market Data'] };
}

/* ---------------- companies / startups / leads: GitHub organizations ---------------- */

type GitHubUser = {
  login?: string;
  name?: string | null;
  blog?: string | null;
  location?: string | null;
  bio?: string | null;
  email?: string | null;
  html_url?: string;
};

/** The requirement's geography, used as the GitHub location filter. */
export function extractGeography(plan: { geography?: string | null; objective: string }): string {
  const stated = (plan.geography || '').trim();
  if (stated) return stated;
  const match = plan.objective.match(/in\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/);
  return match?.[1]?.trim() || '';
}

/**
 * Collects REAL organizations from GitHub's user search, filtered by the
 * requirement's geography — the "companies / startups / sales leads" source.
 * One search call plus a handful of detail calls (name, website, location, bio).
 */
export async function collectOrganizations(request: CollectionRequest): Promise<CollectionResult> {
  const geography = extractGeography(request.plan);
  if (!geography) throw new Error('This requirement states no geography; the organizations source needs one.');

  const promptText = `${request.plan.targetEntity} ${request.plan.objective}`.toLowerCase();
  const topicWords = extractTopicWords(promptText);

  const searchUrl =
    'https://api.github.com/search/users?per_page=25&q=' +
    encodeURIComponent(`type:org location:"${geography}"`);
  const search = (await fetchJson(searchUrl, { Accept: 'application/vnd.github+json' })) as {
    items?: Array<{ login?: string }>;
  };
  const logins = (search.items ?? [])
    .map((i) => i.login)
    .filter((l): l is string => Boolean(l))
    .slice(0, 20);
  if (!logins.length) throw new Error(`No organizations found in "${geography}".`);

  // Detail lookups with bounded concurrency; individual failures are skipped.
  const details: GitHubUser[] = [];
  const queue = [...logins];
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      for (;;) {
        const login = queue.shift();
        if (!login) return;
        try {
          const user = (await fetchJson(`https://api.github.com/users/${login}`, {
            Accept: 'application/vnd.github+json',
          })) as GitHubUser;
          if (user.login) details.push(user);
        } catch {
          // one org failing must not fail the collection
        }
      }
    }),
  );

  if (!details.length) throw new Error('GitHub returned no organization details (rate limit or empty result).');

  // Relevance first: orgs whose name/description matches the topic words lead the list.
  const relevance = (u: GitHubUser): boolean => {
    if (!topicWords.length) return true;
    const hay = `${u.name || ''} ${u.bio || ''} ${u.blog || ''} ${u.login || ''}`.toLowerCase();
    return topicWords.some((w) => hay.includes(w));
  };
  const ordered = [...details].sort((a, b) => Number(relevance(b)) - Number(relevance(a)));

  const records = ordered.slice(0, request.targetRecords).map((user, i) =>
    makeLiveRecord({
      request,
      index: 4000 + i,
      provider: 'github-orgs',
      providerLabel: 'GitHub Organizations',
      sourceUrl: user.html_url || `https://github.com/${user.login}`,
      sourceTitle: `GitHub — ${user.name || user.login} (${geography})`,
      canonical: {
        company: user.name || user.login || '',
        url: ensureUrl(user.blog),
        location: user.location || geography,
        description: (user.bio || '').slice(0, 200),
        person: user.login || '',
        email: user.email || '',
      },
    }),
  );

  return { records, discovered: records.length, sourcesUsed: ['GitHub Organizations'] };
}
