/**
 * 抛体运动 rig — 验证 EquipmentStage 抽象
 * 发射器 + 地面卷尺 + 高度尺 + 落点垫
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { createLauncher, updateLauncher, getVisualLaunchPoint } from '../equipment';
import { createRangeTape } from '../equipment/rangeTape';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeBox, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.22;
/** 卷尺与场景尺度同源: 1 世界单位 = 1/WORLD_SCALE 米 */
const METERS_PER_UNIT = 1 / WORLD_SCALE;

// 模块级 scratch vector，避免每帧分配新对象 (#16)
const _scratchVec3 = new THREE.Vector3();

export interface ProjectileHandles {
    launcher: ReturnType<typeof createLauncher>['handles'];
    rangeTape: THREE.Group;
    heightRuler: ReturnType<typeof createHeightRuler>['handles'];
    landingPad: THREE.Group;
    xLabel: THREE.Sprite;
}

/**
 * 抛体读数 — **单一真源: 引擎 diagnostics.maxValues** (#159 逐节审计)
 *
 * 旧实现在 rig 内重解落地方程求 xLand (`v₀x·tLand`), 与引擎的 `range` 是两套公式。
 * 引擎的 projectile 模型已把「落地即止」写进契约 (tEnd = min(tLand, duration)),
 * 射程/最高点/飞行时间都在 maxValues 里, rig 应直接读。
 *
 * 无引擎结果时回退到解析式 (防御空结果), 并用 `source` 标明来源。
 */
export interface ProjectileReadouts {
    /** 射程 (落地水平距离, m) */
    range: number;
    /** 最高点离地高度 (m) */
    apexHeight: number;
    /** 飞行时间 (s) */
    flightTime: number;
    /** 发射角 (°) */
    thetaDeg: number;
    source: 'engine' | 'fallback';
}

export function projectileReadouts(
    params: Record<string, number>,
    result?: SimulationResult | null
): ProjectileReadouts {
    const angle = num(params['angle'], 45);
    const h0 = num(params['h0'], 2);
    const v0 = num(params['v0'], 20);
    const g = num(params['g'], 9.8);
    const mv = result?.diagnostics?.maxValues as Record<string, number> | undefined;
    if (mv && typeof mv['range'] === 'number' && typeof mv['apexHeight'] === 'number') {
        return {
            range: mv['range'],
            apexHeight: mv['apexHeight'],
            flightTime: typeof mv['flightTime'] === 'number' ? mv['flightTime'] : 0,
            thetaDeg: typeof mv['thetaDeg'] === 'number' ? mv['thetaDeg'] : angle,
            source: 'engine'
        };
    }
    const angleRad = (angle * Math.PI) / 180;
    const v0x = v0 * Math.cos(angleRad);
    const v0y = v0 * Math.sin(angleRad);
    const disc = Math.max(0, v0y * v0y + 2 * g * h0);
    const tLand = g > 0 ? (v0y + Math.sqrt(disc)) / g : 0;
    return {
        range: v0x * tLand,
        apexHeight: h0 + (v0y * v0y) / (2 * g),
        flightTime: tLand,
        thetaDeg: angle,
        source: 'fallback'
    };
}

export const projectileRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, _params) {
        // 发射器
        const { group: launcherGroup, handles: launcherHandles } = createLauncher();
        scene.add(launcherGroup);

        // 地面卷尺 (从发射口下方 x=0 铺展到落点后方)
        // 刻度数字由 metersPerUnit 推导 → 与 rig 的 worldScale 同源 (旧实现 5 m/单位 与 6.25 m/单位 打架)
        const { group: rangeTape } = createRangeTape(8.0, METERS_PER_UNIT);
        rangeTape.position.set(0, 0.035, 0.55);
        scene.add(rangeTape);

        // 水平距离标签
        const xLabel = makeTextSprite('水平距离 x / m', '#2563eb', 36, { x: 1.05, y: 0.36 });
        xLabel.position.set(8.5, 0.2, 0.55);
        scene.add(xLabel);

        // 高度尺
        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        scene.add(heightGroup);

        // 落点垫
        const landingPad = createLandingPad();
        landingPad.position.set(6, 0, 0);
        scene.add(landingPad);

        const group = new THREE.Group(); // 虚拟根（器材已直接挂 scene）

        return {
            group,
            handles: {
                launcher: launcherHandles,
                rangeTape,
                heightRuler: heightHandles,
                landingPad,
                xLabel
            }
        };
    },

    updateEquipment(handles, params, result) {
        const h = handles as ProjectileHandles;
        const angle = num(params['angle'], 45);
        const h0 = num(params['h0'], 2);

        const launchPoint = updateLauncher(h.launcher, angle, h0, WORLD_SCALE);

        // 落地点读引擎射程 (旧实现用本地重解的落地方程)
        const read = projectileReadouts(params, result);
        const landingX = read.range * WORLD_SCALE;
        h.landingPad.position.set(landingX, 0, 0);

        // 地面卷尺从 0 延伸，距离标注对齐落点
        h.rangeTape.position.set(0, 0.035, 0.55);
        h.xLabel.position.set(landingX, 0.2, 0.55);

        // 高度尺放在发射器左侧，测量地面到发射口实际高度
        updateHeightRuler(h.heightRuler, -0.35, 0.08, Math.max(0.22, launchPoint.y), `h0 = ${h0.toFixed(1)} m`);
    },

    getVisualPosition(pos) {
        // 单一真源：引擎轨迹坐标 → 世界坐标。
        // 旧实现在此重解落地方程并自算「贴地滑行」段, 但引擎的 projectile 模型
        // 契约是「落地即止」(tEnd = min(tLand, duration)), 轨迹永远不会越过落点 ——
        // 那段滑行分支是永远走不到的第二套物理, 已删除。
        const visualX = pos.x * WORLD_SCALE;
        const visualY = BALL_RADIUS + Math.max(0, pos.y) * WORLD_SCALE;
        return _scratchVec3.set(visualX, visualY, 0);
    },

    getOrigin(params) {
        const angle = num(params['angle'], 45);
        const h0 = num(params['h0'], 2);
        return getVisualLaunchPoint(angle, h0, WORLD_SCALE);
    }
};

function createLandingPad(): THREE.Group {
    const group = new THREE.Group();
    const pad = makeBox(0.78, 0.028, 0.52, 0xf97316, 0.5);
    pad.position.set(0, 0.03, 0);
    group.add(pad);

    const centerLine = makeBox(0.7, 0.012, 0.035, 0xffffff, 0.4);
    centerLine.position.set(0, 0.055, 0);
    group.add(centerLine);

    const crossLine = makeBox(0.035, 0.012, 0.46, 0xffffff, 0.4);
    crossLine.position.set(0, 0.058, 0);
    group.add(crossLine);

    const label = makeTextSprite('预计落点', '#ea580c', 34, { x: 0.86, y: 0.29 });
    label.position.set(0, 0.22, -0.48);
    group.add(label);

    return group;
}
