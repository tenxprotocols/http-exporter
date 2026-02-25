import { ConfigSchema } from './config'

const validConfig = {
  metric_prefix: 'tenx',
  cache_ttl: 60,
  backoff: { max_retries: 3, initial_delay: 500 },
  profiles: {
    tezos: [
      {
        rest: { path: '/test', method: 'GET' },
        metrics: [{ name: 'bootstrapped', help: 'test', type: 'gauge', path: 'result' }],
      },
    ],
  },
  targets: [{ url: 'https://example.com', name: 'tezos_mainnet', profile: 'tezos', labels: {} }],
}

describe('config validation', () => {
  it('should accept valid OpenMetrics names with underscores', () => {
    expect(() => ConfigSchema.parse(validConfig)).not.toThrow()
  })

  it('should reject metric names containing dots', () => {
    const bad = structuredClone(validConfig)
    const badMetrics = bad.profiles.tezos[0].metrics
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
    const metrics = cfg.profiles.tezos[0].metrics
    if (metrics) metrics[0].type = 'info'
    expect(() => ConfigSchema.parse(cfg)).not.toThrow()
  })
})
