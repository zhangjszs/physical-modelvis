import { CoordinateTransformer } from './CoordinateTransformer';
import { COLORS } from '../utils/colorMap';
import type { VisibleLayers, Vec2 } from '../types/visualization';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private transformer: CoordinateTransformer;
  private layers: VisibleLayers;
  private isDark: boolean;

  constructor(
    ctx: CanvasRenderingContext2D,
    transformer: CoordinateTransformer,
    layers: VisibleLayers,
    isDark: boolean,
  ) {
    this.ctx = ctx;
    this.transformer = transformer;
    this.layers = layers;
    this.isDark = isDark;
  }

  update(transformer: CoordinateTransformer, layers: VisibleLayers, isDark: boolean) {
    this.transformer = transformer;
    this.layers = layers;
    this.isDark = isDark;
  }

  clear(width: number, height: number) {
    this.ctx.fillStyle = this.isDark ? COLORS.bgDark : COLORS.bgLight;
    this.ctx.fillRect(0, 0, width, height);
  }

  drawGrid(width: number, height: number) {
    if (!this.layers.grid) return;
    const ctx = this.ctx;
    const scale = this.transformer.getScale();

    // 计算合适的网格间距（物理单位）
    const gridSpacing = this.calcGridSpacing(scale);
    const screenSpacing = gridSpacing * scale;

    ctx.strokeStyle = this.isDark ? 'rgba(100,116,139,0.15)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;

    const origin = this.transformer.toScreen({ x: 0, y: 0 });

    // 竖线
    for (let x = origin.x % screenSpacing; x < width; x += screenSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let x = origin.x % screenSpacing - screenSpacing; x > 0; x -= screenSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 横线
    for (let y = origin.y % screenSpacing; y < height; y += screenSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let y = origin.y % screenSpacing - screenSpacing; y > 0; y -= screenSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  drawAxes(width: number, height: number) {
    if (!this.layers.axes) return;
    const ctx = this.ctx;
    const origin = this.transformer.toScreen({ x: 0, y: 0 });

    ctx.strokeStyle = this.isDark ? COLORS.axis : '#94a3b8';
    ctx.lineWidth = 2;

    // x 轴
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    // y 轴
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // 刻度标注
    ctx.fillStyle = this.isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    const scale = this.transformer.getScale();
    const gridSpacing = this.calcGridSpacing(scale);
    const screenSpacing = gridSpacing * scale;

    // x 刻度
    for (let x = origin.x % screenSpacing; x < width; x += screenSpacing) {
      const physX = this.transformer.toPhysical({ x, y: origin.y }).x;
      if (Math.abs(physX) < gridSpacing * 0.1) continue;
      ctx.fillText(physX.toFixed(1), x, origin.y + 16);
    }

    // y 刻度
    ctx.textAlign = 'right';
    for (let y = origin.y % screenSpacing; y < height; y += screenSpacing) {
      const physY = this.transformer.toPhysical({ x: origin.x, y }).y;
      if (Math.abs(physY) < gridSpacing * 0.1) continue;
      ctx.fillText(physY.toFixed(1), origin.x - 8, y + 4);
    }

    // 轴标签
    ctx.fillStyle = this.isDark ? '#e2e8f0' : '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x (m)', width - 50, origin.y - 8);
    ctx.textAlign = 'center';
    ctx.fillText('y (m)', origin.x + 20, 16);
  }

  drawTrajectory(points: Vec2[], color = COLORS.trajectory) {
    if (!this.layers.trajectory || points.length < 2) return;
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    const s0 = this.transformer.toScreen(points[0]!);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < points.length; i++) {
      const s = this.transformer.toScreen(points[i]!);
      ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }

  drawBody(pos: Vec2, radius: number, color: string, label?: string) {
    const ctx = this.ctx;
    const s = this.transformer.toScreen(pos);
    const r = Math.max(this.transformer.toScreenLength(radius), 6);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(s.x - r * 0.3, s.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (label && this.layers.bodyLabels) {
      ctx.fillStyle = this.isDark ? '#e2e8f0' : '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, s.x, s.y - r - 8);
    }
  }

  drawVector(origin: Vec2, vector: Vec2, color: string, label?: string, scale = 1) {
    const ctx = this.ctx;
    const sOrigin = this.transformer.toScreen(origin);
    const endX = origin.x + vector.x * scale;
    const endY = origin.y + vector.y * scale;
    const sEnd = this.transformer.toScreen({ x: endX, y: endY });

    const dx = sEnd.x - sOrigin.x;
    const dy = sEnd.y - sOrigin.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;

    // 箭头线
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sOrigin.x, sOrigin.y);
    ctx.lineTo(sEnd.x, sEnd.y);
    ctx.stroke();

    // 箭头头部
    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(12, len * 0.3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sEnd.x, sEnd.y);
    ctx.lineTo(
      sEnd.x - headLen * Math.cos(angle - 0.4),
      sEnd.y - headLen * Math.sin(angle - 0.4),
    );
    ctx.lineTo(
      sEnd.x - headLen * Math.cos(angle + 0.4),
      sEnd.y - headLen * Math.sin(angle + 0.4),
    );
    ctx.closePath();
    ctx.fill();

    // 标签
    if (label) {
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const midX = (sOrigin.x + sEnd.x) / 2;
      const midY = (sOrigin.y + sEnd.y) / 2;
      ctx.fillText(label, midX + 12, midY - 8);
    }
  }

  drawGround(y: number, width: number) {
    const ctx = this.ctx;
    const sY = this.transformer.toScreen({ x: 0, y }).y;

    ctx.strokeStyle = this.isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sY);
    ctx.lineTo(width, sY);
    ctx.stroke();

    // 地面阴影
    ctx.fillStyle = this.isDark ? 'rgba(71,85,105,0.2)' : 'rgba(148,163,184,0.15)';
    ctx.fillRect(0, sY, width, 200);
  }

  drawArrow(from: Vec2, to: Vec2, color: string) {
    const ctx = this.ctx;
    const s1 = this.transformer.toScreen(from);
    const s2 = this.transformer.toScreen(to);
    const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    const headLen = 10;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s2.x - headLen * Math.cos(angle - 0.4), s2.y - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(s2.x - headLen * Math.cos(angle + 0.4), s2.y - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  private calcGridSpacing(scale: number): number {
    // 目标：屏幕间距约 40-80px
    const targets = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    for (const t of targets) {
      if (t * scale >= 40 && t * scale <= 120) return t;
    }
    return 1;
  }
}
