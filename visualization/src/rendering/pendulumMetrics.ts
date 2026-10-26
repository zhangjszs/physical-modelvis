/**
 * 单摆周期实测 — 从引擎轨迹的过零点测量真实周期 (2D 板书与 3D 舞台共用)
 *
 * 单一真源要求: 渲染层不得用小角度公式 T = 2π√(L/g) 冒充引擎结果。
 * 大摆角下真实周期明显长于小角度近似 (θ₀ = 60° 时约 +17%),
 * 画面上直接标 2π√(L/g) 会与引擎轨迹对不上。
 *
 * 测量原理: 摆球水平位移 x(t) 过零 ⟺ 摆角过零 ⟺ 摆球经过平衡位置,
 * 相邻两次过零的间隔 = T/2 (半周期)。
 */

/** 轨迹点的最小结构 (只取 t 与 position.x) */
export interface PendulumTrajPoint {
    t: number;
    position: { x: number };
}

/**
 * 从轨迹实测单摆周期 (s)。
 * @param traj 引擎轨迹 (单摆为 trajectories[0])
 * @returns 周期 (s); 轨迹过短或无过零点时返回 null (调用方回退小角度公式)
 */
export function measurePendulumPeriod(traj: PendulumTrajPoint[] | undefined): number | null {
    if (!traj || traj.length < 4) return null;
    const crossings: number[] = [];
    for (let i = 1; i < traj.length; i++) {
        const a = traj[i - 1];
        const b = traj[i];
        if (!a || !b) continue;
        const xa = a.position.x;
        const xb = b.position.x;
        if (xa * xb < 0) {
            // 线性插值求过零时刻
            const f = xa / (xa - xb);
            crossings.push(a.t + f * (b.t - a.t));
        } else if (xa === 0 && xb !== 0) {
            // 恰好落在平衡位置: 只记一次 (xa===xb===0 是静止, 不算过零)
            crossings.push(a.t);
        }
    }
    if (crossings.length >= 2) {
        const T = (2 * (crossings[crossings.length - 1]! - crossings[0]!)) / (crossings.length - 1);
        return T > 0 ? T : null;
    }
    if (crossings.length === 1) {
        // 只有一个过零点: 起点在极端位置, 首次过零在 T/4 → T = 4t
        const T = 4 * crossings[0]!;
        return T > 0 ? T : null;
    }
    return null;
}
