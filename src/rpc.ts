import axios from 'axios'
import logger from './logger'

export interface RPCRequest {
  jsonrpc: '2.0'
  method: string
  params: unknown[]
  id: number
}

export interface RPCResponse {
  jsonrpc: '2.0'
  result?: unknown
  error?: {
    code: number
    message: string
  }
  id: number
}

export interface BackoffConfig {
  max_retries: number
  initial_delay: number
}

const cache = new Map<string, { value: unknown; expires: number }>()
let requestId = 0

export function clearCache() {
  cache.clear()
}

export async function callRPC(
  url: string,
  method: string,
  params: unknown[],
  backoff: BackoffConfig,
  ttlSeconds: number,
): Promise<unknown> {
  const cacheKey = `rpc:${url}:${method}:${JSON.stringify(params)}`
  const cached = cache.get(cacheKey)

  if (cached && cached.expires > Date.now()) {
    logger.debug(`Cache hit for RPC ${url} ${method}`)
    return cached.value
  }

  logger.debug(`Cache miss for RPC ${url} ${method}`)

  let delay = backoff.initial_delay
  let lastError: unknown

  for (let i = 0; i <= backoff.max_retries; i++) {
    try {
      const id = ++requestId
      const payload = {
        jsonrpc: '2.0',
        method,
        params,
        id,
      }
      logger.debug(`RPC Request to ${url}: ${JSON.stringify(payload)}`)
      const response = await axios.post<RPCResponse>(url, payload)
      logger.debug(`RPC Response from ${url}: ${JSON.stringify(response.data)}`)

      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`)
      }

      const result = response.data.result
      cache.set(cacheKey, {
        value: result,
        expires: Date.now() + ttlSeconds * 1000,
      })

      return result
    } catch (error: unknown) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (i < backoff.max_retries) {
        logger.warn(`RPC call failed for ${url} ${method}, retrying in ${delay}ms: ${message}`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
      } else {
        logger.error(`RPC call failed for ${url} ${method} after ${i + 1} attempts: ${message}`)
      }
    }
  }

  throw lastError
}

export async function callREST(
  baseUrl: string,
  path: string,
  method: string,
  params: Record<string, unknown> | undefined,
  backoff: BackoffConfig,
  ttlSeconds: number,
): Promise<unknown> {
  const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
  const cacheKey = `rest:${url}:${method}:${JSON.stringify(params)}`
  const cached = cache.get(cacheKey)

  if (cached && cached.expires > Date.now()) {
    logger.debug(`Cache hit for REST ${url} ${method}`)
    return cached.value
  }

  logger.debug(`Cache miss for REST ${url} ${method}`)

  let delay = backoff.initial_delay
  let lastError: unknown

  for (let i = 0; i <= backoff.max_retries; i++) {
    try {
      logger.debug(`REST Request to ${url} (${method}): ${JSON.stringify(params)}`)
      const response = await axios({
        method,
        url,
        params: method === 'GET' ? params : undefined,
        data: method !== 'GET' ? params : undefined,
      })
      logger.debug(`REST Response from ${url}: ${JSON.stringify(response.data)}`)

      const result = response.data
      cache.set(cacheKey, {
        value: result,
        expires: Date.now() + ttlSeconds * 1000,
      })

      return result
    } catch (error: unknown) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (i < backoff.max_retries) {
        logger.warn(`REST call failed for ${url} ${method}, retrying in ${delay}ms: ${message}`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2
      } else {
        logger.error(`REST call failed for ${url} ${method} after ${i + 1} attempts: ${message}`)
      }
    }
  }

  throw lastError
}
