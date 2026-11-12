/**
 * 天体轨道与万有引力 rig — 中心天体 + 椭圆开普勒轨道 + 万有引力与速度矢量
 * 验证万有引力提供向心力 G·M·m/r² = m·v²/r 与开普勒行星定律
 *
 * 视觉约定：
 *   - 场景原点取舞台中心 STAGE_CENTER_X（不是世界 x=0），否则整体偏左、露出背景暗边；
 *   - 轨道中心高度 = 轨道视觉半径 + 离地余量，保证轨道最低点永远高于参考平面；
 *   - 轨道线用同一套 Kepler 极坐标生成，卫星位置按同一比例映射，线与点必然重合。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeLine, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';
import { altitudeVisualFraction, orbitShape, type OrbitShape } from '../../../utils/orbitGeometry';

const GM = 3.986e14; // 地球引力参数 (m³/s²)
const N_ORBIT = 220;
const EARTH_RADIUS = 0.42;
/** 轨道最低点与参考平面的间隙（世界单位） */
const GROUND_CLEARANCE = 0.35;
/** 轨道最远点的视觉半径上限，防止大椭圆挤出视口 */
const MAX_VISUAL_RADIUS = 2.35;
const MIN_VISUAL_RADIUS = 1.15;
const BALL_RADIUS = 0.06;

interface OrbitVisual {
    shape: OrbitShape;
    hKm: number;
    vKmS: number;
    /** 轨道最远点的视觉半径 */
    rMaxVisual: number;
    /** 初始轨道半径的视觉大小 */
    initialVisual: number;
    /** 物理米 → 世界单位 */
    scale: number;
    /** 中心天体 / 轨道中心的 y */
    centerY: number;
    typeLabel: string;
}

interface OrbitalHandles {
    center: THREE.Mesh;
    centerWire: THREE.Mesh;
    orbit: THREE.Line;
    gravityArrow: THREE.ArrowHelper;
    velocityArrow: THREE.ArrowHelper;
    gravityLabel: THREE.Sprite;
    velocityLabel: THREE.Sprite;
    centerLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
    /** 信息标牌底板：深色舞台背景下也能保证文字对比度 */
    infoPanel: THREE.Mesh;
    centerPos: THREE.Vector3;
    geom: OrbitVisual;
}

const _rDir = new THREE.Vector3();
const _vDir = new THREE.Vector3();

/** 由参数推导视觉几何（纯函数，60fps 调用零分配） */
function resolveVisual(params: Record<string, number>): OrbitVisual {
    const hKm = THREE.MathUtils.clamp(num(params.altitude, 400), 200, 36000);
    const vf = THREE.MathUtils.clamp(num(params.velocityFactor, 1), 0.5, 1.5);
    const shape = orbitShape(hKm, vf);
    const base = MIN_VISUAL_RADIUS + (2.0 - MIN_VISUAL_RADIUS) * altitudeVisualFraction(hKm);
    const rMaxVisual = Math.min(MAX_VISUAL_RADIUS, base * (shape.rMaxM / shape.r0M));
    const scale = rMaxVisual / shape.rMaxM;
    const typeLabel = !shape.closed
        ? '逃逸轨道'
        : shape.vf > 1.01
          ? '椭圆(近地点)'
          : shape.vf < 0.99
            ? '椭圆(远地点)'
            : '圆轨道';
    return {
        shape,
        hKm,
        vKmS: (Math.sqrt(GM / shape.r0M) * shape.vf) / 1000,
        rMaxVisual,
        initialVisual: shape.r0M * scale,
        scale,
        centerY: rMaxVisual + GROUND_CLEARANCE,
        typeLabel
    };
}

/** 完整闭合轨道的 Kepler 极坐标采样（世界坐标，z 略靠后避免与引擎轨迹线 z-fighting） */
function closedOrbitPoints(geom: OrbitVisual): THREE.Vector3[] {
    const { shape } = geom;
    if (!shape.closed) return [];
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < N_ORBIT; i++) {
        const theta = (i / (N_ORBIT - 1)) * Math.PI * 2;
        const r = geom.initialVisual * shape.radiusRatio(theta);
        points.push(
            new THREE.Vector3(STAGE_CENTER_X + Math.cos(theta) * r, geom.centerY + Math.sin(theta) * r, -0.012)
        );
    }
    return points;
}

/** 开放轨道没有闭合曲线可画，用已积分的引擎轨迹作为参考线（无结果时为空） */
function openOrbitPoints(geom: OrbitVisual, result: SimulationResult | null | undefined): THREE.Vector3[] {
    const traj = result?.trajectories?.[0];
    if (!traj || traj.length < 2) return [];
    const step = Math.max(1, Math.floor(traj.length / N_ORBIT));
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < traj.length; i += step) {
        const p = traj[i]!;
        points.push(
            new THREE.Vector3(
                STAGE_CENTER_X + p.position.x * geom.scale,
                geom.centerY + p.position.y * geom.scale,
                -0.012
            )
        );
    }
    return points;
}

function labelText(geom: OrbitVisual): string {
    const eText = geom.shape.closed ? geom.shape.e.toFixed(2) : `${geom.shape.e.toFixed(2)} (开放)`;
    return `h = ${geom.hKm.toFixed(0)} km | v = ${geom.vKmS.toFixed(2)} km/s | e = ${eText} | ${geom.typeLabel}`;
}

/** 参数/结果变化时重建轨道线与标牌；buildEquipment 也复用它完成初始布局 */
function applyGeometry(
    handles: OrbitalHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined
): void {
    const geom = resolveVisual(params);
    handles.geom = geom;
    handles.centerPos.set(STAGE_CENTER_X, geom.centerY, 0);
    handles.center.position.copy(handles.centerPos);
    handles.centerWire.position.copy(handles.centerPos);

    const points = geom.shape.closed ? closedOrbitPoints(geom) : openOrbitPoints(geom, result);
    handles.orbit.geometry.dispose();
    handles.orbit.geometry = new THREE.BufferGeometry().setFromPoints(points);

    handles.centerLabel.position.set(STAGE_CENTER_X, geom.centerY - EARTH_RADIUS - 0.24, 0.25);
    handles.infoLabel.position.set(STAGE_CENTER_X, geom.centerY + geom.rMaxVisual + 0.42, 0.2);
    setLabel(handles.infoLabel, labelText(geom), '#0f172a');
    // 底板按实际文字宽度缩放（画布含 1.5 倍透明余量，不能用 sprite.scale.x 直接做底板）
    const fontSize =
        typeof handles.infoLabel.userData.textFontSize === 'number' ? handles.infoLabel.userData.textFontSize : 22;
    const textWidth =
        typeof handles.infoLabel.userData.textWidth === 'number' ? handles.infoLabel.userData.textWidth : 0;
    const worldPerPx = handles.infoLabel.scale.y / 128;
    handles.infoPanel.position.set(STAGE_CENTER_X, geom.centerY + geom.rMaxVisual + 0.42, 0.185);
    handles.infoPanel.scale.set(
        Math.max(0.6, (textWidth + 26) * worldPerPx),
        Math.max(0.2, fontSize * 1.8 * worldPerPx),
        1
    );
}

function framingFor(params: Record<string, number>): SceneFraming {
    const geom = resolveVisual(params);
    // 距离按「轨道半径 + 顶部标题」留足余量；近正视角让轨道投影接近正圆，避免斜视拉成竖椭圆
    const distance = Math.max(5.0, (geom.rMaxVisual + 1.35) * 2.9);
    const targetY = geom.centerY + 0.35;
    return {
        target: [STAGE_CENTER_X, targetY, 0],
        position: [STAGE_CENTER_X + distance * 0.08, targetY + distance * 0.09, distance * 0.99],
        distance
    };
}

export const orbitalRig: SceneRig = {
    ballRadius: BALL_RADIUS,
    clampToGround: false,

    framing(params) {
        return framingFor(params);
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        // 1. 中心天体 (带大气光晕与经纬线)
        const center = makeSphere(EARTH_RADIUS, 0x2563eb, {
            roughness: 0.4,
            metalness: 0.1,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.25
        });
        group.add(center);

        const centerWire = new THREE.Mesh(
            new THREE.SphereGeometry(EARTH_RADIUS * 1.024, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true, transparent: true, opacity: 0.25 })
        );
        group.add(centerWire);

        const centerLabel = makeTextSprite('地球', '#1d4ed8', 22, { x: 1.05, y: 0.34 });
        group.add(centerLabel);

        // 2. 完整轨道线（闭合轨道为 Kepler 椭圆；开放轨道为已积分路径）
        const orbit = makeLine([], 0x94a3b8, 0.62);
        group.add(orbit);

        // 3. 引力矢量 (指向地心) 与速度矢量 (引擎切线)
        const gravityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(),
            0.5,
            0xef4444,
            0.12,
            0.08
        );
        group.add(gravityArrow);

        const velocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(),
            0.55,
            0x10b981,
            0.12,
            0.08
        );
        group.add(velocityArrow);

        const gravityLabel = makeTextSprite('F引', '#ef4444', 22, { x: 0.6, y: 0.3 });
        const velocityLabel = makeTextSprite('v', '#10b981', 22, { x: 0.36, y: 0.3 });
        gravityLabel.visible = false;
        velocityLabel.visible = false;
        group.add(gravityLabel, velocityLabel);

        // 4. 实时数据标牌（画布自动扩宽，长文本不再被裁切）
        const infoLabel = makeTextSprite(labelText(resolveVisual(params)), '#0f172a', 22, { x: 1.9, y: 0.56 });
        group.add(infoLabel);
        const infoPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.92, depthWrite: false })
        );
        group.add(infoPanel);

        const handles: OrbitalHandles = {
            center,
            centerWire,
            orbit,
            gravityArrow,
            velocityArrow,
            gravityLabel,
            velocityLabel,
            centerLabel,
            infoLabel,
            infoPanel,
            centerPos: new THREE.Vector3(STAGE_CENTER_X, 0, 0),
            geom: resolveVisual(params)
        };
        applyGeometry(handles, params, result);

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyGeometry(handles as OrbitalHandles, params, result);
    },

    onAnimate(handles, ctx) {
        const h = handles as OrbitalHandles;

        // 万有引力矢量指向地心 (零分配)
        _rDir.subVectors(h.centerPos, ctx.ballPos).normalize();
        h.gravityArrow.position.copy(ctx.ballPos);
        h.gravityArrow.setDirection(_rDir);
        h.gravityArrow.visible = true;
        h.gravityLabel.visible = true;
        h.gravityLabel.position.copy(ctx.ballPos).addScaledVector(_rDir, 0.62);

        // 速度矢量方向优先取引擎当前帧速度（椭圆轨道上并非处处与半径垂直）
        const velocity = ctx.velocity;
        if (
            velocity &&
            Number.isFinite(velocity.x) &&
            Number.isFinite(velocity.y) &&
            Math.hypot(velocity.x, velocity.y) > 0
        ) {
            _vDir.set(velocity.x, velocity.y, 0).normalize();
        } else {
            _vDir.set(-_rDir.y, _rDir.x, 0).normalize();
        }
        h.velocityArrow.position.copy(ctx.ballPos);
        h.velocityArrow.setDirection(_vDir);
        h.velocityArrow.visible = true;
        h.velocityLabel.visible = true;
        h.velocityLabel.position.copy(ctx.ballPos).addScaledVector(_vDir, 0.68);
    },

    getVisualPosition(pos, params) {
        const geom = resolveVisual(params);
        return new THREE.Vector3(STAGE_CENTER_X + pos.x * geom.scale, geom.centerY + pos.y * geom.scale, 0);
    },

    getOrigin(params) {
        const geom = resolveVisual(params);
        return new THREE.Vector3(STAGE_CENTER_X + geom.initialVisual, geom.centerY, 0);
    }
};
