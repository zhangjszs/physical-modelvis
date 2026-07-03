import { CoordinateTransformer } from './CoordinateTransformer';
import { COLORS } from '../utils/colorMap';
import type { VisibleLayers, Vec2 } from '../types/visualization';
import { labBenchTexture, clearTextureCache } from './textureFactory';

/**
 * 实物风格 Canvas 渲染器。
 *
 * 与旧版简约几何风格的区别：
 *  - 背景：渐变天空/实验台氛围，而非纯色
 *  - 网格：纸质感点阵，更柔和
 *  - 物体：径向渐变球体 + 投影 + 高光，呈现立体金属/玻璃球质感
 *  - 轨迹：渐隐尾迹（近端不透明→远端透明），而非等宽线
 *  - 向量：渐变描边 + 精致实心箭头
 *  - 地面：多层渐变 + 细密阴影线，模拟实验台面
 */
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
    const themeChanged = this.isDark !== isDark;
    this.transformer = transformer;
    this.layers = layers;
    this.isDark = isDark;
    if (themeChanged) clearTextureCache();
  }

  /* ------------------------------------------------------------------ */
  /*  背景                                                                */
  /* ------------------------------------------------------------------ */
  clear(width: number, height: number) {
    const ctx = this.ctx;
    if (this.isDark) {
      // 深色主题：深邃蓝黑渐变
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0c1222');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#1a1f35');
      ctx.fillStyle = grad;
    } else {
      // 浅色主题：柔和纸张白→淡灰蓝
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, '#f8fafc');
      grad.addColorStop(1, '#eef2f7');
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);
  }

  /* ------------------------------------------------------------------ */
  /*  网格 — 纸质点阵风格                                                 */
  /* ------------------------------------------------------------------ */
  drawGrid(width: number, height: number) {
    if (!this.layers.grid) return;
    const ctx = this.ctx;
    const scale = this.transformer.getScale();
    const gridSpacing = this.calcGridSpacing(scale);
    const screenSpacing = gridSpacing * scale;
    const origin = this.transformer.toScreen({ x: 0, y: 0 });

    // 点阵风格：在交叉点画小圆点而非满幅线条
    const dotR = this.isDark ? 1.0 : 0.8;
    ctx.fillStyle = this.isDark ? 'rgba(100,116,139,0.25)' : 'rgba(0,0,0,0.10)';

    const xStart = ((origin.x % screenSpacing) + screenSpacing) % screenSpacing;
    const yStart = ((origin.y % screenSpacing) + screenSpacing) % screenSpacing;

    for (let x = xStart; x < width; x += screenSpacing) {
      for (let y = yStart; y < height; y += screenSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  坐标轴 — 带刻度线的精致样式                                          */
  /* ------------------------------------------------------------------ */
  drawAxes(width: number, height: number) {
    if (!this.layers.axes) return;
    const ctx = this.ctx;
    const origin = this.transformer.toScreen({ x: 0, y: 0 });
    const axisColor = this.isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.45)';
    const tickColor = this.isDark ? '#94a3b8' : '#64748b';

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;

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
    ctx.fillStyle = tickColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';

    const scale = this.transformer.getScale();
    const gridSpacing = this.calcGridSpacing(scale);
    const screenSpacing = gridSpacing * scale;
    const tickLen = 4;

    // x 刻度 + 小刻度线
    for (let x = origin.x % screenSpacing; x < width; x += screenSpacing) {
      const physX = this.transformer.toPhysical({ x, y: origin.y }).x;
      if (Math.abs(physX) < gridSpacing * 0.1) continue;
      // 刻度线
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, origin.y - tickLen);
      ctx.lineTo(x, origin.y + tickLen);
      ctx.stroke();
      ctx.fillStyle = tickColor;
      ctx.fillText(physX.toFixed(1), x, origin.y + 18);
    }

    // y 刻度
    ctx.textAlign = 'right';
    for (let y = origin.y % screenSpacing; y < height; y += screenSpacing) {
      const physY = this.transformer.toPhysical({ x: origin.x, y }).y;
      if (Math.abs(physY) < gridSpacing * 0.1) continue;
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(origin.x - tickLen, y);
      ctx.lineTo(origin.x + tickLen, y);
      ctx.stroke();
      ctx.fillStyle = tickColor;
      ctx.fillText(physY.toFixed(1), origin.x - 10, y + 4);
    }

    // 轴标签（带背景高亮）
    const labelColor = this.isDark ? '#e2e8f0' : '#1e293b';
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x (m)', width - 50, origin.y - 10);
    ctx.textAlign = 'center';
    ctx.fillText('y (m)', origin.x + 22, 16);
  }

  /* ------------------------------------------------------------------ */
  /*  轨迹 — 渐隐尾迹效果                                                  */
  /* ------------------------------------------------------------------ */
  drawTrajectory(points: Vec2[], color = COLORS.trajectory) {
    if (!this.layers.trajectory || points.length < 2) return;
    const ctx = this.ctx;
    ctx.setLineDash([]);

    // 逐段绘制，透明度从尾端（不透明）到前端（半透明）渐变
    const total = points.length;

    for (let i = 0; i < total - 1; i++) {
      const progress = i / (total - 1); // 0=起点, 1=终点
      // 起点不透明，终点渐隐
      const alpha = 0.15 + 0.55 * (1 - progress);
      ctx.strokeStyle = colorWithAlpha(color, alpha);
      ctx.lineWidth = 1.5 + 1.0 * (1 - progress);

      const s0 = this.transformer.toScreen(points[i]!);
      const s1 = this.transformer.toScreen(points[i + 1]!);

      // 跳过过远的分段（避免跨屏线）
      if (Math.abs(s1.x - s0.x) > 800 || Math.abs(s1.y - s0.y) > 800) continue;

      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.stroke();
    }

    // 在轨迹上每隔一段画小光点（荧光尾迹效果）
    if (total > 10) {
      const step = Math.max(1, Math.floor(total / 20));
      for (let i = 0; i < total; i += step) {
        const progress = i / (total - 1);
        const alpha = 0.08 + 0.25 * (1 - progress);
        const s = this.transformer.toScreen(points[i]!);
        ctx.fillStyle = colorWithAlpha(color, alpha);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5 * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  物体 — 3D 球体（径向渐变 + 投影 + 高光）                              */
  /* ------------------------------------------------------------------ */
  drawBody(pos: Vec2, radius: number, color: string, label?: string) {
    const ctx = this.ctx;
    const s = this.transformer.toScreen(pos);
    const r = Math.max(this.transformer.toScreenLength(radius), 8);

    // 1. 投影（椭圆阴影偏下）
    ctx.fillStyle = this.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(s.x + r * 0.08, s.y + r * 0.15, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 主体 — 径向渐变（亮心→暗边）
    const bodyGrad = ctx.createRadialGradient(
      s.x - r * 0.25, s.y - r * 0.25, r * 0.1,
      s.x, s.y, r,
    );
    bodyGrad.addColorStop(0, lightenColor(color, 60));
    bodyGrad.addColorStop(0.4, color);
    bodyGrad.addColorStop(1, darkenColor(color, 40));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    // 3. 边缘暗环
    ctx.strokeStyle = darkenColor(color, 50);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 4. 高光（左上角亮斑）
    const hlGrad = ctx.createRadialGradient(
      s.x - r * 0.35, s.y - r * 0.35, 0,
      s.x - r * 0.35, s.y - r * 0.35, r * 0.55,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    // 5. 标签（带半透明背景）
    if (label && this.layers.bodyLabels) {
      const labelColor = this.isDark ? '#e2e8f0' : '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const lx = s.x;
      const ly = s.y - r - 12;
      const pad = 4;
      // 标签背景
      ctx.fillStyle = this.isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      const bw = metrics.width + pad * 2;
      const bh = 16;
      roundRect(ctx, lx - bw / 2, ly - bh / 2 - 1, bw, bh, 3);
      ctx.fill();
      // 标签文字
      ctx.fillStyle = labelColor;
      ctx.fillText(label, lx, ly + 4);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  向量 — 渐变描边 + 精致实心箭头                                       */
  /* ------------------------------------------------------------------ */
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

    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(14, len * 0.25);
    const headW = 0.38; // 箭头半角

    // 1. 箭杆 — 渐变描边（根部半透明→尖端不透明）
    const shaftGrad = ctx.createLinearGradient(sOrigin.x, sOrigin.y, sEnd.x, sEnd.y);
    shaftGrad.addColorStop(0, colorWithAlpha(color, 0.4));
    shaftGrad.addColorStop(0.6, colorWithAlpha(color, 0.85));
    shaftGrad.addColorStop(1, color);
    ctx.strokeStyle = shaftGrad;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sOrigin.x, sOrigin.y);
    ctx.lineTo(sEnd.x, sEnd.y);
    ctx.stroke();

    // 2. 箭头 — 实心三角，带轻微渐变
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sEnd.x, sEnd.y);
    ctx.lineTo(
      sEnd.x - headLen * Math.cos(angle - headW),
      sEnd.y - headLen * Math.sin(angle - headW),
    );
    ctx.lineTo(
      sEnd.x - headLen * 0.5 * Math.cos(angle),
      sEnd.y - headLen * 0.5 * Math.sin(angle),
    );
    ctx.lineTo(
      sEnd.x - headLen * Math.cos(angle + headW),
      sEnd.y - headLen * Math.sin(angle + headW),
    );
    ctx.closePath();
    ctx.fill();

    // 3. 标签（带背景）
    if (label) {
      const midX = (sOrigin.x + sEnd.x) / 2;
      const midY = (sOrigin.y + sEnd.y) / 2;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const lx = midX + 14;
      const ly = midY - 10;
      const pad = 3;
      ctx.fillStyle = this.isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)';
      const bw = metrics.width + pad * 2;
      roundRect(ctx, lx - bw / 2, ly - 7, bw, 14, 3);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(label, lx, ly + 4);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  地面 — 实验台面纹理 + 渐变深度                                        */
  /* ------------------------------------------------------------------ */
  drawGround(y: number, width: number) {
    const ctx = this.ctx;
    const sY = this.transformer.toScreen({ x: 0, y }).y;
    const groundH = 120;

    // 地面线
    ctx.strokeStyle = this.isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sY);
    ctx.lineTo(width, sY);
    ctx.stroke();

    // 实验台面纹理
    const benchTex = labBenchTexture(Math.min(width, 512), groundH, this.isDark);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(benchTex, 0, sY, width, groundH);
    ctx.globalAlpha = 1;
    ctx.restore();

    // 渐变叠加（模拟深度衰减）
    const depthGrad = ctx.createLinearGradient(0, sY, 0, sY + groundH);
    depthGrad.addColorStop(0, 'rgba(0,0,0,0)');
    depthGrad.addColorStop(1, this.isDark ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.6)');
    ctx.fillStyle = depthGrad;
    ctx.fillRect(0, sY, width, groundH);
  }

  /* ------------------------------------------------------------------ */
  /*  简易箭头                                                            */
  /* ------------------------------------------------------------------ */
  drawArrow(from: Vec2, to: Vec2, color: string) {
    const ctx = this.ctx;
    const s1 = this.transformer.toScreen(from);
    const s2 = this.transformer.toScreen(to);
    const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    const headLen = 10;

    // 箭杆渐变
    const grad = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
    grad.addColorStop(0, colorWithAlpha(color, 0.4));
    grad.addColorStop(1, color);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();

    // 实心箭头
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s2.x - headLen * Math.cos(angle - 0.4), s2.y - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(s2.x - headLen * 0.5 * Math.cos(angle), s2.y - headLen * 0.5 * Math.sin(angle));
    ctx.lineTo(s2.x - headLen * Math.cos(angle + 0.4), s2.y - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  /* ------------------------------------------------------------------ */
  /*  工具方法                                                            */
  /* ------------------------------------------------------------------ */
  private calcGridSpacing(scale: number): number {
    const targets = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    for (const t of targets) {
      if (t * scale >= 40 && t * scale <= 120) return t;
    }
    return 1;
  }
}

/* ====================================================================== */
/*  颜色工具函数（模块级）                                                   */
/* ====================================================================== */

/** 解析 hex 颜色为 RGB */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** RGB → hex */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

/** 加亮颜色 */
function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

/** 加深颜色 */
function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}

/** 给颜色加 alpha */
function colorWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 绘制圆角矩形路径 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
