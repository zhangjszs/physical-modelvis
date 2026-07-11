import type { PhysicsProblem } from '../types/problem.js';
import type {
    SimulationResult,
    TrajectoryPoint,
    Keyframe,
    ChartSeries,
    ExplanationStep,
    FormulaUsage
} from '../types/result.js';
import type { ParameterSpec, Vector2D } from '../types/common.js';
import { PhysicsModelBase } from './base.js';
import { Vec2 } from '../math/vector2d.js';

/**
 * 悬挂法确定均匀薄板重心 — 二力平衡原理 (必修一 §3 拓展实验)
 *
 * 物理原理:
 *   - 二力平衡: 物体在重力和拉力作用下静止 → 两力共线反向 → 重力作用线必过悬挂点
 *   - 二次悬挂法: 两次不同悬挂点的悬挂线延长线交点 = 重心
 *   - 数学基础: 直线-直线交点解析解
 *
 * 模型功能:
 *   1. 计算多边形形心 (均匀密度 → 形心 = 重心)
 *   2. 选取两指定悬挂点, 由形心 + 悬挂点确定两条悬挂线
 *   3. 计算两线交点 (理论上 = 形心, 数值误差应 < 1e-6)
 */
export class CenterOfGravityModel extends PhysicsModelBase {
    readonly name = '悬挂法确定重心';
    readonly version = '1.0.0';
    readonly description = '基于二力平衡原理, 通过两次不同点的悬挂线交点确定均匀密度薄板的重心 (形心)';
    readonly modelType = 'center-of-gravity' as const;
    readonly assumptions = [
        '物体视为均匀密度薄板 (面密度恒定)',
        '重力场均匀 (g 恒定, 方向竖直向下)',
        '物体处于静止平衡状态',
        '悬挂点位于薄板平面内',
        '忽略悬挂绳质量与伸长'
    ];
    readonly applicableRange = '适用于任意形状均匀密度薄板 (或多边形近似) 的重心测定';
    readonly errorSources = [
        '实际薄板密度可能不均匀',
        '悬挂线与薄板平面存在夹角',
        '悬挂点摩擦或绳的柔性导致偏差',
        '多边形顶点测量误差'
    ];
    readonly requiredParameters: ParameterSpec[] = [
        { name: 'vertices', description: '多边形顶点 (均匀密度)', unit: 'm', required: true },
        {
            name: 'suspensionIndex1',
            description: '第一次悬挂点索引',
            unit: '',
            required: false,
            defaultValue: 0,
            min: 0
        },
        { name: 'suspensionIndex2', description: '第二次悬挂点索引', unit: '', required: false, min: 0 }
    ];

    solve(problem: PhysicsProblem): SimulationResult {
        this.throwIfInvalid(problem);

        const c = problem.constraints?.centerOfGravity;
        if (!c) {
            throw new Error('悬挂法重心模型需要 constraints.centerOfGravity 配置');
        }

        const vertices = c.vertices;
        if (!vertices || vertices.length < 3) {
            throw new Error('多边形至少需要 3 个顶点');
        }
        const n = vertices.length;

        const idx1 = c.suspensionIndex1 ?? 0;
        const idx2 = c.suspensionIndex2 ?? n - 1;

        if (idx1 < 0 || idx1 >= n) {
            throw new Error(`第一次悬挂点索引越界: ${idx1} (多边形共 ${n} 个顶点)`);
        }
        if (idx2 < 0 || idx2 >= n) {
            throw new Error(`第二次悬挂点索引越界: ${idx2} (多边形共 ${n} 个顶点)`);
        }
        if (idx1 === idx2) {
            throw new Error('两次悬挂点不能相同');
        }

        // === 1. 多边形形心 (均匀密度) ===
        const { centroid, area, signedArea } = this.computePolygonCentroid(vertices);

        if (area < 1e-12) {
            throw new Error('多边形面积为零 (顶点共线或重合)');
        }

        // === 2. 两次悬挂线交点 ===
        const susp1 = vertices[idx1]!;
        const susp2 = vertices[idx2]!;

        // 悬挂线方向: 过悬挂点与形心, 反向延长便于可视化
        const line1dir = Vec2.sub(centroid, susp1);
        const line2dir = Vec2.sub(centroid, susp2);

        // 检查两线是否平行 (理论上不应平行, 不同悬挂点→形心线)
        const det = line1dir.x * line2dir.y - line1dir.y * line2dir.x;
        const isParallel = Math.abs(det) < 1e-12;

        let intersection: Vector2D = centroid;
        let intersectionError = 0;

        if (!isParallel) {
            // 参数方程: L1 = s1 + u * d1, L2 = s2 + v * d2
            // 解: u = cross(s2 - s1, d2) / cross(d1, d2)
            // cross 表示 2D 叉积 (z分量)
            const d = Vec2.sub(susp2, susp1);
            const cross_d1_d2 = line1dir.x * line2dir.y - line1dir.y * line2dir.x;
            const cross_d_d2 = d.x * line2dir.y - d.y * line2dir.x;
            const u = cross_d_d2 / cross_d1_d2;
            intersection = {
                x: susp1.x + u * line1dir.x,
                y: susp1.y + u * line1dir.y
            };
            intersectionError = Vec2.distance(intersection, centroid);
        }

        // === 3. 构建结果 ===
        // 轨迹: 重心在 t=0 处 (静态)
        const trajectory: TrajectoryPoint[] = [
            {
                t: 0,
                position: { x: centroid.x, y: centroid.y },
                velocity: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 },
                kineticEnergy: 0,
                potentialEnergy: 0
            }
        ];

        // 关键帧: 悬挂点1, 悬挂点2, 交点(重心)
        const keyframes: Keyframe[] = [
            {
                label: '悬挂点 1',
                t: 0,
                position: { x: susp1.x, y: susp1.y },
                velocity: { x: 0, y: 0 },
                description: `第一次悬挂点 (顶点 #${idx1}) [${susp1.x.toFixed(3)}, ${susp1.y.toFixed(3)}]`
            },
            {
                label: '悬挂点 2',
                t: 0,
                position: { x: susp2.x, y: susp2.y },
                velocity: { x: 0, y: 0 },
                description: `第二次悬挂点 (顶点 #${idx2}) [${susp2.x.toFixed(3)}, ${susp2.y.toFixed(3)}]`
            },
            {
                label: '重心 (交点)',
                t: 0,
                position: { x: centroid.x, y: centroid.y },
                velocity: { x: 0, y: 0 },
                description: `两次悬挂线交点 = 形心 [${centroid.x.toFixed(3)}, ${centroid.y.toFixed(3)}]`
            }
        ];

        // 静态示意图: 多边形轮廓 + 悬挂线 + 重心
        // 点序列约定:
        //   [0 .. n)                                  — 多边形顶点 (首尾相接)
        //   [n .. n+2)                                — 悬挂线1 (susp1 → centroid)
        //   [n+2 .. n+4)                              — 悬挂线2 (susp2 → centroid)
        //   [n+4 .. n+4+3)                            — 重心标记 (三个点组成小三角)
        const line1End = centroid;
        const line2End = centroid;
        const markSize = Math.max(area, 0.01) * 0.05;
        const centroidMarker: Vector2D[] = [
            { x: centroid.x, y: centroid.y + markSize },
            { x: centroid.x - markSize * 0.866, y: centroid.y - markSize * 0.5 },
            { x: centroid.x + markSize * 0.866, y: centroid.y - markSize * 0.5 }
        ];
        const points: Array<{ x: number; y: number }> = [
            ...vertices.map(v => ({ x: v.x, y: v.y })),
            { x: susp1.x, y: susp1.y },
            { x: line1End.x, y: line1End.y },
            { x: susp2.x, y: susp2.y },
            { x: line2End.x, y: line2End.y },
            ...centroidMarker
        ];

        const staticDiagram: ChartSeries = {
            xLabel: 'x',
            yLabel: 'y',
            xUnit: 'm',
            yUnit: 'm',
            points
        };

        // 公式与说明
        const formulas: FormulaUsage[] = [
            {
                name: '多边形形心 x 分量',
                formula: 'C_x = (1/6A)·Σ(xᵢ+xᵢ₊₁)(xᵢyᵢ₊₁ - xᵢ₊₁yᵢ)',
                variables: { A: { value: area, unit: 'm²' }, C_x: { value: centroid.x, unit: 'm' } }
            },
            {
                name: '多边形形心 y 分量',
                formula: 'C_y = (1/6A)·Σ(yᵢ+yᵢ₊₁)(xᵢyᵢ₊₁ - xᵢ₊₁yᵢ)',
                variables: { A: { value: area, unit: 'm²' }, C_y: { value: centroid.y, unit: 'm' } }
            },
            {
                name: '多边形面积 (鞋带公式)',
                formula: 'A = ½|Σ(xᵢyᵢ₊₁ - xᵢ₊₁yᵢ)|',
                variables: { A: { value: area, unit: 'm²' } }
            },
            {
                name: '二力平衡',
                formula: '重力作用线 过悬挂点',
                variables: {}
            },
            {
                name: '直线交点',
                formula: 'u = cross(s₂-s₁, d₂) / cross(d₁, d₂)',
                variables: {}
            }
        ];

        const steps: ExplanationStep[] = [
            {
                order: 1,
                description: '原理：二力平衡',
                formula: '静止物体受重力和拉力 → 二力共线 → 重力作用线必过悬挂点',
                result: '重力作用线是过悬挂点的竖直线'
            },
            {
                order: 2,
                description: '第一次悬挂',
                formula: 'L₁ 过 s₁(悬挂点) 与 C(重心)',
                calculation: `s₁ = [${susp1.x.toFixed(3)}, ${susp1.y.toFixed(3)}]`,
                result: 'L₁ 是重力的作用线'
            },
            {
                order: 3,
                description: '第二次悬挂',
                formula: 'L₂ 过 s₂(第二悬挂点) 与 C(重心)',
                calculation: `s₂ = [${susp2.x.toFixed(3)}, ${susp2.y.toFixed(3)}]`,
                result: 'L₂ 是重力的另一条作用线'
            },
            {
                order: 4,
                description: '交点确定重心',
                formula: 'L₁ ∩ L₂ = C(重心)',
                calculation: `C = [${centroid.x.toFixed(3)}, ${centroid.y.toFixed(3)}], 交点误差 ε = ${intersectionError.toExponential(2)}`,
                result: '两线唯一交点即为薄板重心'
            }
        ];

        return {
            meta: this.makeMeta('analytical'),
            trajectories: [trajectory],
            keyframes,
            charts: { 'static-diagram': staticDiagram },
            diagnostics: {
                conservedQuantities: [],
                maxValues: {
                    polygonArea: area,
                    signedArea,
                    vertexCount: n,
                    centroidX: centroid.x,
                    centroidY: centroid.y,
                    intersectionX: intersection.x,
                    intersectionY: intersection.y,
                    intersectionError,
                    suspensionIdx1: idx1,
                    suspensionIdx2: idx2,
                    suspensionX1: susp1.x,
                    suspensionY1: susp1.y,
                    suspensionX2: susp2.x,
                    suspensionY2: susp2.y
                },
                rangeCheck: {
                    withinRange: intersectionError < 1e-6 && !isParallel,
                    warnings: isParallel
                        ? ['两次悬挂线与形心共线 (两线平行), 无法通过交点确定重心']
                        : intersectionError > 1e-6
                          ? [`交点与形心偏差 ${intersectionError.toExponential(2)} 超出容差 1e-6`]
                          : []
                }
            },
            explanation: {
                summary: `均匀密度薄板 (面积 A=${area.toFixed(4)} m², ${n} 顶点); 形心 (重心) 位于 C=[${centroid.x.toFixed(3)}, ${centroid.y.toFixed(3)}] m; 两次悬挂线交点与形心偏差 ε=${intersectionError.toExponential(2)}`,
                steps,
                formulas
            },
            errors: [],
            warnings: isParallel ? ['两次悬挂线与形心共线 — 请更换悬挂点'] : []
        };
    }

    /**
     * 计算多边形形心 (均匀密度)
     * 公式:
     *   A  = ½ Σ (xᵢ yᵢ₊₁ - xᵢ₊₁ yᵢ)
     *   Cx = (1/6A) Σ (xᵢ + xᵢ₊₁)(xᵢ yᵢ₊₁ - xᵢ₊₁ yᵢ)
     *   Cy = (1/6A) Σ (yᵢ + yᵢ₊₁)(xᵢ yᵢ₊₁ - xᵢ₊₁ yᵢ)
     */
    private computePolygonCentroid(vertices: ReadonlyArray<Vector2D>): {
        centroid: Vector2D;
        area: number;
        signedArea: number;
    } {
        const n = vertices.length;
        let cross = 0;
        let cx = 0;
        let cy = 0;

        for (let i = 0; i < n; i++) {
            const vi = vertices[i]!;
            const vj = vertices[(i + 1) % n]!;
            const cross_i = vi.x * vj.y - vj.x * vi.y;
            cross += cross_i;
            cx += (vi.x + vj.x) * cross_i;
            cy += (vi.y + vj.y) * cross_i;
        }

        const signedArea = cross / 2;
        const area = Math.abs(signedArea);

        if (area < 1e-14) {
            return { centroid: { x: 0, y: 0 }, area: 0, signedArea };
        }

        const inv = 1 / (6 * signedArea);
        return {
            centroid: { x: cx * inv, y: cy * inv },
            area,
            signedArea
        };
    }
}
