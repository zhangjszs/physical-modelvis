/**
 * 光学折射定律 rig — 360°光学分度盘 + 半圆形高透玻璃砖 + 激光入射与折射光束
 * 验证斯涅尔折射定律 n₁·sinθ₁ = n₂·sinθ₂
 *
 * 口径修正 (#159 逐节审计 · 批次 F 折射):
 *   旧 rig 自己按 sinθ₂ = sinθ₁/(n₂/n₁) 重算折射角, 不读引擎
 *   `diagnostics.maxValues.refractionAngleDeg` / `totalInternalReflection` /
 *   `criticalAngleDeg` —— 引擎一改公式, 画面就漂。
 *   现改为整组读引擎 (角度、临界角、全反射标志), 器材几何按引擎给的角度摆。
 *
 * 另修两处画面问题:
 *   - 舞台按「轨迹包围盒」自动取景, 而本场景的引擎轨迹只有 4 个 t=0 的静态端点
 *     (跨度仅 ±0.5 归一化单位) ⇒ 分度盘 (半径 1.6) 被挤到画面左上角。
 *     改为显式 framing, 把分度盘摆到画面中心。
 *   - 舞台默认小球画在轨迹点上, 而「光」不是小球, 且它正好盖住圆心的光路交点
 *     ⇒ ownParticles: true, 只保留器材本身的光路。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { SceneFraming, SceneRig } from '../EquipmentStage';
import { createOpticalDisk, updateOpticalDisk, OpticalDiskHandles } from '../equipment/opticalDisk';
import { setLabel, num } from './params';

const WORLD_SCALE = 0.16;
const CENTER_Y = 1.4;
/** 分度盘半径 (世界单位) */
const DISK_RADIUS = 1.6;

interface OpticsHandles {
    diskHandles: OpticalDiskHandles;
}

/** 3D 读数 — 单一真源: 引擎 maxValues */
export interface OpticsRigReadouts {
    source: 'engine' | 'fallback';
    /** 介质 1 折射率 */
    n1: number;
    /** 介质 2 折射率 */
    n2: number;
    /** 入射角 θ₁ (°) */
    theta1: number;
    /** 折射角 θ₂ (°); 全反射时为 null */
    theta2: number | null;
    /** 临界角 θ_c (°); n₁ ≤ n₂ 时为 null */
    criticalAngle: number | null;
    /** 是否全反射 */
    totalInternalReflection: boolean;
    /** sinθ₁ */
    sinTheta1: number;
    /** sinθ₂ */
    sinTheta2: number;
}

/** 引擎角度哨兵: -1 = 该配置下无定义 (全反射 / n₁≤n₂ 无临界角) */
const UNDEFINED_ANGLE = -1;

export function opticsRigReadouts(params: Record<string, number>, result?: SimulationResult | null): OpticsRigReadouts {
    const n1 = num(params['n1'], 1.0);
    const n2 = num(params['n2'], 1.5);
    const theta1 = num(params['angle'], 30);

    const mv = result?.diagnostics?.maxValues;
    const eng = (key: string): number | undefined => {
        const v = mv?.[key];
        return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };

    const totalInternalReflection = eng('totalInternalReflection') === 1;
    const rawTheta2 = eng('refractionAngleDeg');
    const rawCritical = eng('criticalAngleDeg');
    const theta2 = rawTheta2 === undefined || rawTheta2 === UNDEFINED_ANGLE ? null : rawTheta2;
    const criticalAngle = rawCritical === undefined || rawCritical === UNDEFINED_ANGLE ? null : rawCritical;

    // 兜底: 引擎无结果时按 Snell 定律解析式算 (与引擎同式)
    const sinTheta1 = eng('sinTheta1') ?? Math.sin((theta1 * Math.PI) / 180);
    const sinTheta2Raw = eng('sinTheta2') ?? (n1 / n2) * sinTheta1;

    return {
        source: mv ? 'engine' : 'fallback',
        n1,
        n2,
        theta1,
        theta2: theta2 ?? (totalInternalReflection ? null : (Math.asin(Math.min(1, sinTheta2Raw)) * 180) / Math.PI),
        criticalAngle: criticalAngle ?? (n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null),
        totalInternalReflection,
        sinTheta1,
        sinTheta2: sinTheta2Raw
    };
}

/** 3D 标牌读数 */
export function opticsReadoutText(read: OpticsRigReadouts): string {
    if (read.totalInternalReflection) {
        return (
            `θ₁ = ${read.theta1.toFixed(1)}° > θc = ${(read.criticalAngle ?? 0).toFixed(1)}° → 全反射 (无折射光)  ` +
            `n₁=${read.n1.toFixed(2)} n₂=${read.n2.toFixed(2)}`
        );
    }
    return (
        `θ₁ = ${read.theta1.toFixed(1)}° → θ₂ = ${(read.theta2 ?? 0).toFixed(2)}°  ` +
        `n₁=${read.n1.toFixed(2)} n₂=${read.n2.toFixed(2)}`
    );
}

export const opticsRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,
    /** 场景没有运动物体 (引擎轨迹 = 4 个静态端点) ⇒ 不画默认球, 只画分度盘与光路 */
    ownParticles: true,
    /**
     * 显式取景: 分度盘半径 1.6、中心高 1.4, 顶部读数标牌在 y = 3.3。
     * 注视点抬到 1.75 并把视距拉到 6.0, 使「盘 + 标牌」完整落在画面内
     * (旧参数下标牌顶到工具条那一行, 被遮掉上半行字)。
     * 舞台默认按轨迹包围盒取景则会把盘挤到画面左上角。
     */
    framing(): SceneFraming {
        const target: [number, number, number] = [0, CENTER_Y + 0.35, 0];
        const distance = 6.0;
        return {
            target,
            position: [target[0] + distance * 0.08, target[1] + distance * 0.14, distance * 0.96],
            distance
        };
    },

    buildEquipment(scene, params, result) {
        const { group, handles: diskHandles } = createOpticalDisk(DISK_RADIUS, CENTER_Y);
        scene.add(group);

        const read = opticsRigReadouts(params, result);
        updateOpticalDisk(diskHandles, read, CENTER_Y, DISK_RADIUS);
        setLabel(diskHandles.angleLabel, opticsReadoutText(read), '#0f172a');

        return {
            group,
            handles: { diskHandles }
        };
    },

    updateEquipment(handles, params, result) {
        const h = handles as OpticsHandles;
        const read = opticsRigReadouts(params, result);
        updateOpticalDisk(h.diskHandles, read, CENTER_Y, DISK_RADIUS);
        setLabel(h.diskHandles.angleLabel, opticsReadoutText(read), '#0f172a');
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, CENTER_Y + pos.y * WORLD_SCALE, 0.05);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, CENTER_Y, 0.05);
    }
};
