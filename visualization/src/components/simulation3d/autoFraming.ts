/**
 * 移动轨迹的自动取景计算（#165）
 *
 * 背景：EquipmentStage 原先只在 `rig.framing` 存在时才实时重取景；无 framing 的移动场景
 * 只把包围盒写进「默认视角预设」（initialViewRef），相机不动 —— 参数一变（射程/位移/高度
 * 大幅增大）主体就飞出画面（projectile v₀→70 / free-fall h→140 / newton-2nd F→40 …）。
 *
 * 本函数把「轨迹包围盒 → 相机 target/position/distance」抽成纯函数，供舞台在
 * simulationResult/parameters 变化时实时应用；静态（单点/退化）轨迹返回 null，交由 rig 显式 framing。
 */

export interface AutoFraming {
    target: [number, number, number];
    position: [number, number, number];
    distance: number;
}

/**
 * @param points 主轨迹的世界坐标点（已由 rig.getVisualPosition 映射）
 * @returns 移动轨迹的取景；点数 < 2 或包围盒退化（跨度 < 1e-6）时返回 null
 */
export function computeAutoFraming(points: ReadonlyArray<{ x: number; y: number }>): AutoFraming | null {
    if (points.length < 2) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    // 退化（单点/静止占位）→ 不接管取景
    if (spanX < 1e-6 && spanY < 1e-6) return null;

    const xMid = (minX + maxX) / 2;
    const yMid = Math.max(0.6, (minY + maxY) / 2);
    const effSpanX = Math.max(4, spanX);
    const effSpanY = Math.max(2, spanY);
    const distance = Math.max(5.5, effSpanX * 0.9, effSpanY * 1.2);
    return {
        target: [xMid, yMid, 0],
        position: [xMid + distance * 0.45, yMid + distance * 0.35, distance * 0.85],
        distance
    };
}
