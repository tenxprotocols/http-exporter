#!/usr/bin/env node
import fs from 'node:fs'
import { parseArgs } from 'node:util'

import Koa from 'koa'
import Router from '@koa/router'

import { type Config, loadConfig } from './config'
import logger from './logger'
import { type MetricSample, formatMetricFamilies, formatValue, getValueByPath } from './mapper'
import { callREST, callRPC } from './rpc'

const { values } = parseArgs({
  options: {
    config: {
      type: 'string',
      short: 'c',
    },
  },
})

const app = new Koa()
const router = new Router()

const configPath = (values.config as string) || process.env.CONFIG_PATH || 'config.yaml'
let config: Config

function reloadConfig() {
  try {
    config = loadConfig(configPath)
    logger.info(`Loaded configuration from ${configPath}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to load configuration: ${message}`)
    if (!config) process.exit(1)
  }
}

reloadConfig()

fs.watch(configPath, (event) => {
  if (event === 'change') {
    logger.info(`Configuration file ${configPath} changed, reloading...`)
    reloadConfig()
  }
})

router.get('/healthz', (ctx) => {
  ctx.status = 200
  ctx.body = 'OK'
})

router.get('/readyz', (ctx) => {
  if (config) {
    ctx.status = 200
    ctx.body = 'OK'
  } else {
    ctx.status = 503
    ctx.body = 'Service Unavailable'
  }
})

router.get('/metrics', async (ctx) => {
  logger.debug('Received request for /metrics')
  const samples: MetricSample[] = []

  for (const target of config.targets) {
    const profile = config.profiles[target.profile]
    if (!profile) {
      logger.warn(`Profile ${target.profile} not found for target ${target.name}`)
      continue
    }

    for (const metric of profile) {
      try {
        let rawValue: unknown

        if (metric.rpc) {
          rawValue = await callRPC(target.url, metric.rpc.method, metric.rpc.params, config.backoff, config.cache_ttl)
        } else if (metric.rest) {
          rawValue = await callREST(
            target.url,
            metric.rest.path,
            metric.rest.method,
            metric.rest.params,
            config.backoff,
            config.cache_ttl,
          )
        } else {
          logger.warn('Metric has neither rpc nor rest configuration')
          continue
        }

        const metricsToProcess = metric.metrics || [
          {
            name: metric.name ?? 'unknown',
            help: metric.help ?? '',
            type: metric.type,
            path: metric.rpc?.path || metric.rest?.json_path || '',
          },
        ]

        for (const m of metricsToProcess) {
          const value = formatValue(getValueByPath(rawValue, m.path), m.map || metric.map)
          samples.push({
            name: `${target.name}.${m.name}`,
            help: m.help,
            type: m.type,
            value,
            prefix: config.metric_prefix,
            labels: target.labels || {},
          })
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Error fetching metrics for target ${target.name}: ${message}`)
      }
    }
  }

  ctx.body = `${formatMetricFamilies(samples)}\n# EOF\n`
  ctx.type = 'application/openmetrics-text; version=1.0.0; charset=utf-8'
})

app.use(router.routes()).use(router.allowedMethods())

const port = process.env.PORT || 3000
app.listen(port, () => {
  logger.info(`Exporter running on http://localhost:${port}/metrics`)
})
