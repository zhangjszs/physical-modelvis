/**
 * 高 DPI（Retina / 2x / 3x）canvas 缓冲区配置工具。
 *
 * 问题：默认 canvas 的后备缓冲区等于其 CSS 显示尺寸（1:1），在 devicePixelRatio > 1 的
 * 屏幕上会被浏览器拉伸，导致线条/文字发虚。
 *
 * 方案：把后备缓冲区设为 device 像素（cssW * dpr），但把 CSS 显示尺寸保持为 cssW/cssH，
 * 使绘制坐标仍以 CSS 像素书写。调用方需随后执行 `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`，
 * 让所有以 CSS 像素书写的绘制自动映射到 device 像素。
 *
 * @returns 实际使用的 devicePixelRatio（便于调用方设置变换矩阵）
 */
export function setupHiDPICanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number): number {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    return dpr;
}
