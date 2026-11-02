# FRAME / LAB

### TV UI Performance & A/B Experimentation Harness

FRAME / LAB is a React and TypeScript engineering dashboard for evaluating streaming TV interface performance, remote-style navigation responsiveness, layout experiments, and browser-based release quality gates.

The project explores how different TV discovery layouts behave under local browser performance measurements and automated regression tests.

## Features

### TV Interface Simulator
- 30-film discovery catalog with artwork
- Variant A: Classic Grid
- Variant B: Editorial Layout
- Keyboard-based D-pad navigation
- Focus indicators and movie detail interactions
- Variant-aware navigation behavior

### Performance Benchmarking
- Browser animation-frame sampling
- P95 frame interval
- Estimated frames per second (FPS)
- Percentage of frames exceeding 33.3 ms
- Independent benchmark history for each variant

### Navigation Responsiveness
- Keyboard-to-animation-frame latency sampling
- P50 and P95 latency measurements
- Independent navigation statistics for both variants

### A/B Experimentation
- Side-by-side performance comparison
- Separate metrics for Classic Grid and Editorial Layout
- Browser-local experiment results

### Release Quality Gates
Each variant requires at least three benchmark runs.

Preliminary thresholds:
- P95 frame interval <= 33.34 ms
- Estimated FPS >= 50
- Slow frames <= 5%

Results are classified as PASS, FAIL, or INSUFFICIENT DATA.

These gates measure local browser performance, not production TV-device certification.

## Tech Stack

- React 19
- TypeScript
- Vite
- Recharts
- Lucide React
- Vitest
- Playwright
- TMDB artwork metadata

## Getting Started

Requirements: Node.js and npm.

Clone the repository:

git clone https://github.com/ChandanaRondla/frame-lab.git

cd frame-lab

Install dependencies:

npm install

Start the development server:

npm run dev

Open the localhost URL displayed in Terminal.

The committed poster assets allow the existing catalog to display without configuring a TMDB API key.

## Testing

Run unit tests:

npm run test

Run browser tests:

npm run test:e2e

Run the full validation suite:

npm run test:all

Run lint checks:

npm run lint

## Current Automated Coverage

- 16 unit tests
- 5 Playwright browser tests
- TypeScript production build
- Oxlint static checks

## Measurement Limitations

Performance results depend on browser conditions, hardware, system load, and measurement methodology.

Keyboard-to-animation-frame latency is a browser-side responsiveness proxy, not a measurement of physical TV remote hardware latency.

The A/B comparison evaluates technical performance. It does not establish improvements in viewer engagement or business outcomes.

## Project Context

FRAME / LAB complements FRAME / TV, a separate streaming discovery application.

FRAME / TV:
https://github.com/ChandanaRondla/frame-tv

FRAME / LAB focuses on performance instrumentation, experimentation, regression testing, and release-readiness evaluation.

## Author

Chandana Rondla
