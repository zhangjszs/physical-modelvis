/**
 * 阴影贴图自适应质量契约 (#95)
 *
 * 背景: M2.6 收官时阴影图回调保持固定 1024² + radius=2 (显存 4MB 护栏)。本单把
 * 固定值改为设备能力驱动的三档策略, 本测试固化其契约:
 *   1. medium 档必须逐字等于 M2.6 基线值 (1024² + radius=2) —— 信号缺失时的兜底行为
 *      与改动前完全一致, 这是护栏不回退的机器化判据;
 *   2. radius 与 mapSize 等比例 (PCF radius 以纹素计, 世界空间模糊半径恒定),
 *      换档只改清晰度不改柔和观感;
 *   3. 设备能力分档边界 (核数) 与 URL 覆盖通道的取整/夹取/非法输入收口;
 *   4. createEnvironment 把档位真正写到平行光阴影上 (集成路径)。
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as THREE from 'three';
import {
    SHADOW_QUALITY_PRESETS,
    applyShadowQuality,
    detectShadowQualityTier,
    isShadowQualityTier,
    resolveShadowQuality,
    resolveShadowQualityTier,
    shadowTierFromSearch,
    type ShadowQualityTier
} from '../../src/components/simulation3d/shadowQuality';
import { createEnvironment } from '../../src/components/simulation3d/primitives';

/** 从 createEnvironment 的 lights 里取平行光 (阴影载体) */
function keyLightOf(scene: THREE.Scene): THREE.DirectionalLight {
    const light = scene.children.find((c): c is THREE.DirectionalLight => c instanceof THREE.DirectionalLight);
    if (!light) throw new Error('createEnvironment 未创建 DirectionalLight');
    return light;
}

describe('阴影档位预设表 (#95)', () => {
    it('medium 档 = M2.6 基线值 1024² + radius=2 (护栏锚点)', () => {
        expect(SHADOW_QUALITY_PRESETS.medium).toEqual({ mapSize: 1024, radius: 2 });
    });

    it('mapSize 均为 2 的幂且夹取在 [512, 2048] (显存 1MB–16MB, 不越 #79 事故量级)', () => {
        for (const preset of Object.values(SHADOW_QUALITY_PRESETS)) {
            expect(Number.isInteger(Math.log2(preset.mapSize))).toBe(true);
            expect(preset.mapSize).toBeGreaterThanOrEqual(512);
            expect(preset.mapSize).toBeLessThanOrEqual(2048);
        }
    });

    it('radius 与 mapSize 等比例 — 世界空间模糊半径恒定 (shadow camera ±8 固定)', () => {
        const worldBlur = (q: { mapSize: number; radius: number }) => (q.radius * 16) / q.mapSize;
        const baseline = worldBlur(SHADOW_QUALITY_PRESETS.medium);
        expect(worldBlur(SHADOW_QUALITY_PRESETS.low)).toBeCloseTo(baseline, 10);
        expect(worldBlur(SHADOW_QUALITY_PRESETS.high)).toBeCloseTo(baseline, 10);
    });
});

describe('detectShadowQualityTier 设备能力分档 (#95)', () => {
    it('≥8 核 → high (2048²)', () => {
        expect(detectShadowQualityTier({ hardwareConcurrency: 8 })).toBe('high');
        expect(detectShadowQualityTier({ hardwareConcurrency: 24 })).toBe('high');
    });

    it('5–7 核 → medium', () => {
        expect(detectShadowQualityTier({ hardwareConcurrency: 5 })).toBe('medium');
        expect(detectShadowQualityTier({ hardwareConcurrency: 7 })).toBe('medium');
    });

    it('≤4 核 → low (512², 1MB)', () => {
        expect(detectShadowQualityTier({ hardwareConcurrency: 4 })).toBe('low');
        expect(detectShadowQualityTier({ hardwareConcurrency: 1 })).toBe('low');
    });

    it('信号缺失/非法 (0/负数/NaN/undefined) → medium 基线兜底', () => {
        expect(detectShadowQualityTier({})).toBe('medium');
        expect(detectShadowQualityTier({ hardwareConcurrency: undefined })).toBe('medium');
        expect(detectShadowQualityTier({ hardwareConcurrency: 0 })).toBe('medium');
        expect(detectShadowQualityTier({ hardwareConcurrency: -2 })).toBe('medium');
        expect(detectShadowQualityTier({ hardwareConcurrency: NaN })).toBe('medium');
    });
});

describe('shadowTierFromSearch URL 覆盖通道 (#95)', () => {
    it('精确档位名解析', () => {
        expect(shadowTierFromSearch('?shadowTier=low')).toBe('low');
        expect(shadowTierFromSearch('?shadowTier=medium')).toBe('medium');
        expect(shadowTierFromSearch('?shadowTier=high')).toBe('high');
    });

    it('非法/缺失值返回 null (回退设备检测, 不放大显存)', () => {
        expect(shadowTierFromSearch('?shadowTier=ultra')).toBeNull();
        expect(shadowTierFromSearch('?shadowTier=')).toBeNull();
        expect(shadowTierFromSearch('?other=1')).toBeNull();
        expect(shadowTierFromSearch('')).toBeNull();
    });
});

describe('isShadowQualityTier 外部输入收口 (#95)', () => {
    it('仅接受三个精确档位名', () => {
        expect(isShadowQualityTier('low')).toBe(true);
        expect(isShadowQualityTier('medium')).toBe(true);
        expect(isShadowQualityTier('high')).toBe(true);
        expect(isShadowQualityTier('ultra')).toBe(false);
        expect(isShadowQualityTier(undefined)).toBe(false);
        expect(isShadowQualityTier(1024)).toBe(false);
    });
});

describe('resolveShadowQuality 取参 (#95)', () => {
    it('合法档位取预设; undefined 与非法名回落 medium', () => {
        expect(resolveShadowQuality('low')).toEqual(SHADOW_QUALITY_PRESETS.low);
        expect(resolveShadowQuality('high')).toEqual(SHADOW_QUALITY_PRESETS.high);
        expect(resolveShadowQuality()).toEqual(SHADOW_QUALITY_PRESETS.medium);
        expect(resolveShadowQuality('ultra' as ShadowQualityTier)).toEqual(SHADOW_QUALITY_PRESETS.medium);
    });
});

describe('applyShadowQuality 写到平行光 (#95)', () => {
    it('mapSize 正方形且与 radius 联动生效', () => {
        const light = new THREE.DirectionalLight(0xffffff, 1);
        const q = applyShadowQuality(light, 'high');
        expect(q).toEqual(SHADOW_QUALITY_PRESETS.high);
        expect(light.shadow.mapSize.width).toBe(2048);
        expect(light.shadow.mapSize.height).toBe(2048);
        expect(light.shadow.radius).toBe(4);
    });
});

describe('createEnvironment 阴影档位集成 (#95)', () => {
    afterEach(() => {
        window.history.replaceState(null, '', '/');
    });

    it('显式档位参数写到 key 光阴影上', () => {
        const scene = new THREE.Scene();
        createEnvironment(scene, 0xf8fafc, 'low');
        const key = keyLightOf(scene);
        expect(key.shadow.mapSize.width).toBe(512);
        expect(key.shadow.radius).toBe(1);
    });

    it('设备信号缺失 (jsdom 桩掉 hardwareConcurrency) → 回落 medium 基线 (行为同改动前)', () => {
        Object.defineProperty(navigator, 'hardwareConcurrency', { value: undefined, configurable: true });
        try {
            const scene = new THREE.Scene();
            createEnvironment(scene);
            const key = keyLightOf(scene);
            expect(key.shadow.mapSize.width).toBe(1024);
            expect(key.shadow.radius).toBe(2);
        } finally {
            Object.defineProperty(navigator, 'hardwareConcurrency', { value: 24, configurable: true });
        }
    });

    it('无显式档位时跟随设备检测 (jsdom 报 24 核 → high, URL 缺省)', () => {
        const scene = new THREE.Scene();
        createEnvironment(scene);
        const key = keyLightOf(scene);
        expect(key.shadow.mapSize.width).toBe(
            SHADOW_QUALITY_PRESETS[detectShadowQualityTier({ hardwareConcurrency: navigator.hardwareConcurrency })]
                .mapSize
        );
    });

    it('URL ?shadowTier= 覆盖通道优先于设备检测', () => {
        window.history.replaceState(null, '', '/?shadowTier=high');
        const scene = new THREE.Scene();
        createEnvironment(scene);
        const key = keyLightOf(scene);
        expect(key.shadow.mapSize.width).toBe(2048);
        expect(key.shadow.radius).toBe(4);
    });

    it('resolveShadowQualityTier 优先级: 显式参数 > URL > 设备检测', () => {
        const originalCores = navigator.hardwareConcurrency;
        window.history.replaceState(null, '', '/?shadowTier=high');
        expect(resolveShadowQualityTier('low')).toBe('low'); // 显式参数胜出
        expect(resolveShadowQualityTier()).toBe('high'); // URL 覆盖
        window.history.replaceState(null, '', '/');
        Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4, configurable: true });
        try {
            expect(resolveShadowQualityTier()).toBe('low'); // 设备检测 (4 核)
        } finally {
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                value: originalCores,
                configurable: true
            });
        }
    });
});
