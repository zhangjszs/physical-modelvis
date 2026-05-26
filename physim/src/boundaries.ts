import { Vec3 } from './vec3';
import { ParticleState } from './particle';

export interface Boundary {
    type: string;
    check(state: ParticleState): BoundaryResult;
}

export interface BoundaryResult {
    hit: boolean;
    hitPoint: Vec3 | null;
    hitNormal: Vec3 | null;
}

export class VerticalPlatesBoundary implements Boundary {
    public type = 'vertical_plates';
    public separation: number;

    constructor(separation: number) {
        this.separation = separation;
    }

    check(state: ParticleState): BoundaryResult {
        const halfSep = this.separation / 2;
        if (Math.abs(state.position.x) >= halfSep) {
            return {
                hit: true,
                hitPoint: state.position.clone(),
                hitNormal: new Vec3(state.position.x > 0 ? -1 : 1, 0, 0)
            };
        }
        return { hit: false, hitPoint: null, hitNormal: null };
    }
}

export class HorizontalPlatesBoundary implements Boundary {
    public type = 'horizontal_plates';
    public separation: number;

    constructor(separation: number) {
        this.separation = separation;
    }

    check(state: ParticleState): BoundaryResult {
        const halfSep = this.separation / 2;
        if (Math.abs(state.position.y) >= halfSep) {
            return {
                hit: true,
                hitPoint: state.position.clone(),
                hitNormal: new Vec3(0, state.position.y > 0 ? -1 : 1, 0)
            };
        }
        return { hit: false, hitPoint: null, hitNormal: null };
    }
}

export class BoxBoundary implements Boundary {
    public type = 'box';
    public halfWidth: number;
    public halfHeight: number;
    public halfDepth: number;

    constructor(halfWidth: number, halfHeight: number, halfDepth: number = 100) {
        this.halfWidth = halfWidth;
        this.halfHeight = halfHeight;
        this.halfDepth = halfDepth;
    }

    check(state: ParticleState): BoundaryResult {
        if (
            Math.abs(state.position.x) > this.halfWidth ||
            Math.abs(state.position.y) > this.halfHeight ||
            Math.abs(state.position.z) > this.halfDepth
        ) {
            return {
                hit: true,
                hitPoint: state.position.clone(),
                hitNormal: null
            };
        }
        return { hit: false, hitPoint: null, hitNormal: null };
    }
}

export class CylinderBoundary implements Boundary {
    public type = 'cylinder';
    public radius: number;
    public halfHeight: number;

    constructor(radius: number, halfHeight: number = 100) {
        this.radius = radius;
        this.halfHeight = halfHeight;
    }

    check(state: ParticleState): BoundaryResult {
        const r = Math.sqrt(state.position.x * state.position.x + state.position.y * state.position.y);
        if (r > this.radius || Math.abs(state.position.z) > this.halfHeight) {
            return {
                hit: true,
                hitPoint: state.position.clone(),
                hitNormal: null
            };
        }
        return { hit: false, hitPoint: null, hitNormal: null };
    }
}
