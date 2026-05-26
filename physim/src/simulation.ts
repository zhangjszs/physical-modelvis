import { Vec3 } from './vec3';
import { ParticleState, createParticleState, kineticEnergy, momentum } from './particle';
import { FieldSource, CompositeField } from './fields';
import { Integrator, BorisIntegrator, VelocityVerletIntegrator, RK4Integrator } from './integrators';
import { Boundary, BoundaryResult } from './boundaries';

export interface SimulationConfig {
    integrator: 'boris' | 'velocity-verlet' | 'rk4';
    dt: number;
    maxSteps: number;
    trailLength: number;
    rk4Tolerance?: number;
}

export interface SimulationCallbacks {
    onHit?: (particle: ParticleState, hitPoint: Vec3, boundary: Boundary) => void;
    onStep?: (simulation: Simulation) => void;
}

export const DEFAULT_CONFIG: SimulationConfig = {
    integrator: 'boris',
    dt: 1e-10,
    maxSteps: 100000,
    trailLength: 5000,
    rk4Tolerance: 1e-6
};

export class Simulation {
    public field: CompositeField;
    public boundaries: Boundary[];
    public integrator: Integrator;
    public config: SimulationConfig;
    public particles: ParticleState[];
    public time: number;
    public stepCount: number;
    private callbacks: SimulationCallbacks;

    constructor(
        field: FieldSource | CompositeField,
        boundaries: Boundary[] = [],
        config: Partial<SimulationConfig> = {},
        callbacks: SimulationCallbacks = {}
    ) {
        this.field = field instanceof CompositeField ? field : new CompositeField([field]);
        this.boundaries = boundaries;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.integrator = this.createIntegrator(this.config.integrator);
        this.particles = [];
        this.time = 0;
        this.stepCount = 0;
        this.callbacks = callbacks;
    }

    private createIntegrator(type: string): Integrator {
        switch (type) {
            case 'boris':
                return new BorisIntegrator();
            case 'velocity-verlet':
                return new VelocityVerletIntegrator();
            case 'rk4':
                return new RK4Integrator(this.config.rk4Tolerance);
            default:
                return new BorisIntegrator();
        }
    }

    addParticle(
        position: Vec3,
        velocity: Vec3,
        charge: number,
        mass: number
    ): ParticleState {
        const state = createParticleState(position, velocity, charge, mass);
        this.particles.push(state);
        return state;
    }

    removeParticle(index: number): void {
        this.particles.splice(index, 1);
    }

    clearParticles(): void {
        this.particles = [];
    }

    step(dt?: number): void {
        const effectiveDt = dt || this.config.dt;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (!p.alive) continue;

            const newState = this.integrator.step(p, this.field, effectiveDt);

            const boundaryResult = this.checkBoundaries(newState);
            if (boundaryResult.hit) {
                newState.alive = false;
                newState.hitPoint = boundaryResult.hitPoint;
                newState.hitTime = newState.time;
                if (this.callbacks.onHit && boundaryResult.hitPoint) {
                    this.callbacks.onHit(newState, boundaryResult.hitPoint, this.boundaries[0]);
                }
            }

            if (newState.trail.length > this.config.trailLength) {
                newState.trail.splice(0, newState.trail.length - this.config.trailLength);
            }

            this.particles[i] = newState;
        }

        this.time += effectiveDt;
        this.stepCount++;

        if (this.callbacks.onStep) {
            this.callbacks.onStep(this);
        }
    }

    stepN(n: number, dt?: number): void {
        for (let i = 0; i < n; i++) {
            this.step(dt);
        }
    }

    private checkBoundaries(state: ParticleState): BoundaryResult {
        for (const boundary of this.boundaries) {
            const result = boundary.check(state);
            if (result.hit) return result;
        }
        return { hit: false, hitPoint: null, hitNormal: null };
    }

    reset(): void {
        this.particles = [];
        this.time = 0;
        this.stepCount = 0;
    }

    getAliveCount(): number {
        return this.particles.filter(p => p.alive).length;
    }

    getHitCount(): number {
        return this.particles.filter(p => !p.alive && p.hitPoint !== null).length;
    }

    getHitRatio(): number {
        if (this.particles.length === 0) return 0;
        return this.getHitCount() / this.particles.length;
    }

    getParticle(index: number): ParticleState | null {
        return this.particles[index] || null;
    }

    validateEnergyConservation(initialKE: number, tolerance: number = 0.01): boolean {
        for (const p of this.particles) {
            if (!p.alive) continue;
            const currentKE = kineticEnergy(p);
            const relativeError = Math.abs(currentKE - initialKE) / initialKE;
            if (relativeError > tolerance) return false;
        }
        return true;
    }

    setCallbacks(callbacks: SimulationCallbacks): void {
        this.callbacks = callbacks;
    }

    getTotalKineticEnergy(): number {
        let total = 0;
        for (const p of this.particles) {
            if (p.alive) total += kineticEnergy(p);
        }
        return total;
    }

    getTotalMomentum(): Vec3 {
        const total = new Vec3();
        for (const p of this.particles) {
            if (p.alive) total.addInPlace(momentum(p));
        }
        return total;
    }
}

export function runSimulation(
    field: FieldSource,
    boundaries: Boundary[],
    initialState: {
        position: Vec3;
        velocity: Vec3;
        charge: number;
        mass: number;
    },
    config: Partial<SimulationConfig> = {}
): ParticleState {
    const sim = new Simulation(field, boundaries, config);
    sim.addParticle(initialState.position, initialState.velocity, initialState.charge, initialState.mass);

    const maxSteps = config.maxSteps || DEFAULT_CONFIG.maxSteps;
    for (let i = 0; i < maxSteps; i++) {
        const p = sim.getParticle(0)!;
        if (!p.alive) break;
        sim.step();
    }

    return sim.getParticle(0)!;
}
