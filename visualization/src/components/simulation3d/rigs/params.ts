/**
 * 参数安全取值助手
 *
 * `params['key'] ?? default` 只捕 null/undefined；slider 清空产生的 NaN 会穿透到
 * cos/sin 产生 NaN 球体坐标。Number.isNaN 双重守卫堵住这条路径。
 */
export const num = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
};

/**
 * 更新文字精灵 (makeTextSprite 产物) 的画布内容。
 * sprite 的材质贴图是一个 2D canvas，重绘后需置 needsUpdate。
 */
export const setLabel = (sprite: import('three').Sprite, text: string, color = '#334155'): void => {
    const canvas = (sprite.material as import('three').SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '600 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    (sprite.material as import('three').SpriteMaterial).map!.needsUpdate = true;
};
