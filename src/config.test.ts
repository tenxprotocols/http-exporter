import { ConfigSchema } from './config'

const validConfig = {
  metric_prefix: 'tenx',
  cache_ttl: 60,
  timeout: 10000,
  backoff: { max_retries: 3, initial_delay: 500 },
  headers: { 'User-Agent': 'http-exporter' },
  profiles: {
    tezos: {
      metrics: [
        {
          rest: { path: '/test', method: 'GET' },
          metrics: [{ name: 'bootstrapped', help: 'test', type: 'gauge', path: 'result' }],
        },
      ],
    },
  },
  targets: [{ url: 'https://example.com', name: 'tezos_mainnet', profile: 'tezos', labels: {} }],
}

describe('config validation', () => {
  it('should accept valid OpenMetrics names with underscores', () => {
    expect(() => ConfigSchema.parse(validConfig)).not.toThrow()
  })

  it('should reject metric names containing dots', () => {
    const bad = structuredClone(validConfig)
    const badMetrics = bad.profiles.tezos.metrics[0].metrics
    if (badMetrics) badMetrics[0].name = 'sync.state'
    expect(() => ConfigSchema.parse(bad)).toThrow(/OpenMetrics/)
  })

  it('should reject target names containing dots', () => {
    const bad = structuredClone(validConfig)
    bad.targets[0].name = 'tezos.mainnet'
    expect(() => ConfigSchema.parse(bad)).toThrow(/OpenMetrics/)
  })

  it('should reject metric_prefix containing dots', () => {
    const bad = structuredClone(validConfig)
    bad.metric_prefix = 'tenx.io'
    expect(() => ConfigSchema.parse(bad)).toThrow(/OpenMetrics/)
  })

  it('should allow empty metric_prefix', () => {
    const cfg = structuredClone(validConfig)
    cfg.metric_prefix = ''
    expect(() => ConfigSchema.parse(cfg)).not.toThrow()
  })

  it('should accept info metric type', () => {
    const cfg = structuredClone(validConfig)
    const metrics = cfg.profiles.tezos.metrics[0].metrics
    if (metrics) metrics[0].type = 'info'
    expect(() => ConfigSchema.parse(cfg)).not.toThrow()
  })

  it('should apply defaults for timeout and headers', () => {
    const minimal = {
      profiles: {
        test: {
          metrics: [
            {
              name: 'foo',
              help: 'test',
              rpc: { method: 'test' },
            },
          ],
        },
      },
      targets: [{ url: 'https://example.com', name: 'test', profile: 'test' }],
    }
    const parsed = ConfigSchema.parse(minimal)
    expect(parsed.timeout).toBe(10000)
    expect(parsed.headers).toEqual({})
    expect(parsed.cache_ttl).toBe(60)
    expect(parsed.metric_prefix).toBe('')
  })

  it('should accept profile-level overrides', () => {
    const cfg = structuredClone(validConfig)
    cfg.profiles.tezos = {
      ...cfg.profiles.tezos,
      metric_prefix: 'tez',
      cache_ttl: 30,
      timeout: 5000,
      backoff: { max_retries: 5, initial_delay: 200 },
      labels: { protocol: 'tezos' },
      headers: { 'X-Custom': 'value' },
    } as typeof cfg.profiles.tezos
    const parsed = ConfigSchema.parse(cfg)
    const profile = parsed.profiles.tezos
    expect(profile.metric_prefix).toBe('tez')
    expect(profile.cache_ttl).toBe(30)
    expect(profile.timeout).toBe(5000)
    expect(profile.backoff).toEqual({ max_retries: 5, initial_delay: 200 })
    expect(profile.labels).toEqual({ protocol: 'tezos' })
    expect(profile.headers).toEqual({ 'X-Custom': 'value' })
  })

  it('should accept metric-level overrides', () => {
    const cfg = structuredClone(validConfig)
    cfg.profiles.tezos.metrics[0] = {
      ...cfg.profiles.tezos.metrics[0],
      cache_ttl: 5,
      timeout: 2000,
      backoff: { max_retries: 1, initial_delay: 100 },
    } as (typeof cfg.profiles.tezos.metrics)[0]
    const parsed = ConfigSchema.parse(cfg)
    const metric = parsed.profiles.tezos.metrics[0]
    expect(metric.cache_ttl).toBe(5)
    expect(metric.timeout).toBe(2000)
    expect(metric.backoff).toEqual({ max_retries: 1, initial_delay: 100 })
  })

  it('should reject profile-level metric_prefix with dots', () => {
    const bad = structuredClone(validConfig)
    bad.profiles.tezos = {
      ...bad.profiles.tezos,
      metric_prefix: 'bad.prefix',
    } as typeof bad.profiles.tezos
    expect(() => ConfigSchema.parse(bad)).toThrow(/OpenMetrics/)
  })

  it('should allow empty profile-level metric_prefix', () => {
    const cfg = structuredClone(validConfig)
    cfg.profiles.tezos = {
      ...cfg.profiles.tezos,
      metric_prefix: '',
    } as typeof cfg.profiles.tezos
    expect(() => ConfigSchema.parse(cfg)).not.toThrow()
  })

  it('should accept target-level headers', () => {
    const cfg = structuredClone(validConfig)
    cfg.targets[0] = {
      ...cfg.targets[0],
      headers: { Authorization: 'Bearer token' },
    } as (typeof cfg.targets)[0]
    const parsed = ConfigSchema.parse(cfg)
    expect(parsed.targets[0].headers).toEqual({ Authorization: 'Bearer token' })
  })
})
