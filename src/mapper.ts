import _ from 'lodash'
import logger from './logger'

export function getValueByPath(obj: unknown, path: string): unknown {
  logger.debug(`Get value at path '${path}' from ${JSON.stringify(obj)}`)
  if (!path || path === '') return obj
  return _.get(obj, path)
}

export function formatValue(value: unknown, map?: Record<string, number>): number {
  if (map && value !== undefined && value !== null) {
    const mapped = map[String(value)]
    if (mapped !== undefined) {
      logger.debug(`Mapped value ${value} to ${mapped}`)
      return mapped
    }
  }

  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    if (value.startsWith('0x')) {
      const parsed = parseInt(value, 16)
      logger.debug(`Parsed hex value ${value} to ${parsed}`)
      return parsed
    }

    // Try parsing as date first if it looks like an ISO string or has date separators
    if (value.includes('-') || value.includes(':') || value.includes('T')) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        const timestamp = date.getTime()
        logger.debug(`Parsed date string ${value} to ${timestamp}`)
        return timestamp
      }
    }

    const parsed = parseFloat(value)
    if (!Number.isNaN(parsed)) {
      logger.debug(`Parsed string value ${value} to ${parsed}`)
      return parsed
    }
  }
  if (typeof value === 'boolean') {
    const parsed = value ? 1 : 0
    logger.debug(`Parsed boolean value ${value} to ${parsed}`)
    return parsed
  }
  logger.warn(`Could not parse value ${JSON.stringify(value)}, returning -1`)
  return -1
}

export function formatMetric(
  name: string,
  help: string,
  type: string,
  value: number,
  prefix = '',
  labels: Record<string, string> = {},
): string {
  const fullName = prefix ? `${prefix}_${name}` : name
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',')

  const fullLabels = labelStr ? `{${labelStr}}` : ''

  return `# HELP ${fullName} ${help}
# TYPE ${fullName} ${type}
${fullName}${fullLabels} ${value}`
}
