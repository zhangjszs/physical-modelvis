/**
 * rig 注册表 — 所有 3D 实验场景的 rig 配置
 *
 * 懒加载设计：
 *   - 123 个实验对应 45 种 rig，静态全量导入会让首屏 bundle 超过 1 MB
 *   - 按知识模块分组（mechanics / eMech / em / optics / modern），每组一个动态 import
 *   - 首屏只加载模块路由表（几 KB），用户点进实验时才下载对应 chunk
 *   - 每个 bundle 使用 export default Record<string, SceneRig>，loadSceneRig 取 .default
 */
import type { SceneRig } from '../EquipmentStage';

/**
 * 模块分组 — 每组对应一个独立的动态 import chunk。
 * 分组依据：人教版教材模块，兼顾 rig 复用（同模块内多场景共享同一 rig）。
 */
const RIG_MODULES = {
    // 必修一：力学基础（自由落体/抛体/斜面/胡克/牛顿定律/打点/摩擦/惯性/超重/失重/弹簧/重心/微形变/测工具...）
    mechanics: () => import('./bundles/mechanicsBundle') as Promise<{ default: Record<string, SceneRig> }>,

    // 必修二：曲线运动/能量/动量/万有引力
    eMech: () => import('./bundles/eMechBundle') as Promise<{ default: Record<string, SceneRig> }>,

    // 必修三：电场/磁场/电路/电磁感应
    em: () => import('./bundles/emBundle') as Promise<{ default: Record<string, SceneRig> }>,

    // 选必一：振动/波/光学
    optics: () => import('./bundles/opticsBundle') as Promise<{ default: Record<string, SceneRig> }>,

    // 选必二：电磁感应/传感器
    induction: () => import('./bundles/inductionBundle') as Promise<{ default: Record<string, SceneRig> }>,

    // 选必三：热学/量子/原子/现代物理
    modern: () => import('./bundles/modernBundle') as Promise<{ default: Record<string, SceneRig> }>
} as const;

type ModuleKey = keyof typeof RIG_MODULES;

/** 场景 → 模块归属 */
const SCENE_TO_MODULE: Record<string, ModuleKey> = {
    // —— 力学（必修一）——
    projectile: 'mechanics',
    'free-fall': 'mechanics',
    'uniform-accelerated': 'mechanics',
    'energy-conservation': 'mechanics',
    'work-energy': 'mechanics',
    'ball-xt': 'mechanics',
    'newton-tube': 'mechanics',
    'inclined-plane': 'mechanics',
    'galileo-incline': 'mechanics',
    'ticker-timer': 'mechanics',
    'hooke-law': 'mechanics',
    'air-track': 'mechanics',
    'newton-second-law': 'mechanics',
    'sliding-friction': 'mechanics',
    'force-composition': 'mechanics',
    inertia: 'mechanics',
    overweight: 'mechanics',
    'reaction-time': 'mechanics',
    'newton-third-law': 'mechanics',
    spring: 'mechanics',
    'center-of-gravity': 'mechanics',
    'simple-pendulum': 'mechanics',
    'newton-first-law': 'mechanics',
    'micro-deformation': 'mechanics',
    'vernier-caliper-tool': 'mechanics',
    'micrometer-tool': 'mechanics',
    'multimeter-tool': 'mechanics',

    // —— 必修二（曲线/能量/动量/引力）——
    'curve-velocity-direction': 'eMech',
    'curve-condition': 'eMech',
    'motion-composition': 'eMech',
    'transmission-belt': 'eMech',
    'vertical-circle': 'eMech',
    centrifugal: 'eMech',
    'circular-motion': 'eMech',
    collision: 'eMech',
    momentum: 'eMech',
    orbital: 'eMech',
    'moon-earth-test': 'eMech',
    cavendish: 'eMech',

    // —— 必修三（电磁学）——
    'electric-field': 'em',
    'magnetic-field': 'em',
    'em-combined': 'em',
    'efield-lines': 'em',
    circuit: 'em',
    'load-voltage': 'em',
    'resistance-law': 'em',
    'bulb-vi': 'em',
    'capacitor-charge': 'em',
    'parallel-plate-capacitor': 'em',
    electroscope: 'em',
    'electrostatic-induction': 'em',
    'electrostatic-shielding': 'em',
    'coulomb-force-explore': 'em',
    'ampere-force': 'em',
    'current-magnetic': 'em',
    'em-induction': 'em',
    'em-wave-communication': 'em',
    'em-wave-hertz': 'em',

    // —— 选必一（振动/波/光）——
    'mechanical-wave': 'optics',
    'sound-waveform': 'optics',
    'doppler-effect': 'optics',
    refraction: 'optics',
    'total-internal-reflection': 'optics',
    'polarization-malus': 'optics',
    hologram: 'optics',
    interference: 'optics',
    'water-diffraction': 'optics',
    'sound-interference': 'optics',
    'single-slit': 'optics',
    'diffraction-grating': 'optics',
    'thin-film': 'optics',
    'forced-vibration-freq': 'optics',
    'resonance-curve': 'optics',
    'double-pendulum-sync': 'optics',
    'projectile-collision': 'optics',

    // —— 选必二（电磁感应/传感器）——
    'magnetic-force': 'induction',
    'ac-current': 'induction',
    'lc-oscillator': 'induction',
    'current-balance': 'induction',
    'eddy-current': 'induction',
    'em-damping': 'induction',
    'mutual-inductance': 'induction',
    'self-inductance': 'induction',
    'em-spectrum': 'induction',
    'hall-effect': 'induction',
    'reed-switch': 'induction',
    thermistor: 'induction',
    photoresistor: 'induction',
    'strain-gauge': 'induction',
    'security-alarm': 'induction',
    'light-control-switch': 'induction',

    // —— 选必三（热学/量子/原子/现代）——
    'gas-law': 'modern',
    photoelectric: 'modern',
    bohr: 'modern',
    'bohr-orbit': 'modern',
    radioactive: 'modern',
    'geiger-counter': 'modern',
    diffusion: 'modern',
    'brownian-motion': 'modern',
    'oil-film': 'modern',
    'melting-curve': 'modern',
    'surface-tension': 'modern',
    capillary: 'modern',
    wetting: 'modern',
    'liquid-crystal': 'modern',
    'joule-mechanical': 'modern',
    'joule-electrical': 'modern',
    'adiabatic-compression': 'modern',
    'heat-transfer': 'modern',
    'energy-transformation': 'modern',
    'perpetuum-mobile': 'modern',
    'heat-direction': 'modern',
    'alpha-scattering': 'modern',
    'decay-statistics': 'modern',
    'fission-chain': 'modern',
    'black-body': 'modern',
    'cosmic-ray': 'modern',
    'electron-diffraction': 'modern',
    'faraday-cup': 'modern',
    'liquid-mixing': 'modern',
    'molecular-force': 'modern',
    'neutron-discovery': 'modern',
    'radiation-deflection': 'modern'
};

/** 已加载缓存：模块 key → rig 映射 */
const moduleCache = new Map<ModuleKey, Record<string, SceneRig>>();

/**
 * 异步获取指定场景的 rig。
 * 首次访问某模块时触发动态 import，后续从缓存读取。
 */
export async function loadSceneRig(sceneId: string): Promise<SceneRig | undefined> {
    const mod = SCENE_TO_MODULE[sceneId];
    if (!mod) return undefined;

    if (!moduleCache.has(mod)) {
        const loader = RIG_MODULES[mod];
        const module = await loader();
        const rigs = module.default; // bundle 使用 export default
        moduleCache.set(mod, rigs);
    }

    return moduleCache.get(mod)![sceneId];
}

/**
 * 同步版 — 仅用于判断"该场景是否有 3D rig"（决定走 EquipmentStage 还是 Canvas）。
 * 注意：返回 undefined 不代表没有 rig，可能只是模块尚未加载。
 * 渲染路径请用 loadSceneRig + Suspense。
 */
export function hasSceneRig(sceneId: string): boolean {
    return sceneId in SCENE_TO_MODULE;
}
