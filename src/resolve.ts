import type { Backoff, Config, Metric, Profile, Target } from './config'

/** Resolve cache_ttl: metric → profile → root */
export function resolveCacheTtl(config: Config, profile: Profile, metric: Metric): number {
  return metric.cache_ttl ?? profile.cache_ttl ?? config.cache_ttl
}

/** Resolve backoff: metric → profile → root */
export function resolveBackoff(config: Config, profile: Profile, metric: Metric): Backoff {
  return metric.backoff ?? profile.backoff ?? config.backoff
}

/** Resolve timeout: metric → profile → root */
export function resolveTimeout(config: Config, profile: Profile, metric: Metric): number {
  return metric.timeout ?? profile.timeout ?? config.timeout
}

/** Resolve metric_prefix: profile → root */
export function resolvePrefix(config: Config, profile: Profile): string {
  return profile.metric_prefix ?? config.metric_prefix
}

/** Merge labels: profile labels (base) + target labels (override) */
export function mergeLabels(profile: Profile, target: Target): Record<string, string> {
  return { ...(profile.labels || {}), ...(target.labels || {}) }
}

/** Merge headers: root headers (base) + target headers (override) */
export function mergeHeaders(config: Config, target: Target): Record<string, string> {
  return { ...config.headers, ...(target.headers || {}) }
}
