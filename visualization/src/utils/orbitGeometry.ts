/**
 * 卫星轨道视觉几何（2D 板书 / 3D 器材台共用）
 *
 * 轨道形状只由「轨道高度 + 速度/圆轨道速度」决定：
 *   比角动量 h = r₀·v，比能 ε = v²/2 − GM/r₀
 *   偏心率 e = |v²/v_c² − 1| = |vFactor² − 1|
 *   半长轴 a = r₀ / (2 − vFactor²)   （仅闭合轨道 ε < 0，即 vFactor < √2）
 * 闭合轨道用极坐标 r(θ) = a(1−e²)/(1 ± e·cosθ) 生成完整椭圆；
 * 初始点 (r₀, 0) 在 vFactor>1 时是近地点、vFactor<1 时是远地点。
 *
 * 渲染层只做「物理半径 → 屏幕/世界半径」的比例换算，不重算积分轨迹。
 */

const R_EARTH_KM = 6371;
export const GEO_ALTITUDE_KM = 36000;
const MIN_ALTITUDE_KM = 200;
const MAX_ALTITUDE_KM = 36000;

/** 高度对数映射到 [0,1]，让 400km(LEO) 与 36000km(GEO) 的视觉差异可辨 */
export function altitudeVisualFraction(altitudeKm: number): number {
    const h = Math.min(MAX_ALTITUDE_KM, Math.max(MIN_ALTITUDE_KM, altitudeKm));
    return Math.log10(1 + h / 400) / Math.log10(1 + MAX_ALTITUDE_KM / 400);
}

export interface OrbitShape {
    /** 初始轨道半径 (m) */
    readonly r0M: number;
    /** 速度 / 圆轨道速度 */
    readonly vf: number;
    readonly e: number;
    readonly closed: boolean;
    /** 轨道可达到的最大 / 最小半径 (m)；开放轨道只取模拟时段内的最大半径 */
    readonly rMaxM: number;
    readonly rMinM: number;
    /** 完整闭合轨道在角度 θ 处的半径比 r(θ)/r₀；开放轨道恒为 1 */
    radiusRatio(theta: number): number;
}

/**
 * 由场景参数推导轨道形状。
 * 开放轨道（vFactor ≥ √2）只按初始半径取景，飞行器随后飞出视野 —— 这正是「逃逸」的教学语义。
 */
export function orbitShape(altitudeKm: number, velocityFactor: number): OrbitShape {
    const hKm = Math.min(MAX_ALTITUDE_KM, Math.max(MIN_ALTITUDE_KM, altitudeKm));
    const vf = Number.isFinite(velocityFactor) ? velocityFactor : 1;
    const r0M = (R_EARTH_KM + hKm) * 1000;
    const vf2 = vf * vf;
    const e = Math.abs(vf2 - 1);
    const closed = vf2 < 2 - 1e-9;
    const a = closed ? r0M / (2 - vf2) : Number.POSITIVE_INFINITY;

    let rMaxM: number;
    let rMinM: number;
    if (closed) {
        // vf<1: 初始点是远地点 (rMax=r0)；vf>1: 初始点是近地点 (rMin=r0)
        rMaxM = vf < 1 ? r0M : a * (1 + e);
        rMinM = vf < 1 ? a * (1 - e) : r0M;
    } else {
        rMaxM = r0M;
        rMinM = r0M;
    }

    const sign = vf >= 1 ? 1 : -1;
    const semiLatus = closed ? a * (1 - e * e) : 0;
    const radiusRatio = (theta: number): number => {
        if (!closed || e < 1e-9) return 1;
        const denominator = 1 + sign * e * Math.cos(theta);
        return denominator === 0 ? Number.POSITIVE_INFINITY : semiLatus / denominator / r0M;
    };

    return { r0M, vf, e, closed, rMaxM, rMinM, radiusRatio };
}
