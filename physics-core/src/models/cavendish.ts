import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/** 万有引力常量标准值 */
const G_STANDARD = 6.674e-11;

/**
 * 卡文迪什扭秤 — 必修二 第三章 §3 实验 (测量万有引力常量 G)
 *
 * 经典物理实验: 1798 年卡文迪什用扭秤测出万有引力常量，
 * 第一次"称量了地球" — 由 G 计算地球质量。
 *
 * 物理:
 *   引力 F = G·m₁·m₂/r²
 *   三次放大:
 *     ① 力矩放大: τ = F·L              (L = 悬丝到小球距离)
 *     ② 扭转放大: θ = τ/k              (k = 扭转常数)
 *     ③ 光杠杆放大: Δspot = 2·D·θ_mirror (D = 镜面到投影屏距离, θ_mirror = θ)
 *        光点偏转角 = 2θ, 所以 Δspot = 2·D·tan(2θ) ≈ 4·D·θ (θ 小)
 *
 * 关键量:
 *   扭矩: τ = G·m₁·m₂/r² · L
 *   扭转角: θ = τ/k
 *   光点位移: Δspot = 2·D·θ  (或精确: 2D·tan(2θ))
 *   反推 G:  G = θ·k·r² / (m₁·m₂·L)
 */
export class CavendishModel extends PhysicsModelBase {
    readonly name = '卡文迪什扭秤';
    readonly version = '1.0.0';
    readonly description = '三次放大测万有引力常量 G: 力矩→扭转→光杠杆; 扭秤实验';
    readonly modelType = 'cavendish' as const;
    readonly assumptions = [
        '大球对小球引力沿连线',
        '小角度下扭转回复力矩线性: τ = k·θ',
        '小角度光杠杆近似: tan(2θ) ≈ 2θ',
        '系统达到静力平衡 (忽略空气扰动与残余气流)',
        '小球所受其他引力干扰可忽略 (地球引力对天平两臂等大反向)'
    ];
    readonly applicableRange = '教学演示用; m₁=0.1–2000 kg, m₂=0.001–10 kg, r=0.01–1 m';
    readonly errorSources = [
        '外界振动与气流扰动',
        '悬丝滞弹性 (k 不是理想常数)',
        '球心距离测量误差 (本实验主要误差来源)',
        '大球与小球并非理想点质量或质球',
        '眼镜/望远镜读数引入人为偏差'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'm1', description: '大球质量 m₁ (kg)', unit: 'kg', required: true, min: 0.001, max: 1e5 },
        { name: 'm2', description: '小球质量 m₂ (kg)', unit: 'kg', required: true, min: 1e-6, max: 1e3 },
        { name: 'distance', description: '球心间距 r (m)', unit: 'm', required: true, min: 1e-3, max: 10 },
        {
            name: 'torsionConst',
            description: '扭转常数 k (N·m/rad)',
            unit: 'N·m/rad',
            required: true,
            min: 1e-15,
            max: 1
        },
        { name: 'mirrorDist', description: '镜面到投影屏距离 D (m)', unit: 'm', required: true, min: 0.05, max: 100 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.cavendish ?? {
            m1: 10,
            m2: 0.5,
            distance: 0.1,
            torsionConst: 1e-4,
            mirrorDist: 5,
            armLength: 1
        };

        const m1 = c.m1;
        const m2 = c.m2;
        const r = c.distance;
        const k = c.torsionConst;
        const D = c.mirrorDist;
        const L = c.armLength ?? r; // 半臂长，默认用 r 代替

        // ===== 核心静态计算 (真实值用 G 标准输入, 反推 G 后对比) =====
        const F = (G_STANDARD * m1 * m2) / (r * r); // 引力
        const torque = F * L; // 力矩
        const theta = torque / k; // 扭转角 (弧度)
        const thetaDeg = (theta * 180) / Math.PI; // 扭转角 (度)
        const thetaMirror = theta; // 镜面偏转角
        const deltaSpotLinear = 2 * D * thetaMirror; // 小角近似光点位移
        const deltaSpotExact = 2 * D * Math.tan(2 * thetaMirror); // 精确光点位移
        const amplification = ((2 * D) / k) * L; // 总放大系数 (Δspot/F): 2D·L/k

        // ===== 反推 G 并与标准值比对 =====
        const G_fit = theta > 0 ? (theta * k * r * r) / (m1 * m2 * L) : 0;
        const relativeError = ((G_fit - G_STANDARD) / G_STANDARD) * 100; // %

        // ===== 扫描: 改变 m₁ 看扭转角变化 (演示用) =====
        const sweepPoints = 200;
        const duration = problem.timeConfig.duration ?? 1;
        const m1Max = m1 * 2;
        const tau_theta_points: { x: number; y: number }[] = [];
        const sweepTraj: TrajectoryPoint[] = [];

        for (let i = 0; i <= sweepPoints; i++) {
            const t = (i / sweepPoints) * duration;
            const m1s = (i / sweepPoints) * m1Max;
            const Fs = (G_STANDARD * m1s * m2) / (r * r);
            const taus = Fs * L;
            const ths = taus / k;
            tau_theta_points.push({ x: taus, y: ths });
            sweepTraj.push({
                t,
                position: { x: m1s, y: ths },
                velocity: { x: Fs, y: taus },
                acceleration: { x: ths, y: deltaSpotLinear },
                kineticEnergy: Fs,
                potentialEnergy: taus
            });
        }

        // ===== 图表 1: 扭转角-引力 (τ-θ, 线性) =====
        const displacement_sin: ChartSeries = {
            xLabel: '力矩 τ (N·m)',
            yLabel: '扭转角 θ (rad)',
            xUnit: 'N·m',
            yUnit: 'rad',
            points: tau_theta_points
        };

        // ===== 图表 2: 静态扭秤图示 (用点描绘各部件) =====
        // 坐标约定: 悬丝为原点 O(0,0)
        //   镜子 M 与 丝平行 (沿 y 轴)
        //   小球: P1(+L, 0), P2(-L, 0)
        //   大球 Q: 在 (+L + r_small_arm, offset) — 简化: 大球在 (L+r_offset, 摆偏 θ 角)
        //   光屏: 与镜面距离 D, 偏转角 2θ
        const scale = 100;
        const mirrorX = 0;
        const mirrorY = 0.3 * scale; // 顶点
        const topX = 0;
        const topY = 0; // 悬丝顶端
        // 沿 θ 偏转 θ (小) 后小球位置
        const armLenPx = L * scale * 5;
        const ball1X = Math.sin(theta) * armLenPx + 0;
        const ball1Y = -Math.cos(theta) * armLenPx + mirrorY;
        const ball2X = -Math.sin(theta) * armLenPx + 0;
        const ball2Y = -Math.cos(theta) * armLenPx + mirrorY;
        // 大球在小球旁边, 距离 r
        const ball1CenterY = ball1Y;
        const bigR = 0.05 * scale * 5;
        // light beam: mirror → screen (D away), beam deflection 2θ
        const screenDist = D * scale * 3;
        const beamEndX = screenDist; // 屏幕坐标 (沿 x 轴)
        const spotEndX = beamEndX;
        const spotEndY = mirrorY + Math.tan(2 * theta) * screenDist;

        const staticDiagram: ChartSeries = {
            xLabel: '扭秤示意 (放大夸张)',
            yLabel: 'y (像素单位)',
            xUnit: 'px',
            yUnit: 'px',
            points: [
                { x: topX, y: topY }, // 0. 悬丝顶
                { x: mirrorX, y: mirrorY }, // 1. 镜面 (偏转 θ)
                { x: ball1X, y: ball1Y }, // 2. 小球 1
                { x: ball2X, y: ball2Y }, // 3. 小球 2
                { x: ball1X - bigR - bigR * 0.1, y: ball1CenterY }, // 4. 大球 (示意位置)
                { x: mirrorX, y: mirrorY }, // 5. 镜面入射点
                { x: spotEndX, y: spotEndY }, // 6. 光屏上的光点
                { x: beamEndX, y: mirrorY } // 7. 零θ参考光点
            ]
        };

        // ===== 关键帧 =====
        const keyframes: Keyframe[] = [
            {
                label: '状态: 大球靠近',
                t: 0,
                position: { x: ball1X, y: ball1Y },
                velocity: { x: F, y: theta },
                description: `大球 m₁=${m1}kg 靠近小球 m₂=${m2}kg, r=${r}m, F=${F.toExponential(3)}N`
            },
            {
                label: '扭转静平衡',
                t: duration / 2,
                position: { x: thetaDeg, y: deltaSpotLinear },
                velocity: { x: theta, y: deltaSpotExact },
                description: `扭转角 θ=${theta.toExponential(3)} rad = ${thetaDeg.toExponential(3)}°, 光点位移 Δspot≈${deltaSpotLinear.toExponential(3)} m`
            },
            {
                label: '拟合 G 值',
                t: duration,
                position: { x: G_fit, y: G_STANDARD },
                velocity: { x: relativeError, y: amplification },
                description: `拟合 G = ${G_fit.toExponential(3)} (相对误差 ${relativeError.toFixed(2)}%, 放大系数≈${amplification.toExponential(2)})`
            }
        ];

        const warnings: string[] = [];
        const steps = this.buildSteps(
            m1,
            m2,
            r,
            k,
            D,
            L,
            F,
            theta,
            thetaDeg,
            deltaSpotLinear,
            deltaSpotExact,
            G_fit,
            relativeError,
            amplification,
            torque
        );

        return {
            meta: {
                model: 'cavendish',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [sweepTraj],
            keyframes,
            charts: { displacement_sin, 'static-diagram-cavendish': staticDiagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    F,
                    torque,
                    theta_rad: theta,
                    theta_deg: thetaDeg,
                    deltaSpot_m: deltaSpotExact,
                    D,
                    k,
                    L,
                    G_fit,
                    G_standard: G_STANDARD,
                    relativeError_pct: relativeError,
                    amplification,
                    linearAmplification: amplification
                },
                rangeCheck: {
                    withinRange: warnings.length === 0,
                    warnings
                }
            },
            explanation: {
                summary: `卡文迪什扭秤: F=${F.toExponential(3)}N, θ=${theta.toExponential(3)} rad, Δspot≈${deltaSpotLinear.toExponential(3)} m, 拟合 G=${G_fit.toExponential(3)} (±${Math.abs(relativeError).toFixed(1)}%)`,
                steps,
                formulas: [
                    {
                        name: '万有引力',
                        formula: 'F = G·m₁·m₂/r²',
                        variables: {
                            G: { value: G_STANDARD, unit: 'N·m²/kg²' },
                            m1: { value: m1, unit: 'kg' },
                            m2: { value: m2, unit: 'kg' },
                            r: { value: r, unit: 'm' }
                        }
                    },
                    {
                        name: '力矩放大',
                        formula: 'τ = F·L',
                        variables: { F: { value: F, unit: 'N' }, L: { value: L, unit: 'm' } }
                    },
                    {
                        name: '扭转放大',
                        formula: 'θ = τ/k',
                        variables: { τ: { value: torque, unit: 'N·m' }, k: { value: k, unit: 'N·m/rad' } }
                    },
                    {
                        name: '光杠杆放大',
                        formula: 'Δspot = 2·D·θ ≈ 4D·θ (小角)',
                        variables: { D: { value: D, unit: 'm' }, θ: { value: theta, unit: 'rad' } }
                    },
                    {
                        name: '拟合 G',
                        formula: 'G = θ·k·r² / (m₁·m₂·L)',
                        variables: { G_fit: { value: G_fit, unit: 'N·m²/kg²' } }
                    }
                ]
            },
            renderHints: [
                { bodyId: 'mirror', renderColor: '#88ccff', renderLabel: '反射镜' },
                { bodyId: 'ball1', renderColor: '#ff5555', renderLabel: '小球₁' },
                { bodyId: 'ball2', renderColor: '#5555ff', renderLabel: '小球₂' },
                { bodyId: 'bigBall', renderColor: '#444444', renderLabel: '大球' },
                { bodyId: 'light', renderColor: '#ffcc00', renderLabel: '光束' },
                { bodyId: 'screen', renderColor: '#222222', renderLabel: '光屏' }
            ],
            errors: [],
            warnings
        };
    }

    private buildSteps(
        m1: number,
        m2: number,
        r: number,
        k: number,
        D: number,
        L: number,
        F: number,
        theta: number,
        thetaDeg: number,
        deltaSpotLinear: number,
        deltaSpotExact: number,
        G_fit: number,
        relErr: number,
        amplification: number,
        torque: number
    ) {
        const F_calc = `F = 6.674×10⁻¹¹ × ${m1} × ${m2} / ${r}²`;
        const torque_calc = `τ = ${F.toExponential(3)} × ${L}`;
        const theta_calc = `θ = ${torque.toExponential(3)} / ${k}`;
        const spot_calc = `Δspot = 2 × ${D} × ${theta.toExponential(3)}`;
        const G_fit_calc = `G = ${theta.toExponential(3)} × ${k} × ${r}² / (${m1} × ${m2} × ${L})`;
        return [
            {
                order: 1,
                description: '万有引力 — 大球与小球间的引力 (极小)',
                formula: 'F = G·m₁·m₂/r²',
                calculation: F_calc,
                result: `F = ${F.toExponential(3)} N (约 ${m1} kg 物体重力的 ${Math.abs(F / (m1 * 9.8)).toExponential(1)} 倍)`
            },
            {
                order: 2,
                description: '第一次放大 — 力矩放大：引力沿悬臂产生力矩',
                formula: 'τ = F·L',
                calculation: torque_calc,
                result: `τ = ${torque.toExponential(3)} N·m (力臂越长放大越多)`
            },
            {
                order: 3,
                description: '第二次放大 — 扭转放大：力矩使悬丝扭转，转角 θ = τ/k',
                formula: 'θ = τ/k',
                calculation: theta_calc,
                result: `θ = ${theta.toExponential(3)} rad = ${thetaDeg.toExponential(3)}° (极微小)`
            },
            {
                order: 4,
                description: '第三次放大 — 光杠杆：镜面随悬丝偏转，反射光斑在远处屏上移动',
                formula: 'Δspot = 2D·tan(2θ) ≈ 4D·θ',
                calculation: `${spot_calc}; ①近似 = ${deltaSpotLinear.toExponential(3)} m, ②精确 = ${deltaSpotExact.toExponential(3)} m`,
                result: `Δspot ≈ ${deltaSpotLinear.toExponential(3)} m — 已经可用标尺读数 (cm 级)`
            },
            {
                order: 5,
                description: '反推 G 值并与标准值对比 (核心标定)',
                formula: 'G = θ·k·r² / (m₁·m₂·L)',
                calculation: `${G_fit_calc}; G_fit = ${G_fit.toExponential(3)}, G_std = 6.674×10⁻¹¹`,
                result: `拟合相对误差: ${relErr.toFixed(2)}%, 总放大系数 ≈ ${amplification.toExponential(2)}`
            }
        ];
    }
}
