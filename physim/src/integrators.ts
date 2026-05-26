import { Vec3 } from './vec3';
import { ParticleState } from './particle';
import { FieldSource } from './fields';

export interface Integrator {
    name: string;
    step(state: ParticleState, field: FieldSource, dt: number): ParticleState;
}

export class BorisIntegrator implements Integrator {
    public name = 'boris';

    step(state: ParticleState, field: FieldSource, dt: number): ParticleState {
        const q = state.charge;
        const m = state.mass;
        const qom = q / m;

        const E = field.electricFieldAt(state.position, state.time);
        const B = field.magneticFieldAt(state.position, state.time);

        const v_minus = state.velocity.add(E.multiplyScalar(qom * dt / 2));

        const t = B.multiplyScalar(qom * dt / 2);
        const tMagSq = t.lengthSq();
        const s = t.multiplyScalar(2 / (1 + tMagSq));

        const v_prime = v_minus.add(v_minus.cross(t));
        const v_plus = v_minus.add(v_prime.cross(s));

        const v_new = v_plus.add(E.multiplyScalar(qom * dt / 2));

        const pos_new = state.position.add(v_new.multiplyScalar(dt));

        state.position = pos_new;
        state.velocity = v_new;
        state.time += dt;
        state.trail.push(pos_new.clone());
        if (state.trail.length > 5000) {
            state.trail.splice(0, state.trail.length - 5000);
        }
        return state;
    }
}

export class VelocityVerletIntegrator implements Integrator {
    public name = 'velocity-verlet';

    step(state: ParticleState, field: FieldSource, dt: number): ParticleState {
        const q = state.charge;
        const m = state.mass;

        const E = field.electricFieldAt(state.position, state.time);
        const B = field.magneticFieldAt(state.position, state.time);

        const F1 = this.lorentzForce(state.velocity, E, B, q);
        const a1 = F1.multiplyScalar(1 / m);

        const pos_new = state.position.add(state.velocity.multiplyScalar(dt)).add(a1.multiplyScalar(0.5 * dt * dt));

        const E2 = field.electricFieldAt(pos_new, state.time + dt);
        const B2 = field.magneticFieldAt(pos_new, state.time + dt);

        const v_half = state.velocity.add(a1.multiplyScalar(dt / 2));
        const F2 = this.lorentzForce(v_half, E2, B2, q);
        const a2 = F2.multiplyScalar(1 / m);

        const v_new = state.velocity.add(a1.add(a2).multiplyScalar(dt / 2));

        state.position = pos_new;
        state.velocity = v_new;
        state.time += dt;
        state.trail.push(pos_new.clone());
        if (state.trail.length > 5000) {
            state.trail.splice(0, state.trail.length - 5000);
        }
        return state;
    }

    private lorentzForce(v: Vec3, E: Vec3, B: Vec3, q: number): Vec3 {
        return E.add(v.cross(B)).multiplyScalar(q);
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
        let currentState = state;

        for (let i = 0; i < numSubSteps; i++) {
            currentState = this.rk4Step(currentState, field, subDt);
        }

        return currentState;
    }

    private rk4Step(state: ParticleState, field: FieldSource, dt: number): ParticleState {
        const k1 = this.derivatives(state, field);
        const s2 = this.applyK(state, k1, dt / 2);
        const k2 = this.derivatives(s2, field);
        const s3 = this.applyK(state, k2, dt / 2);
        const k3 = this.derivatives(s3, field);
        const s4 = this.applyK(state, k3, dt);
        const k4 = this.derivatives(s4, field);

        const dx = k1.dx.add(k2.dx.multiplyScalar(2)).add(k3.dx.multiplyScalar(2)).add(k4.dx).multiplyScalar(dt / 6);
        const dv = k1.dv.add(k2.dv.multiplyScalar(2)).add(k3.dv.multiplyScalar(2)).add(k4.dv).multiplyScalar(dt / 6);

        const pos_new = state.position.add(dx);
        const v_new = state.velocity.add(dv);

        state.position = pos_new;
        state.velocity = v_new;
        state.time += dt;
        state.trail.push(pos_new.clone());
        if (state.trail.length > 5000) {
            state.trail.splice(0, state.trail.length - 5000);
        }
        return state;
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
