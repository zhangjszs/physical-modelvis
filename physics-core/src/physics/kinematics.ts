/**
 * 运动学公式 — 纯函数工具集
 *
 * 集中管理散落各模型的基础运动学公式, 避免同一公式在多处手写导致漂移.
 */

/**
 * 动能: KE = 1/2 * m * v^2
 *
 * @param mass  质量 (kg)
 * @param speed 速率 (m/s)
 * @returns 动能 (J)
 */
export function kineticEnergy(mass: number, speed: number): number {
    return 0.5 * mass * speed * speed;
}
