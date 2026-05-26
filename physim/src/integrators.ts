import { Vec3 } from './vec3';
import { ParticleState } from './particle';
import { FieldSource } from './fields';

export interface Integrator {
    name: string;
    step(state: ParticleState, field: FieldSource, dt: number): ParticleState;
}

export class BorisIntegrator implements Integrator {
    public name = 'boris';
    // Pre-allocated scratch buffers to avoid per-step Vec3 allocation
    private _s: Vec3[] = Array.from({ length: 11 }, () => new Vec3());

    step(state: ParticleState, field: FieldSource, dt: number): ParticleState {
        const q = state.charge;
        const m = state.mass;
        const qom = q / m;
        const halfQomDt = qom * dt / 2;
        const s = this._s;

        // Field evaluations (return clones — unavoidable with current interface)
        const E = field.electricFieldAt(state.position, state.time);
        const B = field.magneticFieldAt(state.position, state.time);

        // s[0] = E * (q/m * dt/2)
        s[0].copy(E).multiplyScalarInPlace(halfQomDt);
        // s[1] = v_minus = v + s[0] (half electric kick)
        s[1].copy(state.velocity).addInPlace(s[0]);

        // s[2] = t = B * (q/m * dt/2)
        s[2].copy(B).multiplyScalarInPlace(halfQomDt);
        const tMagSq = s[2].lengthSq();
        // s[3] = s_vec = t * 2/(1+|t|²)
        s[3].copy(s[2]).multiplyScalarInPlace(2 / (1 + tMagSq));

        // s[4] = v_minus × t
        s[4].copy(s[1]).crossInPlace(s[2]);
        // s[5] = v_prime = v_minus + (v_minus × t)
        s[5].copy(s[1]).addInPlace(s[4]);

        // s[6] = v_prime × s_vec
        s[6].copy(s[5]).crossInPlace(s[3]);
        // s[7] = v_plus = v_minus + (v_prime × s_vec)
        s[7].copy(s[1]).addInPlace(s[6]);

        // s[8] = v_new = v_plus + E*(q/m*dt/2) (second half electric kick)
        s[8].copy(s[7]).addInPlace(s[0]);

        // s[9] = v_new * dt
        s[9].copy(s[8]).multiplyScalarInPlace(dt);
        // s[10] = pos_new = pos + v_new*dt
        s[10].copy(state.position).addInPlace(s[9]);

        state.position.copy(s[10]);
        state.velocity.copy(s[8]);
        state.time += dt;
        state.trail.push(s[10].clone());
        return state;
    }
}

export class VelocityVerletIntegrator implements Integrator {
    public name = 'velocity-verlet';
    private _s: Vec3[] = Array.from({ length: 6 }, () => new Vec3());

    step(state: ParticleState, field: FieldSource, dt: number): ParticleState {
        const q = state.charge;
        const m = state.mass;
        const s = this._s;

        const E = field.electricFieldAt(state.position, state.time);
        const B = field.magneticFieldAt(state.position, state.time);

        // a1 = lorentzForce(v, E, B, q) / m
        // F = (E + v × B) * q
        s[0].copy(state.velocity).crossInPlace(B).addInPlace(E).multiplyScalarInPlace(q / m);
        // s[0] = a1

        // pos_new = pos + v*dt + a1*0.5*dt²
        s[1].copy(state.velocity).multiplyScalarInPlace(dt);
        s[2].copy(s[0]).multiplyScalarInPlace(0.5 * dt * dt);
        s[3].copy(state.position).addInPlace(s[1]).addInPlace(s[2]);
        // s[3] = pos_new

        const E2 = field.electricFieldAt(s[3], state.time + dt);
        const B2 = field.magneticFieldAt(s[3], state.time + dt);

        // v_half = v + a1 * dt/2
        s[4].copy(state.velocity).addInPlace(s[0].clone().multiplyScalarInPlace(dt / 2));
        // Wait, s[0] was already used. Let me recompute.
        // Actually s[0] is a1, we need a1*(dt/2) without modifying s[0]
        // Use s[5] for a1*(dt/2)
        s[5].copy(s[0]).multiplyScalarInPlace(dt / 2);
        s[4].copy(state.velocity).addInPlace(s[5]);
        // s[4] = v_half

        // a2 = lorentzForce(v_half, E2, B2, q) / m
        s[5].copy(s[4]).crossInPlace(B2).addInPlace(E2).multiplyScalarInPlace(q / m);
        // s[5] = a2

        // v_new = v + (a1 + a2) * dt/2
        s[0].addInPlace(s[5]).multiplyScalarInPlace(dt / 2);
        state.velocity.addInPlace(s[0]);

        state.position.copy(s[3]);
        state.time += dt;
        state.trail.push(s[3].clone());
        return state;
    }
}

export class RK4Integrator implements Integrator {
    public name = 'rk4';
    public tolerance: number;
    public maxDt: number;
    public minDt: number;

    constructor(tolerance: number = 1e-6, maxDt: number = 1e-10, minDt: number = 1e-15) {
        this.tolerance = tolerance;
        this.maxDt = maxDt;
        this.minDt = minDt;
    }

    step(state: ParticleState, field: FieldSource, dt: number): ParticleState {
        const numSubSteps = Math.max(1, Math.ceil(dt / this.maxDt));
        const subDt = dt / numSubSteps;

        for (let i = 0; i < numSubSteps; i++) {
            this.rk4Step(state, field, subDt);
        }

        state.trail.push(state.position.clone());
        return state;
    }

    private rk4Step(state: ParticleState, field: FieldSource, dt: number): void {
        const k1 = this.derivatives(state, field);
        const s2 = this.applyK(state, k1, dt / 2);
        const k2 = this.derivatives(s2, field);
        const s3 = this.applyK(state, k2, dt / 2);
        const k3 = this.derivatives(s3, field);
        const s4 = this.applyK(state, k3, dt);
        const k4 = this.derivatives(s4, field);

        const dx = k1.dx.add(k2.dx.multiplyScalar(2)).add(k3.dx.multiplyScalar(2)).add(k4.dx).multiplyScalar(dt / 6);
        const dv = k1.dv.add(k2.dv.multiplyScalar(2)).add(k3.dv.multiplyScalar(2)).add(k4.dv).multiplyScalar(dt / 6);

        state.position = state.position.add(dx);
        state.velocity = state.velocity.add(dv);
        state.time += dt;
    }

    private derivatives(state: ParticleState, field: FieldSource): { dx: Vec3; dv: Vec3 } {
        const E = field.electricFieldAt(state.position, state.time);
        const B = field.magneticFieldAt(state.position, state.time);
        const F = E.add(state.velocity.cross(B)).multiplyScalar(state.charge);
        const a = F.multiplyScalar(1 / state.mass);
        return { dx: state.velocity.clone(), dv: a };
    }

    private applyK(state: ParticleState, k: { dx: Vec3; dv: Vec3 }, dt: number): ParticleState {
        return {
            position: state.position.add(k.dx.multiplyScalar(dt)),
            velocity: state.velocity.add(k.dv.multiplyScalar(dt)),
            charge: state.charge,
            mass: state.mass,
            time: state.time + dt,
            alive: state.alive,
            trail: state.trail,
            hitPoint: state.hitPoint,
            hitTime: state.hitTime,
            metadata: state.metadata
        };
    }
}
