export type Variant = 'A' | 'B'

export type Measurement = {
  timestamp: number
  frameIntervals: number[]
  p95FrameInterval: number
  estimatedFps: number
  slowFramePercent: number
}

export type ExperimentRun = {
  id: string
  variant: Variant
  createdAt: string
  measurement: Measurement
}

export const STORAGE_KEY = 'frame-lab-experiments-v1'

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  )

  return sorted[index]
}

export function summarizeFrames(intervals: number[]): Measurement {
  const average = intervals.length
    ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    : 0

  const slowFrames = intervals.filter(value => value > 1000 / 30)

  return {
    timestamp: Date.now(),
    frameIntervals: intervals,
    p95FrameInterval: percentile(intervals, 95),
    estimatedFps: average > 0 ? 1000 / average : 0,
    slowFramePercent: intervals.length
      ? (slowFrames.length / intervals.length) * 100
      : 0
  }
}

export async function measureFrames(
  frameCount = 120
): Promise<Measurement> {
  return new Promise(resolve => {
    const intervals: number[] = []
    let previous: number | null = null

    function sample(now: number) {
      if (previous !== null) {
        intervals.push(now - previous)
      }

      previous = now

      if (intervals.length >= frameCount) {
        resolve(summarizeFrames(intervals))
      } else {
        requestAnimationFrame(sample)
      }
    }

    requestAnimationFrame(sample)
  })
}

export function loadRuns(): ExperimentRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed.filter((run): run is ExperimentRun => {
      if (!run || typeof run !== 'object') return false

      const item = run as Partial<ExperimentRun>

      return (
        typeof item.id === 'string' &&
        (item.variant === 'A' || item.variant === 'B') &&
        typeof item.createdAt === 'string' &&
        !!item.measurement &&
        Array.isArray(item.measurement.frameIntervals)
      )
    })
  } catch {
    return []
  }
}

export function saveRuns(runs: ExperimentRun[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs))
}

export function createRun(
  variant: Variant,
  measurement: Measurement
): ExperimentRun {
  return {
    id: crypto.randomUUID(),
    variant,
    createdAt: new Date().toISOString(),
    measurement
  }
}

export function getVariantStats(runs: ExperimentRun[], variant: Variant) {
  const selected = runs.filter(run => run.variant === variant)

  if (!selected.length) return null

  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length

  return {
    count: selected.length,
    p95: average(selected.map(run => run.measurement.p95FrameInterval)),
    fps: average(selected.map(run => run.measurement.estimatedFps)),
    slowFrames: average(selected.map(run => run.measurement.slowFramePercent))
  }
}

export function evaluateRelease(
  stats: ReturnType<typeof getVariantStats>
) {
  if (!stats || stats.count < 3) return 'INSUFFICIENT DATA'

  return stats.p95 <= 33.34 &&
    stats.fps >= 50 &&
    stats.slowFrames <= 5
    ? 'PASS'
    : 'FAIL'
}
