import type { PropBase, RulerMark } from './types';

export interface RulerOptions extends PropBase {
  /** Canvas 2D 上下文 */
  ctx: CanvasRenderingContext2D;
  /** 刻度尺起点 x（屏幕像素） */
  x: number;
  /** 刻度尺基线 y（屏幕像素） */
  y: number;
  /** 总长（屏幕像素） */
  length: number;
  /** 像素/米（用于刻度数值标注） */
  pixelsPerMeter: number;
  /** 主刻度间隔（米），默认 0.1 */
  majorInterval?: number;
  /** 每个主刻度内的次刻度数，默认 5 */
  minorPerMajor?: number;
  /** 方向，默认水平 */
  orientation?: 'horizontal' | 'vertical';
  /** 整体标签，如 "位置 x (m)" */
  label?: string;
  /** 在尺上高亮标记的特殊位置（如光电门 G1/G2） */
  marks?: RulerMark[];
}

/**
 * 绘制刻度尺（水平或垂直方向）。
 *
 * 设计为可复用元件：可用于气垫导轨、打点计时器纸带测量、单摆摆长测量等场景。
 * 不依赖任何外部状态，所有几何参数由 opts 传入。
 */
export function drawRuler(opts: RulerOptions): void {
  const {
    ctx, x, y, length, pixelsPerMeter, isDark,
    majorInterval = 0.1, minorPerMajor = 5, orientation = 'horizontal',
    label, marks = [],
  } = opts;

  const majorPx = majorInterval * pixelsPerMeter;
  const minorPx = majorPx / minorPerMajor;
  const lineColor = isDark ? '#94a3b8' : '#475569';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const minorColor = isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.5)';

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = lineColor;

  // 基线
  ctx.beginPath();
  if (orientation === 'horizontal') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + length);
  }
  ctx.stroke();

  // 刻度
  const totalMeters = length / pixelsPerMeter;
  const majorCount = Math.floor(totalMeters / majorInterval);
  ctx.font = '11px monospace';
  ctx.fillStyle = textColor;

  for (let i = 0; i <= majorCount; i++) {
    const mx = i * majorPx;
    // 主刻度
    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    if (orientation === 'horizontal') {
      ctx.moveTo(x + mx, y);
      ctx.lineTo(x + mx, y + 10);
    } else {
      ctx.moveTo(x, y + mx);
      ctx.lineTo(x + 10, y + mx);
    }
    ctx.stroke();

    // 主刻度数值
    const v = i * majorInterval;
    const labelTxt = v.toFixed(majorInterval < 1 ? 2 : 1);
    if (orientation === 'horizontal') {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labelTxt, x + mx, y + 14);
    } else {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelTxt, x - 6, y + mx);
    }

    // 次刻度
    ctx.strokeStyle = minorColor;
    for (let j = 1; j < minorPerMajor; j++) {
      const nx = mx + j * minorPx;
      if (x + nx > x + length) break;
      ctx.beginPath();
      if (orientation === 'horizontal') {
        ctx.moveTo(x + nx, y);
        ctx.lineTo(x + nx, y + 5);
      } else {
        ctx.moveTo(x, y + nx);
        ctx.lineTo(x + 5, y + nx);
      }
      ctx.stroke();
    }
  }

  // 整体标签
  if (label) {
    ctx.fillStyle = textColor;
    ctx.font = 'bold 11px sans-serif';
    if (orientation === 'horizontal') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x + length, y + 28);
    } else {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.save();
      ctx.translate(x + 18, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }

  // 特殊位置标记（如光电门位置）
  for (const mark of marks) {
    const mx = mark.position * pixelsPerMeter;
    if (x + mx < x || x + mx > x + length) continue;
    const color = mark.color ?? '#ef4444';
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    if (orientation === 'horizontal') {
      // 三角形向下指
      ctx.beginPath();
      ctx.moveTo(x + mx, y - 4);
      ctx.lineTo(x + mx - 5, y - 14);
      ctx.lineTo(x + mx + 5, y - 14);
      ctx.closePath();
      ctx.fill();

      // 虚线
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x + mx, y - 14);
      ctx.lineTo(x + mx, y);
      ctx.stroke();
      ctx.restore();

      // 标签
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(mark.label, x + mx, y - 16);
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 4, y + mx);
      ctx.lineTo(x - 14, y + mx - 5);
      ctx.lineTo(x - 14, y + mx + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark.label, x - 16, y + mx);
    }
  }

  ctx.restore();
}
