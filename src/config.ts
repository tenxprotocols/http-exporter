import fs from 'node:fs'

import yaml from 'js-yaml'
import { z } from 'zod'

// OpenMetrics metric names must match [a-zA-Z_:][a-zA-Z0-9_:]*
const OPENMETRICS_NAME_RE = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/
const openmetricsName = z
  .string()
  .regex(OPENMETRICS_NAME_RE, 'Must be a valid OpenMetrics name (letters, digits, underscores, colons only — no dots)')

export const MetricSchema = z
  .object({
    name: openmetricsName.optional(),
    help: z.string().optional(),
    type: z.enum(['gauge', 'counter']).default('gauge'),
    rpc: z
      .object({
        method: z.string(),
        params: z.array(z.any()).default([]),
        path: z.string().default(''),
      })
      .optional(),
    rest: z
      .object({
        path: z.string(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
        params: z.record(z.string(), z.any()).optional(),
        json_path: z.string().default(''),
      })
      .optional(),
    metrics: z
      .array(
        z.object({
          name: openmetricsName,
          help: z.string(),
          type: z.enum(['gauge', 'counter']).default('gauge'),
          path: z.string().default(''),
          map: z.record(z.string(), z.number()).optional(),
        }),
      )
      .optional(),
    map: z.record(z.string(), z.number()).optional(),
  })
  .refine((data) => data.rpc || data.rest, {
    message: 'Either rpc or rest must be provided',
  })
  .refine((data) => data.name || (data.metrics && data.metrics.length > 0), {
    message: 'Either name or metrics must be provided',
  })

export const ProfileSchema = z.array(MetricSchema)

export const TargetSchema = z.object({
  url: z.string().url(),
  name: openmetricsName,
  profile: z.string(),
})

export const ConfigSchema = z.object({
  metric_prefix: openmetricsName.or(z.literal('')).default(''),
  cache_ttl: z.number().default(60),
  backoff: z
    .object({
      max_retries: z.number().default(3),
      initial_delay: z.number().default(500),
    })
    .default({
      max_retries: 3,
      initial_delay: 500,
    }),
  profiles: z.record(z.string(), ProfileSchema),
  targets: z.array(TargetSchema),
})

export type Config = z.infer<typeof ConfigSchema>
export type Metric = z.infer<typeof MetricSchema>
export type Target = z.infer<typeof TargetSchema>

export function loadConfig(path: string): Config {
  const fileContents = fs.readFileSync(path, 'utf8')
  let data: unknown

  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    data = yaml.load(fileContents)
  } else {
    data = JSON.parse(fileContents)
  }

  return ConfigSchema.parse(data)
}
