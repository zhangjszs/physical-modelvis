import type { Vector3D } from '../types/common.js';
import { Vec3 } from '../math/vector3d.js';

/**
 * 3D Boris 数值积分器 — 带电粒子在任意 (E(r), B(r)) 中的轨迹。
 *
 * 与 em-combined-field 模型内 2D 匀强场特化版不同, 本层面向"拖拽组合
 * 电磁实验": 场由 fields3d 的场源叠加给出, 随空间位置变化, 每步在粒子
 * 当前位置重新求值。Boris 推进器 (半步电场 kick → 磁场精确旋转 → 半步
 * kick) 在纯磁场下严格保持能量与回旋半径, 是带电粒子模拟的工业标准。
 *
 * 实现: 标准 leapfrog 形式, 速度存于半步时刻 v(t−dt/2), 位置用半步速度
 * 推进 — 这保证匀强磁场中离散轨道是**精确圆** (整周期后严格回到起点)。
 * 启动时由整数时刻初速 (x₀, v₀) 精确回推半步速度 (退两次半步电场 kick
 * + 绕磁场回转 −α/2), 使第一步即落在真实轨道上。
 *
 * 纯 2D 匀强场场景仍应使用 em-combined-field 模型 (解析特化路径更精确);
 * 本层服务于 3D / 非匀强 / 组合场。
 */

/** 单点的电磁场快照 */
export interface FieldAtPoint {
    readonly E: Vector3D;
    readonly B: Vector3D;
}

/** 场求值器 — 在给定位置返回 (E, B)。由 fields3d 的 total*Field 组合而成。 */
export type FieldEvaluator = (position: Vector3D) => FieldAtPoint;

/** 单步允许的最大回旋角 |q|·B·dt/(2m) (rad)。
 *
 * 超过 π/4 时单步转角过大会放大相位误差, 故帧内自动细分子步
 * (与 em-combined-field 的 BORIS_MAX_TZ 同源)。
 */
const BORIS_MAX_TZ = Math.PI / 4;

/** 3D 轨迹点 — **独立于 `SimulationResult` 的 3D 通道**（#56 接口归属决策, 采用方案 A）。
 *
 * 为什么不归并进 types/result.ts 的 `SimulationResult`：`SimulationResult.trajectories`
 * 的元素 `TrajectoryPoint`(`position`/`velocity`: `Vector2D`) 是渲染层单一真源契约的支点 ——
 * 被 123 个场景、`getFrame()` 与 `visualization/tests/accuracy/single-source-contract.test.ts`
 * 全面依赖; 把它扩成 2D/3D 联合类型属破坏性变更, 波及整个渲染层, 收益不足以抵消风险。
 * 故 `borisTrajectory3D` 返回本独立结构, 由调用方（3D 可视化 / 组合实验台）单独消费。
 * 若将来渲染层确立统一的 3D 轨迹契约, 再评估归并（届时需同步改上述依赖面）。 */
export interface TrajectoryPoint3D {
    readonly t: number;
    readonly position: Vector3D;
    readonly velocity: Vector3D;
    readonly kineticEnergy: number;
}

export interface BorisTrajectory3DOptions {
    /** 电荷量 (C), 可为负 */
    readonly charge: number;
    /** 质量 (kg), 必须为正 */
    readonly mass: number;
    /** 初始位置 (m) */
    readonly x0: Vector3D;
    /** 初速度 (m/s) */
    readonly v0: Vector3D;
    /** 场求值器 (E(r), B(r)) */
    readonly fieldAt: FieldEvaluator;
    /** 仿真时长 (s) */
    readonly duration: number;
    /** 输出采样帧数 (含首尾, 实际帧数 = sampleCount + 1), 默认 1000 */
    readonly sampleCount?: number;
    /** 单步最大回旋角 (rad), 默认 π/4 */
    readonly maxCyclotronStep?: number;
}

export interface BorisTrajectory3DResult {
    readonly points: TrajectoryPoint3D[];
    /** 数值过程告警 (子步加密 / 发散截断) */
    readonly warnings: string[];
    /** 实际执行的内部子步总数 (含所有帧) */
    readonly stepCount: number;
}

function kineticEnergy3D(mass: number, v: Vector3D): number {
    return 0.5 * mass * Vec3.magnitudeSq(v);
}

/**
 * Boris 精确旋转 — 绕轴 t⃗ (|t⃗| = tan(α/2), 方向即转轴) 把 v 恰好旋转 α 角。
 * 两次叉积构成正交旋转 (v' = v + v×t; v⁺ = v + v'×s, s = 2t/(1+|t|²)),
 * 严格保持 |v|, 这是 Boris 格式能量长期能界定的根源。
 */
function borisRotate(v: Vector3D, t: Vector3D): Vector3D {
    const s = Vec3.scale(t, 2 / (1 + Vec3.magnitudeSq(t)));
    const vPrime = Vec3.add(v, Vec3.cross(v, t));
    return Vec3.add(v, Vec3.cross(vPrime, s));
}

/**
 * 在 (E(r), B(r)) 场中积分带电粒子轨迹。
 *
 * 输出帧均匀铺满 [0, duration]; 帧内按回旋角上限自适应细分子步,
 * 保证强磁场区域单步转角不超过 maxCyclotronStep。
 * 数值发散 (位置/速度出现非有限值) 时停止积分并回填告警,
 * 返回已完成的完整帧。
 */
export function borisTrajectory3D(options: BorisTrajectory3DOptions): BorisTrajectory3DResult {
    const { charge, mass, x0, v0, fieldAt } = options;
    const duration = options.duration;
    const sampleCount = options.sampleCount ?? 1000;
    const maxTz = options.maxCyclotronStep ?? BORIS_MAX_TZ;

    if (!(mass > 0) || !Number.isFinite(mass)) {
        throw new Error(`质量必须为正的有限数, 当前: ${mass}`);
    }
    if (!(duration > 0) || !Number.isFinite(duration)) {
        throw new Error(`仿真时长必须为正的有限数, 当前: ${duration}`);
    }
    if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
        throw new Error(`采样帧数必须为正整数, 当前: ${sampleCount}`);
    }

    const warnings: string[] = [];
    const dtFrame = duration / sampleCount;
    const points: TrajectoryPoint3D[] = [];
    const qm = charge / mass;

    let x = x0;
    let stepCount = 0;
    let usedSubstepping = false;
    let diverged = false;

    // —— leapfrog 启动: 由整数时刻 (x₀, v₀) 回推半步速度 v(t₀ − dtFirst/2)
    // 回退半步 = 退一次半步电场 kick + 沿物理回旋反方向回转半角:
    //   v(t₀−dt/2) = R(+α/2)·(v₀ − qE·dt/2)
    const field0 = fieldAt(x0);
    const qB0 = Math.abs(charge) * Vec3.magnitude(field0.B);
    const dtMax0 = qB0 > 0 ? (2 * maxTz * mass) / qB0 : Number.POSITIVE_INFINITY;
    const dtFirst = Math.min(dtFrame, dtMax0);
    let vHalf = Vec3.add(v0, Vec3.scale(field0.E, (-qm * dtFirst) / 2));
    const tF = Vec3.scale(field0.B, (qm * dtFirst) / 2); // |tF| = tan(α/2), α 为首步回旋角
    const tfMag = Vec3.magnitude(tF);
    if (tfMag > 0) {
        // borisRotate(v, +t) 沿推转方向旋转 (q>0, B=+ẑ 时为顺时针),
        // 时间回退须反向: tBack = −tan(α/4)·B̂, tan(α/4) = tan(α/2)/(1+√(1+tan²(α/2)))
        const tBack = Vec3.scale(tF, -1 / (1 + Math.sqrt(1 + tfMag * tfMag)));
        vHalf = borisRotate(vHalf, tBack);
    }

    points.push({ t: 0, position: x, velocity: v0, kineticEnergy: kineticEnergy3D(mass, v0) });

    for (let i = 1; i <= sampleCount && !diverged; i++) {
        const tTarget = i * dtFrame;
        let t = (i - 1) * dtFrame;
        let lastDt = 0;
        while (t < tTarget) {
            const field = fieldAt(x);
            // 回旋角保护: dt ≤ 2·maxTz·m/(|q|·|B|); 无磁场或无电荷时不设限
            const qB = Math.abs(charge) * Vec3.magnitude(field.B);
            const dtMax = qB > 0 ? (2 * maxTz * mass) / qB : Number.POSITIVE_INFINITY;
            const dt = Math.min(tTarget - t, dtMax);
            if (dt < tTarget - t) usedSubstepping = true;

            // leapfrog Boris: vHalf 从 t−dt/2 推进到 t+dt/2, 位置用半步速度更新
            const vMinus = Vec3.add(vHalf, Vec3.scale(field.E, (qm * dt) / 2));
            const tV = Vec3.scale(field.B, (qm * dt) / 2);
            const vHalfNew = Vec3.add(borisRotate(vMinus, tV), Vec3.scale(field.E, (qm * dt) / 2));
            const xNew = Vec3.add(x, Vec3.scale(vHalfNew, dt));

            x = xNew;
            vHalf = vHalfNew;
            t += dt;
            lastDt = dt;
            stepCount++;

            if (!Number.isFinite(x.x + x.y + x.z + vHalf.x + vHalf.y + vHalf.z)) {
                warnings.push(`数值发散: t≈${t.toFixed(3)}s 处位置或速度出现非有限值, 积分提前终止`);
                diverged = true;
                break;
            }
        }
        if (diverged) break;
        // 帧边界整点速度: v(t_n) ≈ vHalf(t_n − dtLast/2) + qE·dtLast/2
        const fieldEnd = fieldAt(x);
        const vInt = Vec3.add(vHalf, Vec3.scale(fieldEnd.E, (qm * lastDt) / 2));
        points.push({ t: tTarget, position: x, velocity: vInt, kineticEnergy: kineticEnergy3D(mass, vInt) });
    }

    if (usedSubstepping && !diverged) {
        warnings.push(`已启用回旋角保护: 强磁场区域帧内细分子步 (上限 ${maxTz} rad/步)`);
    }

    return { points, warnings, stepCount };
}
