import type { PhysicsProblem, MicrometerConstraint } from '../types/problem.js';
import type { SimulationResult, TrajectoryPoint, Keyframe, ChartSeries, ExplanationStep } from '../types/result.js';
import type { ParameterSpec } from '../types/common.js';
import { PhysicsModelBase } from './base.js';

/**
 * 螺旋测微器读数模型 — 必修三 实验 (长度测量)
 *
 * 读数公式: L = a (固定刻度 mm) + b (半毫米刻度) + n × 0.01 mm (可动刻度)
 *   精度: 0.01 mm (估读到 0.001 mm)
 *   测量范围: 0 ~ 25 mm (典型小量程螺旋测微器)
 *
 * 本模型生成：
 *   - 固定刻度 a (mm, 0.5 分度可见)
 *   - 半毫米刻度 b (0 或 0.5 mm)
 *   - 可动刻度 n (0~49)
 *   - 最终读数 L = a + b + n×0.01 mm
 */
export class MicrometerModel extends PhysicsModelBase {
    readonly name = '螺旋测微器读数';
    readonly version = '1.0.0';
    readonly description = 'L = a + b + n×0.01 mm; 精度 0.01 mm; 读数练习';
    readonly modelType = 'micrometer' as const;
    readonly assumptions = [
        '螺旋测微器零点已校准 (无零误差)',
        '被测物体厚度在量程 0~25 mm 内',
        '测量时棘轮旋紧到标准力度',
        '读数时视线垂直于刻度筒'
    ];
    readonly applicableRange = '0 ~ 25 mm (典型千分尺量程)；精度 0.01 mm';
    readonly errorSources = [
        '零点漂移 (未校准)',
        '热胀冷缩影响',
        '测量力不一致 (棘轮未旋紧)',
        '刻度筒与固定套筒间隙导致的回程误差'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'thickness', description: '被测物体厚度 (mm)', unit: 'mm', required: true, min: 0.01, max: 25 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const mc = problem.constraints?.micrometer as MicrometerConstraint | undefined;
        if (!mc) throw new Error('micrometer 模型需要 micrometer 约束配置');

        const thickness = mc.thickness;
        const randomAngle = mc.randomAngle ?? 0;

        // 随机角度映射到可动刻度偏移 (0~49 格)
        const angleNorm = ((randomAngle % 360) + 360) % 360; // 0~360
        const angleDelta = (angleNorm / 360) * 0.5; // 0~0.5 mm 的随机偏移

        // 有效读数 = 厚度 + 随机偏移 (模拟随机测量位置)
        const effectiveThickness = thickness + angleDelta;

        // 固定刻度 a: 0.5mm 分度向下取整
        const a = Math.floor(effectiveThickness * 2) / 2; // 例如 5.5 或 6.0
        // 半毫米刻度 b: 若有小数部分 ≥ 0.5 则 b=0.5, 否则 0
        const remainderAfterA = effectiveThickness - a;
        const b = remainderAfterA >= 0.5 ? 0.5 : 0;
        // 可动刻度 n: (remainderAfterA - b) / 0.01, 四舍五入到 0~49
        const n = Math.min(49, Math.max(0, Math.round((remainderAfterA - b) / 0.01)));

        // 最终读数
        const reading = parseFloat((a + b + n * 0.01).toFixed(2));

        // 静态图示数据
        // x_t: 固定套筒刻度 (mm, 半毫米分度可见)
        const fixedScale: ChartSeries = {
            xLabel: '固定套筒位置 (mm)',
            yLabel: '刻度线',
            xUnit: 'mm',
            yUnit: '',
            points: Array.from({ length: 12 }, (_, i) => {
                const mm = Math.max(0, Math.floor(a) - 2 + i);
                const isHalf = i % 2 === 1;
                return { x: mm + (isHalf ? 0.5 : 0), y: 0 };
            })
        };

        // y_t: 可动筒刻度 (0~49 格)
        const movableScale: ChartSeries = {
            xLabel: '可动刻度格数',
            yLabel: '对齐基准线',
            xUnit: '格',
            yUnit: '',
            points: Array.from({ length: 10 }, (_, i) => {
                const mark = Math.floor(n / 5) - 5 + i;
                return { x: mark, y: mark === n ? 2 : 0.5 };
            })
        };

        // static-diagram: 螺旋测微器图示 (固定套筒 + 可动筒 + 读数线)
        const diagram = this.generateStaticDiagram(a, b, n, thickness, reading);

        const keyframes: Keyframe[] = [
            {
                label: '螺旋测微器读数',
                t: 0,
                position: { x: reading, y: n },
                velocity: { x: 0, y: 0 },
                description: `L = ${a} + ${b} + ${n}×0.01 = ${reading} mm (精度 0.01mm)`
            }
        ];

        const trajectory: TrajectoryPoint[] = [
            { t: 0, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, kineticEnergy: 0, potentialEnergy: 0 }
        ];

        const warnings: string[] = [];
        if (thickness > 25) warnings.push('超过螺旋测微器量程 25 mm, 需更换大量程型号');
        if (thickness < 0.5) warnings.push('厚度 < 0.5 mm, 建议使用更薄物或游标卡尺');
        if (n === 0 || n === 49) warnings.push('可动刻度接近边界 (0 或 49), 可能正好对齐');

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '读取固定套筒刻度 a (0.5 mm 分度)',
                formula: 'a = 固定套筒露出的最大半毫米整数',
                calculation: `a = ${a} mm`
            },
            {
                order: 2,
                description: '判断半毫米刻度 b 是否露出',
                formula: 'b = 0.5 mm (若半刻度线已露出) 否则 0',
                calculation: `b = ${b} mm ${b > 0 ? '(半刻度线露出)' : '(半刻度线未露出)'}`
            },
            {
                order: 3,
                description: '读取可动刻度 n (0~49 格)',
                formula: 'n = 可动筒上与固定套筒基线对齐的格数',
                calculation: `n = ${n} 格`
            },
            {
                order: 4,
                description: '计算最终读数',
                formula: 'L = a + b + n × 0.01 mm',
                calculation: `L = ${a} + ${b} + ${n}×0.01 = ${reading} mm`
            },
            {
                order: 5,
                description: '说明精度',
                formula: '精度 = 0.01 mm, 可估读到 0.001 mm',
                result: `读数 ${reading} mm 可估读为 ${reading.toFixed(3)} mm`
            }
        ];

        return {
            meta: {
                model: 'micrometer',
                solver: 'analytical',
                computationTime: 0,
                timestamp: new Date().toISOString(),
                version: this.version
            },
            trajectories: [trajectory],
            keyframes,
            charts: { x_t: fixedScale, y_t: movableScale, 'static-diagram': diagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    thickness,
                    randomAngle: angleNorm,
                    angleDelta,
                    a,
                    b,
                    n,
                    reading,
                    effectiveThickness
                },
                rangeCheck: { withinRange: warnings.length === 0, warnings }
            },
            explanation: {
                summary: `螺旋测微器: 厚度=${thickness}mm → 固定=${a}mm + 半=${b}mm + 可动=${n}×0.01mm = ${reading}mm`,
                steps,
                formulas: [
                    {
                        name: '螺旋测微器读数',
                        formula: 'L = a + b + n×0.01mm',
                        variables: {
                            L: { value: reading, unit: 'mm' },
                            a: { value: a, unit: 'mm' },
                            b: { value: b, unit: 'mm' },
                            n: { value: n, unit: '格' }
                        }
                    },
                    { name: '精度', formula: 'ΔL = 0.01mm', variables: { ΔL: { value: 0.01, unit: 'mm' } } }
                ]
            },
            errors: [],
            warnings
        };
    }

    /** 生成螺旋测微器静态图示数据 */
    private generateStaticDiagram(a: number, b: number, n: number, thickness: number, reading: number): ChartSeries {
        const points: Array<{ x: number; y: number }> = [];
        // 固定套筒基线 (y=0), 半毫米分度
        for (let mm = Math.max(0, Math.floor(a) - 1); mm <= a + 2; mm++) {
            points.push({ x: mm, y: 0 });
            points.push({ x: mm + 0.5, y: -0.3 }); // 半毫米线稍短
        }
        // 可动筒前沿 (x = a + b + n*0.01)
        points.push({ x: reading, y: 0.5 }); // 筒前沿
        points.push({ x: reading, y: -0.5 });
        // 可动筒上的对齐标记
        for (let i = 0; i <= 5; i++) {
            points.push({ x: a + b + i * 5 * 0.01, y: 0.3 });
        }
        // 被测物体参考线
        points.push({ x: thickness, y: -1 });
        // 最终读数标记
        points.push({ x: reading, y: 1 });
        return { xLabel: '位置 (mm)', yLabel: '层次', xUnit: 'mm', yUnit: '', points };
    }
}
