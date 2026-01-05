import axios from 'axios'
import { callRPC, callREST, clearCache } from './rpc'

jest.mock('axios')
const mockedAxios = axios as unknown as jest.Mock & { post: jest.Mock }

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

      const result = await callRPC('http://localhost', 'eth_blockNumber', [], { max_retries: 0, initial_delay: 0 }, 60)
      expect(result).toBe('0x7b')
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          data: { jsonrpc: '2.0', result: '0x7b', id: 1 },
        })

      const result = await callRPC('http://localhost', 'eth_blockNumber', [], { max_retries: 1, initial_delay: 1 }, 60)
      expect(result).toBe('0x7b')
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'))

      await expect(
        callRPC('http://localhost', 'eth_blockNumber', [], { max_retries: 1, initial_delay: 1 }, 60)
      ).rejects.toThrow('Network Error')
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should return cached value if available', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { jsonrpc: '2.0', result: '0x7b', id: 1 },
      })

      // First call
      await callRPC('http://localhost', 'eth_blockNumber', [], { max_retries: 0, initial_delay: 0 }, 60)
      
      // Second call should use cache
      const result = await callRPC('http://localhost', 'eth_blockNumber', [], { max_retries: 0, initial_delay: 0 }, 60)
      
      expect(result).toBe('0x7b')
      expect(mockedAxios.post).toHaveBeenCalledTimes(1)
    })
  })

  describe('callREST', () => {
    it('should return result on successful GET call', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { level: 123 },
      })

      const result = await callREST(
        'http://localhost',
        '/head',
        'GET',
        undefined,
        { max_retries: 0, initial_delay: 0 },
        60
      )
      expect(result).toEqual({ level: 123 })
      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        url: 'http://localhost/head',
      }))
    })

    it('should return result on successful POST call', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { success: true },
      })

      const result = await callREST(
        'http://localhost',
        '/submit',
        'POST',
        { data: 'test' },
        { max_retries: 0, initial_delay: 0 },
        60
      )
      expect(result).toEqual({ success: true })
      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST',
        url: 'http://localhost/submit',
        data: { data: 'test' },
      }))
    })

    it('should retry on failure', async () => {
      mockedAxios
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          data: { level: 123 },
        })

      const result = await callREST(
        'http://localhost',
        '/head',
        'GET',
        undefined,
        { max_retries: 1, initial_delay: 1 },
        60
      )
      expect(result).toEqual({ level: 123 })
      expect(mockedAxios).toHaveBeenCalledTimes(2)
    })

    it('should return cached value if available', async () => {
      mockedAxios.mockResolvedValueOnce({
        data: { level: 123 },
      })

      // First call
      await callREST('http://localhost', '/head', 'GET', undefined, { max_retries: 0, initial_delay: 0 }, 60)
      
      // Second call should use cache
      const result = await callREST('http://localhost', '/head', 'GET', undefined, { max_retries: 0, initial_delay: 0 }, 60)
      
      expect(result).toEqual({ level: 123 })
      expect(mockedAxios).toHaveBeenCalledTimes(1)
    })
  })
})
