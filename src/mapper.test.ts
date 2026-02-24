import { formatMetric, formatValue, getValueByPath } from './mapper'

describe('mapper', () => {
  describe('getValueByPath', () => {
    it('should extract value from simple path', () => {
      const obj = { result: 123 }
      expect(getValueByPath(obj, 'result')).toBe(123)
    })

    it('should extract value from nested path', () => {
      const obj = { result: { value: 456 } }
      expect(getValueByPath(obj, 'result.value')).toBe(456)
    })

    it('should return undefined for invalid path', () => {
      const obj = { result: 123 }
      expect(getValueByPath(obj, 'invalid.path')).toBeUndefined()
    })

    it('should return array length', () => {
      const obj = { items: [1, 2, 3] }
      expect(getValueByPath(obj, 'items.length')).toBe(3)
    })
  })

  describe('formatValue', () => {
    it('should return number as is', () => {
      expect(formatValue(123)).toBe(123)
    })

    it('should convert hex string to number', () => {
      expect(formatValue('0x7b')).toBe(123)
    })

    it('should convert decimal string to number', () => {
      expect(formatValue('123.45')).toBe(123.45)
    })

    it('should convert boolean to 1 or 0', () => {
      expect(formatValue(true)).toBe(1)
      expect(formatValue(false)).toBe(0)
    })

    it('should convert date string to timestamp', () => {
      const dateStr = '2024-01-01T00:00:00Z'
      const expected = new Date(dateStr).getTime()
      expect(formatValue(dateStr)).toBe(expected)
    })

    it('should return -1 for unknown values', () => {
      expect(formatValue('not a number')).toBe(-1)
      expect(formatValue({})).toBe(-1)
    })
  })

  describe('formatMetric', () => {
    it('should format metric without prefix or labels', () => {
      const result = formatMetric('test.metric', 'Test help', 'gauge', 123)
      expect(result).toBe(`# HELP test.metric Test help
# TYPE test.metric gauge
test.metric 123`)
    })

    it('should format metric with prefix', () => {
      const result = formatMetric('test.metric', 'Test help', 'gauge', 123, 'prefix')
      expect(result).toBe(`# HELP prefix.test.metric Test help
# TYPE prefix.test.metric gauge
prefix.test.metric 123`)
    })

    it('should format metric with labels', () => {
      const result = formatMetric('test.metric', 'Test help', 'gauge', 123, '', { label1: 'val1', label2: 'val2' })
      expect(result).toBe(`# HELP test.metric Test help
# TYPE test.metric gauge
test.metric{label1="val1",label2="val2"} 123`)
    })
  })
})
