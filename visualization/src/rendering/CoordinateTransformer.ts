import type { Vec2 } from '../types/visualization';

/** 物理坐标 ↔ 屏幕坐标转换器 */
export class CoordinateTransformer {
  private scale: number;       // px per meter
  private originX: number;     // 屏幕原点 x (px)
  private originY: number;     // 屏幕原点 y (px)

  constructor(canvasWidth: number, canvasHeight: number, scale = 80) {
    this.scale = scale;
    this.originX = canvasWidth / 2;
    this.originY = canvasHeight / 2;
  }

  /** 物理坐标 → 屏幕坐标 */
  toScreen(phys: Vec2): Vec2 {
    return {
      x: this.originX + phys.x * this.scale,
      y: this.originY - phys.y * this.scale, // y 轴翻转
    };
  }

  /** 屏幕坐标 → 物理坐标 */
  toPhysical(screen: Vec2): Vec2 {
    return {
      x: (screen.x - this.originX) / this.scale,
      y: (this.originY - screen.y) / this.scale,
    };
  }

  /** 物理长度 → 屏幕像素 */
  toScreenLength(physLen: number): number {
    return physLen * this.scale;
  }

  /** 获取当前缩放 */
  getScale(): number {
    return this.scale;
  }

  /** 自动缩放以适应轨迹范围 */
  autoFit(
    points: Vec2[],
    canvasWidth: number,
    canvasHeight: number,
    padding = 60,
  ): void {
    if (points.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const availW = canvasWidth - padding * 2;
    const availH = canvasHeight - padding * 2;

    this.scale = Math.min(availW / rangeX, availH / rangeY);
    this.originX = canvasWidth / 2 - centerX * this.scale;
    this.originY = canvasHeight / 2 + centerY * this.scale; // y 翻转
  }
}
