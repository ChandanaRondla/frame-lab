import { describe, it, expect } from 'vitest'
import {
  percentile,
  summarizeFrames,
  getVariantStats,
  evaluateRelease,
  type ExperimentRun,
  type Measurement
} from '../../src/lib/experiments'

function makeRun(
  variant: 'A' | 'B',
  p95: number,
  fps: number,
  slowFrames: number
): ExperimentRun {
  const measurement: Measurement = {
    timestamp: 1,
    frameIntervals: [],
    p95FrameInterval: p95,
    estimatedFps: fps,
    slowFramePercent: slowFrames
  }

  return {
    id: `${variant}-${p95}-${fps}`,
    variant,
    createdAt: '2026-11-01T00:00:00.000Z',
    measurement
  }
}

describe('Frame performance calculations', () => {
  it('handles empty measurements', () => {
    const result = summarizeFrames([])

    expect(result.p95FrameInterval).toBe(0)
    expect(result.estimatedFps).toBe(0)
    expect(result.slowFramePercent).toBe(0)
  })

  it('calculates percentiles correctly', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1)

    expect(percentile(values, 50)).toBe(50)
    expect(percentile(values, 95)).toBe(95)
  })

  it('calculates approximately 60 FPS', () => {
    const result = summarizeFrames(Array(120).fill(1000 / 60))

    expect(result.estimatedFps).toBeCloseTo(60, 2)
    expect(result.slowFramePercent).toBe(0)
  })

  it('detects slow frames', () => {
    const intervals = [
      ...Array(90).fill(16.67),
      ...Array(10).fill(50)
    ]

    const result = summarizeFrames(intervals)

    expect(result.slowFramePercent).toBe(10)
    expect(result.p95FrameInterval).toBe(50)
  })
})

describe('A/B experiment aggregation', () => {
  it('keeps variant measurements separate', () => {
    const runs = [
      makeRun('A', 20, 60, 1),
      makeRun('A', 22, 58, 2),
      makeRun('B', 30, 52, 4)
    ]

    const a = getVariantStats(runs, 'A')
    const b = getVariantStats(runs, 'B')

    expect(a?.count).toBe(2)
    expect(a?.p95).toBe(21)
    expect(a?.fps).toBe(59)

    expect(b?.count).toBe(1)
    expect(b?.p95).toBe(30)
    expect(b?.fps).toBe(52)
  })

  it('returns null for a variant without runs', () => {
    expect(getVariantStats([], 'A')).toBeNull()
  })
})

describe('Release-quality gates', () => {
  it('requires at least three runs', () => {
    const runs = [
      makeRun('A', 17, 60, 0),
      makeRun('A', 17, 60, 0)
    ]

    expect(evaluateRelease(getVariantStats(runs, 'A')))
      .toBe('INSUFFICIENT DATA')
  })

  it('passes when all thresholds are satisfied', () => {
    const runs = Array.from(
      { length: 3 },
      () => makeRun('A', 17, 60, 1)
    )

    expect(evaluateRelease(getVariantStats(runs, 'A'))).toBe('PASS')
  })

  it('fails when FPS is below 50', () => {
    const runs = Array.from(
      { length: 3 },
      () => makeRun('A', 17, 49, 1)
    )

    expect(evaluateRelease(getVariantStats(runs, 'A'))).toBe('FAIL')
  })

  it('fails when P95 exceeds 33.34 ms', () => {
    const runs = Array.from(
      { length: 3 },
      () => makeRun('A', 40, 60, 1)
    )

    expect(evaluateRelease(getVariantStats(runs, 'A'))).toBe('FAIL')
  })

  it('fails when slow frames exceed 5%', () => {
    const runs = Array.from(
      { length: 3 },
      () => makeRun('B', 17, 60, 8)
    )

    expect(evaluateRelease(getVariantStats(runs, 'B'))).toBe('FAIL')
  })

  it('accepts values exactly at the release thresholds', () => {
    const runs = Array.from(
      { length: 3 },
      () => makeRun('B', 33.34, 50, 5)
    )

    expect(evaluateRelease(getVariantStats(runs, 'B'))).toBe('PASS')
  })
})
