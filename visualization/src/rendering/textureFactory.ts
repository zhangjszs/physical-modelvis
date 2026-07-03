/**
 * 程序化纹理工厂 — 纯 Canvas API 生成物理实验器材纹理。
 *
 * 所有纹理缓存在离屏 Canvas 中，首次调用时生成，后续复用。
 * 不依赖任何外部图片文件。
 */

/* ── 缓存 ── */
const cache = new Map<string, HTMLCanvasElement>();

function getCached(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cacheKey = `${key}_${w}_${h}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d')!;
  draw(ctx);
  cache.set(cacheKey, off);
  return off;
}

/* ── 噪声工具 ── */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

/* ================================================================== */
/*  木纹纹理                                                            */
/* ================================================================== */
export function woodTexture(
  w = 256, h = 256,
  baseColor = '#b07c4f',
  isDark = false,
): HTMLCanvasElement {
  return getCached(`wood_${baseColor}_${isDark}`, w, h, (ctx) => {
    // 基色
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    const rng = seededRandom(42);
    const [br, bg, bb] = hexToRgb(baseColor);

    // 水平木纹线条
    for (let y = 0; y < h; y += 2) {
      const variation = (rng() - 0.5) * 30;
      const r = Math.max(0, Math.min(255, br + variation));
      const g = Math.max(0, Math.min(255, bg + variation * 0.7));
      const b = Math.max(0, Math.min(255, bb + variation * 0.4));
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},0.6)`;
      ctx.lineWidth = 1 + rng() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      // 轻微波浪
      for (let x = 0; x < w; x += 20) {
        ctx.lineTo(x, y + (rng() - 0.5) * 2);
      }
      ctx.stroke();
    }

    // 节疤（椭圆暗斑）
    for (let i = 0; i < 3; i++) {
      const kx = rng() * w;
      const ky = rng() * h;
      const kr = 4 + rng() * 8;
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
      grad.addColorStop(0, `rgba(${Math.max(0, br - 50)},${Math.max(0, bg - 40)},${Math.max(0, bb - 30)},0.5)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(kx, ky, kr, kr * 0.6, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // 深色主题叠加
    if (isDark) {
      ctx.fillStyle = 'rgba(15,23,42,0.35)';
      ctx.fillRect(0, 0, w, h);
    }
  });
}

/* ================================================================== */
/*  金属纹理                                                            */
/* ================================================================== */
export function metalTexture(
  w = 128, h = 128,
  baseColor = '#94a3b8',
  isDark = false,
): HTMLCanvasElement {
  return getCached(`metal_${baseColor}_${isDark}`, w, h, (ctx) => {
    const [br, bg, bb] = hexToRgb(baseColor);

    // 基色渐变（模拟金属光泽）
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `rgb(${br + 20},${bg + 20},${bb + 20})`);
    grad.addColorStop(0.3, `rgb(${br},${bg},${bb})`);
    grad.addColorStop(0.5, `rgb(${br + 30},${bg + 30},${bb + 30})`);
    grad.addColorStop(0.7, `rgb(${br - 10},${bg - 10},${bb - 10})`);
    grad.addColorStop(1, `rgb(${br},${bg},${bb})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 拉丝纹理（水平细线）
    const rng = seededRandom(77);
    for (let y = 0; y < h; y++) {
      const alpha = 0.02 + rng() * 0.06;
      const bright = rng() > 0.5 ? 255 : 0;
      ctx.strokeStyle = `rgba(${bright},${bright},${bright},${alpha})`;
      ctx.lineWidth = 0.5 + rng() * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + rng() * 0.5);
      ctx.lineTo(w, y + rng() * 0.5);
      ctx.stroke();
    }

    if (isDark) {
      ctx.fillStyle = 'rgba(15,23,42,0.3)';
      ctx.fillRect(0, 0, w, h);
    }
  });
}

/* ================================================================== */
/*  大理石 / 实验台面纹理                                                */
/* ================================================================== */
export function marbleTexture(
  w = 256, h = 256,
  isDark = false,
): HTMLCanvasElement {
  return getCached(`marble_${isDark}`, w, h, (ctx) => {
    const base = isDark ? [30, 41, 59] : [240, 240, 235];
    const vein = isDark ? [51, 65, 85] : [200, 200, 195];

    ctx.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    ctx.fillRect(0, 0, w, h);

    const rng = seededRandom(123);

    // 大理石纹脉
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(${vein[0]},${vein[1]},${vein[2]},${0.1 + rng() * 0.15})`;
      ctx.lineWidth = 0.5 + rng() * 2;
      ctx.beginPath();
      let x = rng() * w;
      let y = rng() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (rng() - 0.5) * 80;
        y += (rng() - 0.3) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 细微噪点
    for (let i = 0; i < 2000; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const a = 0.02 + rng() * 0.04;
      ctx.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

/* ================================================================== */
/*  地面 / 桌面纹理（实验台）                                            */
/* ================================================================== */
export function labBenchTexture(
  w = 512, h = 128,
  isDark = false,
): HTMLCanvasElement {
  return getCached(`bench_${isDark}`, w, h, (ctx) => {
    // 基色渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (isDark) {
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.3, '#0f172a');
      grad.addColorStop(1, 'rgba(15,23,42,0)');
    } else {
      grad.addColorStop(0, '#d6d3d1');
      grad.addColorStop(0.3, '#e7e5e4');
      grad.addColorStop(1, 'rgba(231,229,228,0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 细密噪点
    const rng = seededRandom(999);
    for (let i = 0; i < 3000; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const a = 0.01 + rng() * 0.03;
      ctx.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

/* ================================================================== */
/*  工具                                                                */
/* ================================================================== */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** 清除纹理缓存（主题切换时调用） */
export function clearTextureCache() {
  cache.clear();
}
