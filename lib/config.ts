import { isDemoMode } from './adapters';

/**
 * Server-only runtime status for the UI.
 *
 * Import this from server components only. No secrets are ever included: this
 * reports configuration state, model name and which sources are wired in.
 */

export type RuntimeStatus = {
  aiConfigured: boolean;
  /** "configured" is not a reachability claim: the endpoint is exercised on demand. */
  planner: string;
  model: string;
  collectionMode: 'live' | 'demo';
  collectionLabel: string;
  collectionNote: string;
};

const LIVE_SOURCES = 'Arbeitnow + RemoteOK (jobs), GitHub (sponsors), CoinGecko (market)';

export function runtimeStatus(): RuntimeStatus {
  const aiConfigured = Boolean(
    process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL,
  );
  const demoForced = isDemoMode();

  return {
    aiConfigured,
    planner: aiConfigured ? 'AI planner' : 'Fallback planner',
    model: aiConfigured ? (process.env.AI_MODEL as string) : '',
    collectionMode: demoForced ? 'demo' : 'live',
    collectionLabel: demoForced
      ? 'Synthetic demo sources'
      : 'Live sources + demo fallback',
    collectionNote: demoForced
      ? 'DEMO_MODE is on: collection is deterministic, synthetic and offline.'
      : `Live sources are selected per requirement: ${LIVE_SOURCES}. ` +
        'If a live source is unreachable, the run falls back to clearly-labeled synthetic data.',
  };
}

export { isDemoMode };
