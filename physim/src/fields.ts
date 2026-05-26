import { Vec3 } from './vec3';

export interface FieldSource {
    type: string;
    electricFieldAt(position: Vec3, time: number): Vec3;
    magneticFieldAt(position: Vec3, time: number): Vec3;
    isInsideRegion(position: Vec3): boolean;
}

function isInsideBoxRegion(position: Vec3, region: { min: Vec3; max: Vec3 } | null): boolean {
    if (!region) return true;
    return (
        position.x >= region.min.x && position.x <= region.max.x &&
        position.y >= region.min.y && position.y <= region.max.y &&
        position.z >= region.min.z && position.z <= region.max.z
    );
}

export class UniformElectricField implements FieldSource {
    public type = 'uniform_electric';
    public field: Vec3;
    public region: { min: Vec3; max: Vec3 } | null;

    constructor(field: Vec3, region?: { min: Vec3; max: Vec3 }) {
        this.field = field.clone();
        this.region = region || null;
    }

    electricFieldAt(position: Vec3, _time: number): Vec3 {
        if (!this.isInsideRegion(position)) return Vec3.ZERO.clone();
        return this.field.clone();
    }

    magneticFieldAt(_position: Vec3, _time: number): Vec3 {
        return Vec3.ZERO.clone();
    }

    isInsideRegion(position: Vec3): boolean {
        return isInsideBoxRegion(position, this.region);
    }
}

export class UniformMagneticField implements FieldSource {
    public type = 'uniform_magnetic';
    public field: Vec3;
    public region: { min: Vec3; max: Vec3 } | null;

    constructor(field: Vec3, region?: { min: Vec3; max: Vec3 }) {
        this.field = field.clone();
        this.region = region || null;
    }

    electricFieldAt(_position: Vec3, _time: number): Vec3 {
        return Vec3.ZERO.clone();
    }

    magneticFieldAt(position: Vec3, _time: number): Vec3 {
        if (!this.isInsideRegion(position)) return Vec3.ZERO.clone();
        return this.field.clone();
    }

    isInsideRegion(position: Vec3): boolean {
        return isInsideBoxRegion(position, this.region);
    }
}

export class PointChargeField implements FieldSource {
    public type = 'point_charge';
    public charge: number;
    public position: Vec3;
    public k: number;

    constructor(charge: number, position: Vec3, k: number = 8.99e9) {
        this.charge = charge;
        this.position = position.clone();
        this.k = k;
    }

    electricFieldAt(pos: Vec3, _time: number): Vec3 {
        const r = pos.sub(this.position);
        const dist = r.length();
        if (dist < 1e-10) return Vec3.ZERO.clone();
        const Emag = this.k * this.charge / (dist * dist);
        return r.normalize().multiplyScalar(Emag);
    }

    magneticFieldAt(_position: Vec3, _time: number): Vec3 {
        return Vec3.ZERO.clone();
    }

    isInsideRegion(_position: Vec3): boolean {
        return true;
    }
}

export class DipoleField implements FieldSource {
    public type = 'dipole';
    public positiveCharge: PointChargeField;
    public negativeCharge: PointChargeField;

    constructor(q: number, separation: number, center: Vec3 = Vec3.ZERO.clone(), k: number = 8.99e9) {
        const halfSep = separation / 2;
        this.positiveCharge = new PointChargeField(q, center.add(new Vec3(-halfSep, 0, 0)), k);
        this.negativeCharge = new PointChargeField(-q, center.add(new Vec3(halfSep, 0, 0)), k);
    }

    electricFieldAt(position: Vec3, time: number): Vec3 {
        return this.positiveCharge.electricFieldAt(position, time)
            .add(this.negativeCharge.electricFieldAt(position, time));
    }

    magneticFieldAt(_position: Vec3, _time: number): Vec3 {
        return Vec3.ZERO.clone();
    }

    isInsideRegion(position: Vec3): boolean {
        const d1 = position.distanceTo(this.positiveCharge.position);
        const d2 = position.distanceTo(this.negativeCharge.position);
        return d1 > 0.01 && d2 > 0.01;
    }
}

export class CompositeField implements FieldSource {
    public type = 'composite';
    public sources: FieldSource[];

    constructor(sources: FieldSource[] = []) {
        this.sources = sources;
    }

    addSource(source: FieldSource): void {
        this.sources.push(source);
    }

    electricFieldAt(position: Vec3, time: number): Vec3 {
        const E = new Vec3();
        for (const source of this.sources) {
            E.addInPlace(source.electricFieldAt(position, time));
        }
        return E;
    }

    magneticFieldAt(position: Vec3, time: number): Vec3 {
        const B = new Vec3();
        for (const source of this.sources) {
            B.addInPlace(source.magneticFieldAt(position, time));
        }
        return B;
    }

    isInsideRegion(position: Vec3): boolean {
        return this.sources.some(s => s.isInsideRegion(position));
    }
}
