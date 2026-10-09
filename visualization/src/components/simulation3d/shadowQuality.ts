/**
 * 3D 阴影贴图自适应质量 (#95)
 *
 * 背景：M2.6 收官时 3D 舞台阴影图回调保持固定 1024² + PCF radius=2
 * （显存 4MB，防快速切场景时 GPU 上下文卡死）。固定值的问题：
 * 高分屏/大视口下阴影偏糊；低端设备上 4MB 也未必必要；没有按设备能力调节的通道。
 *
 * 策略（设备能力驱动，全局默认，无用户可见 UI）：
 * - 以 `navigator.hardwareConcurrency` 逻辑核数为信号分三档：
 *   ≥8 核 → high（2048²），5–7 核 → medium（1024²），≤4 核 → low（512²）；
 * - 信号缺失或非法（jsdom/SSR/测试）→ medium，即 M2.6 基线值，行为与改动前完全一致；
 * - 刻意不用 devicePixelRatio 作信号：mapSize 决定的是"每世界单位的纹素密度"
 *   （shadow camera 固定 ±8 覆盖 16×16 世界单位），与屏幕 DPR 无关——DPR 高只让
 *   画面整体更锐，不改变阴影相机覆盖的世界面积；且 2x 屏里低端设备噪声大。
 *
 * 档位→参数的联动关系：three r185 的 PCF 采样半径为 `shadowRadius × texelSize`
 * （见 ShaderChunk/shadowmap_pars_fragment.glsl.js），即模糊半径 = radius × (相机宽 / mapSize)。
 * 三档按 mapSize 等比例缩放 radius（512/1、1024/2、2048/4），保持世界空间模糊半径
 * 恒等于基线值 2×16/1024 ≈ 0.031 世界单位——换档只改清晰度，不改柔和观感。
 *
 * 显存账（与 M2.6 注释同口径 4 字节/纹素）：low 1MB · medium 4MB · high 16MB，
 * 均不高于 #79 事故值 64MB（4096²）的量级。
 */
import * as THREE from 'three';

/** 阴影质量档位。medium 为 M2.6 基线档（1024² + radius=2）。 */
export type ShadowQualityTier = 'low' | 'medium' | 'high';

/** 单档阴影参数：贴图边长（正方形）与 PCF 模糊半径（纹素为单位）。 */
export interface ShadowQuality {
    readonly mapSize: number;
    readonly radius: number;
}

/** 档位→参数表。radius 与 mapSize 等比例（见文件头联动说明）。 */
export const SHADOW_QUALITY_PRESETS: Readonly<Record<ShadowQualityTier, ShadowQuality>> = {
    low: { mapSize: 512, radius: 1 },
    medium: { mapSize: 1024, radius: 2 },
    high: { mapSize: 2048, radius: 4 }
};

/** 设备能力信号（可注入，便于测试；缺省由 navigator 读取）。 */
export interface ShadowCapabilitySignals {
    /** navigator.hardwareConcurrency —— 逻辑处理器数 */
    hardwareConcurrency?: number;
}

/** 开发/QA 覆盖通道：URL query `?shadowTier=low|medium|high`（仅接受精确档位名）。 */
const TIER_QUERY_KEY = 'shadowTier';

const TIER_NAMES: readonly ShadowQualityTier[] = ['low', 'medium', 'high'];

function isTierName(value: string | null): value is ShadowQualityTier {
    return value !== null && (TIER_NAMES as readonly string[]).includes(value);
}

/** 读取 navigator.hardwareConcurrency（非浏览器环境返回 undefined）。 */
function readHardwareConcurrency(): number | undefined {
    if (typeof navigator === 'undefined') return undefined;
    const cores = navigator.hardwareConcurrency;
    return typeof cores === 'number' && Number.isFinite(cores) ? cores : undefined;
}

/**
 * 按设备能力信号推断质量档（纯函数）。
 * 核数分档：≥8 → high，5–7 → medium，≤4 → low；信号缺失/非法 → medium（基线兜底）。
 */
export function detectShadowQualityTier(signals: ShadowCapabilitySignals = {}): ShadowQualityTier {
    const cores = signals.hardwareConcurrency;
    if (typeof cores !== 'number' || !Number.isFinite(cores) || cores <= 0) return 'medium';
    if (cores >= 8) return 'high';
    if (cores <= 4) return 'low';
    return 'medium';
}

/** 从 URL query 解析档位覆盖（纯函数）；非法/缺失返回 null。 */
export function shadowTierFromSearch(search: string): ShadowQualityTier | null {
    if (!search) return null;
    let value: string | null = null;
    try {
        value = new URLSearchParams(search).get(TIER_QUERY_KEY);
    } catch {
        return null; // 极端环境无 URLSearchParams —— 忽略覆盖, 回退设备检测
    }
    return isTierName(value) ? value : null;
}

/** 读取当前页面 URL 的档位覆盖（非浏览器环境返回 null）。 */
function readShadowTierFromLocation(): ShadowQualityTier | null {
    if (typeof window === 'undefined' || !window.location) return null;
    return shadowTierFromSearch(window.location.search);
}

/** 档位名合法性校验（URL/外部输入收口用）；非法值返回 false。 */
export function isShadowQualityTier(value: unknown): value is ShadowQualityTier {
    return typeof value === 'string' && isTierName(value);
}

/**
 * 解析生效档位，优先级：显式参数 > URL 覆盖（dev/QA 通道）> 设备能力检测。
 */
export function resolveShadowQualityTier(explicit?: ShadowQualityTier): ShadowQualityTier {
    if (explicit !== undefined && isShadowQualityTier(explicit)) return explicit;
    return readShadowTierFromLocation() ?? detectShadowQualityTier({ hardwareConcurrency: readHardwareConcurrency() });
}

/** 取档位对应的阴影参数；非法档位名回落 medium（基线值，绝不放大显存）。 */
export function resolveShadowQuality(tier?: ShadowQualityTier): ShadowQuality {
    if (tier !== undefined && isShadowQualityTier(tier)) return SHADOW_QUALITY_PRESETS[tier];
    return SHADOW_QUALITY_PRESETS.medium;
}

/**
 * 把档位参数写到平行光上（mapSize 与 radius 联动设置）。
 * 档位经完整解析链：显式参数 > URL 覆盖 > 设备能力检测，最终非法值回落 medium。
 */
export function applyShadowQuality(light: THREE.DirectionalLight, tier?: ShadowQualityTier): ShadowQuality {
    const quality = resolveShadowQuality(resolveShadowQualityTier(tier));
    light.shadow.mapSize.set(quality.mapSize, quality.mapSize);
    light.shadow.radius = quality.radius;
    return quality;
}

/**
 * dev-only 验收探针（#81 `__physvisRenderer` 同型模式）：把当前生效的阴影质量写到
 * `window.__physvisShadowQuality`，供 QA/巡检脚本在真实浏览器里核验档位是否生效
 * （如 `?shadowTier=low` → 512²）。生产构建中 `import.meta.env.DEV` 为 false 被 Tree-shake。
 */
export function exposeShadowQualityProbe(quality: ShadowQuality): void {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__physvisShadowQuality = quality;
}
