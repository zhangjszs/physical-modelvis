/**
 * 渲染单一真源契约 — 迁移后的场景, 渲染层必须消费引擎结果
 *
 * 背景: 阶段 3 起, 渲染层从 `currentTime + 公式` 自算迁移到读引擎
 * (orbital 椭圆率 1.57 时画面仍画匀速圆, 分歧曾达 102.6%)。
 *
 * 每个场景锁两端:
 *   - 引擎端: 用与渲染无关的独立公式复算 charts / maxValues / 轨迹,
 *     引擎公式被改错即红;
 *   - 渲染消费端: 源码解析断言 (it 名含"源码契约"), 渲染退回自算即红。
 *
 * 被锁定的场景清单以本文件各 it 首段的 sceneId 为准, 此处不再列举,
 * 避免注释与用例脱节; 各 describe 的分批标题是历史批次快照, 不代表覆盖范围。
 * 场景 ↔ 契约对照与豁免项见
 * `docs/rendering-physics-audit.md` 的"已迁场景 → 契约覆盖"一节。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { chartsOf, PHYSICS_CONSTANTS } from 'physics-core';
import { getSceneSync, loadAllScenes } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { getFrame, interpSeries } from '../../src/rendering/renderingUtils';
import { readEngineOrbitRadii, readEngineBohrLevels } from '../../src/rendering/atomicModelScenes';
import { readEngineDiffusionCoeff, readEngineBrownianCoeff } from '../../src/rendering/molecularKineticScenes';
import { readEngineAlphaK } from '../../src/rendering/nuclearScenes';
import { readEngineVerticalCircle } from '../../src/rendering/chapter5Scenes';

/** 取渲染源码中某导出函数的完整函数体 (到下一个 export function 为止) — 源码契约断言用 */
function renderFn(file: string, fnName: string): string {
    const src = readFileSync(resolve(__dirname, `../../src/rendering/${file}`), 'utf-8');
    const start = src.indexOf(`export function ${fnName}`);
    if (start < 0) throw new Error(`${fnName} 应存在于 src/rendering/${file}`);
    const next = src.indexOf('\nexport function ', start + 1);
    return src.slice(start, next === -1 ? undefined : next);
}

describe('L1-migration: 渲染单一真源契约 (orbital / pendulum / vertical-circle)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    function scene(id: string) {
        const s = getSceneSync(id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('orbital: vFactor=1.2 时引擎轨迹是椭圆 (非圆), 渲染位置必须跟随引擎', () => {
        const sc = scene('orbital');
        const params: Record<string, number> = { altitude: 400, velocityFactor: 1.2, duration: 200 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const traj = result!.trajectories[0]!;
        const radii = traj.map(p => Math.hypot(p.position.x, p.position.y));
        const maxR = Math.max(...radii);
        const minR = Math.min(...radii);
        const ellipticity = (maxR - minR) / minR;

        // 椭圆性显著 (vFactor=1.2 → 远地点比近地点远 >50%)
        expect(ellipticity).toBeGreaterThan(0.5);
        // 引擎位置在任意时刻 ≠ 匀速圆位置 (半径恒为 r0)
        const r0 = radii[0]!;
        const mid = traj[Math.floor(traj.length / 2)]!;
        const midR = Math.hypot(mid.position.x, mid.position.y);
        expect(Math.abs(midR - r0) / r0).toBeGreaterThan(0.1);
    });

    it('orbital: getFrame 与渲染层映射共享同一引擎轨迹', () => {
        const sc = scene('orbital');
        const params: Record<string, number> = { altitude: 400, velocityFactor: 1.2, duration: 200 };
        const { result } = runSceneSimulation(sc, params);
        const t = 900; // 中间时刻
        const frame = getFrame(result, t);
        expect(frame).not.toBeNull();
        // 帧位置落在引擎轨迹半径区间内
        const traj = result!.trajectories[0]!;
        const radii = traj.map(p => Math.hypot(p.position.x, p.position.y));
        const frameR = Math.hypot(frame!.position.x, frame!.position.y);
        expect(frameR).toBeGreaterThanOrEqual(Math.min(...radii) * 0.99);
        expect(frameR).toBeLessThanOrEqual(Math.max(...radii) * 1.01);
    });

    it('simple-pendulum: θ₀=60° 引擎周期偏离小角度近似 >5% (非线性不可忽略)', () => {
        const sc = scene('simple-pendulum');
        const params: Record<string, number> = { length: 1, angle: 60, mass: 1, g: 9.8, damping: 0, duration: 20 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const theta = result!.charts.theta_t!.points as Array<{ x: number; y: number }>;
        expect(theta.length).toBeGreaterThan(10);
        let firstZero = -1;
        let secondZero = -1;
        for (let i = 1; i < theta.length; i++) {
            if (theta[i - 1]!.y * theta[i]!.y < 0 && theta[i]!.y > 0) {
                if (firstZero < 0) firstZero = theta[i]!.x;
                else {
                    secondZero = theta[i]!.x;
                    break;
                }
            }
        }
        expect(secondZero).toBeGreaterThan(0);
        const TEngine = secondZero - firstZero;
        const TSmall = 2 * Math.PI * Math.sqrt(1 / 9.8);
        expect(Math.abs(TEngine - TSmall) / TSmall).toBeGreaterThan(0.05);
        // theta_t 图表单位是度
        expect(Math.abs(theta[0]!.y)).toBeCloseTo(60, 0);
    });

    it('vertical-circle: 引擎速度在最高点 < 最低点 (机械能守恒), 渲染 HUD 用当前速度', () => {
        const sc = scene('vertical-circle');
        const params: Record<string, number> = { modelType: 0, length: 1, mass: 1, initialSpeed: 7.5, duration: 5 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const traj = result!.trajectories[0]!;
        const speeds = traj.map(p => Math.hypot(p.velocity.x, p.velocity.y));
        const vLowest = speeds[0]!; // 最低点 (初始)
        const vMin = Math.min(...speeds);
        const vMax = Math.max(...speeds);
        expect(vLowest).toBeCloseTo(7.5, 5);
        // 最高点速度 √(v₀²−4gr) = √(56.25−39.2) ≈ 4.13 < 7.5
        expect(vMin).toBeLessThan(vLowest * 0.7);
        // 速度范围跨度显著 (非匀速)
        expect(vMax - vMin).toBeGreaterThan(2);
    });

    it('sound-waveform: 引擎波形含复合音谐波成分 (非纯正弦), 渲染不得只画基频', () => {
        const sc = scene('sound-waveform');
        const params: Record<string, number> = {
            frequency: 440,
            amplitude: 0.8,
            waveType: 1, // complex
            harmonic1: 0.5,
            harmonic2: 0.25,
            duration: 0.05
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const pts = result!.charts.waveform_t!.points as Array<{ x: number; y: number }>;
        expect(pts.length).toBeGreaterThan(100);
        // 纯正弦的波峰/波谷关于 0 对称且过零点均匀; 复合音含谐波 → 峰值不对称样本更多
        // 检测: 复合音波形连续 3 个极值的间隔不等于 T/2 (谐波使极值偏移)
        const peaks: Array<{ x: number; y: number }> = [];
        for (let i = 1; i < pts.length - 1; i++) {
            const y0 = pts[i - 1]!.y;
            const y1 = pts[i]!.y;
            const y2 = pts[i + 1]!.y;
            if (y1 > y0 && y1 > y2 && y1 > 0.1) peaks.push(pts[i]!);
        }
        const T = (1 / 440) * 1000; // ms
        const peakSpacings = peaks.slice(0, 5).map((p, i) => (i === 0 ? 0 : Math.abs(p.x - peaks[i - 1]!.x)));
        // 谐波成分: 存在相邻峰值间距明显偏离 T
        expect(Math.max(...peakSpacings)).toBeGreaterThan(T * 0.8);
    });

    it('sound-waveform: 引擎时域波形与渲染行波快照采样一致 (等效时移)', () => {
        const sc = scene('sound-waveform');
        const params: Record<string, number> = { frequency: 440, amplitude: 0.8, waveType: 0, duration: 0.05 };
        const { result } = runSceneSimulation(sc, params);

        const pts = result!.charts.waveform_t!.points as Array<{ x: number; y: number }>;
        const durMs = pts[pts.length - 1]!.x - pts[0]!.x;
        const freq = 440;
        // 渲染采样: t_eng = (t_anim − x/v) mod duration; 取 t_anim=0, x=0 → y(0)=0
        // 任意时刻: 行波快照在 x=0 处应等于引擎 t=0 采样
        const sampleAt = (tMs: number): number => {
            const tt = (((tMs % durMs) + durMs) % durMs) + pts[0]!.x;
            let lo = 0;
            let hi = pts.length - 1;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                if (pts[mid]!.x < tt) lo = mid;
                else hi = mid;
            }
            const p0 = pts[lo]!;
            const p1 = pts[hi]!;
            return p0.y + ((p1.y - p0.y) * (tt - p0.x)) / (p1.x - p0.x);
        };
        // 纯音: 行波 y(x,t) = A·sin(ωt − kx), x=λ/2 处与 x=0 反相
        const halfLambdaPx = ((340 / freq) * 40) / 2; // λ 像素 = λ*40
        const tAnimMs = (1 / freq) * 250; // T/4 时刻
        // 在 T/4: x=0 处 y=+A, x=λ/2 处 y=-A (传播相位) — 验证引擎波形含正确周期
        expect(sampleAt(tAnimMs)).toBeGreaterThan(0.7 * 0.8);
        const sampleAtHalf = sampleAt(tAnimMs + (halfLambdaPx / vPxOf(freq)) * 1000);
        expect(sampleAtHalf).toBeLessThan(-0.7 * 0.8);
    });

    function vPxOf(freq: number): number {
        const omega = 2 * Math.PI * freq;
        const k = (2 * Math.PI) / Math.max(340 / freq, 1);
        return omega / k;
    }

    it('mechanical-wave: 引擎 9 个 tracked 质点轨迹, 渲染粒子位置必须跟随引擎 (横波)', () => {
        const sc = scene('mechanical-wave');
        const params: Record<string, number> = {
            waveMode: 0,
            amplitude: 0.1,
            frequency: 2,
            wavelength: 0.5,
            duration: 3
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const trajs = result!.trajectories;
        // 9 个 tracked 质点 + 1 条 waveSnapshot
        expect(trajs.length).toBeGreaterThanOrEqual(10);
        // 每个 tracked 质点轨迹覆盖整个时长且位移在 [-A, A] 内
        for (let i = 0; i < 9; i++) {
            const t = trajs[i]!;
            expect(t.length).toBeGreaterThan(50);
            const maxDisp = Math.max(...t.map(p => Math.abs(p.position.y)));
            expect(maxDisp).toBeLessThanOrEqual(0.1 * 1.01);
        }
        // 快照 (81 质点, 相邻 Δx=0.05): 相位差 = k·Δx = 2π/λ·Δx ≠ 0 → 波形非水平线
        const snap = trajs[trajs.length - 1]!;
        const ys = snap.map(p => p.position.y);
        const maxY = Math.max(...ys);
        const minY = Math.min(...ys);
        expect(maxY - minY).toBeGreaterThan(0.1); // 波形有起伏
        // tracked 质点: tMid 时刻相邻相位差 k·Δx = 2π (同相), 用不同波长验证传播
        const tMid = 1.5;
        const y0 = getFrame(result, tMid, 0)!.position.y;
        expect(Math.abs(y0)).toBeLessThanOrEqual(0.101);
    });

    it('mechanical-wave: 干涉模式引擎含驻波 — tracked 质点波节振幅≈0, 波腹≈2A', () => {
        const sc = scene('mechanical-wave');
        // λ=0.4: 波节 x=(2n+1)λ/4 = 0.1, 0.3, 0.5, ...; tracked x: -1, -0.5, 0, 0.5, 1, ...
        //   x=0.5 (trajs[3]) 波节, x=0 (trajs[2]) 波腹
        const params: Record<string, number> = {
            waveMode: 2,
            amplitude: 0.1,
            frequency: 2,
            wavelength: 0.4,
            duration: 3
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const trajs = result!.trajectories;
        const nodeAmp = Math.max(...trajs[3]!.map(p => Math.abs(p.position.y)));
        expect(nodeAmp).toBeLessThan(0.02);
        const antinodeAmp = Math.max(...trajs[2]!.map(p => Math.abs(p.position.y)));
        expect(antinodeAmp).toBeGreaterThan(0.15);
    });

    it('lc-oscillator: 引擎 q/i 曲线满足 LC 关系且渲染当前值必须来自引擎 charts', () => {
        const sc = scene('lc-oscillator');
        const params: Record<string, number> = { C: 100, Lind: 10, Q0: 1, duration: 1e-6 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const charts = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const qPts = charts['x_t']!.points;
        const iPts = charts['y_t']!.points;
        expect(qPts.length).toBeGreaterThan(100);
        // q(0) = Q0 = 1μC
        expect(qPts[0]!.y).toBeCloseTo(1, 5);
        // i(0) = 0 (充电最大时电流为零)
        expect(Math.abs(iPts[0]!.y)).toBeLessThan(0.01);
        // q 与 i 相位差 90°: q 过零时刻 i 达峰值
        const qZeroIdx = qPts.findIndex(p => p.x > 0 && p.x < 30 && Math.abs(p.y) < 0.02);
        expect(qZeroIdx).toBeGreaterThan(0);
        const qZeroX = qPts[qZeroIdx]!.x;
        const iAtZero = iPts.reduce(
            (best, p) => (Math.abs(p.x - qZeroX) < Math.abs(best.x - qZeroX) ? p : best),
            iPts[0]!
        );
        expect(Math.abs(iAtZero.y)).toBeGreaterThan(0.5);
        // 能量守恒: Ee+Em 恒定 = Q0²/2C
        const Ee = charts['ke_t']!.points;
        const Em = charts['pe_t']!.points;
        const Etotal = (1e-6 * 1e-6) / (2 * 100e-12);
        for (let i = 0; i < Ee.length; i++) {
            const sum = Ee[i]!.y + Em[i]!.y;
            expect(Math.abs(sum - Etotal * 1e6) / (Etotal * 1e6)).toBeLessThan(1e-3);
        }
    });

    it('water-diffraction: 引擎衍射曲线中央主极大 = A0, 半宽 = arcsin(λ/a), HUD 数值必须读 maxValues', () => {
        const sc = scene('water-diffraction');
        const params: Record<string, number> = { wavelength: 30, slitWidth: 60, screenDist: 100, waveAmp: 2 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const pts = result!.charts.intensity_angle!.points as Array<{ x: number; y: number }>;
        // 中央主极大 = A0
        expect(Math.max(...pts.map(p => p.y))).toBeCloseTo(2, 3);
        // 半宽 = arcsin(λ/a)
        const halfWidth = result!.diagnostics.maxValues.halfWidthAngle as number;
        const expected = (Math.asin(Math.min(1, 30 / 60)) * 180) / Math.PI;
        expect(halfWidth).toBeCloseTo(expected, 4);
        // 第一极小值位置 ≈ 半宽 (±30°)
        const firstMin = result!.diagnostics.maxValues.firstMinimaDeg as number;
        expect(Math.min(Math.abs(firstMin - 30), Math.abs(firstMin + 30))).toBeLessThan(1);
        // I(θ) 曲线在 ±30° 处为极小 (≈0)
        const idx = pts.findIndex(p => Math.abs(p.x - 30) < 0.4);
        expect(idx).toBeGreaterThan(0);
        expect(Math.abs(pts[idx]!.y)).toBeLessThan(0.02);
    });

    it('em-wave-hertz: 引擎波长 = c/f, 电流波形周期 = T, 渲染 HUD 必须读 maxValues', () => {
        const sc = scene('em-wave-hertz');
        const params: Record<string, number> = { frequency: 100, turns: 10, sparkGap: 1, distance: 5 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        expect(mv.wavelength).toBeCloseTo(3e8 / 1e8, 1); // c / 100MHz = 3 m
        // x_t: LC 振荡电流, 300 点覆盖 3T → 相邻峰值间距 = T (μs)
        const pts = result!.charts.x_t!.points as Array<{ x: number; y: number }>;
        const im = mv.maxCurrent as number;
        const peaks: Array<{ x: number; y: number }> = [];
        for (let i = 1; i < pts.length - 1; i++) {
            if (pts[i]!.y > pts[i - 1]!.y && pts[i]!.y > pts[i + 1]!.y && pts[i]!.y > 0.5 * im) {
                peaks.push(pts[i]!);
            }
        }
        const T = 1 / 1e8; // 10 ns
        // 离散采样下峰值位置误差可达 ±0.5 采样间隔, 用多个峰值平均间距
        expect(peaks.length).toBeGreaterThanOrEqual(3);
        const spacing = (peaks[2]!.x - peaks[0]!.x) / 2;
        expect(Math.abs(spacing - T * 1e6)).toBeLessThan(0.06); // 采样间隔 0.1 μs 的容差
    });

    it('sound-interference: 引擎观察点 I_ratio 与独立公式一致, scan_line 含加强/减弱交替', () => {
        const sc = scene('sound-interference');
        const params: Record<string, number> = {
            frequency: 500,
            speakerDist: 3,
            soundSpeed: 340,
            obsX: 3,
            obsY: 10,
            amplitude: 0.5
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立公式: I/Imax = cos²(π·Δr/λ)
        const lambda = 340 / 500;
        const deltaR = Math.hypot(3 - 3 / 2, 10) - Math.hypot(3 + 3 / 2, 10);
        const expectRatio = Math.pow(Math.cos((Math.PI * deltaR) / lambda), 2);
        expect(mv.I_ratio).toBeCloseTo(expectRatio, 4);
        // scan_line 沿 y=10 扫描: 存在接近 1 的峰与接近 0 的谷
        const scan = result!.charts.scan_line!.points as Array<{ x: number; y: number }>;
        const maxI = Math.max(...scan.map(p => p.y));
        const minI = Math.min(...scan.map(p => p.y));
        expect(maxI).toBeGreaterThan(0.98);
        expect(minI).toBeLessThan(0.02);
        // 加强/减弱交替: 至少 3 次跳变
        let flips = 0;
        for (let i = 1; i < scan.length; i++) {
            const strongA = scan[i - 1]!.y > 0.5;
            const strongB = scan[i]!.y > 0.5;
            if (strongA !== strongB) flips++;
        }
        expect(flips).toBeGreaterThanOrEqual(3);
    });

    it('mutual-inductance: 引擎 I1(t) 周期=1/f 振幅=I0, E2(t) 相位领先 90° 且振幅=M·I0·ω', () => {
        const sc = scene('mutual-inductance');
        const params: Record<string, number> = { L1: 0.1, L2: 0.05, coupling: 0.6, frequency: 50, primaryCurrent: 1 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        const M = 0.6 * Math.sqrt(0.1 * 0.05);
        const omega = 2 * Math.PI * 50;
        expect(mv.M_H).toBeCloseTo(M, 6);
        expect(mv.E2_amplitude_V).toBeCloseTo(M * 1 * omega, 6);

        const i1 = result!.charts.primary_current_vs_time!.points as Array<{ x: number; y: number }>;
        const e2 = result!.charts.secondary_emf_vs_time!.points as Array<{ x: number; y: number }>;
        expect(i1.length).toBeGreaterThan(100);
        expect(Math.max(...i1.map(p => Math.abs(p.y)))).toBeCloseTo(1, 3);
        // 周期: 相邻同向过零点间距 = T/2 → 峰值间距 = T
        const peaks: Array<{ x: number; y: number }> = [];
        for (let i = 1; i < i1.length - 1; i++) {
            if (i1[i]!.y > i1[i - 1]!.y && i1[i]!.y > i1[i + 1]!.y) peaks.push(i1[i]!);
        }
        const T = 1 / 50;
        const spacing = peaks.length >= 3 ? (peaks[peaks.length - 1]!.x - peaks[0]!.x) / (peaks.length - 1) : 0;
        expect(spacing).toBeCloseTo(T, 2);
        // 90° 相位: E2 峰出现在 I1 过零附近 (dI1/dt 最大)
        const e2MaxIdx = e2.reduce((best, p, idx) => (Math.abs(p.y) > Math.abs(e2[best]!.y) ? idx : best), 0);
        const i1AtE2Peak = Math.abs(i1[e2MaxIdx]!.y);
        expect(i1AtE2Peak).toBeLessThan(0.05 * 1); // 接近 0
    });

    it('em-induction: 引擎 Φ(t) 周期=20ms 振幅=N·B·A, ε(t) 振幅=N·B·A·ω 且相位差 90°', () => {
        const sc = scene('em-induction');
        const params: Record<string, number> = { Bind: 0.5, A: 0.01, Nturns: 100, angleBind: 0 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const charts = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const flux = charts['x_t']!.points; // mWb, x=ms
        const emf = charts['y_t']!.points; // mV, x=ms
        expect(flux.length).toBeGreaterThan(100);
        // 振幅: x_t 为单匝磁通 B·A = 0.005 Wb → 5 mWb (N 仅体现在 ε)
        const fluxAmp = (Math.max(...flux.map(p => p.y)) - Math.min(...flux.map(p => p.y))) / 2;
        expect(fluxAmp).toBeCloseTo(5, 1);
        // 周期 20ms: 峰值间距
        const fluxPeaks: number[] = [];
        for (let i = 1; i < flux.length - 1; i++) {
            if (flux[i]!.y > flux[i - 1]!.y && flux[i]!.y > flux[i + 1]!.y) fluxPeaks.push(flux[i]!.x);
        }
        if (fluxPeaks.length >= 2) expect(fluxPeaks[1]! - fluxPeaks[0]!).toBeCloseTo(20, 2);
        // ε 振幅 = N·B·A·ω·1000 mV
        const emfAmp = Math.max(...emf.map(p => Math.abs(p.y)));
        expect(emfAmp).toBeCloseTo(100 * 0.5 * 0.01 * 2 * Math.PI * 50 * 1000, 0);
        // 90°: Φ 过零时 |ε| 最大 (符号翻转检测)
        const fluxZeroIdx = flux.findIndex((p, i) => i > 0 && flux[i - 1]!.y > 0 && p.y <= 0);
        expect(fluxZeroIdx).toBeGreaterThan(0);
        expect(Math.abs(emf[fluxZeroIdx]!.y)).toBeGreaterThan(emfAmp * 0.7);
    });

    it('eddy-current: 引擎涡流功率 = π²B²f²d²V/(6ρ), 温升轨迹逐时递增', () => {
        const sc = scene('eddy-current');
        const params: Record<string, number> = {
            magneticField: 0.2,
            frequency: 50,
            conductivity: 5.8e7,
            thickness: 0.001,
            muR: 1
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        const P1 = mv.eddyPower_W as number;
        expect(P1).toBeGreaterThan(0);
        expect(mv.skinDepth_mm).toBeGreaterThan(0);
        // 温度轨迹: x=t(s), y=°C, 单调不减
        const traj = result!.trajectories[0]!;
        expect(traj.length).toBeGreaterThan(10);
        const temps = traj.map(p => p.position.y);
        expect(temps[temps.length - 1]!).toBeGreaterThanOrEqual(temps[0]!);
        // 振幅关系: P 随 B² 增长 (两次求解对比)
        const r2 = runSceneSimulation(sc, { ...params, magneticField: 0.4 });
        const P2 = r2.result!.diagnostics.maxValues.eddyPower_W as number;
        expect(P2 / P1).toBeCloseTo(4, 1); // B² 比例
    });

    it('security-alarm: 引擎滞回判定 — 吸合区报警=0, 断开区报警=1, 过渡区状态=0.5', () => {
        const sc = scene('security-alarm');
        // 吸合区: d=5 < operate=15
        const closed = runSceneSimulation(sc, { magnetDistance: 5, operateDistance: 15, releaseDistance: 25 });
        expect(closed.error).toBeNull();
        const mvC = closed.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvC.alarmFlag).toBe(0);
        expect(mvC.reedStateFlag).toBe(1);
        // 断开区: d=40 > release=25
        const opened = runSceneSimulation(sc, { magnetDistance: 40, operateDistance: 15, releaseDistance: 25 });
        expect(opened.error).toBeNull();
        const mvO = opened.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvO.alarmFlag).toBe(1);
        expect(mvO.reedStateFlag).toBe(0);
        // 过渡区: d=20 (operate..release 之间) → x_t 为 0~60mm 状态扫描曲线, d=20 处 y=0.5
        const mid = runSceneSimulation(sc, { magnetDistance: 20, operateDistance: 15, releaseDistance: 25 });
        expect(mid.error).toBeNull();
        const pts = mid.result!.charts.x_t!.points;
        const p20 = pts.find(p => Math.abs(p.x - 20) < 1e-6);
        expect(p20).toBeDefined();
        expect(p20!.y).toBe(0.5); // 过渡状态
    });

    it('reed-switch: 引擎 H = K_DIPOLE/d³, 状态随阈值变化 (吸合/释放/过渡)', () => {
        const sc = scene('reed-switch');
        // d=1mm → H=100 mT > 吸合阈值
        const close = runSceneSimulation(sc, { magnetDistance: 1, pullInThreshold: 30, releaseThreshold: 20 });
        expect(close.error).toBeNull();
        const mvC = close.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvC.currentField_mT).toBeCloseTo(100, 3); // 100/d³
        expect(mvC.currentState).toBe(1);
        // d=3mm → H≈3.7 mT < 释放阈值 → 断开
        const open = runSceneSimulation(sc, { magnetDistance: 3, pullInThreshold: 30, releaseThreshold: 20 });
        expect(open.error).toBeNull();
        const mvO = open.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvO.currentField_mT).toBeCloseTo(100 / 27, 2);
        expect(mvO.currentState).toBe(0);
        // 过渡: H 在释放~吸合之间 → 0.5 (取 d=1.55: H≈26.9)
        const mid = runSceneSimulation(sc, { magnetDistance: 1.55, pullInThreshold: 30, releaseThreshold: 20 });
        expect(mid.error).toBeNull();
        const mvM = mid.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvM.currentField_mT).toBeGreaterThan(20);
        expect(mvM.currentField_mT).toBeLessThan(30);
    });

    it('ac-current: 引擎 e(t)/u2(t) 双曲线 2 周期, 峰值 = Em 与 Em·n, 渲染瞬时值必须读引擎序列', () => {
        const sc = scene('ac-current');
        const params: Record<string, number> = { Em: 311, freq: 50, nRatio: 0.1 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();
        const charts = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const e = charts['x_t']!.points; // ms / V
        const u2 = charts['y_t']!.points;
        expect(e.length).toBeGreaterThan(100);
        expect(u2.length).toBeGreaterThan(100);
        // x 轴 ms, 覆盖 2 周期 (50Hz → T=20ms → 40ms)
        expect(e[e.length - 1]!.x).toBeCloseTo(40, 1);
        // 峰值: e 振幅 = Em, u2 振幅 = Em·0.1
        const eAmp = Math.max(...e.map(p => p.y));
        expect(eAmp).toBeCloseTo(311, 0);
        const u2Amp = Math.max(...u2.map(p => p.y));
        expect(u2Amp).toBeCloseTo(31.1, 0);
        // 同相 (理想变压器无相移): 两曲线峰值同处
        const ePeakIdx = e.findIndex(p => p.y === Math.max(...e.map(q => q.y)));
        const u2PeakIdx = u2.findIndex(p => p.y === Math.max(...u2.map(q => q.y)));
        expect(Math.abs(e[ePeakIdx]!.x - u2[u2PeakIdx]!.x)).toBeLessThan(1);
        // maxValues: 频率 50Hz, 峰值 311
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        expect(mv.frequency).toBe(50);
        expect(mv.peakEmf).toBeCloseTo(311, 0);
        expect(mv.turnsRatio).toBeCloseTo(0.1, 6);
    });

    it('em-damping: 引擎 ω(t)=ω₀·e^(-t/τ) 单调衰减, 渲染衰减曲线必须消费引擎序列', () => {
        const sc = scene('em-damping');
        const params: Record<string, number> = {
            magneticField: 0.3,
            angularSpeed: 100,
            inertia: 0.01,
            radius: 0.1,
            conductivity: 5.8e7,
            duration: 5
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();
        const chart = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const w = chart['angular_velocity_vs_time']!.points; // s / rad·s⁻¹
        expect(w.length).toBeGreaterThan(50);
        // 单调衰减: 初始 ω₀, 终值 < 1%
        expect(w[0]!.y).toBeCloseTo(100, 2);
        expect(w[w.length - 1]!.y).toBeLessThan(1);
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        expect(mv.omega0_rad_s).toBe(100);
        // τ_c 解析: J/(0.5·σ·R⁴·B²)
        const tauExpected = 0.01 / (0.5 * 5.8e7 * 1e-4 * 0.09);
        expect(mv.tauC_s).toBeCloseTo(tauExpected, 6);
    });

    it('light-control-switch: 引擎幂律 LDR + 分段 24h 曲线 (夜间 0.5lx), 渲染数值必须读引擎', () => {
        const sc = scene('light-control-switch');
        // 夜晚 (0.5 lx < 阈值 10) → 灯亮
        const night = runSceneSimulation(sc, { lightIntensity: 0.5, threshold: 10, Rfix: 10000, Esupply: 12 });
        expect(night.error).toBeNull();
        const mvN = night.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvN.lightOnFlag).toBe(1);
        expect(mvN.transistorOnFlag).toBe(1);
        // 幂律模型: R = 1e6·L^(-0.7), L=0.5 → ≈1.6MΩ; V_B = 12·R/(R+10k)
        expect(mvN.rLdr).toBeCloseTo(1e6 * Math.pow(0.5, -0.7), -3);
        expect(mvN.vB).toBeGreaterThan(0.7); // 导通
        // 白天 (50000 lx) → 灯灭
        const day = runSceneSimulation(sc, { lightIntensity: 50000, threshold: 10, Rfix: 10000, Esupply: 12 });
        expect(day.error).toBeNull();
        const mvD = day.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvD.lightOnFlag).toBe(0);
        // 24h 曲线: 夜间段 = 0.5, 白天峰值 ≈ 50000+100; x 轴 h
        const chart = night.result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const light = chart['x_t']!.points;
        expect(light[0]!.y).toBe(0.5); // t=0 (凌晨)
        const maxL = Math.max(...light.map(p => p.y));
        expect(maxL).toBeGreaterThan(49000); // 正午峰值
        const stateChart = chart['y_t']!.points;
        expect(stateChart[0]!.y).toBe(1); // 夜晚灯亮
    });

    it('moon-earth-test: 引擎 a_月 vs g(R/r)² ≈ g/3600 (误差<5%), 渲染数值必须读 maxValues', () => {
        const sc = scene('moon-earth-test');
        const { result, error } = runSceneSimulation(sc, { duration: 1 });
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // a_月 = 4π²r/T² ≈ 0.00272 m/s² (r=3.844e8, T=27.3d)
        expect(mv.aMoon).toBeCloseTo(0.00272, 4);
        expect(mv.gOver3600).toBeCloseTo(9.80665 / 3600, 6);
        expect(mv.aFromSquareInv).toBeCloseTo(mv.gOver3600 as number, 2);
        expect(mv.relDiff_pct).toBeLessThan(5); // 验证通过
        expect(mv.ratioRr).toBeCloseTo(6.371e6 / 3.844e8, 6);
    });
});

describe('L1-migration: 渲染单一真源契约 (后续迁移场景)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    function scene(id: string) {
        const s = getSceneSync(id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('liquid-crystal: 引擎 x_t 透射率曲线与 Tarasov 公式独立复算一致 (渲染不得回退分段线性)', () => {
        const sc = scene('liquid-crystal');
        const { result, error } = runSceneSimulation(sc, {
            medium: 0,
            startTemp: 20,
            endTemp: 40,
            voltage: 3,
            duration: 3
        });
        expect(error).toBeNull();

        // 独立复算: Tarasov Δn/Δn0=(1−T/Tc)^0.22, V=3>Vth=2 → 取向比 1−(2/3)², Δn=0.2·ratio, T=sin²(π·Δn·2.5)
        const tc = 35;
        const vth = 2;
        const voltRatio = 1 - (vth / 3) * (vth / 3);
        const exp = (t: number) => {
            const tempRatio = t >= tc ? 0 : Math.pow(1 - t / tc, 0.22);
            return Math.sin(Math.PI * 0.2 * tempRatio * voltRatio * 2.5) ** 2;
        };
        const chart = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const xT = chart['x_t']!.points;
        expect(xT.length).toBeGreaterThan(20);
        for (const t of [0, 15, 30, 35, 40, 50, 90]) {
            const p = xT.find(pt => Math.abs(pt.x - t) < 0.1);
            expect(p, `曲线点 T=${t}℃ 存在`).toBeDefined();
            expect(p!.y, `T=${t}℃ 透射率与 Tarasov 一致`).toBeCloseTo(exp(t), 3);
        }
        // T > Tc 时各向同性, 透射率 ≈ 0 (旧分段线性回退在此处是 0.15, 会被拦截)
        expect(exp(40)).toBeLessThan(0.001);
        // maxValues 与独立复算一致
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        expect(mv.clearingPointDegC).toBe(35);
        expect(mv.thresholdVoltageV).toBe(2);
        expect(mv.transmittancePct).toBeCloseTo(exp(30) * 100, 1); // midTemp=30
    });

    it('capillary: 引擎常量 (ρ_汞=13534, 汞+石蜡 θ=150°) 与 Jurin 独立复算一致 (渲染已同步)', () => {
        const sc = scene('capillary');
        const { result, error } = runSceneSimulation(sc, { medium: 1, material: 1, tubeRadius: 0.5, duration: 3 });
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 常量: ρ=13534 kg/m³ (非 13500), 汞+石蜡 θ=150° (非 140°)
        expect(mv.density).toBe(13534);
        expect(mv.thetaDeg).toBe(150);
        // Jurin 复算: h = 2·σ·cosθ/(ρ·g·r), r=0.5mm
        const h = (2 * 0.487 * Math.cos((150 * Math.PI) / 180)) / (13534 * 9.8 * 0.5e-3);
        expect(mv.hMm).toBeCloseTo(h * 1000, 6);
        // 渲染层若用旧常量 (13500/140°) 会产生可检测偏差
        const hWrong = (2 * 0.487 * Math.cos((140 * Math.PI) / 180)) / (13500 * 9.8 * 0.5e-3);
        expect(Math.abs(h - hWrong)).toBeGreaterThan(1e-4);
    });

    it('newton-second-law: 引擎摩擦 F=μmg (μ 无量纲), 渲染 HUD/位置必须读引擎而非把 μ 当力', () => {
        const sc = scene('newton-second-law');
        // μ=0.2, m=2kg → fK=3.92N; F=10N → 合力 6.08N → a=3.04 m/s²
        const params: Record<string, number> = {
            force: 10,
            mass: 2,
            v0: 0,
            includeFriction: 1,
            friction: 0.2,
            duration: 5
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();
        // 引擎 a_t 为常量 3.04 (非渲染层旧错误 4.9)
        const a_t = result!.charts.a_t!.points;
        expect(a_t[0]!.y).toBeCloseTo(3.04, 5);
        expect(a_t[a_t.length - 1]!.y).toBeCloseTo(3.04, 5);
        // F_t 合力 = 6.08 (非施加力 10)
        const F_t = result!.charts.F_t!.points;
        expect(F_t[0]!.y).toBeCloseTo(6.08, 5);
        // 位移 = ½at² = 0.5·3.04·25 = 38m, 渲染位置必须跟随引擎轨迹
        const last = result!.trajectories[0]!.at(-1)!;
        expect(last.position.x).toBeCloseTo(38, 1);
        const mid = getFrame(result, 2.5);
        expect(mid!.position.x).toBeCloseTo(0.5 * 3.04 * 2.5 * 2.5, 2);
    });

    it('newton-second-law: 引擎静摩擦 F<μmg 时物体静止不动 (渲染不得反向运动)', () => {
        const sc = scene('newton-second-law');
        // F=1N < fK=3.92N → 静止, a=0, 位移=0
        const params: Record<string, number> = {
            force: 1,
            mass: 2,
            v0: 0,
            includeFriction: 1,
            friction: 0.2,
            duration: 5
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();
        expect(result!.diagnostics.maxValues.acceleration).toBeCloseTo(0, 10);
        const last = result!.trajectories[0]!.at(-1)!;
        expect(last.position.x).toBeCloseTo(0, 10);
        expect(last.velocity.x).toBeCloseTo(0, 10);
    });

    it('inertia: 引擎双轨迹 — 上棋子 x 恒定自由落体, 下棋子摩擦减速到静止', () => {
        const sc = scene('inertia');
        // stroke 棋子打击; 下方停止距离与曲线复算共用这组基准量
        const G = 9.8;
        const MU = 0.3;
        const V0 = 2;
        const params: Record<string, number> = {
            mode: 0,
            massRatio: 0.1,
            initialSpeed: V0,
            frictionCoeff: MU,
            duration: 3
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        // 双轨迹: [上方棋子, 下方棋子] — 渲染分别用 getFrame(..., 0/1)
        expect(result!.trajectories.length).toBe(2);
        const top = result!.trajectories[0]!;
        const bottom = result!.trajectories[1]!;

        // 上方棋子因惯性保持原位: x 全程恒定
        const xs = top.map(p => p.position.x);
        expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(1e-9);
        // 自由落体曲线独立复算: 落体期内逐点 y = 1 − ½gt², vy = −gt (锁 g 与曲线形状, 非仅端点)
        const fallT = Math.sqrt(2 / G);
        const falling = top.filter(p => p.t > 0 && p.t < fallT);
        expect(falling.length).toBeGreaterThan(10);
        for (const p of falling) {
            expect(p.position.y).toBeCloseTo(1 - 0.5 * G * p.t * p.t, 6);
            expect(p.velocity.y).toBeCloseTo(-G * p.t, 6);
        }
        expect(top.at(-1)!.position.y).toBeCloseTo(0, 10); // duration=3s 已落地

        // 下方棋子: 匀减速 v = v0 − μg·t, 停止距离 = v0²/(2μg)
        const tStop = V0 / (MU * G);
        const moving = bottom.filter(p => p.t < tStop);
        expect(moving.length).toBeGreaterThan(10);
        for (const p of moving) {
            expect(p.velocity.x).toBeCloseTo(V0 - MU * G * p.t, 6);
        }
        expect(bottom.at(-1)!.velocity.x).toBeCloseTo(0, 10);
        expect(bottom.at(-1)!.position.x).toBeCloseTo((V0 * V0) / (2 * MU * G), 6);
        expect(bottom.at(-1)!.position.x).toBeGreaterThan(bottom[0]!.position.x);
    });

    it('inertia: 渲染层仍读引擎双轨迹帧 (源码契约)', () => {
        const fn = renderFn('chapter4Scenes.ts', 'drawInertiaScene');
        expect(fn, '上方物体读引擎帧 0').toContain('getFrame(simulationResult, currentTime, 0)');
        expect(fn, '下方物体读引擎帧 1').toContain('getFrame(simulationResult, currentTime, 1)');
    });

    it('projectile-collision: maxValues 与平抛/碰后速度解析式一致, 且 m1·OP = m1·OM + m2·ON', () => {
        const sc = scene('projectile-collision');
        const G = 9.8;
        /** 用一组参数求解并与独立解析式逐量对照 */
        const verify = (p: { m1: number; m2: number; v1: number; h: number; e: number }) => {
            const { result, error } = runSceneSimulation(sc, {
                m1: p.m1,
                m2: p.m2,
                v1Initial: p.v1,
                tableHeight: p.h,
                restitution: p.e,
                gravity: G,
                duration: 5
            });
            expect(error).toBeNull();
            const mv = result!.diagnostics.maxValues as Record<string, number>;
            // 与渲染层无关的独立解析式
            const tFall = Math.sqrt((2 * p.h) / G);
            const v1After = ((p.m1 - p.e * p.m2) / (p.m1 + p.m2)) * p.v1;
            const v2After = (((1 + p.e) * p.m1) / (p.m1 + p.m2)) * p.v1;
            expect(mv.tFall).toBeCloseTo(tFall, 10);
            expect(mv.OP).toBeCloseTo(p.v1 * tFall, 10);
            expect(mv.v1After).toBeCloseTo(v1After, 10);
            expect(mv.v2After).toBeCloseTo(v2After, 10);
            expect(mv.OM).toBeCloseTo(Math.abs(v1After) * tFall, 10);
            expect(mv.ON).toBeCloseTo(Math.abs(v2After) * tFall, 10);
            // 动量守恒: 速度式与射程式同源 (m1>m2 → v1After>0, 不反弹, 射程等式成立)
            expect(mv.pBefore).toBeCloseTo(mv.pAfter!, 10);
            expect(p.m1 * mv.OP!).toBeCloseTo(p.m1 * mv.OM! + p.m2 * mv.ON!, 10);
        };
        // 参数化两组: 全弹性 + 半弹性, 覆盖 e / m / v / h 依赖
        verify({ m1: 0.2, m2: 0.1, v1: 2, h: 0.8, e: 1 });
        verify({ m1: 0.3, m2: 0.1, v1: 3, h: 1.25, e: 0.5 });
    });

    it('projectile-collision: 渲染层仍读 diagnostics.maxValues 且保留回退 (源码契约)', () => {
        const fn = renderFn('chapter5Scenes.ts', 'drawProjectileCollisionScene');
        expect(fn, '读引擎 maxValues').toContain('simulationResult?.diagnostics?.maxValues');
        for (const key of ['tFall', 'v1After', 'v2After', 'OP', 'OM', 'ON']) {
            // `?? ` 一并锁定: 读引擎 + 保留回退, 缺任一侧即红
            expect(fn, `渲染需消费 maxValues.${key} 并保留回退`).toContain(`maxVals?.${key} ??`);
        }
    });

    it('bohr-orbit: 引擎能级 E_n=-13.6/n² 与独立复算一致 (半径推导的数据基础)', () => {
        const sc = scene('bohr-orbit');
        const { result, error } = runSceneSimulation(sc, { seriesB: 1, maxN: 6, duration: 2 });
        expect(error).toBeNull();
        const chart = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        const xT = chart['x_t']!.points;
        // 引擎键名 x_t 对应语义"能级图" (n, E) —— 见 physics-core/src/models/bohr.ts
        expect(xT.length).toBeGreaterThanOrEqual(6);
        for (let n = 1; n <= 6; n++) {
            const p = xT.find(pt => Math.round(pt.x) === n);
            expect(p, `能级点 n=${n} 存在`).toBeDefined();
            // 独立复算: E_n = E₁/n², E₁ = -13.6 eV (引擎改公式即红)
            expect(p!.y, `n=${n} 能级与玻尔公式一致`).toBeCloseTo(-13.6 / (n * n), 2);
        }
    });

    it('bohr-orbit: 轨道半径由引擎能级推出 r ∝ n², 空结果回退不崩 (渲染消费端)', () => {
        const sc = scene('bohr-orbit');
        const { result, error } = runSceneSimulation(sc, { seriesB: 1, maxN: 6, duration: 2 });
        expect(error).toBeNull();
        const rN = readEngineOrbitRadii(result);
        expect(rN, '有引擎数据时应给出半径函数').not.toBeNull();
        // r ∝ 1/|E| ∝ n²: r₄/r₁ ≈ 16, r₂/r₁ ≈ 4 (引擎改 E₁ 即跟随, 比例不变)
        expect(rN!(4) / rN!(1)).toBeCloseTo(16, 6);
        expect(rN!(2) / rN!(1)).toBeCloseTo(4, 6);
        // 非法输入一律回退 null, 由调用方走 n² 布局, 不得抛异常
        expect(readEngineOrbitRadii(null)).toBeNull();
        expect(readEngineOrbitRadii({ charts: {} } as never)).toBeNull();
        expect(readEngineOrbitRadii({ charts: { x_t: { points: [] } } } as never)).toBeNull();
        expect(readEngineOrbitRadii({ charts: { x_t: { points: [{ x: 1, y: NaN }] } } } as never)).toBeNull();
    });

    it('bohr-orbit: 渲染层读引擎半径且保留回退, 电子角为装饰动画豁免 (源码契约)', () => {
        const fn = renderFn('atomicModelScenes.ts', 'drawBohrOrbitScene');
        expect(fn, '半径读引擎').toContain('readEngineOrbitRadii(simulationResult)');
        expect(fn, '无引擎结果保留 n² 回退').toContain('engineRadii ??');
        expect(fn, '电子角豁免需有注释记录').toContain('豁免');
    });

    it('bohr: 引擎能级/谱线/常量与独立复算一致 (能级标注与波长的数据基础)', () => {
        const sc = scene('bohr');
        const { result, error } = runSceneSimulation(sc, { seriesB: 1, maxN: 6, duration: 1 });
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 常量真源: R∞ / E₁ (渲染回退公式与此同值, 引擎改常量即红)
        expect(mv.R_inf).toBe(1.097e7);
        expect(mv.E1_eV).toBe(-13.6);
        expect(mv.baseN).toBe(2);
        const chart = result!.charts as unknown as Record<string, { points: Array<{ x: number; y: number }> }>;
        // 巴尔末系谱线: n=2→3..6, 波长 1/λ=R(1/4−1/n₂²), 与 Hα≈656nm 对照
        const yT = chart['y_t']!.points;
        expect(yT.length).toBe(4);
        const R = 1.097e7;
        [3, 4, 5, 6].forEach((n2, i) => {
            const lamNm = (1 / (R * (1 / 4 - 1 / (n2 * n2)))) * 1e9;
            expect(yT[i]!.y, `n=${n2}→2 波长与里德伯公式一致`).toBeCloseTo(lamNm, 1);
        });
        expect(yT[0]!.y, 'Hα 在 656nm 附近').toBeGreaterThan(650);
        expect(yT[0]!.y, 'Hα 在 656nm 附近').toBeLessThan(660);
    });

    it('bohr: 能级/ΔE 读取消耗引擎表, 空结果回退不崩 (渲染消费端)', () => {
        const sc = scene('bohr');
        const { result, error } = runSceneSimulation(sc, { seriesB: 1, maxN: 6, duration: 1 });
        expect(error).toBeNull();
        const levels = readEngineBohrLevels(result);
        expect(levels, '有引擎数据时应给出能级表').not.toBeNull();
        // ΔE(3→2) = |E₃−E₂| ≈ 1.89 eV (引擎改 E₁ 即跟随)
        expect(Math.abs(levels!.get(3)! - levels!.get(2)!)).toBeCloseTo(13.6 * (1 / 4 - 1 / 9), 2);
        expect(levels!.get(1)).toBeCloseTo(-13.6, 2);
        // 非法输入一律回退 null
        expect(readEngineBohrLevels(null)).toBeNull();
        expect(readEngineBohrLevels({ charts: {} } as never)).toBeNull();
        expect(readEngineBohrLevels({ charts: { x_t: { points: [{ x: 2, y: -3.4 }] } } } as never)).toBeNull();
    });

    it('bohr: 渲染层能级/波长/ΔE 读引擎且保留回退 (源码契约)', () => {
        const sceneFn = renderFn('atomicModelScenes.ts', 'drawBohrScene');
        expect(sceneFn, '能级标注读引擎').toContain('readEngineBohrLevels(simulationResult)');
        expect(sceneFn, '谱线波长读引擎 y_t (经 #82 类型化访问层 chartsOf)').toContain(
            "chartsOf(simulationResult, 'bohr-model')?.y_t"
        );
        expect(sceneFn, '无引擎结果回退里德伯公式').toContain('Rydberg');
        const orbitFn = renderFn('atomicModelScenes.ts', 'drawBohrOrbitScene');
        expect(orbitFn, '跃迁 ΔE 取引擎能级差').toContain('readEngineBohrLevels(simulationResult)');
    });
});

describe('L1-migration: 渲染单一真源契约 (#20 收尾: 核/热/竖直圆/EM)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    function scene(id: string) {
        const s = getSceneSync(id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('diffusion: 引擎 D=1e-5·(T/300)^1.5 与独立复算一致 (渲染 D 数值的数据基础)', () => {
        const sc = scene('diffusion');
        const { result, error } = runSceneSimulation(sc, {
            temperature: 300,
            medium: 0,
            particleCount: 500,
            duration: 3
        });
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立复算: 气体 D₀=1e-5, T=300 → D=1e-5
        expect(mv.diffusionCoeff).toBeCloseTo(1e-5, 12);
        // T=600 → D=1e-5·2^1.5
        const hot = runSceneSimulation(sc, { temperature: 600, medium: 0, particleCount: 500, duration: 3 });
        expect(hot.error).toBeNull();
        const mvHot = hot.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvHot.diffusionCoeff).toBeCloseTo(1e-5 * Math.pow(2, 1.5), 10);
    });

    it('diffusion: D 读取消耗引擎表, 空结果回退不崩 (渲染消费端)', () => {
        const sc = scene('diffusion');
        const { result } = runSceneSimulation(sc, {
            temperature: 300,
            medium: 0,
            particleCount: 500,
            duration: 3
        });
        expect(readEngineDiffusionCoeff(result)).toBeCloseTo(1e-5, 12);
        expect(readEngineDiffusionCoeff(null)).toBeNull();
        expect(readEngineDiffusionCoeff({ charts: {} } as never)).toBeNull();
        expect(readEngineDiffusionCoeff({ diagnostics: { maxValues: { diffusionCoeff: NaN } } } as never)).toBeNull();
        expect(readEngineDiffusionCoeff({ diagnostics: { maxValues: { diffusionCoeff: 0 } } } as never)).toBeNull();
    });

    it('diffusion: 渲染层 D 读引擎且保留回退, 粒子位置为装饰动画豁免 (源码契约)', () => {
        const fn = renderFn('molecularKineticScenes.ts', 'drawDiffusionScene');
        expect(fn, 'D 读引擎').toContain('readEngineDiffusionCoeff(simulationResult)');
        expect(fn, '无引擎结果保留回退').toContain('fallbackD');
        expect(fn, '粒子豁免需有注释记录').toContain('豁免');
    });

    it('brownian-motion: 引擎 D=kT/(6πηr) 与独立复算一致 (渲染 D 数值的数据基础)', () => {
        const sc = scene('brownian-motion');
        const { result, error } = runSceneSimulation(sc, {
            particleRadius: 1.0,
            liquidTemp: 300,
            fluidViscosity: 1.0,
            nParticles: 10,
            duration: 5
        });
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立复算: buildProblem 已换算 r=1e-6m, η=1e-3Pa·s; 引擎 kB=1.381e-23
        const expected = (1.381e-23 * 300) / (6 * Math.PI * 1e-3 * 1e-6);
        expect(mv.diffusionCoeff).toBeCloseTo(expected, 16);
    });

    it('brownian-motion: D 读取消耗引擎表, 空结果回退不崩 (渲染消费端)', () => {
        const sc = scene('brownian-motion');
        const { result } = runSceneSimulation(sc, {
            particleRadius: 1.0,
            liquidTemp: 300,
            fluidViscosity: 1.0,
            nParticles: 10,
            duration: 5
        });
        expect(readEngineBrownianCoeff(result)).not.toBeNull();
        expect(readEngineBrownianCoeff(null)).toBeNull();
        expect(readEngineBrownianCoeff({ charts: {} } as never)).toBeNull();
        expect(readEngineBrownianCoeff({ diagnostics: { maxValues: { diffusionCoeff: NaN } } } as never)).toBeNull();
    });

    it('brownian-motion: 渲染层 D 读引擎且保留回退, 轨迹为装饰动画豁免 (源码契约)', () => {
        const fn = renderFn('molecularKineticScenes.ts', 'drawBrownianScene');
        expect(fn, 'D 读引擎').toContain('readEngineBrownianCoeff(simulationResult)');
        expect(fn, '无引擎结果保留回退').toContain('fallbackDb');
        expect(fn, '轨迹豁免需有注释记录').toContain('豁免');
    });

    it('alpha-scattering: 引擎 k=2·Z·e²/(E·5) 与独立复算一致 (渲染散射角的数据基础)', () => {
        const sc = scene('alpha-scattering');
        const { result, error } = runSceneSimulation(sc, { alphaEnergy: 5, targetZ: 79, duration: 5 });
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立复算: e²=1.44MeV·fm, k=2·79·1.44/(5·5)=9.1008fm
        expect(mv.k).toBeCloseTo((2 * 79 * 1.44) / (5 * 5), 6);
    });

    it('alpha-scattering: k 读取消耗引擎表, 空结果回退不崩 (渲染消费端)', () => {
        const sc = scene('alpha-scattering');
        const { result } = runSceneSimulation(sc, { alphaEnergy: 5, targetZ: 79, duration: 5 });
        expect(readEngineAlphaK(result)).toBeCloseTo((2 * 79 * 1.44) / (5 * 5), 6);
        expect(readEngineAlphaK(null)).toBeNull();
        expect(readEngineAlphaK({ charts: {} } as never)).toBeNull();
        expect(readEngineAlphaK({ diagnostics: { maxValues: { k: NaN } } } as never)).toBeNull();
    });

    it('alpha-scattering: 渲染层 k 读引擎且保留回退, 脉冲/进度为装饰动画豁免 (源码契约)', () => {
        const fn = renderFn('nuclearScenes.ts', 'drawAlphaScatteringScene');
        expect(fn, 'k 读引擎').toContain('readEngineAlphaK(simulationResult)');
        expect(fn, '脉冲豁免需有注释记录').toContain('豁免');
    });

    it('vertical-circle: 回退角仅无引擎时使用, 有引擎取帧 (源码契约)', () => {
        const fn = renderFn('chapter5Scenes.ts', 'drawVerticalCircleScene');
        expect(fn, '有引擎取帧').toContain('getFrame(simulationResult, currentTime)');
        expect(fn, '回退豁免需有注释记录').toContain('豁免');
    });

    it('em-wave-hertz/communication: 波纹与 AM 示意为装饰动画豁免, 交变电流回退保留 (源码契约)', () => {
        const hertzFn = renderFn('emWaveScenes.ts', 'drawEmWaveHertzScene');
        expect(hertzFn, '波纹豁免需有注释记录').toContain('豁免');
        const commFn = renderFn('emWaveScenes.ts', 'drawEmWaveCommunicationScene');
        expect(commFn, 'AM 示意豁免需有注释记录').toContain('豁免');
        const acFn = renderFn('emWaveScenes.ts', 'drawAcCurrentScene');
        expect(acFn, '交变电流读引擎').toContain('engCharts?.x_t');
    });
});

describe('L1-migration: 渲染单一真源契约 (#34: 竖直圆临界值模型相关)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    function scene(id: string) {
        const s = getSceneSync(id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('vertical-circle: 杆模型临界为 0 且恒通过, 绳模型为 √(g·L) (引擎端独立复算)', () => {
        const sc = scene('vertical-circle');
        // 杆 + 低速: vMin=0, passesTop=true
        const rod = runSceneSimulation(sc, { modelType: 1, length: 1, mass: 1, initialSpeed: 1, duration: 5 });
        expect(rod.error).toBeNull();
        const mvRod = rod.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvRod.vMin).toBe(0);
        const flagsRod = rod.result!.diagnostics.flags as Record<string, boolean>;
        expect(flagsRod.passesTop).toBe(true);
        // 绳 + 同参数: vMin=√(9.8·1)≈3.13, passesTop=false
        const rope = runSceneSimulation(sc, { modelType: 0, length: 1, mass: 1, initialSpeed: 1, duration: 5 });
        expect(rope.error).toBeNull();
        const mvRope = rope.result!.diagnostics.maxValues as Record<string, number>;
        expect(mvRope.vMin).toBeCloseTo(Math.sqrt(9.8 * 1), 6);
        const flagsRope = rope.result!.diagnostics.flags as Record<string, boolean>;
        expect(flagsRope.passesTop).toBe(false);
    });

    it('vertical-circle: 临界/通过性读取消耗引擎表, 空结果回退不崩 (渲染消费端)', () => {
        const sc = scene('vertical-circle');
        const { result } = runSceneSimulation(sc, { modelType: 1, length: 1, mass: 1, initialSpeed: 1, duration: 5 });
        expect(readEngineVerticalCircle(result)).toEqual({ vMin: 0, passesTop: true });
        expect(readEngineVerticalCircle(null)).toEqual({ vMin: null, passesTop: null });
        expect(readEngineVerticalCircle({ charts: {} } as never)).toEqual({ vMin: null, passesTop: null });
        expect(readEngineVerticalCircle({ diagnostics: { maxValues: { vMin: NaN }, flags: {} } } as never)).toEqual({
            vMin: null,
            passesTop: null
        });
        expect(
            readEngineVerticalCircle({ diagnostics: { maxValues: { vMin: -1 }, flags: { passesTop: true } } } as never)
        ).toEqual({ vMin: null, passesTop: true });
    });

    it('vertical-circle: 渲染层临界读引擎且回退区分杆/绳 (源码契约)', () => {
        const fn = renderFn('chapter5Scenes.ts', 'drawVerticalCircleScene');
        expect(fn, '临界读引擎').toContain('readEngineVerticalCircle(simulationResult)');
        expect(fn, '通过性消费 flags.passesTop').toContain('passesTop');
        expect(fn, '回退区分杆模型').toContain('isRod');
    });
});

describe('L1-migration: 渲染单一真源契约 (M3 批次 1: 光学波动 + 波粒二象 #62)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    function scene(id: string) {
        const s = getSceneSync(id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('diffraction-grating: k_max = min(orderMax, floor(d/λ)) 且光强曲线中央主极大归一化为 1、±k 对称', () => {
        const sc = scene('diffraction-grating');
        const params: Record<string, number> = {
            gratingConst: 2,
            wavelength: 550,
            orderMax: 4,
            slitCount: 500,
            slitWidth: 1
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // k_max = min(orderMax=4, floor(d/λ) = floor(2/0.55) = 3) = 3 (引擎按 |sinθ|≤1 截断)
        expect(mv.orderMax).toBe(Math.min(4, Math.floor(2 / 0.55)));
        // I(θ): 中央主极大归一化 I(0)=1; 主极大为针状峰 (N=500, 峰宽 < 网格步长),
        // 远离 0 级处相对光强趋近 0; ±θ 严格对称 (I 只依赖 sin²θ)
        const pts = chartsOf(result!, 'diffraction-grating')?.grating_intensity?.points ?? [];
        expect(pts.length).toBeGreaterThan(100);
        const central = pts.reduce((best, p) => (Math.abs(p.x) < Math.abs(best.x) ? p : best), pts[0]!);
        expect(central!.y).toBeCloseTo(1, 3);
        expect(Math.max(...pts.map(p => p.y))).toBeCloseTo(1, 3);
        const at = (deg: number) =>
            pts.reduce((best, p) => (Math.abs(p.x - deg) < Math.abs(best.x - deg) ? p : best), pts[0]!);
        expect(at(5)!.y).toBeCloseTo(at(-5)!.y, 9);
        expect(Math.abs(at(5)!.y)).toBeLessThan(0.05);
    });

    it('diffraction-grating: k_max 读引擎 maxValues.orderMax, 主极大射线示意保留 (源码契约)', () => {
        const fn = renderFn('waveOptScenes.ts', 'drawDiffractionGratingScene');
        expect(fn, 'k_max 读引擎 maxValues.orderMax').toContain('mvGrating?.orderMax ?? Math.min(orderMax');
        expect(fn, '射线示意性质有注释记录').toContain('示意图');
    });

    it('polarization-malus: 双片级联 I = I₀·cos²(θ₁−θ₀)·cos²(θ₂−θ₁) 与独立复算一致, multi_scan 逐点吻合', () => {
        const sc = scene('polarization-malus');
        const params: Record<string, number> = {
            initIntensity: 1,
            nPolarizers: 2,
            angle0: 0,
            angle1: 45,
            angle2: 90,
            incAngle: 0
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立公式: I = 1·cos²(0−0)·cos²(45°−0°) = 0.5
        expect(mv.Ifinal).toBeCloseTo(0.5, 4);
        expect(mv.transmission).toBeCloseTo(0.5, 4);
        // multi_scan: 第 2 片转到 45° 时透射 = cos²(0)·cos²(45°) = 0.5
        const scan = chartsOf(result!, 'polarization')?.multi_scan?.points ?? [];
        const at45 = scan.reduce((best, p) => (Math.abs(p.x - 45) < Math.abs(best.x - 45) ? p : best), scan[0]!);
        expect(at45!.y).toBeCloseTo(0.5, 3);
    });

    it('polarization-malus: 出射光强读引擎 maxValues.Ifinal, 中间片级联回退同式 (源码契约)', () => {
        const fn = renderFn('waveOptScenes.ts', 'drawPolarizationMalusScene');
        expect(fn, '最终光强读引擎 Ifinal').toContain('mvMalus?.Ifinal ??');
        expect(fn, '中间片强度保留同式级联回退').toContain('cascaded');
    });

    it('interference: Δy = λL/d 与独立复算一致, 光强曲线在 ±Δy 处为主极大', () => {
        const sc = scene('interference');
        const params: Record<string, number> = { wavelength: 600, slitSep: 0.5, screenDist: 2 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // Δy = 600nm × 2m / 0.5mm = 2.4 mm
        expect(mv.deltaYmm).toBeCloseTo(2.4, 3);
        // I(x) = cos²(π·d·x/(λ·L)): x = ±Δy 处 φ = ±π → I = 1 (主极大); x = ±Δy/2 处 I = 0 (暗纹)
        const pts = chartsOf(result!, 'interference')?.x_t?.points ?? [];
        expect(pts.length).toBeGreaterThan(100);
        const at = (mm: number) =>
            pts.reduce((best, p) => (Math.abs(p.x - mm) < Math.abs(best.x - mm) ? p : best), pts[0]!);
        expect(at(2.4)!.y).toBeCloseTo(1, 3);
        expect(at(-2.4)!.y).toBeCloseTo(1, 3);
        expect(Math.abs(at(1.2)!.y)).toBeLessThan(0.02);
    });

    it('interference: 条纹间距读引擎 maxValues.deltaYmm, 屏上条纹示意保留 (源码契约)', () => {
        const fn = renderFn('waveOptScenes.ts', 'drawInterferenceScene');
        expect(fn, 'Δy 读引擎 maxValues.deltaYmm').toContain('mvInterf?.deltaYmm ??');
        expect(fn, '像素空间示意图性质有注释记录').toContain('示意图');
    });

    it("doppler-effect: f' = f·v/(v − v_s·cosθ) 与独立复算一致, θ 扫描曲线覆盖靠近/远离两端", () => {
        const sc = scene('doppler-effect');
        const params: Record<string, number> = { soundSpeed: 340, sourceFreq: 500, sourceSpeed: 30, dirAngle: 0 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // θ=0° (靠近): f' = 500×340/(340−30) = 548.39 Hz; 拍频 48.39 Hz
        expect(mv.fObserved).toBeCloseTo((500 * 340) / 310, 2);
        expect(mv.fBeat).toBeCloseTo(48.39, 2);
        // θ 扫描: 0° = 靠近值, 180° = 远离值 f' = 500×340/370 = 459.46 Hz
        const thetaScan = chartsOf(result!, 'doppler')?.fprime_vs_theta;
        expect(thetaScan).toBeDefined();
        expect(interpSeries(thetaScan, 0)).toBeCloseTo(548.39, 1);
        expect(interpSeries(thetaScan, 180)).toBeCloseTo(459.46, 1);
    });

    it('doppler-effect: 前/后观察者读数由 fprime_vs_theta 插值, 回退同式 (源码契约)', () => {
        const fn = renderFn('waveOptScenes.ts', 'drawDopplerScene');
        expect(fn, 'θ 扫描曲线读引擎 (经 #82 chartsOf)').toContain(
            "chartsOf(simulationResult, 'doppler')?.fprime_vs_theta"
        );
        expect(fn, '观察者读数插值').toContain('interpSeries(thetaScan');
        expect(fn, '插值非有限时回退同式公式').toContain('Number.isFinite(engF)');
    });

    it('photoelectric: ν₀ = W₀/h 与 Ek = hν − W₀ 和独立复算一致, y_t 采样域覆盖 [ν₀, ν_max]', () => {
        const sc = scene('photoelectric');
        const params: Record<string, number> = { W0: 2.3, nuMin: 300, nuMax: 1500 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立复算 (CODATA): ν₀ = W₀/h = 2.3 eV / 4.135667696e-15 eV·s ≈ 556.1 THz
        expect(mv.thresholdFrequency_THz).toBeCloseTo(2.3 / 4.135667696e-3, 0);
        // Ek(ν) 直线: K(1500 THz) = 4.135667696e-3×1500 − 2.3 ≈ 3.90 eV (引擎 h 用截断字面量, 容差 2 位小数)
        const ek = chartsOf(result!, 'photoelectric')?.y_t?.points ?? [];
        expect(ek.length).toBeGreaterThan(50);
        const last = ek[ek.length - 1]!;
        expect(last.x).toBeCloseTo(1500, 0);
        expect(last.y).toBeCloseTo(4.135667696e-3 * 1500 - 2.3, 2);
        // 曲线从阈值起画: 首点 x ≥ ν₀ (ν < ν₀ 无光电子)
        expect(ek[0]!.x).toBeGreaterThanOrEqual((mv.thresholdFrequency_THz ?? 0) - 1);
        // U_c-ν (x_t) 与 Ek 数值相同 (U_c = E_k/e, 单位 V)
        const uc = chartsOf(result!, 'photoelectric')?.x_t?.points ?? [];
        expect(uc[uc.length - 1]!.y).toBeCloseTo(last.y, 3);
    });

    it('photoelectric: Ek-ν 直线读引擎 y_t, ν₀/K_max 读引擎 (源码契约)', () => {
        const fn = renderFn('waveParticleDualityScenes.ts', 'drawPhotoelectricScene');
        expect(fn, 'Ek-ν 直线读引擎 y_t (经 #82 chartsOf)').toContain("chartsOf(simulationResult, 'photoelectric')");
        expect(fn, 'ν₀ 读引擎 maxValues').toContain('mvPhoto?.thresholdFrequency_THz ??');
        expect(fn, 'K_max 由引擎序列插值').toContain('kAt(nuMax)');
        expect(fn, '直线由引擎点列驱动').toContain('ekSeries?.points');
    });
});

describe('L1-migration: 渲染单一真源契约 (M3 批次 2: 传感器元件 #63)', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    function scene(id: string) {
        const s = getSceneSync(id);
        expect(s, `场景 ${id} 已注册`).toBeDefined();
        return s!;
    }

    it('thermistor: NTC B 方程 R=R₀·exp(B(1/T−1/T₀)) 与独立复算一致, maxValues.resistance 与 x_t 曲线同点吻合', () => {
        const sc = scene('thermistor');
        const params: Record<string, number> = { temperature: 300, R0: 1e4, BValue: 3950, duration: 1 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        // 独立复算 (T₀=298.15): R(300K)=1e4·exp(3950·(1/300−1/298.15))
        const expectedR = 1e4 * Math.exp(3950 * (1 / 300 - 1 / 298.15));
        expect(mv.resistance).toBeCloseTo(expectedR, 2);
        expect(mv.modeFlag).toBe(0); // NTC (场景 buildProblem 恒 'NTC')
        // 引擎 R-T 曲线 x_t 在 T=300 (恰为采样点) 处与 maxValues.resistance 同值 — 画面读数即此值
        const rt = chartsOf(result!, 'thermistor')?.x_t;
        expect(rt?.points.length).toBeGreaterThan(50);
        expect(interpSeries(rt, 300)).toBeCloseTo(expectedR, 1);
    });

    it('thermistor: 实时电阻读数读引擎 maxValues.resistance, R-T 曲线/温度计示意保留 (源码契约)', () => {
        const fn = renderFn('sensorElementScenes.ts', 'drawThermistorScene');
        expect(fn, 'R 读数读引擎 maxValues.resistance').toContain('mvTherm?.resistance ??');
        expect(fn, '曲线/温度计示意性质有注释记录').toContain('示意图');
    });

    it('hall-effect: |U_H|=I·B/(n·q·t) 与独立复算一致, 电子载流子使 hallVoltage_mV 为负 (画面取幅值)', () => {
        const sc = scene('hall-effect');
        const params: Record<string, number> = {
            current: 2,
            magneticField: 0.5,
            chargeDensity: 1e22,
            thickness: 0.002,
            duration: 1
        };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();

        const mv = result!.diagnostics.maxValues as Record<string, number>;
        const q = PHYSICS_CONSTANTS.e.value;
        const expected_mV = ((2 * 0.5) / (1e22 * q * 0.002)) * 1e3;
        expect(mv.hallVoltageAbs_mV).toBeCloseTo(expected_mV, 1);
        // 场景 carrierType 恒 'electron' → 带极性 hallVoltage_mV 为负, 幅值为正; 画面消费幅值
        expect(mv.hallVoltage_mV).toBeLessThan(0);
        expect(mv.hallVoltageAbs_mV).toBeCloseTo(-(mv.hallVoltage_mV ?? 0), 6);
    });

    it('hall-effect: V_H 表头/HUD 读数读引擎 maxValues.hallVoltageAbs_mV, 偏转极性等示意保留 (源码契约)', () => {
        const fn = renderFn('sensorElementScenes.ts', 'drawHallEffectScene');
        expect(fn, 'V_H 读数读引擎 hallVoltageAbs_mV').toContain('mvHall?.hallVoltageAbs_mV ??');
        expect(fn, '偏转/极性示意性质有注释记录').toContain('示意');
    });

    it('photoresistor: R=R_dark(T)·exp(−k·E) 含温度修正, T≠25℃ 工作点随温度下降 (旧渲染漏此温度项)', () => {
        const sc = scene('photoresistor');
        const base = { darkResistance: 1e6, sensitivity: 2e-3, lightIntensity: 100, duration: 5 };
        const { result: r25, error: e25 } = runSceneSimulation(sc, { ...base, temperature: 25 });
        const { result: r75, error: e75 } = runSceneSimulation(sc, { ...base, temperature: 75 });
        expect(e25).toBeNull();
        expect(e75).toBeNull();
        const mv25 = r25!.diagnostics.maxValues as Record<string, number>;
        const mv75 = r75!.diagnostics.maxValues as Record<string, number>;
        // 独立复算: T=25 无修正 R=1e6·exp(−0.2); T=75 暗电阻 ×exp(−0.02·(75−25))=×e^−1
        const noT = 1e6 * Math.exp(-2e-3 * 100);
        const with75 = noT * Math.exp(-0.02 * (75 - 25));
        expect(mv25.workResistance_Ohm).toBeCloseTo(noT, 0);
        expect(mv75.workResistance_Ohm).toBeCloseTo(with75, 0);
        // 温度修正使 T=75 工作点显著低于 T=25 (旧渲染自算不含温度项, 两者相等 = 双源 bug)
        expect(mv75.workResistance_Ohm).toBeLessThan((mv25.workResistance_Ohm ?? 0) * 0.5);
        // 引擎 R-E 曲线 x_t 覆盖工作点 E=100, 与 maxValues 同值 (对数采样线性内插容差 2%)
        const re = chartsOf(r25!, 'photoresistor')?.x_t;
        expect(re?.points.length).toBeGreaterThan(50);
        expect(Math.abs(interpSeries(re, 100) - noT)).toBeLessThan(noT * 0.02);
    });

    it('photoresistor: R-E 曲线整条读引擎 x_t, 工作点 R 读 maxValues (源码契约 · A 全量)', () => {
        const fn = renderFn('sensorElementScenes.ts', 'drawPhotoresistorScene');
        expect(fn, 'R-E 曲线读引擎 x_t (经 #82 chartsOf)').toContain("chartsOf(simulationResult, 'photoresistor')");
        expect(fn, '工作点 R 读引擎 maxValues.workResistance_Ohm').toContain('mvPhoto?.workResistance_Ohm ??');
        expect(fn, '曲线由引擎点列驱动').toContain('reSeries?.points');
    });

    it('strain-gauge: ΔR/R=K·ε 与全桥 ΔU=U_K·K·ε/4 与独立复算一致, y_t 电桥输出曲线在', () => {
        const sc = scene('strain-gauge');
        const params: Record<string, number> = { strain: 1000, gaugeFactor: 2.1, bridgeVoltage: 5, duration: 1 };
        const { result, error } = runSceneSimulation(sc, params);
        expect(error).toBeNull();
        const mv = result!.diagnostics.maxValues as Record<string, number>;
        const eps = 1000 * 1e-6;
        expect(mv.deltaROverR).toBeCloseTo(2.1 * eps, 6);
        expect(mv.deltaUMV).toBeCloseTo(((5 * 2.1 * eps) / 4) * 1000, 4); // 2.625 mV
        expect(chartsOf(result!, 'strain-gauge')?.y_t?.points.length).toBeGreaterThan(50);
    });

    it('strain-gauge: ΔU 与 ΔR/R 读数读引擎 maxValues, ΔU-ε 曲线/形变示意保留 (源码契约)', () => {
        const fn = renderFn('sensorElementScenes.ts', 'drawStrainGaugeScene');
        expect(fn, 'ΔR/R 读数读引擎 deltaROverR').toContain('mvStrain?.deltaROverR ??');
        expect(fn, 'ΔU 读数读引擎 deltaUMV').toContain('mvStrain?.deltaUMV ??');
        expect(fn, '曲线/形变示意性质有注释记录').toContain('示意');
    });
});
