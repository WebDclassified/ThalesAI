import type { ResearchPlan, SourceAdapter } from '../types';
import { demoSourceAdapter } from './demo-adapter';

export { demoSourceAdapter };
import { collectGitHubSponsors, collectJobs, collectMarketData, collectOrganizations } from './sources';

/**
 * Adapter registry with requirement-aware selection.
 *
 * Each task's plan determines which source serves it: jobs come from two real
 * job-board APIs, sponsor opportunities from GitHub, market data from CoinGecko.
 * Everything else (or any live failure) falls back to the deterministic synthetic
 * adapter, so the product always completes a run — online or offline.
 */

const liveJobsAdapter: SourceAdapter = {
  id: 'live-jobs',
  label: 'Arbeitnow + RemoteOK (live job boards)',
  live: true,
  collect: collectJobs,
};

const githubSponsorsAdapter: SourceAdapter = {
  id: 'live-github-sponsors',
  label: 'GitHub (live repository search)',
  live: true,
  collect: collectGitHubSponsors,
};

const marketDataAdapter: SourceAdapter = {
  id: 'live-market',
  label: 'CoinGecko (live market data)',
  live: true,
  collect: collectMarketData,
};

const githubOrgsAdapter: SourceAdapter = {
  id: 'live-organizations',
  label: 'GitHub (live organizations by location)',
  live: true,
  collect: collectOrganizations,
};

const ALL_ADAPTERS: SourceAdapter[] = [
  liveJobsAdapter,
  githubSponsorsAdapter,
  marketDataAdapter,
  githubOrgsAdapter,
  demoSourceAdapter,
];

export function registeredAdapters(): SourceAdapter[] {
  return [...ALL_ADAPTERS];
}

/**
 * `DEMO_MODE=true` forces the synthetic adapter (safe offline demo).
 * Any other value — including unset — enables live sources with automatic
 * synthetic fallback, because every live adapter here is a free public API.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export type ResolvedAdapter = {
  adapter: SourceAdapter;
  mode: 'live' | 'demo';
  /** Why this adapter was selected; surfaced in the UI so the mode is never a mystery. */
  reason: string;
};

export function resolveAdapterForPlan(plan: ResearchPlan): ResolvedAdapter {
  if (isDemoMode()) {
    return {
      adapter: demoSourceAdapter,
      mode: 'demo',
      reason: 'DEMO_MODE is on: collection is deterministic, synthetic and offline.',
    };
  }

  const text = `${plan.targetEntity} ${plan.objective} ${plan.geography ?? ''}`.toLowerCase();

  if (/\bjobs?\b|\bopenings?\b|\bpositions?\b|\broles?\b|\bhiring\b|\bcareer\b|\bvacanc/.test(text)) {
    return {
      adapter: liveJobsAdapter,
      mode: 'live',
      reason: 'Requirement matched job boards: collecting real postings from Arbeitnow and RemoteOK.',
    };
  }
  if (/\bsponsor|\bsponsoring|\bopen source projects?\b|\brepositories?\b/.test(text)) {
    return {
      adapter: githubSponsorsAdapter,
      mode: 'live',
      reason: 'Requirement matched sponsor opportunities: collecting real GitHub repositories.',
    };
  }
  if (/\bcrypto\b|\bbitcoin\b|\bcoins?\b|\btokens?\b|\bmarket cap\b|\btrading\b|\bexchange rate/.test(text)) {
    return {
      adapter: marketDataAdapter,
      mode: 'live',
      reason: 'Requirement matched market data: collecting real prices from CoinGecko.',
    };
  }

  return {
    adapter: demoSourceAdapter,
    mode: 'demo',
    reason:
      'No live source matches this requirement yet, so the deterministic synthetic adapter is used. ' +
      'Live connectors: job boards, GitHub, CoinGecko.',
  };
}
