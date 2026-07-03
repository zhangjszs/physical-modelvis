import type { PropBase } from './types';

export interface CalipersOptions extends PropBase {
  ctx: CanvasRenderingContext2D;
  /** 测量起点 x（屏幕像素） */
  x: number;
  /** 测量线 y（屏幕像素） */
  y: number;
  /** 测量跨度（屏幕像素，对应被测物体的宽度） */
  width: number;
  /** 测量值标签，如 "Δx = 0.02 m" */
  label?: string;
  /** 是否显示主尺刻度，默认 true */
  showMainScale?: boolean;
  /** 是否显示游标刻度，默认 true */
  showVernierScale?: boolean;
  /** 像素/米（用于刻度标注） */
  pixelsPerMeter?: number;
}

/**
 * 绘制游标卡尺示意图（主尺 + 游标 + 测量值标注）。
 *
 * 用于在实验中可视化「挡光片宽度测量」等需要展示卡尺读数的场景。
 * 借鉴真实游标卡尺的视觉：主尺有 mm 刻度，游标有 10 分度。
 *
 * 可复用：任何需要测量长度的实验（金属丝直径、单摆摆球直径等）。
 */
export function drawCalipers(opts: CalipersOptions): void {
  const {
    ctx, x, y, width, isDark, label,
    showMainScale = true, showVernierScale = true,
    pixelsPerMeter,
  } = opts;

  ctx.save();

  const subColor = isDark ? '#94a3b8' : '#64748b';
  const lineColor = isDark ? '#cbd5e1' : '#334155';

  // 主尺基线
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width + 60, y);
  ctx.stroke();

  // 主尺刻度（毫米刻度，假设 1px = 1mm 简化展示）
  if (showMainScale) {
    ctx.strokeStyle = subColor;
    ctx.fillStyle = subColor;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 0.6;
    const majorPx = 10; // 每 cm 一个主刻度
    const totalPx = width + 60;
    for (let mx = 0; mx <= totalPx; mx += 1) {
      const isMajor = mx % majorPx === 0;
      const isMid = mx % 5 === 0;
      const tickLen = isMajor ? 8 : (isMid ? 5 : 3);
      ctx.beginPath();
      ctx.moveTo(x + mx, y);
      ctx.lineTo(x + mx, y + tickLen);
      ctx.stroke();
      if (isMajor && mx % 10 === 0) {
        const cm = mx / 10;
        if (cm % 1 === 0) {
          ctx.fillText(`${cm}`, x + mx, y + 10);
        }
      }
    }
  }

  // 游标（测量起始位置的活动卡爪）
  const jawW = 4;
  ctx.fillStyle = isDark ? '#22d3ee' : '#0891b2';
  // 起点卡爪
  ctx.fillRect(x - jawW, y - 20, jawW, 25);
  // 测量终点卡爪（游标）
  ctx.fillRect(x + width, y - 20, jawW, 25);

  // 游标刻度（10 分度，跨度 width 内画 10 个刻度）
  if (showVernierScale) {
    ctx.strokeStyle = isDark ? '#22d3ee' : '#0891b2';
    ctx.fillStyle = isDark ? '#22d3ee' : '#0891b2';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 0.6;
    const vCount = 10;
    for (let i = 0; i <= vCount; i++) {
      const tickLen = i % 5 === 0 ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(x + width + jawW, y - 12 + i * 1);
      ctx.lineTo(x + width + jawW + tickLen, y - 12 + i * 1);
      ctx.stroke();
    }
  }

  // 测量值标签
  if (label) {
    ctx.fillStyle = isDark ? '#f59e0b' : '#d97706';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + width / 2, y + 25);
  }

  // 测量范围指示线（箭头双向）
  ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706';
  ctx.fillStyle = isDark ? '#f59e0b' : '#d97706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - 25);
  ctx.lineTo(x + width, y - 25);
  ctx.stroke();
  // 两端箭头
  const arr = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 25);
  ctx.lineTo(x + arr, y - 25 - 3);
  ctx.lineTo(x + arr, y - 25 + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + width, y - 25);
  ctx.lineTo(x + width - arr, y - 25 - 3);
  ctx.lineTo(x + width - arr, y - 25 + 3);
  ctx.closePath();
  ctx.fill();

  // 单位标注（如果 pixelsPerMeter 已知）
  if (pixelsPerMeter && label) {
    const meters = width / pixelsPerMeter;
    ctx.fillStyle = subColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`(主尺: ${(meters * 1000).toFixed(1)} mm)`, x + width + 30, y + 4);
  }

  ctx.restore();
}
