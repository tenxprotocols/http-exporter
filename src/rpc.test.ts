import axios from 'axios'
import { callREST, callRPC, clearCache } from './rpc'

jest.mock('axios')
const mockedAxios = axios as unknown as jest.Mock & { post: jest.Mock }

const backoff = { max_retries: 0, initial_delay: 0 }
const retryBackoff = { max_retries: 1, initial_delay: 1 }
const timeout = 10000

describe('rpc', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearCache()
  })

  describe('callRPC', () => {
    it('should return result on successful call', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { jsonrpc: '2.0', result: '0x7b', id: 1 },
      })

      const result = await callRPC('http://localhost', 'eth_blockNumber', [], backoff, 60, timeout)
      expect(result).toBe('0x7b')
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({
        data: { jsonrpc: '2.0', result: '0x7b', id: 1 },
      })

      const result = await callRPC('http://localhost', 'eth_blockNumber', [], retryBackoff, 60, timeout)
      expect(result).toBe('0x7b')
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'))

      await expect(callRPC('http://localhost', 'eth_blockNumber', [], retryBackoff, 60, timeout)).rejects.toThrow(
        'Network Error',
      )
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should return cached value if available', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { jsonrpc: '2.0', result: '0x7b', id: 1 },
      })

      await callRPC('http://localhost', 'eth_blockNumber', [], backoff, 60, timeout)
      const result = await callRPC('http://localhost', 'eth_blockNumber', [], backoff, 60, timeout)

      expect(result).toBe('0x7b')
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })

    it('should pass timeout and headers to axios', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { jsonrpc: '2.0', result: '0x1', id: 1 },
      })

      const headers = { Authorization: 'Bearer token', 'User-Agent': 'http-exporter' }
      await callRPC('http://localhost', 'eth_chainId', [], backoff, 60, 5000, headers)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost',
        expect.objectContaining({ method: 'eth_chainId' }),
        { timeout: 5000, headers },
      )
    })
  })

  describe('callREST', () => {
    it('should return result on successful GET call', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { level: 123 },
      })

      const result = await callREST('http://localhost', '/head', 'GET', undefined, backoff, 60, timeout)
      expect(result).toEqual({ level: 123 })
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost/head',
        }),
      )
    })

    it('should return result on successful POST call', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
      })

      const result = await callREST('http://localhost', '/submit', 'POST', { data: 'test' }, backoff, 60, timeout)
      expect(result).toEqual({ success: true })
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost/submit',
          data: { data: 'test' },
        }),
      )
    })

    it('should retry on failure', async () => {
      mockedAxios.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({
        data: { level: 123 },
      })

      const result = await callREST('http://localhost', '/head', 'GET', undefined, retryBackoff, 60, timeout)
      expect(result).toEqual({ level: 123 })
      expect(mockedAxios).toHaveBeenCalledTimes(2)
    })

    it('should return cached value if available', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { level: 123 },
      })

      await callREST('http://localhost', '/head', 'GET', undefined, backoff, 60, timeout)
      const result = await callREST('http://localhost', '/head', 'GET', undefined, backoff, 60, timeout)

      expect(result).toEqual({ level: 123 })
      expect(mockedAxios).toHaveBeenCalledTimes(1)
    })

    it('should pass timeout and headers to axios', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { level: 123 },
      })

      const headers = { 'User-Agent': 'http-exporter' }
      await callREST('http://localhost', '/head', 'GET', undefined, backoff, 60, 5000, headers)

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://localhost/head',
          timeout: 5000,
          headers,
        }),
      )
    })
  })
})
