import type { Config, Metric, Profile, Target } from './config'
import { mergeHeaders, mergeLabels, resolveBackoff, resolveCacheTtl, resolvePrefix, resolveTimeout } from './resolve'

const rootConfig: Config = {
  metric_prefix: 'tenx',
  cache_ttl: 60,
  timeout: 10000,
  backoff: { max_retries: 3, initial_delay: 500 },
  headers: { 'User-Agent': 'http-exporter', 'X-Global': 'yes' },
  profiles: {},
  targets: [],
}

const baseProfile: Profile = {
  metrics: [],
}

const baseMetric = {
  type: 'gauge' as const,
  name: 'test',
}

const baseTarget: Target = {
  url: 'https://example.com',
  name: 'test',
  profile: 'test',
  labels: {},
}

describe('resolveCacheTtl', () => {
  it('should use root value when no overrides', () => {
    expect(resolveCacheTtl(rootConfig, baseProfile, baseMetric as Metric)).toBe(60)
  })

  it('should use profile override over root', () => {
    const profile = { ...baseProfile, cache_ttl: 30 }
    expect(resolveCacheTtl(rootConfig, profile, baseMetric as Metric)).toBe(30)
  })

  it('should use metric override over profile and root', () => {
    const profile = { ...baseProfile, cache_ttl: 30 }
    const metric = { ...baseMetric, cache_ttl: 5 }
    expect(resolveCacheTtl(rootConfig, profile, metric as Metric)).toBe(5)
  })
})

describe('resolveBackoff', () => {
  it('should use root value when no overrides', () => {
    expect(resolveBackoff(rootConfig, baseProfile, baseMetric as Metric)).toEqual({
      max_retries: 3,
      initial_delay: 500,
    })
  })

  it('should use profile override over root', () => {
    const profile = { ...baseProfile, backoff: { max_retries: 5, initial_delay: 200 } }
    expect(resolveBackoff(rootConfig, profile, baseMetric as Metric)).toEqual({
      max_retries: 5,
      initial_delay: 200,
    })
  })

  it('should use metric override over profile and root', () => {
    const profile = { ...baseProfile, backoff: { max_retries: 5, initial_delay: 200 } }
    const metric = { ...baseMetric, backoff: { max_retries: 1, initial_delay: 100 } }
    expect(resolveBackoff(rootConfig, profile, metric as Metric)).toEqual({
      max_retries: 1,
      initial_delay: 100,
    })
  })
})

describe('resolveTimeout', () => {
  it('should use root value when no overrides', () => {
    expect(resolveTimeout(rootConfig, baseProfile, baseMetric as Metric)).toBe(10000)
  })

  it('should use profile override over root', () => {
    const profile = { ...baseProfile, timeout: 5000 }
    expect(resolveTimeout(rootConfig, profile, baseMetric as Metric)).toBe(5000)
  })

  it('should use metric override over profile and root', () => {
    const profile = { ...baseProfile, timeout: 5000 }
    const metric = { ...baseMetric, timeout: 2000 }
    expect(resolveTimeout(rootConfig, profile, metric as Metric)).toBe(2000)
  })
})

describe('resolvePrefix', () => {
  it('should use root value when no profile override', () => {
    expect(resolvePrefix(rootConfig, baseProfile)).toBe('tenx')
  })

  it('should use profile override over root', () => {
    const profile = { ...baseProfile, metric_prefix: 'eth' }
    expect(resolvePrefix(rootConfig, profile)).toBe('eth')
  })

  it('should use empty string profile override over root', () => {
    const profile = { ...baseProfile, metric_prefix: '' }
    expect(resolvePrefix(rootConfig, profile)).toBe('')
  })
})

describe('mergeLabels', () => {
  it('should return target labels when no profile labels', () => {
    const target = { ...baseTarget, labels: { network: 'mainnet' } }
    expect(mergeLabels(baseProfile, target)).toEqual({ network: 'mainnet' })
  })

  it('should return profile labels when no target labels', () => {
    const profile = { ...baseProfile, labels: { protocol: 'ethereum' } }
    expect(mergeLabels(profile, baseTarget)).toEqual({ protocol: 'ethereum' })
  })

  it('should merge profile and target labels', () => {
    const profile = { ...baseProfile, labels: { protocol: 'ethereum' } }
    const target = { ...baseTarget, labels: { network: 'mainnet' } }
    expect(mergeLabels(profile, target)).toEqual({ protocol: 'ethereum', network: 'mainnet' })
  })

  it('should let target labels override profile labels on conflict', () => {
    const profile = { ...baseProfile, labels: { env: 'staging', protocol: 'ethereum' } }
    const target = { ...baseTarget, labels: { env: 'production' } }
    expect(mergeLabels(profile, target)).toEqual({ protocol: 'ethereum', env: 'production' })
  })
})

describe('mergeHeaders', () => {
  it('should return root headers when no target headers', () => {
    expect(mergeHeaders(rootConfig, baseTarget)).toEqual({
      'User-Agent': 'http-exporter',
      'X-Global': 'yes',
    })
  })

  it('should merge root and target headers', () => {
    const target = { ...baseTarget, headers: { Authorization: 'Bearer token' } }
    expect(mergeHeaders(rootConfig, target)).toEqual({
      'User-Agent': 'http-exporter',
      'X-Global': 'yes',
      Authorization: 'Bearer token',
    })
  })

  it('should let target headers override root headers on conflict', () => {
    const target = { ...baseTarget, headers: { 'User-Agent': 'custom-agent' } }
    expect(mergeHeaders(rootConfig, target)).toEqual({
      'User-Agent': 'custom-agent',
      'X-Global': 'yes',
    })
  })

  it('should return empty object when no headers anywhere', () => {
    const config = { ...rootConfig, headers: {} }
    expect(mergeHeaders(config, baseTarget)).toEqual({})
  })
})
