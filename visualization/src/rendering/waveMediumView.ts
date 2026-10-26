/**
 * 机械波介质视图 — 从引擎结果采样「当前时刻的介质质点位置」
 *
 * 单一真源约定：质点的平衡位置来自引擎 `extra.waveMedium.trackedX`，
 * 当前位移来自引擎轨迹的时间插值。渲染层 (2D 板书 / 3D 舞台) 只做
 * 「米 → 世界单位」的几何映射，**不重算**相位 / 振幅 / 波长。
 *
 * 引擎的追踪采样间距 ≤ λ/8 (见 physics-core/src/models/mechanical-wave.ts),
 * 保证渲染层用追踪点连线还原出的波形接近光滑正弦而非尖刺三角波。
 *
 * 早期 3D 舞台用 `y = A·sin(ωt − kx)` 自算波形，且世界尺度与介质实长
 * 不一致 (介质 4 m 画成 0.64 世界单位)，画面与引擎物理彻底脱节。
 */
import type { SimulationResult, TrajectoryPoint } from 'physics-core';
import { interpolateFrame } from '../utils/frameUtils';
import { readWaveMediumFromResult } from './engineExtraAccess';

/** 横向比例尺：1 世界单位 = 1 米 (与介质实长一致) */
export const WAVE_WORLD_SCALE = 1;

/** 追踪质点当前状态 */
export interface WaveParticleSample {
    /** 平衡位置 x (m) */
    xEq: number;
    /** 当前 x 坐标 (m) —— 纵波模式随振动方向在 x 上摆动 */
    x: number;
    /** 当前竖直位移 (m, 向上为正; 纵波恒为 0) */
    yUp: number;
}

/** 介质视图 (几何事实 + 当前时刻质点采样) */
export interface WaveMediumView {
    xStart: number;
    xEnd: number;
    dx: number;
    particleCount: number;
    mode: 'transverse' | 'longitudinal' | 'interference';
    amplitude: number;
    frequency: number;
    wavelength: number;
    waveSpeed: number;
    /** 介质中心横坐标 (m) */
    xCenter: number;
    /** 当前时刻的追踪质点 (按平衡位置升序) */
    particles: WaveParticleSample[];
}

/** 在轨迹里按时间取插值帧 (二分查找 + 线性插值) */
function sampleAt(points: TrajectoryPoint[], time: number): TrajectoryPoint | null {
    if (points.length === 0) return null;
    if (points.length === 1) return points[0]!;
    // 时间钳到轨迹区间内: interpolateFrame 会外推, 越过轨迹末尾会算出不存在的位置
    const t0 = points[0]!.t;
    const t1 = points[points.length - 1]!.t;
    const t = Math.min(Math.max(time, t0), t1);
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (points[mid]!.t < t) lo = mid + 1;
        else hi = mid;
    }
    const p1 = points[lo]!;
    const p0 = points[Math.max(0, lo - 1)]!;
    return interpolateFrame(p0, p1, t);
}

/**
 * 读取当前时刻的介质视图。
 * 引擎结果缺失 / extra 结构不符 / 无追踪轨迹 → null (调用方回退静态示意)。
 */
export function readWaveMediumView(result: SimulationResult | null | undefined, time: number): WaveMediumView | null {
    const medium = readWaveMediumFromResult(result);
    if (!medium || !result) return null;
    const count = Math.min(medium.trackedCount, medium.trackedX.length);
    const particles: WaveParticleSample[] = [];
    for (let i = 0; i < count; i++) {
        const traj = result.trajectories[i];
        if (!traj || traj.length === 0) continue;
        const frame = sampleAt(traj, time);
        if (!frame) continue;
        const xEq = medium.trackedX[i]!;
        particles.push({
            xEq,
            x: frame.position.x,
            // 引擎横波的 position.y = -位移 (屏幕手性: 向下为正), 取负还原「向上为正」
            yUp: -frame.position.y
        });
    }
    if (particles.length === 0) return null;
    return {
        xStart: medium.xStart,
        xEnd: medium.xEnd,
        dx: medium.dx,
        particleCount: medium.particleCount,
        mode: medium.mode,
        amplitude: medium.amplitude,
        frequency: medium.frequency,
        wavelength: medium.wavelength,
        waveSpeed: medium.waveSpeed,
        xCenter: (medium.xStart + medium.xEnd) / 2,
        particles
    };
}

/**
 * 纵向放大倍数 —— 横向 1:1 (1 单位 = 1 米), 纵向为看清波形放大。
 *
 * 上限 4 倍, 且显示振幅不超过 1.2 世界单位 (大幅值时不冲出画面)。
 * 放大倍数必须显示在标牌上, 否则画面比例与真实物理不符 (即 #160 的原始病根)。
 */
export function waveVerticalGain(amplitude: number): number {
    const a = Number.isFinite(amplitude) && amplitude > 0 ? amplitude : 0.1;
    return Math.min(4, 1.2 / a);
}
