import {
  measureFrames,
  loadRuns,
  saveRuns,
  createRun,
  getVariantStats,
  evaluateRelease,
  type ExperimentRun
} from './lib/experiments'
import { useState, useEffect, useRef } from 'react'
import {
  Activity, BarChart3, Monitor, FlaskConical,
  ShieldCheck, Play, RotateCcw, ArrowRight,
  CheckCircle2, Clock3, Gauge
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts'
import {
  summarizeNavigation,
  type NavigationSample
} from './lib/navigation'
import './App.css'

type Variant = 'A' | 'B'
type View = 'Overview' | 'TV Simulator' | 'Experiments' | 'Release Quality'
type Sample = { run: number; latency: number; fps: number }

const titles = [
  'Northern Lights', 'The Last Signal', 'After Hours',
  'Parallel', 'The Crossing', 'Blue Horizon',
  'Echo Valley', 'The Archive', 'Midnight Run'
]

function percentile(values: number[], p: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] ?? sorted[0]
}

function App() {
  const [view, setView] = useState<View>('Overview')
  const [variant, setVariant] = useState<Variant>('A')
  const [focus, setFocus] = useState(0)
  const [samples, setSamples] = useState<Sample[]>([])
  const [running, setRunning] = useState(false)
  const [experimentRuns, setExperimentRuns] = useState<ExperimentRun[]>(loadRuns)

  const [sessionCount, setSessionCount] = useState(0)
  const pendingInput = useRef<number | null>(null)
  const [navigationSamples, setNavigationSamples] = useState<NavigationSample[]>([])
  const navigationStats = summarizeNavigation(navigationSamples)
  console.debug('Navigation responsiveness:', navigationStats)

  const p95 = percentile(samples.map(s => s.latency), 95)
  const avgFps = samples.length
    ? samples.reduce((sum, s) => sum + s.fps, 0) / samples.length
    : 0

  useEffect(() => {
    if (view !== 'TV Simulator') return

    function onKey(e: KeyboardEvent) {
      const directions: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: 3,
        ArrowUp: -3
      }

      if (!(e.key in directions)) return
      e.preventDefault()

      pendingInput.current = performance.now()
      setFocus(current =>
        Math.max(0, Math.min(titles.length - 1, current + directions[e.key]))
      )
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  useEffect(() => {
    if (pendingInput.current === null) return

    const start = pendingInput.current
    pendingInput.current = null

    const frame = requestAnimationFrame(() => {
      const latency = performance.now() - start

      setNavigationSamples(prev => [
        ...prev.slice(-199),
        {
          timestamp: Date.now(),
          variant,
          latency: Number(latency.toFixed(2))
        }
      ])
    })

    return () => cancelAnimationFrame(frame)
  }, [focus, variant])

  async function runBenchmark() {
    if (running) return

    setRunning(true)
    setView('TV Simulator')

    try {
      // Allow the selected layout to render before sampling.
      await new Promise<void>(resolve =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        )
      )

      const measurement = await measureFrames(120)
      const run = createRun(variant, measurement)

      setExperimentRuns(previous => {
        const updated = [...previous, run]
        saveRuns(updated)
        return updated
      })

      setSamples(measurement.frameIntervals.map((latency, index) => ({
        run: index + 1,
        latency: Number(latency.toFixed(2)),
        fps: Number((1000 / latency).toFixed(1))
      })))

      setSessionCount(count => count + 1)
      setView('Overview')
    } finally {
      setRunning(false)
    }
  }

  const nav: { name: View; icon: typeof Activity }[] = [
    { name: 'Overview', icon: BarChart3 },
    { name: 'TV Simulator', icon: Monitor },
    { name: 'Experiments', icon: FlaskConical },
    { name: 'Release Quality', icon: ShieldCheck }
  ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">F</span><div>FRAME <span>/ LAB</span><small>ENGINEERING CONSOLE</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map(({ name, icon: Icon }) => (
            <button key={name} className={view === name ? 'nav active' : 'nav'} onClick={() => setView(name)}>
              <Icon size={18} /> {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><span className="status-dot" /> LOCAL INSTRUMENTATION<br/><small>Browser performance APIs</small></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="breadcrumb">ENGINEERING / {view.toUpperCase()}</span><h1>{view === 'Overview' ? 'Performance overview' : view}</h1><p>TV interface performance, experimentation, and release intelligence.</p></div>
          <button className="primary" onClick={runBenchmark} disabled={running}><Play size={15}/>{running ? 'Running…' : 'Run benchmark'}</button>
        </header>

        <div className="content">
          {view === 'Overview' && <>
            <div className="section-label">LIVE SESSION METRICS <span>Browser-measured · No sample data</span></div>
            <div className="metrics">
              <Metric label="P95 FRAME RESPONSE" value={samples.length ? `${p95.toFixed(1)} ms` : '—'} sub="Measured frame callback latency" icon={<Clock3 size={18}/>} />
              <Metric label="EST. FRAME RATE" value={samples.length ? `${avgFps.toFixed(1)} FPS` : '—'} sub="Two-frame benchmark estimate" icon={<Gauge size={18}/>} />
              <Metric label="BENCHMARK RUNS" value={String(sessionCount)} sub="Completed in this session" icon={<Activity size={18}/>} />
              <Metric label="SAMPLES" value={String(samples.length)} sub="Collected browser measurements" icon={<CheckCircle2 size={18}/>} />
            </div>
            <div className="two-col">
              <section className="panel chart-panel">
                <div className="panel-heading"><div><h2>Frame response trend</h2><p>Milliseconds per measurement</p></div><span className="tag">LIVE DATA</span></div>
                {samples.length ? <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={samples}>
                    <CartesianGrid stroke="#202838" strokeDasharray="3 4"/>
                    <XAxis dataKey="run" stroke="#768094" fontSize={11}/>
                    <YAxis stroke="#768094" fontSize={11}/>
                    <Tooltip contentStyle={{background:'#151d2a',border:'1px solid #344052',borderRadius:8}}/>
                    <Line dataKey="latency" stroke="#74d5db" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer> : <div className="empty-chart">No measurements yet.<br/><span>Run a benchmark to populate the chart.</span></div>}
              </section>
              <section className="panel">
                <div className="panel-heading"><div><h2>Experiment workspace</h2><p>Compare two TV discovery layouts</p></div><FlaskConical size={20}/></div>
                <div className="variant-grid">
                  {(['A','B'] as Variant[]).map(v => <button key={v} className={variant === v ? 'variant selected' : 'variant'} onClick={() => {setVariant(v);setView('TV Simulator')}}><span>VARIANT {v}</span><strong>{v === 'A' ? 'Classic Grid' : 'Editorial Layout'}</strong><small>{v === 'A' ? 'Compact content discovery' : 'Larger featured content'}</small><ArrowRight size={16}/></button>)}
                </div>
                <div className="info-note">Experiment outcomes require repeated measured sessions. No winner is assumed.</div>
              </section>
            </div>
          </>}

          {view === 'TV Simulator' && <>
            <div className="sim-toolbar"><div><h2>TV interaction simulator</h2><p>Use arrow keys to navigate the catalog.</p></div><div className="switcher">{(['A','B'] as Variant[]).map(v => <button key={v} className={variant===v?'chosen':''} onClick={()=>{setVariant(v);setFocus(0)}}>Variant {v}</button>)}</div></div>
            <div className={`tv-screen ${variant === 'B' ? 'editorial' : ''}`}>
              <div className="tv-header"><strong>FRAME <span>/ TV</span></strong><span>DISCOVER &nbsp;&nbsp; FILMS &nbsp;&nbsp; SERIES</span><small>EXPERIMENT {variant}</small></div>
              <div className="tv-hero"><span>FEATURED COLLECTION</span><h2>{variant === 'A' ? 'Stories worth staying for.' : 'A different way to discover.'}</h2><p>Explore curated stories using your remote.</p></div>
              <div className="tv-row-label">TRENDING NOW <small>Arrow keys to navigate</small></div>
              <div className="tv-grid">{titles.map((t,i)=><div key={t} className={`poster poster-${i%6} ${focus===i?'focused':''}`}><div className="poster-art">{String(i+1).padStart(2,'0')}</div><strong>{t}</strong><small>FILM · DISCOVERY</small></div>)}</div>
            </div>
            <div className="sim-footer"><span>FOCUSED ITEM: <strong>{titles[focus]}</strong></span><span>VARIANT {variant} · KEYBOARD / D-PAD</span><button onClick={()=>{setSamples([]);setSessionCount(0)}}><RotateCcw size={14}/> Reset measurements</button></div>
          </>}

          {view === 'Experiments' && (
            <section className="panel experiment-page">
              <span className="eyebrow">A/B EXPERIMENTATION</span>
              <h2>Variant performance comparison</h2>
              <p>
                Run the benchmark with each TV layout selected.
                Results are stored locally and compared independently.
              </p>

              <div className="comparison-grid">
                {(['A', 'B'] as const).map(v => {
                  const stats = getVariantStats(experimentRuns, v)

                  return (
                    <div className="comparison-card" key={v}>
                      <span className="eyebrow">VARIANT {v}</span>
                      <h3>{v === 'A' ? 'Classic Grid' : 'Editorial Layout'}</h3>

                      <div className="comparison-stat">
                        <span>Benchmark runs</span>
                        <strong>{stats?.count ?? 0}</strong>
                      </div>

                      <div className="comparison-stat">
                        <span>Mean run P95 frame interval</span>
                        <strong>{stats ? stats.p95.toFixed(2) + ' ms' : '—'}</strong>
                      </div>

                      <div className="comparison-stat">
                        <span>Estimated FPS</span>
                        <strong>{stats ? stats.fps.toFixed(1) : '—'}</strong>
                      </div>

                      <div className="comparison-stat">
                        <span>Frames over 33.3 ms</span>
                        <strong>{stats ? stats.slowFrames.toFixed(1) + '%' : '—'}</strong>
                      </div>

                      <button
                        className="primary"
                        disabled={running}
                        onClick={() => {
                          setVariant(v)
                          setView('TV Simulator')
                        }}
                      >
                        <Monitor size={15} />
                        Open Variant {v}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="info-note">
                These measurements describe browser animation-frame timing.
                They do not establish which layout improves viewer engagement.
              </div>
            </section>
          )}

          {view === 'Release Quality' && (
            <section className="panel experiment-page">
              <span className="eyebrow">RELEASE READINESS</span>
              <h2>Performance regression gates</h2>
              <p>
                Each variant needs at least three benchmark runs before
                its preliminary browser-performance gate can be evaluated.
              </p>

              {(['A', 'B'] as const).map(v => {
                const stats = getVariantStats(experimentRuns, v)
                const result = evaluateRelease(stats)

                return (
                  <div className="quality-row" key={v}>
                    <span>
                      Variant {v} · {stats?.count ?? 0} runs
                      <small className="quality-description">
                        P95 ≤ 33.34 ms · FPS ≥ 50 · slow frames ≤ 5%
                      </small>
                    </span>
                    <strong>{result}</strong>
                  </div>
                )
              })}

              <div className="info-note">
                A passing result is only a local browser performance check,
                not a production TV-device release certification.
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  )
}

function Metric({label,value,sub,icon}:{label:string,value:string,sub:string,icon:React.ReactNode}) {
  return <div className="metric"><div className="metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{sub}</small></div>
}

export default App
