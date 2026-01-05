import fs from 'fs'
import Koa from 'koa'
import Router from '@koa/router'
import { loadConfig } from './config'
import { callRPC, callREST } from './rpc'
import { formatMetric, formatValue, getValueByPath } from './mapper'
import logger from './logger'

const app = new Koa()
const router = new Router()

const configPath = process.env.CONFIG_PATH || 'config.yaml'
let config: any

function reloadConfig() {
  try {
    config = loadConfig(configPath)
    logger.info(`Loaded configuration from ${configPath}`)
  } catch (error: any) {
    logger.error(`Failed to load configuration: ${error.message}`)
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

router.get('/metrics', async (ctx) => {
  logger.debug('Received request for /metrics')
  const results: string[] = []

  for (const target of config.targets) {
    const profile = config.profiles[target.profile]
    if (!profile) {
      logger.warn(`Profile ${target.profile} not found for target ${target.name}`)
      continue
    }

    for (const metric of profile) {
      try {
        let rawValue: any

        if (metric.rpc) {
          rawValue = await callRPC(
            target.url,
            metric.rpc.method,
            metric.rpc.params,
            config.backoff,
            config.cache_ttl
          )
        } else if (metric.rest) {
          rawValue = await callREST(
            target.url,
            metric.rest.path,
            metric.rest.method,
            metric.rest.params,
            config.backoff,
            config.cache_ttl
          )
        } else {
          logger.warn(`Metric has neither rpc nor rest configuration`)
          continue
        }

        const metricsToProcess = metric.metrics || [
          {
            name: metric.name!,
            help: metric.help!,
            type: metric.type,
            path: metric.rpc?.path || metric.rest?.json_path || '',
          },
        ]

        for (const m of metricsToProcess) {
          const value = formatValue(getValueByPath(rawValue, m.path), m.map || metric.map)
          results.push(
            formatMetric(`${target.name}_${m.name}`, m.help, m.type, value, config.metric_prefix, {
              provider: target.provider,
            })
          )
        }
      } catch (error: any) {
        logger.error(`Error fetching metrics for target ${target.name}: ${error.message}`)
      }
    }
  }

  ctx.body = results.join('\n\n') + '\n'
  ctx.type = 'text/plain; version=0.0.4; charset=utf-8'
})

app.use(router.routes()).use(router.allowedMethods())

const port = process.env.PORT || 3000
app.listen(port, () => {
  logger.info(`Exporter running on http://localhost:${port}/metrics`)
})
