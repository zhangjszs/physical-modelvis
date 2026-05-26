# PhysVis - 高中电磁学可视化仿真系统

## Project Overview
Interactive electromagnetic physics simulation for Chinese high school education.
Three-layer architecture: PhysSim engine (TypeScript) → PhysVis bridge (JS) → Three.js renderer.

## Build & Test
```bash
# Build physics engine
cd physim && npm run build

# Run all tests
cd physim && npm test          # Core physics tests (9 tests)
npx tsx test/physics.test.ts   # Root regression tests (15 tests)
node test/bridge.test.js       # Bridge layer tests (11 tests)

# Lint
npx eslint physim/src/ js/ templates/ problems/

# Format
npx prettier --write "physim/src/**/*.ts" "js/**/*.js" "templates/**/*.js" "problems/**/*.js"
```

## Architecture
```
index.html          — Monolithic SPA (CSS + HTML + inline JS: Renderer3D, Simulator, UIManager, App)
physim/src/         — Zero-dependency TypeScript physics engine
  vec3.ts           — 3D vector math (immutable ops + in-place mutations)
  particle.ts       — Particle state interface + utility functions
  fields.ts         — Field sources (UniformE, UniformB, PointCharge, Dipole, Composite)
  integrators.ts    — Boris, Velocity-Verlet, RK4 integrators
  boundaries.ts     — Collision boundaries (plates, box, cylinder)
  simulation.ts     — Simulation orchestrator + runSimulation()
js/framework.js     — Bridge layer: PhysVis global namespace (SceneSpec, ProblemConfig, SceneBuilder, SimulationManager, Integrators, ProblemRegistry)
templates/          — 6 scene templates (parallel plates+magnetic, velocity selector, mass spectrometer, cyclotron, parallel plates electric, dipole)
problems/           — 3 exam problem definitions
```

## Key Patterns
- Physics engine uses normalized units (q=±1, m=R*B/v) for numerical stability
- Boris integrator is primary (energy conservation <0.1% error)
- Integrators mutate ParticleState in-place for performance (trail array push/splice)
- Vec3 static constants (ZERO, UNIT_X, etc.) are frozen — always .clone() before modifying
- Bridge layer caches PhysSim field objects via JSON.stringify key
- Renderer shares geometry/material instances for particles via _sharedGeoms/_sharedMats

## Conventions
- TypeScript strict mode for physim/
- Vanilla JS (CommonJS/IIFE) for bridge/templates/problems
- Three.js 0.128.0 via CDN
- Chinese language for UI text and documentation
- No frontend framework — pure DOM manipulation
