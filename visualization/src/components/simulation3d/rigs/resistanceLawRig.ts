/**
 * 电阻定律 3D rig — 四线对比实验板 + 鳄鱼滑动测量夹 + 标尺与电阻读数
 * 探究导体电阻与材料、长度、横截面积的关系 R = ρ·L/S
 *
 * 口径修正 (#159 逐节审计 · 批次 E'' 电阻定律):
 *   旧 rig 自带一份电阻率表 (Cu 1.7e-8 / Fe 1.0e-7 / Nichrome 1.0e-6) 并**自己**
 *   按 R = ρ·L/S 算电阻, 而引擎 `resistance-law` 用的是 RESISTIVITY
 *   (Cu **1.68e-8** / Fe 1.0e-7 / Nichrome **1.1e-6**):
 *     - 铜档 R₀: rig 0.021646 Ω vs 引擎 0.021390 Ω (差 1.2%);
 *     - 镍铬档 R₀: rig 1.273 Ω vs 引擎 1.401 Ω (差 10%)。
 *   ⇒ 3D 标牌上的 R 与 2D 板书 / 数据抽屉里的 R 不是同一个数, 改引擎参数就漂。
 *
 *   现在 rig 只消费引擎 `diagnostics.maxValues`
 *   (resistivity / crossSection / baseResistance / slope_R_L / slope_R_invS /
 *    rCu / rFe / rNichrome), 电阻率表直接从 physics-core 的 RESISTIVITY 取
 *   (仅作「无引擎结果」时的兜底, 不再维护第二份副本)。
 */
import * as THREE from 'three';
import { RESISTIVITY, type SimulationResult } from 'physics-core';
import { SceneFraming, SceneRig } from '../EquipmentStage';
import { createResistanceBoard, updateResistanceBoard, ResistanceBoardHandles } from '../equipment/resistanceBoard';
import { num, STAGE_CENTER_X } from './params';

const WORLD_SCALE = 0.16;

/** 场景参数 material 索引 → 引擎材料键 (与 physics-core 的 RESISTIVITY 对齐) */
const MATERIAL_KEYS = ['Cu', 'Fe', 'Nichrome'] as const;
export type ResistanceMaterialKey = (typeof MATERIAL_KEYS)[number];

/** 材料中文名 */
export const RESISTANCE_MATERIAL_NAMES: Record<ResistanceMaterialKey, string> = {
    Cu: '铜',
    Fe: '铁',
    Nichrome: '镍铬'
};

/** 场景参数索引 → 材料键 (越界钳到有效范围) */
export function resistanceMaterialKey(index: number): ResistanceMaterialKey {
    const i = Math.round(index);
    return MATERIAL_KEYS[Math.min(MATERIAL_KEYS.length - 1, Math.max(0, i))]!;
}

/** 3D 读数 — 单一真源: 引擎 maxValues */
export interface ResistanceLawRigReadouts {
    source: 'engine' | 'fallback';
    /** 导线长度 L (m) */
    L: number;
    /** 导线直径 d (mm) */
    dMm: number;
    /** 材料键 */
    material: ResistanceMaterialKey;
    /** 材料中文名 */
    materialName: string;
    /** 电阻率 ρ (Ω·m) */
    rho: number;
    /** 横截面积 S (m²) */
    area: number;
    /** 基准电阻 R₀ (Ω) */
    R: number;
    /** R-L 斜率 = ρ/S (Ω/m) */
    slopeRL: number;
    /** R-1/S 斜率 = ρ·L (Ω·m²) */
    slopeInvS: number;
    /** 当前 L、S 下铜的电阻 (Ω) */
    rCu: number;
    /** 当前 L、S 下铁的电阻 (Ω) */
    rFe: number;
    /** 当前 L、S 下镍铬的电阻 (Ω) */
    rNichrome: number;
}

/**
 * 读引擎结果; 引擎没给值时才用 RESISTIVITY + 解析式兜底。
 *
 * `maxValues` 的类型是 `Record<string, number>`, 取值天然带 `undefined`,
 * 不需要任何强转 —— 与 #124「渲染层读引擎结果必须走类型化层」的约定一致。
 */
export function resistanceLawRigReadouts(
    params: Record<string, number>,
    result?: SimulationResult | null
): ResistanceLawRigReadouts {
    const L = num(params['length'], 1);
    const dMm = num(params['diameter'], 1);
    const material = resistanceMaterialKey(num(params['material'], 0));

    const mv = result?.diagnostics?.maxValues;
    const eng = (key: string): number | undefined => {
        const v = mv?.[key];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };

    const area = Math.PI * ((dMm * 1e-3) / 2) ** 2;
    const rho = eng('resistivity') ?? RESISTIVITY[material];
    const crossSection = eng('crossSection') ?? area;
    const denom = Math.max(crossSection, 1e-12);

    return {
        source: eng('baseResistance') !== undefined ? 'engine' : 'fallback',
        L,
        dMm,
        material,
        materialName: RESISTANCE_MATERIAL_NAMES[material],
        rho,
        area: crossSection,
        R: eng('baseResistance') ?? (rho * L) / denom,
        slopeRL: eng('slope_R_L') ?? rho / denom,
        slopeInvS: eng('slope_R_invS') ?? rho * L,
        rCu: eng('rCu') ?? (RESISTIVITY.Cu * L) / denom,
        rFe: eng('rFe') ?? (RESISTIVITY.Fe * L) / denom,
        rNichrome: eng('rNichrome') ?? (RESISTIVITY.Nichrome * L) / denom
    };
}

/** 电阻读数的有效数字格式 (R₀ 常在 10⁻³ ~ 10¹ 量级, 固定两位小数会把 0.0214 写成 0.02) */
export function formatResistance(r: number): string {
    if (!Number.isFinite(r)) return '—';
    const abs = Math.abs(r);
    if (abs >= 1000 || (abs > 0 && abs < 0.01)) return r.toExponential(2);
    if (abs >= 100) return r.toFixed(1);
    if (abs >= 10) return r.toFixed(2);
    return r.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

/** 3D 主读数标牌 */
export function resistanceReadoutText(read: ResistanceLawRigReadouts): string {
    return `R = ${formatResistance(read.R)} Ω  |  L = ${read.L.toFixed(2)} m  |  ρ = ${read.rho.toExponential(2)} Ω·m`;
}

/** 3D 材料对比标牌 (对应引擎 R_material 曲线) */
export function resistanceCompareText(read: ResistanceLawRigReadouts): string {
    return (
        `铜 ${formatResistance(read.rCu)} Ω  |  铁 ${formatResistance(read.rFe)} Ω  |  ` +
        `镍铬 ${formatResistance(read.rNichrome)} Ω`
    );
}

/** 实验板四根电阻丝的标签: 场景材料 (L,S) / (L/2,S) / (L,2S) + 对比材料 (L,S) */
export function resistanceWireLabels(read: ResistanceLawRigReadouts): string[] {
    const other: ResistanceMaterialKey = read.material === 'Fe' ? 'Cu' : 'Fe';
    const m = RESISTANCE_MATERIAL_NAMES[read.material];
    const o = RESISTANCE_MATERIAL_NAMES[other];
    return [`1. ${m} (L, S)`, `2. ${m} (L/2, S)`, `3. ${m} (L, 2S)`, `4. ${o} (L, S)`];
}

/**
 * 3D 实验板对应的接入长度显示区间 (m) —— 与场景 `length` 参数的 min/max 一致。
 *
 * 滑夹位置按**对数**刻度映射: L 从 0.01 m 到 100 m 跨 4 个数量级,
 * 线性刻度下默认 L = 1 m 会贴在板子最左端 (0.01 m~1 m 挤在一起看不出差别),
 * 对数刻度把每个数量级等分, L = 1 m 正落在板中央, L = 10 m / 0.1 m 分别在 3/4 与 1/4 处 ——
 * 「长度↑ → 接入电阻丝更长 → R 更大」这条因果链在 3D 里**看得见**。
 *
 * (旧版按 L/2 线性映射并硬夹在 [0.05, 0.95], L > 1.9 m 后滑夹卡死在右端,
 *  画面与参数脱节。)
 */
const L_DISPLAY_MIN = 0.01;
const L_DISPLAY_MAX = 100;

/** 滑夹归一化位置 (0~1, 对数刻度) */
export function resistanceClipRatio(L: number): number {
    const lo = Math.log10(L_DISPLAY_MIN);
    const hi = Math.log10(L_DISPLAY_MAX);
    const l = Math.log10(Math.min(L_DISPLAY_MAX, Math.max(L_DISPLAY_MIN, L)));
    const t = (l - lo) / (hi - lo);
    return THREE.MathUtils.clamp(t, 0.05, 0.95);
}

export const resistanceLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,
    /**
     * 引擎轨迹只有 1 个静止点 (电阻定律是参数研究, 没有运动物体),
     * 舞台的「按轨迹包围盒自动取景」会把 3.2×1.4 的实验板挤到画面左上角。
     * 故显式取景: 注视点抬到板面之上, 俯角加大以看清四根电阻丝与滑���。
     */
    framing(): SceneFraming {
        const target: [number, number, number] = [STAGE_CENTER_X, 0.35, 0];
        const distance = 4.4;
        return {
            target,
            position: [target[0] + distance * 0.12, target[1] + distance * 0.62, distance * 0.88],
            distance
        };
    },
    /** 场景没有运动物体 (引擎轨迹 = 1 个静止点) ⇒ 不画默认球/轨迹线, 只画实验板与滑夹 */
    ownParticles: true,

    buildEquipment(scene, params, result) {
        const read = resistanceLawRigReadouts(params, result);
        const { group, handles } = createResistanceBoard(3.2, 1.4, resistanceWireLabels(read), '标尺 0 ~ 100 m (对数)');
        // 实验板摆到舞台中心 (器材默认落在 x=0 → 画面偏左)
        group.position.x = STAGE_CENTER_X;
        scene.add(group);

        updateResistanceBoard(
            handles,
            resistanceClipRatio(read.L),
            resistanceReadoutText(read),
            resistanceCompareText(read),
            3.2
        );

        return {
            group,
            handles
        };
    },

    updateEquipment(handles, params, result) {
        const h = handles as ResistanceBoardHandles;
        const read = resistanceLawRigReadouts(params, result);
        updateResistanceBoard(
            h,
            resistanceClipRatio(read.L),
            resistanceReadoutText(read),
            resistanceCompareText(read),
            3.2
        );
    },

    getVisualPosition(_pos, params, result) {
        const read = resistanceLawRigReadouts(params, result);
        const xPos = -1.3 + resistanceClipRatio(read.L) * 2.6;
        return new THREE.Vector3(xPos, 0.12, 0);
    },

    getOrigin(_params, result) {
        const read = resistanceLawRigReadouts(_params, result);
        void read;
        return new THREE.Vector3(0, 0.12, 0);
    }
};
