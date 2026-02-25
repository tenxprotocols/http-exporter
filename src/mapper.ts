import _ from 'lodash'
import logger from './logger'

export function getValueByPath(obj: unknown, path: string): unknown {
  logger.debug(`Get value at path '${path}' from ${JSON.stringify(obj)}`)
  if (!path || path === '' || path === '.') return obj
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

export interface MetricSample {
  name: string
  help: string
  type: string
  value: number
  prefix: string
  labels: Record<string, string>
}

export function formatMetricSample(sample: MetricSample): { fullName: string; line: string } {
  const fullName = sample.prefix ? `${sample.prefix}_${sample.name}` : sample.name
  const labelStr = Object.entries(sample.labels)
    .map(([k, v]) => `${k}="${v}"`)
    .join(',')
  const fullLabels = labelStr ? `{${labelStr}}` : ''
  return { fullName, line: `${fullName}${fullLabels} ${sample.value}` }
}

export function formatMetricFamilies(samples: MetricSample[]): string {
  const families = new Map<string, { help: string; type: string; lines: string[] }>()

  for (const sample of samples) {
    const { fullName, line } = formatMetricSample(sample)
    let family = families.get(fullName)
    if (!family) {
      family = { help: sample.help, type: sample.type, lines: [] }
      families.set(fullName, family)
    }
    family.lines.push(line)
  }

  const blocks: string[] = []
  for (const [fullName, family] of families) {
    blocks.push(`# HELP ${fullName} ${family.help}\n# TYPE ${fullName} ${family.type}\n${family.lines.join('\n')}`)
  }

  return blocks.join('\n')
}

export function formatMetric(
  name: string,
  help: string,
  type: string,
  value: number,
  prefix = '',
  labels: Record<string, string> = {},
): string {
  const sample: MetricSample = { name, help, type, value, prefix, labels }
  const { fullName, line } = formatMetricSample(sample)
  return `# HELP ${fullName} ${help}\n# TYPE ${fullName} ${type}\n${line}`
}
