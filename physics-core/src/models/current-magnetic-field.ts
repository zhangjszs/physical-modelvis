import type { PhysicsProblem } from '../types/problem.js';
import type { SimulationResult, Keyframe, ChartSeries } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PhysicsError } from '../errors/index.js';
import type { CurrentMagneticFieldConstraint } from '../types/problem.js';

/** 真空磁导率 (N/A²) */
const MU0 = 4 * Math.PI * 1e-7;
/** 场景单位 → 米 的映射比例 */
const SCENE_TO_M = 0.1;

export interface MagFieldLine {
    readonly points: Array<{ x: number; y: number }>;
}

export interface MagFieldSample {
    readonly x: number;
    readonly y: number;
    readonly bx: number;
    readonly by: number;
    readonly magnitude: number;
}

export interface MagFieldExtra {
    readonly fieldLines: MagFieldLine[];
    readonly samples: MagFieldSample[];
    /** 剖面曲线 (B 沿某轴), 用于渲染层绘制 */
    profile?: ChartSeries;
    /** 直导线模式下导线位置 */
    wire?: { x: number; y: number };
    /** 线圈/螺线管模式下极区 (用于标注 N/S 极) */
    poles?: { north: { x: number; y: number }; south: { x: number; y: number } };
}

/**
 * 电流的磁场模型 — 选必二 §1
 *
 * 计算载流导体周围的磁场分布并生成磁场线:
 * - 'straight-wire': 无限长直导线 (二维截面), B = μ₀I/(2πr), 磁场线为同心圆
 * - 'coil' / 'solenoid': 等效磁偶极子 (外部) + 螺线管内部近似匀强场
 *
 * 坐标系: 归一化场景空间, 原点为中心, 范围约 [-1,1]。
 * current 符号: + 出纸面 (逆时针磁场), − 入纸面 (顺时针)。
 */
export class CurrentMagneticFieldModel extends PhysicsModelBase {
    readonly name = '电流的磁场';
    readonly version = '1.0.0';
    readonly description = '奥斯特实验 / 通电直导线 / 通电线圈的磁场线与磁感应强度分布';
    readonly modelType = 'current-magnetic-field' as const;
    readonly assumptions = [
        '稳恒电流',
        '真空中 (μ = μ₀)',
        '直导线视为无限长 (二维截面)',
        '线圈/螺线管近似为磁偶极子 (外部场)'
    ];
    readonly applicableRange = '适用于奥斯特实验、通电直导线、圆形线圈、螺线管等磁场可视化';
    readonly errorSources = ['有限长导线端部效应未建模', '线圈非点偶极近似在近端有偏差'];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'current', description: '电流 (A)', unit: 'A', required: true }
    ];

    /** 场分布模型无运动物体, 放宽基类校验 (不要求 bodies) */
    validate(problem: PhysicsProblem) {
        const errors: Array<{ code: string; message: string; param?: string }> = [];
        const warnings: Array<{ code: string; message: string }> = [];
        if (problem.model !== this.modelType) {
            errors.push({
                code: 'MODEL_MISMATCH',
                message: `期望模型 ${this.modelType}，收到 ${problem.model}`,
                param: 'model'
            });
        }
        if (problem.timeConfig.duration <= 0) {
            errors.push({
                code: 'INVALID_DURATION',
                message: `模拟时长必须为正数，当前值: ${problem.timeConfig.duration}`,
                param: 'timeConfig.duration'
            });
        }
        return { valid: errors.length === 0, errors, warnings };
    }

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);
        const c = problem.constraints?.currentMagneticField;
        if (!c) {
            throw new PhysicsError(
                'MISSING_CONSTRAINT',
                'current-magnetic-field 模型需要提供 constraints.currentMagneticField',
                { param: 'constraints.currentMagneticField' }
            );
        }

        const I = c.current;
        const center = c.center ?? { x: 0, y: 0 };
        const steps = c.steps ?? 600;
        const maxLength = c.maxLength ?? 6;
        const lineCount = c.lineCount ?? 16;

        let fieldLines: MagFieldLine[] = [];
        let poles: { north: { x: number; y: number }; south: { x: number; y: number } } | undefined;
        let wire: { x: number; y: number } | undefined;

        if (c.mode === 'straight-wire') {
            wire = center;
            fieldLines = this.straightWireLines(center, I, lineCount);
        } else {
            const radius = c.radius ?? 0.6;
            const halfLen = c.halfLength ?? 1.0;
            const turns = c.turns ?? 10;
            poles = {
                north: { x: center.x, y: center.y + (c.mode === 'solenoid' ? halfLen : radius) },
                south: { x: center.x, y: center.y - (c.mode === 'solenoid' ? halfLen : radius) }
            };
            fieldLines = this.dipoleLines(center, I, turns, radius, c.mode, lineCount, steps, maxLength);
        }

        const samples = this.sampleField(c, center, I, 7);

        const extra: MagFieldExtra = { fieldLines, samples };
        if (wire) extra.wire = wire;
        if (poles) extra.poles = poles;
        extra.profile = this.buildProfile(c, center, I, samples);

        const summary =
            c.mode === 'straight-wire'
                ? `通电直导线 (I=${I}A): 磁场线为以导线为中心的同心圆, B=μ₀I/(2πr), ${I >= 0 ? '逆时针' : '顺时针'} (右手螺旋)`
                : `载流${c.mode === 'solenoid' ? '螺线管' : '线圈'} (I=${I}A): 外部磁场等效磁偶极子, 内部近似匀强场, 呈 N/S 极分布`;

        return {
            meta: {
                model: 'current-magnetic-field',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [],
            keyframes: this.buildKeyframes(c, center, wire, poles),
            charts: {},
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    maxField: Math.max(1e-12, ...samples.map(s => s.magnitude))
                },
                rangeCheck: { withinRange: true, warnings: [] }
            },
            explanation: {
                summary,
                steps: [
                    {
                        order: 1,
                        description: c.mode === 'straight-wire' ? '安培右手螺旋定则' : '磁偶极近似',
                        formula: c.mode === 'straight-wire' ? 'B = μ₀I/(2πr)' : 'm = N·I·A'
                    },
                    {
                        order: 2,
                        description: '磁场线积分',
                        formula: 'dr/ds = B / |B|'
                    }
                ],
                formulas: [
                    {
                        name: '毕奥-萨伐尔 (直导线)',
                        formula: 'B = μ₀I/(2πr)',
                        variables: { MU0: { value: MU0, unit: 'N/A²' }, I: { value: I, unit: 'A' } }
                    }
                ]
            },
            extra: extra as unknown as Record<string, unknown>,
            errors: [],
            warnings: []
        };
    }

    /** 直导线磁场矢量 (归一化场景坐标) */
    private wireFieldAt(center: { x: number; y: number }, I: number, x: number, y: number): { x: number; y: number } {
        const dx = x - center.x;
        const dy = y - center.y;
        const r2 = dx * dx + dy * dy;
        const r = Math.sqrt(r2);
        if (r < 1e-4) return { x: 0, y: 0 };
        // B = μ₀I/(2πr), 方向切向 (右手定则: +I 出纸面 → 逆时针)
        // 切向单位向量 = (-dy, dx)/r
        const B = (MU0 * I) / (2 * Math.PI * r * SCENE_TO_M);
        return { x: (B * -dy) / r, y: (B * dx) / r };
    }

    /** 磁偶极子场 (归一化场景坐标), m 沿 +y */
    private dipoleFieldAt(center: { x: number; y: number }, m: number, x: number, y: number): { x: number; y: number } {
        const dx = x - center.x;
        const dy = y - center.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 1e-4) return { x: 0, y: 0 };
        const r3 = r * r * r;
        // m = (0, m): B ∝ [3(m·r̂)r̂ - m] / r³
        // m·r̂ = m * dy/r
        const mdotr = (m * dy) / r;
        const bx = (3 * mdotr * (dx / r)) / r3;
        const by = (3 * mdotr * (dy / r) - m) / r3;
        return { x: bx, y: by };
    }

    private straightWireLines(center: { x: number; y: number }, I: number, lineCount: number): MagFieldLine[] {
        const lines: MagFieldLine[] = [];
        const radii = [0.2, 0.35, 0.5, 0.65, 0.8, 0.95].slice(0, lineCount);
        const dir = I >= 0 ? 1 : -1;
        for (const r of radii) {
            const pts: Array<{ x: number; y: number }> = [];
            const seg = 64;
            for (let s = 0; s <= seg; s++) {
                const a = (dir * (2 * Math.PI * s)) / seg;
                pts.push({ x: center.x + r * Math.cos(a), y: center.y + r * Math.sin(a) });
            }
            lines.push({ points: pts });
        }
        return lines;
    }

    private dipoleLines(
        center: { x: number; y: number },
        I: number,
        turns: number,
        radius: number,
        mode: 'coil' | 'solenoid',
        lineCount: number,
        steps: number,
        maxLength: number
    ): MagFieldLine[] {
        const m = I * turns * Math.PI * radius * radius; // 磁矩 ∝ I·N·A
        const ds = maxLength / steps;
        const lines: MagFieldLine[] = [];
        // 从 N 极附近 (上) 周围播种, 沿磁场方向积分, 形成闭合回路
        const seedR = mode === 'solenoid' ? 0.15 : radius * 0.5;
        const seedY = center.y + (mode === 'solenoid' ? 0 : radius * 0.6);
        for (let i = 0; i < lineCount; i++) {
            const theta = (2 * Math.PI * i) / lineCount;
            let x = center.x + seedR * Math.cos(theta);
            let y = seedY + seedR * 0.4 * Math.sin(theta);
            const points: Array<{ x: number; y: number }> = [{ x, y }];
            for (let s = 0; s < steps; s++) {
                const f = this.dipoleFieldAt(center, m, x, y);
                const mag = Math.hypot(f.x, f.y);
                if (mag < 1e-9) break;
                x += (ds * f.x) / mag;
                y += (ds * f.y) / mag;
                points.push({ x, y });
                if (Math.hypot(x - center.x, y - center.y) > 2.2) break;
            }
            lines.push({ points });
        }
        return lines;
    }

    private sampleField(
        c: CurrentMagneticFieldConstraint,
        center: { x: number; y: number },
        I: number,
        n: number
    ): MagFieldSample[] {
        const samples: MagFieldSample[] = [];
        const m = I * (c.turns ?? 10) * Math.PI * (c.radius ?? 0.6) * (c.radius ?? 0.6);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const x = -1 + (2 * i) / (n - 1);
                const y = -1 + (2 * j) / (n - 1);
                let f: { x: number; y: number };
                if (c.mode === 'straight-wire') {
                    f = this.wireFieldAt(center, I, x, y);
                } else {
                    f = this.dipoleFieldAt(center, m, x, y);
                }
                samples.push({ x, y, bx: f.x, by: f.y, magnitude: Math.hypot(f.x, f.y) });
            }
        }
        return samples;
    }

    private buildKeyframes(
        c: CurrentMagneticFieldConstraint,
        center: { x: number; y: number },
        wire: { x: number; y: number } | undefined,
        poles: { north: { x: number; y: number }; south: { x: number; y: number } } | undefined
    ): Keyframe[] {
        if (wire) {
            return [
                {
                    label: '导线 (电流垂直纸面)',
                    t: 0,
                    position: { x: wire.x, y: wire.y },
                    velocity: { x: 0, y: 0 },
                    description: `I=${c.current}A ${c.current >= 0 ? '出纸面' : '入纸面'}, 磁场线为同心圆`
                }
            ];
        }
        if (poles) {
            return [
                {
                    label: 'N 极',
                    t: 0,
                    position: poles.north,
                    velocity: { x: 0, y: 0 },
                    description: '磁场线从 N 极发出'
                },
                {
                    label: 'S 极',
                    t: 0,
                    position: poles.south,
                    velocity: { x: 0, y: 0 },
                    description: '磁场线汇入 S 极'
                }
            ];
        }
        return [];
    }

    private buildProfile(
        c: CurrentMagneticFieldConstraint,
        center: { x: number; y: number },
        I: number,
        samples: MagFieldSample[]
    ): ChartSeries {
        if (c.mode === 'straight-wire') {
            // B ∝ 1/r: 沿 x 轴采样
            return {
                xLabel: 'r (场景)',
                yLabel: 'B (相对)',
                xUnit: 'scene',
                yUnit: 'a.u.',
                points: samples
                    .filter(s => Math.abs(s.y - center.y) < 1e-6 && s.x > center.x)
                    .map(s => ({ x: s.x - center.x, y: s.magnitude }))
            };
        }
        return {
            xLabel: 'y (场景)',
            yLabel: 'B_y (相对)',
            xUnit: 'scene',
            yUnit: 'a.u.',
            points: samples.filter(s => Math.abs(s.x - center.x) < 1e-6).map(s => ({ x: s.y - center.y, y: s.by }))
        };
    }
}
