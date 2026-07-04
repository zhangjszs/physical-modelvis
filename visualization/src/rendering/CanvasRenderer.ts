import { CoordinateTransformer } from './CoordinateTransformer';
import { COLORS } from '../utils/colorMap';
import type { VisibleLayers, Vec2 } from '../types/visualization';
import { labBenchTexture, clearTextureCache } from './textureFactory';

type Screen3D = { x: number; y: number; depth: number };

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private transformer: CoordinateTransformer;
  private layers: VisibleLayers;
  private isDark: boolean;
  private use3D: boolean;
  private canvasW: number;
  private canvasH: number;

  private readonly CABINET_COS = 0.707;
  private readonly CABINET_DEPTH_SCALE = 0.5;
  private readonly TILT_AZIMUTH = Math.PI / 4;

  private vpX = 0;
  private vpY = 0;
  private baseScale = 80;
  private groundZRange = 0;
  private worldCenterX = 0;
  private worldCenterY = 0;

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
    this.use3D = false;
    this.canvasW = 0;
    this.canvasH = 0;
  }

  update(transformer: CoordinateTransformer, layers: VisibleLayers, isDark: boolean) {
    const themeChanged = this.isDark !== isDark;
    this.transformer = transformer;
    this.layers = layers;
    this.isDark = isDark;
    if (themeChanged) clearTextureCache();
  }

  set3DEnabled(enabled: boolean, canvasW: number, canvasH: number) {
    this.use3D = enabled;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    if (enabled) {
      this.recompute3DParams();
    }
  }

  worldToScreenPoint(p: Vec2): { x: number; y: number } {
    if (this.use3D) {
      return this.physToScreen(p, 0);
    }
    return this.transformer.toScreen(p);
  }

  is3D(): boolean {
    return this.use3D;
  }

  private recompute3DParams() {
    this.baseScale = this.transformer.getScale();
    const origin2D = this.transformer.toScreen({ x: 0, y: 0 });
    this.vpX = origin2D.x;
    this.vpY = origin2D.y;
    this.worldCenterX = 0;
    this.worldCenterY = 0;
    const extentX = this.canvasW / (2 * this.baseScale);
    this.groundZRange = extentX * 0.8;
  }

  private worldToScreen(wx: number, wy: number, wz: number): Screen3D {
    if (!this.use3D) {
      const s = this.transformer.toScreen({ x: wx, y: wy });
      return { x: s.x, y: s.y, depth: 0 };
    }
    const cosA = Math.cos(this.TILT_AZIMUTH);
    const sinA = Math.sin(this.TILT_AZIMUTH);
    const zx = -wz * this.CABINET_DEPTH_SCALE * cosA;
    const zy = -wz * this.CABINET_DEPTH_SCALE * sinA;
    const screenX = this.vpX + (wx - this.worldCenterX) * this.baseScale + zx * this.baseScale;
    const screenY = this.vpY - (wy - this.worldCenterY) * this.baseScale + zy * this.baseScale;
    const depth = -wz;
    return { x: screenX, y: screenY, depth };
  }

  private physToScreen(p: Vec2, wz = 0): Screen3D {
    return this.worldToScreen(p.x, p.y, wz);
  }

  private toScreenLen(physLen: number): number {
    return physLen * this.baseScale;
  }

  clear(width: number, height: number) {
    const ctx = this.ctx;
    this.canvasW = width;
    this.canvasH = height;
    if (this.use3D) {
      const origin2D = this.transformer.toScreen({ x: 0, y: 0 });
      this.vpX = origin2D.x;
      this.vpY = origin2D.y;
      if (this.isDark) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#0a0f1f');
        skyGrad.addColorStop(0.35, '#142038');
        skyGrad.addColorStop(0.65, '#1e2d4a');
        skyGrad.addColorStop(1, '#2a3f5f');
        ctx.fillStyle = skyGrad;
      } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#e8f4fd');
        skyGrad.addColorStop(0.35, '#d0e8f7');
        skyGrad.addColorStop(0.65, '#b8d8ef');
        skyGrad.addColorStop(1, '#8fb8d8');
        ctx.fillStyle = skyGrad;
      }
      ctx.fillRect(0, 0, width, height);
      this.drawHorizonGlow(width, height);
    } else {
      if (this.isDark) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0c1222');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#1a1f35');
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.6, '#f8fafc');
        grad.addColorStop(1, '#eef2f7');
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawHorizonGlow(width: number, height: number) {
    const ctx = this.ctx;
    const horizonY = this.vpY;
    const glowGrad = ctx.createRadialGradient(
      width / 2, horizonY - 20, 0,
      width / 2, horizonY - 20, width * 0.7,
    );
    if (this.isDark) {
      glowGrad.addColorStop(0, 'rgba(96,165,250,0.08)');
      glowGrad.addColorStop(1, 'rgba(96,165,250,0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
      glowGrad.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);
  }

  drawGrid(width: number, height: number) {
    if (!this.layers.grid) return;
    if (this.use3D) {
      this.draw3DGrid(width, height);
    } else {
      this.draw2DGrid(width, height);
    }
  }

  private draw2DGrid(width: number, height: number) {
    const ctx = this.ctx;
    const scale = this.transformer.getScale();
    const gridSpacing = this.calcGridSpacing(scale);
    const screenSpacing = gridSpacing * scale;
    const origin = this.transformer.toScreen({ x: 0, y: 0 });
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

  private draw3DGrid(_width: number, _height: number) {
    const ctx = this.ctx;
    const scale = this.baseScale;
    const gridSpacing = this.calcGridSpacing(scale);
    const zMax = this.groundZRange;
    const zMin = 0;
    const xMin = -this.vpX / this.baseScale * 0.5;
    const xMax = (this.canvasW - this.vpX) / this.baseScale * 0.95;

    const groundLineFar = this.isDark ? 'rgba(100,116,139,0.10)' : 'rgba(100,116,139,0.07)';
    const groundLineNear = this.isDark ? 'rgba(148,163,184,0.35)' : 'rgba(71,85,105,0.25)';
    const groundLineBold = this.isDark ? 'rgba(148,163,184,0.45)' : 'rgba(51,65,85,0.35)';
    const motionPlaneColor = this.isDark ? 'rgba(56,189,248,0.06)' : 'rgba(59,130,246,0.04)';
    const motionPlaneEdge = this.isDark ? 'rgba(56,189,248,0.2)' : 'rgba(59,130,246,0.15)';

    for (let gx = Math.floor(xMin / gridSpacing) * gridSpacing; gx <= xMax; gx += gridSpacing) {
      const isMain = Math.abs(gx) < gridSpacing * 0.01;
      const near = this.worldToScreen(gx, 0, zMin);
      const far = this.worldToScreen(gx, 0, zMax);
      const grad = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
      grad.addColorStop(0, isMain ? groundLineBold : groundLineNear);
      grad.addColorStop(1, groundLineFar);
      ctx.strokeStyle = grad;
      ctx.lineWidth = isMain ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }

    for (let gz = zMin; gz <= zMax; gz += gridSpacing) {
      const isMain = Math.abs(gz) < gridSpacing * 0.01;
      const t = gz / zMax;
      const leftX = xMin - gz * this.CABINET_DEPTH_SCALE * this.CABINET_COS;
      const rightX = xMax - gz * this.CABINET_DEPTH_SCALE * this.CABINET_COS;
      ctx.strokeStyle = isMain ? groundLineBold : (this.isDark ? `rgba(100,116,139,${0.35 - t*0.25})` : `rgba(100,116,139,${0.25 - t*0.18})`);
      ctx.lineWidth = isMain ? 1.8 : (1 - t * 0.4);
      ctx.beginPath();
      const left = this.worldToScreen(leftX, 0, gz);
      const right = this.worldToScreen(rightX, 0, gz);
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    const yRange = this.canvasH / (2 * this.baseScale);
    ctx.fillStyle = motionPlaneColor;
    ctx.beginPath();
    const tl = this.worldToScreen(xMin, yRange, 0);
    const tr = this.worldToScreen(xMax, yRange, 0);
    const br = this.worldToScreen(xMax, 0, 0);
    const bl = this.worldToScreen(xMin, 0, 0);
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = motionPlaneEdge;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (let gy = gridSpacing; gy < yRange; gy += gridSpacing) {
      ctx.beginPath();
      const l = this.worldToScreen(xMin, gy, 0);
      const r = this.worldToScreen(xMax, gy, 0);
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  drawAxes(width: number, height: number) {
    if (!this.layers.axes) return;
    if (this.use3D) {
      this.draw3DAxes(width, height);
    } else {
      this.draw2DAxes(width, height);
    }
  }

  private draw2DAxes(width: number, height: number) {
    const ctx = this.ctx;
    const origin = this.transformer.toScreen({ x: 0, y: 0 });
    const axisColor = this.isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.45)';
    const tickColor = this.isDark ? '#94a3b8' : '#64748b';
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();
    ctx.fillStyle = tickColor;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    const scale = this.transformer.getScale();
    const gridSpacing = this.calcGridSpacing(scale);
    const screenSpacing = gridSpacing * scale;
    const tickLen = 4;
    for (let x = origin.x % screenSpacing; x < width; x += screenSpacing) {
      const physX = this.transformer.toPhysical({ x, y: origin.y }).x;
      if (Math.abs(physX) < gridSpacing * 0.1) continue;
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, origin.y - tickLen);
      ctx.lineTo(x, origin.y + tickLen);
      ctx.stroke();
      ctx.fillStyle = tickColor;
      ctx.fillText(physX.toFixed(1), x, origin.y + 18);
    }
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
    const labelColor = this.isDark ? '#e2e8f0' : '#1e293b';
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('x (m)', width - 50, origin.y - 10);
    ctx.textAlign = 'center';
    ctx.fillText('y (m)', origin.x + 22, 16);
  }

  private draw3DAxes(_width: number, _height: number) {
    const ctx = this.ctx;
    const scale = this.baseScale;
    const axisLen = Math.min(
      (this.canvasW - this.vpX) / this.baseScale * 0.5,
      this.canvasH / (2.2 * this.baseScale) * 0.8,
    );
    const zLen = this.groundZRange * 0.5;
    const origin = this.worldToScreen(0, 0, 0);
    const xEnd = this.worldToScreen(axisLen, 0, 0);
    const yEnd = this.worldToScreen(0, axisLen, 0);
    const zEnd = this.worldToScreen(0, 0, zLen);

    const xColor = '#ef4444';
    const yColor = '#22c55e';
    const zColor = this.isDark ? '#818cf8' : '#6366f1';

    this.draw3DAxisWithArrow(origin, zEnd, zColor, '', 'right');
    this.draw3DAxisWithArrow(origin, xEnd, xColor, 'x (m)', 'right');
    this.draw3DAxisWithArrow(origin, yEnd, yColor, 'y (m)', 'top');

    const gridSpacing = this.calcGridSpacing(scale);
    ctx.font = '10px monospace';
    ctx.fillStyle = this.isDark ? 'rgba(148,163,184,0.7)' : 'rgba(71,85,105,0.7)';
    ctx.textAlign = 'center';

    for (let gx = gridSpacing; gx < axisLen; gx += gridSpacing) {
      const p = this.worldToScreen(gx, 0, 0);
      ctx.fillText(gx.toFixed(0), p.x, p.y + 14);
    }
    ctx.textAlign = 'right';
    for (let gy = gridSpacing; gy < axisLen; gy += gridSpacing) {
      const p = this.worldToScreen(0, gy, 0);
      ctx.fillText(gy.toFixed(0), p.x - 6, p.y + 4);
    }
  }

  private draw3DAxisWithArrow(
    from: Screen3D,
    to: Screen3D,
    color: string,
    label: string,
    labelPos: 'right' | 'top',
  ) {
    const ctx = this.ctx;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const arrowLen = 12;
    const arrowAngle = 0.45;

    const shaftGrad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    shaftGrad.addColorStop(0, colorWithAlpha(color, 0.3));
    shaftGrad.addColorStop(1, color);
    ctx.strokeStyle = shaftGrad;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLen * Math.cos(angle - arrowAngle),
      to.y - arrowLen * Math.sin(angle - arrowAngle),
    );
    ctx.lineTo(
      to.x - arrowLen * 0.5 * Math.cos(angle),
      to.y - arrowLen * 0.5 * Math.sin(angle),
    );
    ctx.lineTo(
      to.x - arrowLen * Math.cos(angle + arrowAngle),
      to.y - arrowLen * Math.sin(angle + arrowAngle),
    );
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = to.x + 8;
    let ly = to.y;
    if (labelPos === 'top') {
      lx = to.x;
      ly = to.y - 14;
      ctx.textAlign = 'center';
    }
    ctx.fillText(label, lx, ly);
    ctx.textBaseline = 'alphabetic';
  }

  drawTrajectory(points: Vec2[], color = COLORS.trajectory) {
    if (!this.layers.trajectory || points.length < 2) return;
    if (this.use3D) {
      this.draw3DTrajectory(points, color);
    } else {
      this.draw2DTrajectory(points, color);
    }
  }

  private draw2DTrajectory(points: Vec2[], color: string) {
    const ctx = this.ctx;
    ctx.setLineDash([]);
    const total = points.length;
    for (let i = 0; i < total - 1; i++) {
      const progress = i / (total - 1);
      const alpha = 0.15 + 0.55 * (1 - progress);
      ctx.strokeStyle = colorWithAlpha(color, alpha);
      ctx.lineWidth = 1.5 + 1.0 * (1 - progress);
      const s0 = this.transformer.toScreen(points[i]!);
      const s1 = this.transformer.toScreen(points[i + 1]!);
      if (Math.abs(s1.x - s0.x) > 800 || Math.abs(s1.y - s0.y) > 800) continue;
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.stroke();
    }
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

  private draw3DTrajectory(points: Vec2[], color: string) {
    const ctx = this.ctx;
    const total = points.length;

    ctx.strokeStyle = this.isDark ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const p = points[i]!;
      const gp = this.worldToScreen(p.x, 0, 0);
      if (i === 0) ctx.moveTo(gp.x, gp.y);
      else ctx.lineTo(gp.x, gp.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = this.isDark ? 'rgba(251,191,36,0.08)' : 'rgba(217,119,6,0.06)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 5]);
    for (let i = 0; i < total; i += Math.max(1, Math.floor(total / 12))) {
      const p = points[i]!;
      const s = this.physToScreen(p, 0);
      const gp = this.worldToScreen(p.x, 0, 0);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(gp.x, gp.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < total - 1; i++) {
      const progress = i / (total - 1);
      const alpha = 0.2 + 0.7 * (1 - progress);
      ctx.strokeStyle = colorWithAlpha(color, alpha);
      ctx.lineWidth = 2 + 1.5 * (1 - progress);
      const s0 = this.physToScreen(points[i]!, 0);
      const s1 = this.physToScreen(points[i + 1]!, 0);
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.stroke();
    }

    if (total > 6) {
      const step = Math.max(1, Math.floor(total / 15));
      for (let i = step; i < total; i += step) {
        const progress = i / (total - 1);
        const alpha = 0.15 + 0.45 * (1 - progress);
        const s = this.physToScreen(points[i]!, 0);
        ctx.fillStyle = colorWithAlpha(color, alpha);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3 * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  drawBody(pos: Vec2, radius: number, color: string, label?: string) {
    if (this.use3D) {
      this.draw3DBody(pos, radius, color, label);
    } else {
      this.draw2DBody(pos, radius, color, label);
    }
  }

  private draw2DBody(pos: Vec2, radius: number, color: string, label?: string) {
    const ctx = this.ctx;
    const s = this.transformer.toScreen(pos);
    const r = Math.max(this.transformer.toScreenLength(radius), 8);
    ctx.fillStyle = this.isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(s.x + r * 0.08, s.y + r * 0.15, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.strokeStyle = darkenColor(color, 50);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
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
    if (label && this.layers.bodyLabels) {
      const labelColor = this.isDark ? '#e2e8f0' : '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const lx = s.x;
      const ly = s.y - r - 12;
      const pad = 4;
      ctx.fillStyle = this.isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      const bw = metrics.width + pad * 2;
      const bh = 16;
      roundRect(ctx, lx - bw / 2, ly - bh / 2 - 1, bw, bh, 3);
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.fillText(label, lx, ly + 4);
    }
  }

  private draw3DBody(pos: Vec2, radius: number, color: string, label?: string) {
    const ctx = this.ctx;
    const s = this.physToScreen(pos, 0);
    const r = Math.max(this.toScreenLen(radius), 10);
    const shadowY = this.worldToScreen(pos.x, 0, 0).y;
    const objY = s.y;
    const heightDiff = shadowY - objY;

    const shadowScaleX = 1.0 + Math.min(heightDiff / (r * 4), 0.6);
    const shadowScaleY = 0.35 + Math.min(heightDiff / (r * 8), 0.2);
    const shadowAlpha = Math.max(0.12, 0.35 - heightDiff / 400);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(s.x, shadowY, r * shadowScaleX, r * shadowScaleY, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(
      s.x - r * 0.3, s.y - r * 0.3, r * 0.05,
      s.x, s.y, r,
    );
    bodyGrad.addColorStop(0, lightenColor(color, 80));
    bodyGrad.addColorStop(0.35, lightenColor(color, 30));
    bodyGrad.addColorStop(0.7, color);
    bodyGrad.addColorStop(1, darkenColor(color, 50));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = darkenColor(color, 60);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const hlGrad = ctx.createRadialGradient(
      s.x - r * 0.4, s.y - r * 0.4, 0,
      s.x - r * 0.4, s.y - r * 0.4, r * 0.65,
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
    hlGrad.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    const rimGrad = ctx.createRadialGradient(
      s.x + r * 0.2, s.y + r * 0.2, r * 0.3,
      s.x + r * 0.2, s.y + r * 0.2, r * 1.1,
    );
    rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(1, darkenColor(color, 30) + '44');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    if (label && this.layers.bodyLabels) {
      const labelColor = this.isDark ? '#e2e8f0' : '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const lx = s.x;
      const ly = s.y - r - 14;
      const pad = 5;
      ctx.fillStyle = this.isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.88)';
      const bw = metrics.width + pad * 2;
      const bh = 18;
      roundRect(ctx, lx - bw / 2, ly - bh / 2 - 1, bw, bh, 4);
      ctx.fill();
      ctx.strokeStyle = this.isDark ? 'rgba(56,189,248,0.3)' : 'rgba(59,130,246,0.2)';
      ctx.lineWidth = 1;
      roundRect(ctx, lx - bw / 2, ly - bh / 2 - 1, bw, bh, 4);
      ctx.stroke();
      ctx.fillStyle = labelColor;
      ctx.fillText(label, lx, ly + 4);
    }
  }

  drawVector(origin: Vec2, vector: Vec2, color: string, label?: string, scale = 1) {
    if (this.use3D) {
      this.draw3DVector(origin, vector, color, label, scale);
    } else {
      this.draw2DVector(origin, vector, color, label, scale);
    }
  }

  private draw2DVector(origin: Vec2, vector: Vec2, color: string, label?: string, scale = 1) {
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
    const headW = 0.38;
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

  private draw3DVector(origin: Vec2, vector: Vec2, color: string, label?: string, scale = 1) {
    const ctx = this.ctx;
    const sOrigin = this.physToScreen(origin, 0);
    const endX = origin.x + vector.x * scale;
    const endY = origin.y + vector.y * scale;
    const sEnd = this.worldToScreen(endX, endY, 0);
    const dx = sEnd.x - sOrigin.x;
    const dy = sEnd.y - sOrigin.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return;
    const angle = Math.atan2(dy, dx);
    const headLen = Math.min(14, len * 0.25);
    const headW = 0.4;
    ctx.strokeStyle = colorWithAlpha(color, 0.2);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sOrigin.x, sOrigin.y);
    ctx.lineTo(sEnd.x, sEnd.y);
    ctx.stroke();
    const shaftGrad = ctx.createLinearGradient(sOrigin.x, sOrigin.y, sEnd.x, sEnd.y);
    shaftGrad.addColorStop(0, colorWithAlpha(color, 0.5));
    shaftGrad.addColorStop(0.5, colorWithAlpha(color, 0.9));
    shaftGrad.addColorStop(1, color);
    ctx.strokeStyle = shaftGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sOrigin.x, sOrigin.y);
    ctx.lineTo(sEnd.x, sEnd.y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sEnd.x, sEnd.y);
    ctx.lineTo(
      sEnd.x - headLen * Math.cos(angle - headW),
      sEnd.y - headLen * Math.sin(angle - headW),
    );
    ctx.lineTo(
      sEnd.x - headLen * 0.45 * Math.cos(angle),
      sEnd.y - headLen * 0.45 * Math.sin(angle),
    );
    ctx.lineTo(
      sEnd.x - headLen * Math.cos(angle + headW),
      sEnd.y - headLen * Math.sin(angle + headW),
    );
    ctx.closePath();
    ctx.fill();
    if (label) {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const lx = sEnd.x + 14 * Math.cos(angle - 0.5);
      const ly = sEnd.y + 14 * Math.sin(angle - 0.5);
      const pad = 4;
      ctx.fillStyle = this.isDark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.88)';
      const bw = metrics.width + pad * 2;
      const bh = 16;
      roundRect(ctx, lx - bw / 2, ly - bh / 2, bw, bh, 3);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(label, lx, ly + 4);
    }
  }

  drawGround(y: number, width: number) {
    if (this.use3D) {
      this.draw3DGround(y, width);
    } else {
      this.draw2DGround(y, width);
    }
  }

  private draw2DGround(y: number, width: number) {
    const ctx = this.ctx;
    const sY = this.transformer.toScreen({ x: 0, y }).y;
    const groundH = 120;
    ctx.strokeStyle = this.isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, sY);
    ctx.lineTo(width, sY);
    ctx.stroke();
    const benchTex = labBenchTexture(Math.min(width, 512), groundH, this.isDark);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(benchTex, 0, sY, width, groundH);
    ctx.globalAlpha = 1;
    ctx.restore();
    const depthGrad = ctx.createLinearGradient(0, sY, 0, sY + groundH);
    depthGrad.addColorStop(0, 'rgba(0,0,0,0)');
    depthGrad.addColorStop(1, this.isDark ? 'rgba(15,23,42,0.6)' : 'rgba(248,250,252,0.6)');
    ctx.fillStyle = depthGrad;
    ctx.fillRect(0, sY, width, groundH);
  }

  private draw3DGround(_y: number, _width: number) {
    const ctx = this.ctx;
    const xMin = -this.vpX / this.baseScale * 0.5;
    const xMax = (this.canvasW - this.vpX) / this.baseScale * 1.2;

    const bl = this.worldToScreen(xMin, 0, 0);
    const br = this.worldToScreen(xMax, 0, 0);

    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(this.canvasW, this.canvasH);
    ctx.lineTo(0, this.canvasH);
    ctx.closePath();

    const groundGrad = ctx.createLinearGradient(0, bl.y, 0, this.canvasH);
    if (this.isDark) {
      groundGrad.addColorStop(0, 'rgba(30,58,95,0.6)');
      groundGrad.addColorStop(0.15, 'rgba(22,42,72,0.8)');
      groundGrad.addColorStop(1, 'rgba(8,12,24,1)');
    } else {
      groundGrad.addColorStop(0, 'rgba(180,200,220,0.55)');
      groundGrad.addColorStop(0.15, 'rgba(140,165,190,0.75)');
      groundGrad.addColorStop(1, 'rgba(70,95,120,0.95)');
    }
    ctx.fillStyle = groundGrad;
    ctx.fill();

    ctx.strokeStyle = this.isDark ? 'rgba(148,163,184,0.4)' : 'rgba(71,85,105,0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.stroke();
  }

  drawProbePoint(pos: Vec2, info: { t: number; vx: number; vy: number }, isDark: boolean) {
    const ctx = this.ctx;
    const s = this.use3D ? this.physToScreen(pos, 0) : this.transform(pos);
    const r = 7;

    ctx.save();

    const glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 4);
    glowGrad.addColorStop(0, 'rgba(251,191,36,0.55)');
    glowGrad.addColorStop(0.4, 'rgba(251,191,36,0.18)');
    glowGrad.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(s.x, s.y, r - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();

    const speed = Math.sqrt(info.vx * info.vx + info.vy * info.vy);
    const lines = [
      `t = ${info.t.toFixed(2)} s`,
      `x = ${pos.x.toFixed(1)} m`,
      `y = ${pos.y.toFixed(1)} m`,
      `vₓ = ${info.vx.toFixed(1)} m/s`,
      `vᵧ = ${info.vy.toFixed(1)} m/s`,
      `|v| = ${speed.toFixed(1)} m/s`,
    ];
    const panelW = 175;
    const lineH = 17;
    const panelH = lines.length * lineH + 16;
    const margin = 14;
    let px: number;
    let py: number;

    const placeRight = s.x < this.canvasW * 0.55;
    if (placeRight) {
      px = s.x + margin + r;
    } else {
      px = s.x - margin - r - panelW;
    }
    py = s.y - panelH / 2;
    if (py < 8) py = 8;
    if (py + panelH > this.canvasH - 8) py = this.canvasH - 8 - panelH;

    ctx.strokeStyle = 'rgba(251,191,36,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const anchorX = placeRight ? px : px + panelW;
    const anchorY = py + 22;
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(anchorX, anchorY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)';
    this.roundRect(ctx, px, py, panelW, panelH, 7);
    ctx.fill();

    ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.45)' : 'rgba(217,119,6,0.4)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, px, py, panelW, panelH, 7);
    ctx.stroke();

    ctx.fillStyle = isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.08)';
    this.roundRect(ctx, px, py, panelW, lineH + 10, 7);
    ctx.fill();
    ctx.fillRect(px, py + lineH + 10, panelW, 0);

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const labelColor = isDark ? '#64748b' : '#94a3b8';
    const valueColor = isDark ? '#e2e8f0' : '#1e293b';
    const accentColor = '#fbbf24';

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(lines[0]!, px + 10, py + 20);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      const eqIdx = line.indexOf('=');
      const label = line.substring(0, eqIdx + 1);
      const value = line.substring(eqIdx + 1);
      ctx.font = '11px monospace';
      ctx.fillStyle = labelColor;
      ctx.fillText(label, px + 10, py + 22 + i * lineH);
      const labelWidth = ctx.measureText(label).width;
      ctx.fillStyle = i === lines.length - 1 ? accentColor : valueColor;
      ctx.font = i === lines.length - 1 ? 'bold 11px monospace' : '11px monospace';
      ctx.fillText(value, px + 10 + labelWidth, py + 22 + i * lineH);
    }

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawCrosshair(pos: Vec2, isDark: boolean) {
    const ctx = this.ctx;
    const s = this.use3D ? this.physToScreen(pos, 0) : this.transform(pos);
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(251,191,36,0.4)' : 'rgba(217,119,6,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(s.x, 0);
    ctx.lineTo(s.x, this.canvasH);
    ctx.moveTo(0, s.y);
    ctx.lineTo(this.canvasW, s.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private transform(p: Vec2): Screen3D {
    const s = this.transformer.toScreen(p);
    return { x: s.x, y: s.y, depth: 0 };
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

  drawArrow(from: Vec2, to: Vec2, color: string) {
    const ctx = this.ctx;
    const transform = this.use3D ? (p: Vec2) => this.physToScreen(p, 0) : (p: Vec2) => this.transformer.toScreen(p);
    const s1 = transform(from);
    const s2 = transform(to);
    const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    const headLen = 10;
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
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s2.x - headLen * Math.cos(angle - 0.4), s2.y - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(s2.x - headLen * 0.5 * Math.cos(angle), s2.y - headLen * 0.5 * Math.sin(angle));
    ctx.lineTo(s2.x - headLen * Math.cos(angle + 0.4), s2.y - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  private calcGridSpacing(scale: number): number {
    const targets = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
    for (const t of targets) {
      if (t * scale >= 40 && t * scale <= 120) return t;
    }
    return 1;
  }
}

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

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r - amount, g - amount, b - amount);
}

function colorWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
