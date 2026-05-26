export class Vec3 {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    copy(v: Vec3): Vec3 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    set(x: number, y: number, z: number): Vec3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    add(v: Vec3): Vec3 {
        return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    sub(v: Vec3): Vec3 {
        return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiplyScalar(s: number): Vec3 {
        return new Vec3(this.x * s, this.y * s, this.z * s);
    }

    divideScalar(s: number): Vec3 {
        if (s === 0) return new Vec3(0, 0, 0);
        return new Vec3(this.x / s, this.y / s, this.z / s);
    }

    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v: Vec3): Vec3 {
        return new Vec3(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    lengthSq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize(): Vec3 {
        const len = this.length();
        if (len === 0) return new Vec3(0, 0, 0);
        return this.divideScalar(len);
    }

    distanceTo(v: Vec3): number {
        return this.sub(v).length();
    }

    negate(): Vec3 {
        return new Vec3(-this.x, -this.y, -this.z);
    }

    addInPlace(v: Vec3): Vec3 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    multiplyScalarInPlace(s: number): Vec3 {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    static readonly ZERO: Readonly<Vec3> = Object.freeze(new Vec3(0, 0, 0));
    static readonly UNIT_X: Readonly<Vec3> = Object.freeze(new Vec3(1, 0, 0));
    static readonly UNIT_Y: Readonly<Vec3> = Object.freeze(new Vec3(0, 1, 0));
    static readonly UNIT_Z: Readonly<Vec3> = Object.freeze(new Vec3(0, 0, 1));
}
