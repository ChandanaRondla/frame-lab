export type NavigationSample = {
  timestamp: number
  variant: 'A' | 'B'
  latency: number
}

export function navigationPercentile(
  values: number[],
  percentile: number
): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(
    0,
    Math.min(
      sorted.length - 1,
      Math.ceil((percentile / 100) * sorted.length) - 1
    )
  )

  return sorted[index]
}

export function summarizeNavigation(samples: NavigationSample[]) {
  const latencies = samples.map(sample => sample.latency)

  return {
    count: latencies.length,
    p50: navigationPercentile(latencies, 50),
    p95: navigationPercentile(latencies, 95),
    max: latencies.length ? Math.max(...latencies) : 0
  }
}
