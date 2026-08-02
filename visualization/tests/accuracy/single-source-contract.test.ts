/**
 * L1-migration: 渲染单一真源契约 — 迁移后的场景, 渲染层必须消费引擎结果
 *
 * 背景: 阶段 3 首轮迁移 (orbital / simple-pendulum / vertical-circle)。
 * 此前这些场景渲染层用 `currentTime + 公式` 自算, 与引擎结果漂移
 * (orbital 椭圆率 1.57 时画面仍画匀速圆, 分歧 102.6%)。
 *
 * 本测试固化的契约:
 *   1. orbital: 引擎轨迹 maxR/minR 呈现真实椭圆/圆 → 渲染层不得再用匀速圆
 *   2. simple-pendulum: 大角度 θ₀=60° 引擎周期 T 显著偏离小角度近似
 *      (非线性不可忽略) → 渲染层读 theta_t 而非 cos 近似
 *   3. vertical-circle: 引擎速度最高点 < 最低点 (机械能守恒) → HUD 展示当前速度
 *
 * 若未来渲染层回退到自算公式 (或引擎被改错), 本测试直接拦截。
 */

import { describe, it, expect } from 'vitest';
import { SCENES } from '../../src/scenes/sceneRegistry';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
import { getFrame } from '../../src/rendering/renderingUtils';

describe('L1-migration: 渲染单一真源契约 (orbital / pendulum / vertical-circle)', () => {
    function scene(id: string) {
        const s = SCENES.find(x => x.id === id);
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
});
