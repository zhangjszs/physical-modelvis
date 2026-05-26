import { Vec3 } from './vec3';

export interface ParticleState {
    position: Vec3;
    velocity: Vec3;
    charge: number;
    mass: number;
    time: number;
    alive: boolean;
    trail: Vec3[];
    hitPoint: Vec3 | null;
    hitTime: number;
    metadata: Record<string, number>;
}

export function createParticleState(
    position: Vec3,
    velocity: Vec3,
    charge: number,
    mass: number
): ParticleState {
    return {
        position: position.clone(),
        velocity: velocity.clone(),
        charge,
        mass,
        time: 0,
        alive: true,
        trail: [position.clone()],
        hitPoint: null,
        hitTime: -1,
        metadata: {}
    };
}

export function kineticEnergy(state: ParticleState): number {
    return 0.5 * state.mass * state.velocity.lengthSq();
}

export function momentum(state: ParticleState): Vec3 {
    return state.velocity.multiplyScalar(state.mass);
}

export function speed(state: ParticleState): number {
    return state.velocity.length();
}

export function cyclotronRadius(state: ParticleState, B: number): number {
    if (B === 0) return Infinity;
    return state.mass * state.velocity.length() / (Math.abs(state.charge) * B);
}

export function cyclotronPeriod(state: ParticleState, B: number): number {
    if (B === 0) return Infinity;
    return 2 * Math.PI * state.mass / (Math.abs(state.charge) * B);
}

export function cyclotronFrequency(state: ParticleState, B: number): number {
    if (B === 0) return 0;
    return Math.abs(state.charge) * B / state.mass;
}
