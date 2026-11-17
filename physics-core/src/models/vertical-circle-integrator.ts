import type { Vector2D } from '../types/common.js';

export type VerticalCircleType = 'rope' | 'rod' | 'ring';

export interface SimFrame {
    position: Vector2D;
    velocity: Vector2D;
    acceleration: Vector2D;
    theta: number;
    omega: number;
    inCircle: boolean;
    caught: boolean;
}

export interface VerticalCircleIntegrationResult {
    frames: SimFrame[];
    tTopCross: number | null;
    tHorizontalCross: number | null;
    tDet: number | null;
    thetaDet: number | null;
    posDet: Vector2D | null;
    tCatch: number | null;
    posCatch: Vector2D | null;
    tOscPeak: number | null;
    thetaMaxOsc: number | null;
}

/** 细步长 RK4 约束积分 + 脱轨抛体演化 (y 向上为正, θ=0 为最低点, 逆时针为正) */
export function integrateVerticalCircle(opts: {
    r: number;
    g: number;
    v0: number;
    modelType: VerticalCircleType;
    center: Vector2D;
    duration: number;
    sampleCount: number;
}): VerticalCircleIntegrationResult {
    const { r, g, v0, modelType, center, duration, sampleCount } = opts;
    const dtSample = duration / sampleCount;
    const substeps = Math.max(4, Math.ceil(dtSample / 0.001));
    const h = dtSample / substeps;
    const unilateral = modelType !== 'rod';
    const canDetach = unilateral && v0 * v0 > 2 * g * r + 1e-12 && v0 * v0 < 5 * g * r - 1e-12;

    const posOnCircle = (th: number): Vector2D => ({
        x: center.x + r * Math.sin(th),
        y: center.y - r * Math.cos(th)
    });
    const velOnCircle = (th: number, om: number): Vector2D => ({
        x: r * om * Math.cos(th),
        y: r * om * Math.sin(th)
    });
    const accOnCircle = (th: number, om: number): Vector2D => {
        const alpha = -(g / r) * Math.sin(th);
        return {
            x: r * alpha * Math.cos(th) - r * om * om * Math.sin(th),
            y: r * alpha * Math.sin(th) + r * om * om * Math.cos(th)
        };
    };
    const fRad = (th: number, om: number) => r * om * om + g * Math.cos(th);
    const rk4Step = (th: number, om: number, step: number): [number, number] => {
        const angAcc = (a: number) => -(g / r) * Math.sin(a);
        const k1t = om;
        const k1w = angAcc(th);
        const k2t = om + 0.5 * step * k1w;
        const k2w = angAcc(th + 0.5 * step * k1t);
        const k3t = om + 0.5 * step * k2w;
        const k3w = angAcc(th + 0.5 * step * k2t);
        const k4t = om + step * k3w;
        const k4w = angAcc(th + step * k3t);
        return [th + (step / 6) * (k1t + 2 * k2t + 2 * k3t + k4t), om + (step / 6) * (k1w + 2 * k2w + 2 * k3w + k4w)];
    };

    let theta = 0;
    let omega = v0 / r;
    let phase: 'circle' | 'projectile' | 'caught' = 'circle';
    let t = 0;
    let tDet: number | null = null;
    let thetaDet: number | null = null;
    let posDet: Vector2D | null = null;
    let velDet: Vector2D | null = null;
    let tCatch: number | null = null;
    let posCatch: Vector2D | null = null;
    let tTopCross: number | null = null;
    let tHorizontalCross: number | null = null;
    let tOscPeak: number | null = null;
    let thetaMaxOsc: number | null = null;

    const evalProjectile = (time: number): { pos: Vector2D; vel: Vector2D; dist: number } => {
        const dt = time - tDet!;
        const pos = {
            x: posDet!.x + velDet!.x * dt,
            y: posDet!.y + velDet!.y * dt - 0.5 * g * dt * dt
        };
        const vel = { x: velDet!.x, y: velDet!.y - g * dt };
        const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
        return { pos, vel, dist };
    };

    const catchProjectile = (loTime: number, hiTime: number): void => {
        let lo = loTime;
        let hi = hiTime;
        for (let k = 0; k < 20; k++) {
            const mid = 0.5 * (lo + hi);
            if (evalProjectile(mid).dist < r) lo = mid;
            else hi = mid;
        }
        tCatch = 0.5 * (lo + hi);
        const pCatch = evalProjectile(tCatch);
        const scale = r / Math.max(1e-12, pCatch.dist);
        posCatch = {
            x: center.x + (pCatch.pos.x - center.x) * scale,
            y: center.y + (pCatch.pos.y - center.y) * scale
        };
        phase = 'caught';
    };

    const makeFrame = (time: number): SimFrame => {
        if (phase === 'circle') {
            return {
                position: posOnCircle(theta),
                velocity: velOnCircle(theta, omega),
                acceleration: accOnCircle(theta, omega),
                theta,
                omega,
                inCircle: true,
                caught: false
            };
        }
        if (phase === 'projectile') {
            const p = evalProjectile(time);
            return {
                position: p.pos,
                velocity: p.vel,
                acceleration: { x: 0, y: -g },
                theta: thetaDet!,
                omega: 0,
                inCircle: false,
                caught: false
            };
        }
        return {
            position: { ...posCatch! },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            theta: thetaDet!,
            omega: 0,
            inCircle: false,
            caught: true
        };
    };

    const frames: SimFrame[] = [makeFrame(0)];
    for (let i = 1; i <= sampleCount; i++) {
        for (let s = 0; s < substeps; s++) {
            const tNext = t + h;
            if (phase === 'circle') {
                const prevTh = theta;
                const prevOm = omega;
                const [nextTh, nextOm] = rk4Step(theta, omega, h);
                if (tHorizontalCross === null && prevTh < Math.PI / 2 && nextTh >= Math.PI / 2) {
                    const frac = (Math.PI / 2 - prevTh) / Math.max(1e-12, nextTh - prevTh);
                    tHorizontalCross = t + frac * h;
                }
                if (tTopCross === null && prevTh < Math.PI && nextTh >= Math.PI) {
                    const frac = (Math.PI - prevTh) / Math.max(1e-12, nextTh - prevTh);
                    tTopCross = t + frac * h;
                }
                if (tOscPeak === null && prevOm > 1e-9 && nextOm <= 0) {
                    const frac = prevOm / Math.max(1e-12, prevOm - nextOm);
                    tOscPeak = t + frac * h;
                    thetaMaxOsc = prevTh + frac * (nextTh - prevTh);
                }
                if (canDetach && nextTh > Math.PI / 2 && fRad(nextTh, nextOm) <= 0) {
                    let lo = 0;
                    let hi = h;
                    for (let k = 0; k < 20; k++) {
                        const mid = 0.5 * (lo + hi);
                        const [mTh, mOm] = rk4Step(prevTh, prevOm, mid);
                        if (fRad(mTh, mOm) > 0) lo = mid;
                        else hi = mid;
                    }
                    const dtDet = 0.5 * (lo + hi);
                    const [dTh, dOm] = rk4Step(prevTh, prevOm, dtDet);
                    tDet = t + dtDet;
                    thetaDet = dTh;
                    posDet = posOnCircle(dTh);
                    velDet = velOnCircle(dTh, dOm);
                    phase = 'projectile';
                    const post = evalProjectile(tNext);
                    if (tNext - tDet > 1e-4 && post.dist >= r) {
                        catchProjectile(tDet + 1e-5, tNext);
                    }
                } else {
                    theta = nextTh;
                    omega = nextOm;
                }
            } else if (phase === 'projectile') {
                const post = evalProjectile(tNext);
                if (tNext - tDet! > 1e-4 && post.dist >= r) {
                    catchProjectile(t, tNext);
                }
            }
            t = tNext;
        }
        frames.push(makeFrame(t));
    }

    return {
        frames,
        tTopCross,
        tHorizontalCross,
        tDet,
        thetaDet,
        posDet,
        tCatch,
        posCatch,
        tOscPeak,
        thetaMaxOsc
    };
}
