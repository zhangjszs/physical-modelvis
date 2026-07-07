import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    Keyframe,
    ChartSeries
} from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { PhysicsError } from '../errors/index.js';
import type { ElectricFieldLinesConstraint, FieldCharge } from '../types/problem.js';

/** 库仑常量 (N·m²/C²) */
const K = 8.9875517923e9;
/** 场景单位 → 米 的映射比例 (仅用于物理量级估算, 渲染用归一化坐标) */
const SCENE_TO_M = 0.1;

/** 单条电场线 (归一化场景坐标折线) */
export interface FieldLine {
    /** 折线顶点 (归一化场景坐标) */
    readonly points: Array<{ x: number; y: number }>;
    /** 起点电荷符号: +1 源 / -1 汇 (决定箭头方向) */
    readonly sign: 1 | -1;
}

/** 矢量场采样点 */
export interface FieldSample {
    readonly x: number;
    readonly y: number;
    readonly ex: number;
    readonly ey: number;
    readonly magnitude: number;
}

export interface ElectricFieldExtra {
    readonly fieldLines: FieldLine[];
    readonly samples: FieldSample[];
    /** 剖面曲线 (|E| 沿某轴), 用于渲染层绘制 */
    profile?: ChartSeries;
    /** 均匀场上平行板两板位置 (y 坐标), parallel-plate 模式有效 */
    plates?: { top: number; bottom: number; left: number; right: number };
    /** 板间场强估算 (V/m), parallel-plate 模式有效 */
    plateField?: number;
}

/**
 * 电场线分布模型 — 必修三 第十二章
 *
 * 计算点电荷系 / 电偶极 / 平行板电容器的静电场, 通过数值积分生成电场线,
 * 并采样矢量场供渲染层绘制箭头。
 *
 * 坐标系: 归一化场景空间, 原点为中心, 范围约 [-1,1]。
 */
export class ElectricFieldLinesModel extends PhysicsModelBase {
    readonly name = '电场线分布';
    readonly version = '1.0.0';
    readonly description = '点电荷 / 电偶极 / 平行板电容器的电场线与电场矢量分布';
    readonly modelType = 'electric-field-lines' as const;
    readonly assumptions = [
        '静电场',
        '真空中库仑定律 (F = k·|q₁q₂|/r²)',
        '平行板忽略边缘效应的近似 (仅作教学演示)',
        '二维截面 (忽略三维结构)'
    ];
    readonly applicableRange = '适用于点电荷系、电偶极子、平行板电容器等静电场可视化';
    readonly errorSources = ['平行板边缘效应未精确建模', '二维截面忽略三维结构'];
    readonly requiredParameters: ParameterSpec[] = [];

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
        const c = problem.constraints?.electricFieldLines;
        if (!c) {
            throw new PhysicsError(
                'MISSING_CONSTRAINT',
                'electric-field-lines 模型需要提供 constraints.electricFieldLines',
                { param: 'constraints.electricFieldLines' }
            );
        }

        const charges = this.resolveCharges(c);
        const steps = c.steps ?? 600;
        const maxLength = c.maxLength ?? 6;
        const lineCount = c.lineCount ?? 16;

        let fieldLines: Array<FieldLine> = [];
        let plates: { top: number; bottom: number; left: number; right: number } | undefined = undefined;
        let plateField: number | undefined = undefined;

        if (c.mode === 'parallel-plate') {
            const gap = c.plateGap ?? 1.2;
            const length = c.plateLength ?? 2.0;
            const voltage = c.plateVoltage ?? 12;
            plates = { top: gap / 2, bottom: -gap / 2, left: -length / 2, right: length / 2 };
            // 板间场强 E = U/d (V/m), 用场景→米比例换算
            plateField = voltage / (gap * SCENE_TO_M);
            fieldLines = this.parallelPlateLines(plates, lineCount);
        } else {
            fieldLines = this.integrateFieldLines(charges, lineCount, steps, maxLength);
        }

        const samples = this.sampleField(charges, plates, 7);

        const extra: ElectricFieldExtra = { fieldLines, samples };
        if (plates) extra.plates = plates;
        if (plateField !== undefined) extra.plateField = plateField;
        // 剖面曲线放入 extra (charts 联合类型未收录自定义键)
        extra.profile = this.buildProfile(samples);

        const summary =
            c.mode === 'parallel-plate'
                ? `平行板电容器 (U=${c.plateVoltage ?? 12}V, d=${(c.plateGap ?? 1.2).toFixed(2)} 场景单位): 板间匀强电场 E≈${plateField?.toExponential(2)} V/m, 电场线垂直于极板`
                : `静电场 (${charges.length} 个电荷): 电场线从正电荷发出、负电荷汇入, 不相交`;

        return {
            meta: {
                model: 'electric-field-lines',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [],
            keyframes: this.buildKeyframes(charges, plates),
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
                        description: '电场叠加',
                        formula: 'E = Σ k·q_i·r̂_i / r_i²',
                        calculation: `共 ${charges.length} 个电荷源参与叠加`
                    },
                    {
                        order: 2,
                        description: '电场线积分',
                        formula: 'dr/ds = E / |E|',
                        calculation: `从每个正电荷周围按 ${lineCount} 个方向播种并积分 ${steps} 步`
                    }
                ],
                formulas: [
                    {
                        name: '库仑定律',
                        formula: 'E = k·q/r²',
                        variables: { k: { value: K, unit: 'N·m²/C²' } }
                    }
                ]
            },
            extra: extra as unknown as Record<string, unknown>,
            errors: [],
            warnings: []
        };
    }

    /** 解析出电荷源列表 */
    private resolveCharges(c: ElectricFieldLinesConstraint): FieldCharge[] {
        if (c.mode === 'dipole') {
            const q = c.dipoleCharge ?? 5;
            const sep = c.dipoleSeparation ?? 1.0;
            return [
                { x: -sep / 2, y: 0, q },
                { x: sep / 2, y: 0, q: -q }
            ];
        }
        if (c.charges && c.charges.length > 0) return c.charges;
        return [{ x: 0, y: 0, q: 1 }];
    }

    /** 电荷量转为库仑 (nC → C) */
    private qC(qNC: number): number {
        return qNC * 1e-9;
    }

    /** 在 (x,y) 处求电场矢量 (归一化场景坐标) */
    private fieldAt(charges: FieldCharge[], x: number, y: number): { x: number; y: number } {
        let ex = 0;
        let ey = 0;
        for (const ch of charges) {
            const dx = x - ch.x;
            const dy = y - ch.y;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);
            if (r < 1e-4) continue; // 避开奇点
            const E = (K * this.qC(ch.q)) / (r2 * SCENE_TO_M * SCENE_TO_M);
            ex += (E * dx) / r;
            ey += (E * dy) / r;
        }
        return { x: ex, y: ey };
    }

    /** 从正电荷周围均匀播种, 沿电场方向积分出场线 */
    private integrateFieldLines(
        charges: FieldCharge[],
        lineCount: number,
        steps: number,
        maxLength: number
    ): FieldLine[] {
        const lines: FieldLine[] = [];
        const ds = maxLength / steps;
        for (const ch of charges) {
            if (ch.q <= 0) continue; // 仅从正电荷发出
            for (let i = 0; i < lineCount; i++) {
                const theta = (2 * Math.PI * i) / lineCount;
                let x = ch.x + 0.02 * Math.cos(theta);
                let y = ch.y + 0.02 * Math.sin(theta);
                const points: Array<{ x: number; y: number }> = [{ x: ch.x, y: ch.y }];
                for (let s = 0; s < steps; s++) {
                    const f = this.fieldAt(charges, x, y);
                    const mag = Math.hypot(f.x, f.y);
                    if (mag < 1e-9) break;
                    x += (ds * f.x) / mag;
                    y += (ds * f.y) / mag;
                    points.push({ x, y });
                    // 终止: 接近某负电荷
                    let absorbed = false;
                    for (const other of charges) {
                        if (other.q < 0 && Math.hypot(x - other.x, y - other.y) < 0.03) {
                            points.push({ x: other.x, y: other.y });
                            absorbed = true;
                            break;
                        }
                    }
                    if (absorbed) break;
                    if (Math.hypot(x, y) > 2.5) break; // 出界
                }
                lines.push({ points, sign: 1 });
            }
        }
        return lines;
    }

    /** 平行板匀强场的电场线: 板间等距竖直直线 + 端部轻微外凸 */
    private parallelPlateLines(
        plates: { top: number; bottom: number; left: number; right: number },
        lineCount: number
    ): FieldLine[] {
        const lines: FieldLine[] = [];
        const n = lineCount;
        for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const x = plates.left + t * (plates.right - plates.left);
            const points: Array<{ x: number; y: number }> = [];
            const segs = 40;
            for (let s = 0; s <= segs; s++) {
                const fy = -1 + (2 * s) / segs; // 从下板到上板
                const fringe = 0.12 * Math.sin(((fy + 1) / 2) * Math.PI) * (x < 0 ? -1 : 1);
                points.push({ x: x + fringe, y: fy });
            }
            lines.push({ points, sign: 1 });
        }
        return lines;
    }

    /** 规则网格采样矢量场 */
    private sampleField(
        charges: FieldCharge[],
        plates: { top: number; bottom: number; left: number; right: number } | undefined,
        n: number
    ): FieldSample[] {
        const samples: FieldSample[] = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const x = -1 + (2 * i) / (n - 1);
                const y = -1 + (2 * j) / (n - 1);
                let f: { x: number; y: number };
                if (plates) {
                    // 平行板: 板间竖直匀强场, 板外近零
                    const inside = x > plates.left && x < plates.right && y > plates.bottom && y < plates.top;
                    f = inside ? { x: 0, y: 1 } : { x: 0, y: 0 };
                } else {
                    f = this.fieldAt(charges, x, y);
                }
                samples.push({ x, y, ex: f.x, ey: f.y, magnitude: Math.hypot(f.x, f.y) });
            }
        }
        return samples;
    }

    private buildKeyframes(
        charges: FieldCharge[],
        plates: { top: number; bottom: number; left: number; right: number } | undefined
    ): Keyframe[] {
        if (plates) {
            return [
                {
                    label: '上板 (+)',
                    t: 0,
                    position: { x: 0, y: plates.top },
                    velocity: { x: 0, y: 0 },
                    description: '上极板带正电'
                },
                {
                    label: '下板 (−)',
                    t: 0,
                    position: { x: 0, y: plates.bottom },
                    velocity: { x: 0, y: 0 },
                    description: '下极板带负电, 电场线垂直指向负极板'
                }
            ];
        }
        return charges.map((ch, idx) => ({
            label: ch.q >= 0 ? `正电荷 ${idx + 1}` : `负电荷 ${idx + 1}`,
            t: 0,
            position: { x: ch.x, y: ch.y },
            velocity: { x: 0, y: 0 },
            description: `q=${ch.q} nC 位于 (${ch.x}, ${ch.y})`
        }));
    }

    private buildProfile(samples: FieldSample[]): ChartSeries {
        return {
            xLabel: 'x (场景)',
            yLabel: '|E| (相对)',
            xUnit: 'scene',
            yUnit: 'a.u.',
            points: samples
                .filter(s => Math.abs(s.y) < 1e-6)
                .map(s => ({ x: s.x, y: s.magnitude }))
        };
    }
}
