import { describe, it, expect } from 'vitest'
import {
  navigationPercentile,
  summarizeNavigation,
  type NavigationSample
} from '../../src/lib/navigation'

describe('Navigation latency calculations', () => {
  it('returns zero for empty measurements', () => {
    expect(navigationPercentile([], 95)).toBe(0)
    expect(summarizeNavigation([])).toEqual({
      count: 0,
      p50: 0,
      p95: 0,
      max: 0
    })
  })

  it('calculates P50 and P95 correctly', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1)

    expect(navigationPercentile(values, 50)).toBe(50)
    expect(navigationPercentile(values, 95)).toBe(95)
  })

  it('sorts measurements before calculating percentiles', () => {
    expect(navigationPercentile([40, 10, 30, 20], 50)).toBe(20)
    expect(navigationPercentile([40, 10, 30, 20], 95)).toBe(40)
  })

  it('summarizes recorded navigation latency', () => {
    const samples: NavigationSample[] = [
      { timestamp: 1, variant: 'A', latency: 10 },
      { timestamp: 2, variant: 'A', latency: 20 },
      { timestamp: 3, variant: 'B', latency: 30 },
      { timestamp: 4, variant: 'B', latency: 40 }
    ]

    expect(summarizeNavigation(samples)).toEqual({
      count: 4,
      p50: 20,
      p95: 40,
      max: 40
    })
  })
})
