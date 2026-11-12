/**
 * 单摆实验 rig — 悬点横梁 + 量角分度盘 + 动态摆线 + 平衡位置光电门
 * 探究单摆周期公式 T = 2π√(L/g)
 *
 * 尺度约定: **1 世界单位 = 1 米** (与 vertical-circle rig 同口径)。
 * 早期版本用 0.16 的通用缩放: 支点放在 2.4 世界单位 (≈15 m) 而摆线只有 0.16 世界单位
 * (1 m) —— 摆球半径 (0.18) 比摆线还长, 摆球整个糊在支点上, 摆线与摆幅都看不见,
 * 光电门也悬在支点旁, 画面表达的物理模型与引擎 (L = 1 m) 完全对不上。
 *
 * 坐标映射: 引擎的摆球位置是 (x = L·sinθ, y = L·cosθ), 其中 y 是**支点下方的距离**
 * (屏幕 y 向下为正), 故 3D 世界高度 = 支点高度 − y。
 *
 * 横向: 装置原点落在舞台中心 STAGE_CENTER_X (与 orbitalRig / circularMotionRig 同口径),
 * 否则器材贴在实验平台左边缘, 画面里露出一大片空地与背景墙切口。
 */
import * as THREE from 'three';
import { SceneRig, SceneFraming } from '../EquipmentStage';
import { createPhotogate } from '../equipment/photogate';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { measurePendulumPeriod } from '../../../rendering/pendulumMetrics';
import { num, setLabel, STAGE_CENTER_X } from './params';

/** 1 世界单位 = 1 米 */
const SCALE = 1;
/** 摆球半径 (m) */
const BALL_RADIUS = 0.08;
/** 支点距地面的净空 (m) —— 最低点的摆球离地高度 */
const PIVOT_CLEARANCE = 0.35;
/** 摆线半径 (m) */
const STRING_RADIUS = 0.01;

const UP = new THREE.Vector3(0, 1, 0);

export interface PendulumHandles {
    beam: THREE.Group;
    string: THREE.Mesh;
    photogate: THREE.Group;
    fieldLabel: THREE.Sprite;
    periodLabel: THREE.Sprite;
    panel: THREE.Mesh;
}

/** 摆长 (m) */
export function lengthOf(params: Record<string, number>): number {
    return num(params.length, num(params.L, 1));
}

/** 支点高度 (m): 支点 = 摆长 + 净空, 保证最低点摆球离地 */
export function pivotHeight(L: number): number {
    return L + PIVOT_CLEARANCE;
}

/** 引擎实测周期 (s); 结果缺失时回退小角度公式 */
function periodOf(
    params: Record<string, number>,
    result?: { trajectories?: unknown } | null
): {
    value: number;
    measured: boolean;
} {
    const L = lengthOf(params);
    const g = num(params.g, 9.8);
    const fallback = 2 * Math.PI * Math.sqrt(L / Math.max(0.1, g));
    const trajs = (result?.trajectories ?? []) as Array<Array<{ t: number; position: { x: number } }>>;
    const measured = measurePendulumPeriod(trajs[0]);
    if (measured !== null && Number.isFinite(measured) && measured > 0) {
        return { value: measured, measured: true };
    }
    return { value: fallback, measured: false };
}

function fieldText(params: Record<string, number>): string {
    const L = lengthOf(params);
    const g = num(params.g, 9.8);
    const theta0 = num(params.angle, 15);
    return `L = ${L.toFixed(2)} m  |  g = ${g.toFixed(1)} m/s²  |  θ₀ = ${theta0.toFixed(0)}°`;
}

function periodText(params: Record<string, number>, result?: { trajectories?: unknown } | null): string {
    const L = lengthOf(params);
    const g = num(params.g, 9.8);
    const tSmall = 2 * Math.PI * Math.sqrt(L / Math.max(0.1, g));
    const { value, measured } = periodOf(params, result);
    const src = measured ? '引擎实测' : '小角度估算';
    return `T = ${value.toFixed(2)} s (${src})  |  2π√(L/g) = ${tSmall.toFixed(2)} s`;
}

/** 按标牌文字宽度调整背景板尺寸 (取 sprite 实际世界宽度, 否则标牌会溢出背景板) */
function layoutPanel(panel: THREE.Mesh, sprites: THREE.Sprite[]): void {
    let worldWidth = 0;
    let worldHeight = 0;
    for (const sprite of sprites) {
        const fontSize = typeof sprite.userData.textFontSize === 'number' ? sprite.userData.textFontSize : 22;
        const worldPerPx = sprite.scale.y / 128;
        worldWidth = Math.max(worldWidth, sprite.scale.x);
        worldHeight = Math.max(worldHeight, fontSize * worldPerPx);
    }
    panel.scale.set(Math.max(0.6, worldWidth + 0.24), Math.max(0.2, worldHeight * 2.6), 1);
}

export const pendulumRig: SceneRig = {
    worldScale: SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: false,

    buildEquipment(scene, params, result) {
        const group = new THREE.Group();

        const L = lengthOf(params);
        const pivotY = pivotHeight(L);

        // 1. 顶部悬挂横梁与悬挂夹
        const beam = new THREE.Group();
        const beamBar = makeBox(2.2, 0.08, 0.14, 0x334155, 0.4, 0.6);
        beamBar.position.set(STAGE_CENTER_X, pivotY + 0.08, 0);
        beam.add(beamBar);

        const clamp = makeCylinder(0.04, 0.12, 0xd97706, 0.3, 0.8);
        clamp.position.set(STAGE_CENTER_X, pivotY + 0.04, 0);
        beam.add(clamp);

        // 横梁必须落在立柱上 (实验台是落地支架, 不是凭空横着一根杆)
        const legHeight = pivotY + 0.04;
        [-0.95, 0.95].forEach(dx => {
            const leg = makeBox(0.07, legHeight, 0.07, 0x475569, 0.55, 0.45);
            leg.position.set(STAGE_CENTER_X + dx, legHeight / 2, 0);
            beam.add(leg);
        });
        const foot = makeBox(2.3, 0.06, 0.42, 0x64748b, 0.65, 0.35);
        foot.position.set(STAGE_CENTER_X, 0.03, 0);
        beam.add(foot);
        group.add(beam);

        // 2. 悬点量角分度弧 (小角度量角盘)
        const dialPts: THREE.Vector3[] = [];
        for (let a = -30; a <= 30; a += 5) {
            const rad = (a * Math.PI) / 180;
            dialPts.push(new THREE.Vector3(STAGE_CENTER_X + Math.sin(rad) * 0.35, pivotY - Math.cos(rad) * 0.35, 0.02));
        }
        const dialArc = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(dialPts),
            new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 })
        );
        group.add(dialArc);

        // 3. 动态单摆细绳 (长度恒为 L, 每帧连到摆球球心)
        const string = makeCylinder(STRING_RADIUS, 1, 0x1e293b, 0.2, 0.8);
        group.add(string);

        // 4. 平衡位置光电门计时探头 (光束高度 = 最低点摆球球心高度)
        const pg = createPhotogate(0.3);
        pg.group.position.set(STAGE_CENTER_X, PIVOT_CLEARANCE - 0.25, 0);
        group.add(pg.group);

        // 5. 测量标牌 (实测周期取自引擎轨迹, 不用小角度公式冒充)
        const fieldLabel = makeTextSprite(fieldText(params), '#0f172a', 22, { x: 1.7, y: 0.28 });
        fieldLabel.position.set(STAGE_CENTER_X, pivotY + 0.62, 0.25);
        group.add(fieldLabel);

        const periodLabel = makeTextSprite(periodText(params, result), '#2563eb', 22, { x: 1.7, y: 0.28 });
        periodLabel.position.set(STAGE_CENTER_X, pivotY + 0.34, 0.25);
        group.add(periodLabel);

        const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9, depthWrite: false })
        );
        panel.position.set(STAGE_CENTER_X, pivotY + 0.48, 0.235);
        group.add(panel);
        layoutPanel(panel, [fieldLabel, periodLabel]);

        scene.add(group);

        const handles: PendulumHandles = {
            beam,
            string,
            photogate: pg.group,
            fieldLabel,
            periodLabel,
            panel
        };

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as PendulumHandles;
        setLabel(h.fieldLabel, fieldText(params), '#0f172a');
        setLabel(h.periodLabel, periodText(params, result), '#2563eb');
        layoutPanel(h.panel, [h.fieldLabel, h.periodLabel]);
    },

    onAnimate(handles, ctx) {
        const h = handles as PendulumHandles;
        const pivotY = pivotHeight(lengthOf(ctx.params));

        // 摆线每帧连到摆球实时球心 (长度恒为 L): 中点定位 + 朝向对齐 + y 向缩放
        const bob = ctx.ballPos;
        const dx = bob.x - STAGE_CENTER_X; // 相对支点的水平偏移
        const dy = bob.y - pivotY;
        const len = Math.max(1e-4, Math.hypot(dx, dy));
        h.string.position.set(STAGE_CENTER_X + dx / 2, pivotY + dy / 2, bob.z / 2);
        h.string.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx, dy, bob.z).normalize());
        h.string.scale.set(1, len, 1);
    },

    /**
     * 物理坐标 → 3D 坐标。
     * 引擎的 y 是「支点下方的距离」(屏幕 y 向下为正), 世界 y 轴朝上 → 取反。
     */
    getVisualPosition(pos, params) {
        const pivotY = pivotHeight(lengthOf(params));
        return new THREE.Vector3(STAGE_CENTER_X + pos.x * SCALE, pivotY - pos.y * SCALE, 0);
    },

    getOrigin(params) {
        const L = lengthOf(params);
        return new THREE.Vector3(STAGE_CENTER_X, pivotHeight(L) - L, 0);
    },

    framing(params, _result): SceneFraming {
        const L = lengthOf(params);
        const pivotY = pivotHeight(L);
        // 画面内容纵向范围: 地面 (光电门底座) ~ 顶部标牌 (支点上方)
        const topY = pivotY + 0.78;
        const bottomY = Math.max(0, pivotY - L - 0.2);
        // 取景需同时容下纵向内容与横向长标牌 (周期行 ≈ 3.4 世界单位宽)
        const distance = Math.max(4.1, ((topY - bottomY) / 0.4142) * 0.78, pivotY * 2.9);
        const target: [number, number, number] = [STAGE_CENTER_X, (topY + bottomY) / 2, 0];
        return {
            target,
            position: [target[0] + distance * 0.22, target[1] + distance * 0.2, distance * 0.94],
            distance
        };
    }
};
