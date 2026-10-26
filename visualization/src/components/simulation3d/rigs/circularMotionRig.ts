/**
 * 匀速圆周运动 rig — 水平向心力转台 + 径向牵引线 + 速度/向心力矢量
 * 探究向心力公式 F_n = m·r·ω²
 *
 * 视觉约定：
 *   - 转台放在舞台中心 STAGE_CENTER_X，水平圆周（物理 x-y 平面 → 世界 x-(-z) 平面）；
 *   - 小球尺寸按当前圆周半径等比缩放（球径 ≈ 轨道直径的 10%），不再出现"球比圆周大"；
 *   - 圆心 / 半径 / 速度 / 向心力标注全部随几何位置实时更新。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel, STAGE_CENTER_X } from './params';

/** 1 m 物理半径 → 0.6 世界单位 */
const WORLD_SCALE = 0.6;
/** 水平转台台面高度（世界单位） */
const TRACK_HEIGHT = 1.2;
const N = 96;
const BALL_RADIUS_RATIO = 0.12;
const MIN_BALL_RADIUS = 0.0005;
const MAX_BALL_RADIUS = 0.32;
/** 物理默认 g（与引擎 conical 模式一致；scene 未覆盖 gravity 数值） */
const G = 9.8;

interface CircleGeometry {
    rPhys: number;
    /** 圆周视觉半径 */
    r: number;
    ballRadius: number;
    mass: number;
    omega: number;
    speed: number;
    force: number;
    /** 初始角度 (rad) */
    phi0: number;
    conical: boolean;
}

interface CircularHandles {
    track: THREE.Mesh;
    radialArm: THREE.Line;
    stand: THREE.Mesh;
    basePlate: THREE.Mesh;
    hub: THREE.Mesh;
    ball: THREE.Mesh;
    forceArrow: THREE.ArrowHelper;
    velocityArrow: THREE.ArrowHelper;
    titleLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
    centerLabel: THREE.Sprite;
    radiusLabel: THREE.Sprite;
    forceLabel: THREE.Sprite;
    velocityLabel: THREE.Sprite;
    geom: CircleGeometry;
}

const _forceDir = new THREE.Vector3();
const _vDir = new THREE.Vector3();

/** 从引擎诊断读数取有限数值（单一真源：优先引擎 effective radius，其次场景公式） */
function engineNumber(result: SimulationResult | null | undefined, key: string): number | undefined {
    const value = result?.diagnostics?.maxValues?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** 由场景参数 + 引擎结果推导实际半径/角速度（圆锥摆与引擎同式） */
function resolveGeometry(params: Record<string, number>, result?: SimulationResult | null): CircleGeometry {
    const conical = num(params.conicalMode, 0) === 1 && num(params.ropeLength, 1) > 0;
    const ropeLength = num(params.ropeLength, 1);
    const angle = THREE.MathUtils.clamp(num(params.conicalAngle, 30), 1, 80);
    const angleRad = (angle * Math.PI) / 180;
    // 圆锥摆的有效半径可能小于 0.1m（如 L=1m、θ=5°），不能再用普通模式的 0.1m 下限；
    // 引擎 maxValues.radius 是最终真源，场景公式只在结果未就绪时兜底。
    const rawR = engineNumber(result, 'radius') ?? (conical ? ropeLength * Math.sin(angleRad) : num(params.radius, 1));
    const rPhys = Math.max(1e-4, rawR);
    const mass = THREE.MathUtils.clamp(num(params.mass, 0.2), 0.01, 5);
    const engineSpeed = engineNumber(result, 'maxSpeed');
    const omega =
        engineSpeed !== undefined && rPhys > 0
            ? engineSpeed / rPhys
            : THREE.MathUtils.clamp(
                  conical ? Math.sqrt(G / Math.max(0.01, ropeLength * Math.cos(angleRad))) : num(params.omega, 3),
                  0.1,
                  30
              );
    const r = rPhys * WORLD_SCALE;
    // 球径随轨道半径等比缩放，并保证球直径不超过轨道直径（极端小半径也不“球比圈大”）
    const ballRadius = Math.min(Math.max(r * BALL_RADIUS_RATIO, MIN_BALL_RADIUS), MAX_BALL_RADIUS, r * 0.45);
    const phi0 = (num(params.initialAngle, 0) * Math.PI) / 180;
    const force = engineNumber(result, 'centripetalForce') ?? mass * rPhys * omega * omega;
    return {
        rPhys,
        r,
        ballRadius,
        mass,
        omega,
        speed: engineSpeed ?? omega * rPhys,
        force,
        phi0,
        conical
    };
}

/** 信息行只保留数值，公式已在标题中；避免长度超出视口 */
function infoText(geom: CircleGeometry): string {
    const rText = geom.rPhys < 0.1 ? geom.rPhys.toFixed(3) : geom.rPhys.toFixed(2);
    return `r = ${rText} m | ω = ${geom.omega.toFixed(2)} rad/s | v = ${geom.speed.toFixed(2)} m/s | F_n = ${geom.force.toFixed(2)} N`;
}

/** 物理 (x,y) → 世界 (x, TRACK_HEIGHT, -y)，水平圆周 */
function toWorld(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(STAGE_CENTER_X + x * WORLD_SCALE, TRACK_HEIGHT, -y * WORLD_SCALE);
}

function applyGeometry(
    handles: CircularHandles,
    params: Record<string, number>,
    result?: SimulationResult | null
): void {
    const geom = resolveGeometry(params, result);
    handles.geom = geom;

    // 轨道：圆环实体（水平面）；管径随半径收缩，极小半径时不会变成一坨
    const tube = Math.min(0.012, geom.r * 0.15);
    handles.track.geometry.dispose();
    handles.track.geometry = new THREE.TorusGeometry(geom.r, tube, 12, N * 2);
    handles.track.position.set(STAGE_CENTER_X, TRACK_HEIGHT - tube, 0);
    handles.track.rotation.set(Math.PI / 2, 0, 0);

    // 支座/立轴/轴心随半径收缩，避免小半径时轨道被固定尺寸的轴心盖住
    const frameScale = THREE.MathUtils.clamp(geom.r / 0.6, 0.12, 1);
    handles.stand.scale.set(frameScale, 1, frameScale);
    handles.basePlate.scale.set(frameScale, 1, frameScale);
    handles.hub.scale.setScalar(frameScale);
    // 极小半径下场景标注会大于轨道本身，只在网格足够大时显示箭头/贴字；数值仍由顶部信息行给出
    const annotate = geom.r >= 0.22;
    handles.forceArrow.visible = annotate;
    handles.velocityArrow.visible = annotate;
    handles.forceLabel.visible = annotate;
    handles.velocityLabel.visible = annotate;
    handles.centerLabel.visible = annotate;
    handles.radiusLabel.visible = annotate;
    handles.velocityArrow.setLength(Math.min(0.5, Math.max(0.06, geom.r * 0.8)), 0.1, 0.07);

    // 小球按半径等比缩放，位于初始角度
    const start = toWorld(geom.rPhys * Math.cos(geom.phi0), geom.rPhys * Math.sin(geom.phi0));
    handles.ball.position.copy(start);
    handles.ball.scale.setScalar(geom.ballRadius);

    // 径向牵引线初始位置
    const posAttr = handles.radialArm.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (posAttr) {
        const arr = posAttr.array as Float32Array;
        arr[0] = STAGE_CENTER_X;
        arr[1] = TRACK_HEIGHT;
        arr[2] = 0;
        arr[3] = start.x;
        arr[4] = start.y;
        arr[5] = start.z;
        posAttr.needsUpdate = true;
    }

    handles.titleLabel.position.set(STAGE_CENTER_X, TRACK_HEIGHT + 1.28, 0.15);
    handles.infoLabel.position.set(STAGE_CENTER_X, TRACK_HEIGHT + 0.94, 0.15);
    handles.centerLabel.position.set(STAGE_CENTER_X, TRACK_HEIGHT + 0.2, 0.5);
    handles.radiusLabel.position.set((STAGE_CENTER_X + start.x) / 2, TRACK_HEIGHT + 0.16, start.z / 2 + 0.18);
    setLabel(handles.infoLabel, infoText(geom), '#b91c1c');
    setLabel(
        handles.radiusLabel,
        `r = ${geom.rPhys < 0.1 ? geom.rPhys.toFixed(3) : geom.rPhys.toFixed(2)} m`,
        '#0f766e'
    );
    setLabel(
        handles.titleLabel,
        geom.conical ? '圆锥摆 · 向心力 F_n = mω²r' : '匀速圆周运动 · 向心力 F_n = mω²r',
        '#0f172a'
    );
    handles.forceArrow.setLength(
        THREE.MathUtils.clamp(Math.min(0.2 + geom.force * 0.06, geom.r * 0.75), 0.03, 0.9),
        0.1,
        0.07
    );
}

function framingFor(params: Record<string, number>, result?: SimulationResult | null): SceneFraming {
    const geom = resolveGeometry(params, result);
    const distance = THREE.MathUtils.clamp(geom.r * 3.2 + 1.2, 3.8, 8.6);
    const targetY = TRACK_HEIGHT + 0.35;
    return {
        target: [STAGE_CENTER_X, targetY, 0],
        position: [STAGE_CENTER_X + distance * 0.1, targetY + distance * 0.5, distance * 0.86],
        distance
    };
}

export const circularMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    // 默认小球隐藏：本 rig 自建随半径缩放的小球
    ballRadius: 0.001,
    clampToGround: false,

    framing(params, result) {
        return framingFor(params, result);
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();

        // 1. 转台立轴 + 底座 + 轴心
        const stand = makeCylinder(0.045, TRACK_HEIGHT, 0x94a3b8, 0.55, 0.35);
        stand.position.set(STAGE_CENTER_X, TRACK_HEIGHT / 2, 0);
        group.add(stand);

        const basePlate = makeCylinder(0.24, 0.05, 0x475569, 0.3, 0.5);
        basePlate.position.set(STAGE_CENTER_X, 0.025, 0);
        group.add(basePlate);

        const hub = makeCylinder(0.09, 0.16, 0xd97706, 0.4, 0.6);
        hub.position.set(STAGE_CENTER_X, TRACK_HEIGHT, 0);
        group.add(hub);

        // 2. 水平圆形轨道（圆环实体）
        const track = new THREE.Mesh(
            new THREE.TorusGeometry(1, 0.012, 12, N * 2),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.5 })
        );
        track.rotation.set(Math.PI / 2, 0, 0);
        track.castShadow = true;
        track.receiveShadow = true;
        group.add(track);

        // 3. 径向牵引线（圆心 → 小球）
        const radialArm = makeLine(
            [new THREE.Vector3(STAGE_CENTER_X, TRACK_HEIGHT, 0), new THREE.Vector3(STAGE_CENTER_X, TRACK_HEIGHT, 0)],
            0x475569,
            0.9
        );
        group.add(radialArm);

        // 4. 自建小球（按半径缩放；Stage 默认球已缩到不可见）
        const ball = makeSphere(1, 0x2563eb, {
            roughness: 0.25,
            metalness: 0.15,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.18
        });
        group.add(ball);

        // 5. 速度 (切线, 绿) 与向心力 (指向圆心, 红) 矢量
        const forceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(STAGE_CENTER_X, TRACK_HEIGHT, 0),
            0.4,
            0xef4444,
            0.1,
            0.07
        );
        group.add(forceArrow);

        const velocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(STAGE_CENTER_X, TRACK_HEIGHT, 0),
            0.5,
            0x10b981,
            0.1,
            0.07
        );
        group.add(velocityArrow);

        // 6. 文字标牌（自动扩宽，长公式不再被裁切）
        const titleLabel = makeTextSprite('匀速圆周运动 · 向心力 F_n = mω²r', '#0f172a', 26, { x: 2.0, y: 0.62 });
        const infoLabel = makeTextSprite('', '#b91c1c', 22, { x: 1.9, y: 0.52 });
        const centerLabel = makeTextSprite('圆心 O', '#0f172a', 20, { x: 0.72, y: 0.24 });
        const radiusLabel = makeTextSprite('r = 1.00 m', '#0f766e', 20, { x: 0.8, y: 0.26 });
        const forceLabel = makeTextSprite('F_n', '#ef4444', 20, { x: 0.4, y: 0.22 });
        const velocityLabel = makeTextSprite('v', '#10b981', 20, { x: 0.24, y: 0.22 });
        group.add(titleLabel, infoLabel, centerLabel, radiusLabel, forceLabel, velocityLabel);

        const handles: CircularHandles = {
            track,
            radialArm,
            stand,
            basePlate,
            hub,
            ball,
            forceArrow,
            velocityArrow,
            titleLabel,
            infoLabel,
            centerLabel,
            radiusLabel,
            forceLabel,
            velocityLabel,
            geom: resolveGeometry(params, result)
        };
        applyGeometry(handles, params, result);

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyGeometry(handles as CircularHandles, params, result);
    },

    onAnimate(handles, ctx) {
        const h = handles as CircularHandles;

        // 小球随引擎轨迹运动
        h.ball.position.copy(ctx.ballPos);

        // 径向牵引线就地更新顶点（零分配）
        const posAttr = h.radialArm.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
        if (posAttr) {
            const arr = posAttr.array as Float32Array;
            arr[0] = STAGE_CENTER_X;
            arr[1] = TRACK_HEIGHT;
            arr[2] = 0;
            arr[3] = ctx.ballPos.x;
            arr[4] = ctx.ballPos.y;
            arr[5] = ctx.ballPos.z;
            posAttr.needsUpdate = true;
        }

        // 向心力箭头：水平面内直指圆心
        _forceDir.set(STAGE_CENTER_X - ctx.ballPos.x, 0, -ctx.ballPos.z).normalize();
        h.forceArrow.position.copy(ctx.ballPos);
        h.forceArrow.setDirection(_forceDir);
        const forceLen = THREE.MathUtils.clamp(Math.min(0.2 + h.geom.force * 0.06, h.geom.r * 0.75), 0.03, 0.9);
        h.forceLabel.position.copy(ctx.ballPos).addScaledVector(_forceDir, forceLen + 0.12);

        // 速度方向优先取引擎速度（物理 y → 世界 -z）
        const velocity = ctx.velocity;
        if (
            velocity &&
            Number.isFinite(velocity.x) &&
            Number.isFinite(velocity.y) &&
            Math.hypot(velocity.x, velocity.y) > 0
        ) {
            _vDir.set(velocity.x, 0, -velocity.y).normalize();
        } else {
            _vDir.set(-_forceDir.z, 0, _forceDir.x).normalize();
        }
        h.velocityArrow.position.copy(ctx.ballPos);
        h.velocityArrow.setDirection(_vDir);
        h.velocityLabel.position.copy(ctx.ballPos).addScaledVector(_vDir, Math.max(0.12, h.geom.r * 0.8 + 0.08));

        // 半径标注跟随牵引线中点
        h.radiusLabel.position.set((STAGE_CENTER_X + ctx.ballPos.x) / 2, TRACK_HEIGHT + 0.16, ctx.ballPos.z / 2 + 0.18);
    },

    getVisualPosition(pos, _params) {
        return toWorld(pos.x, pos.y);
    },

    getOrigin(params, result) {
        const geom = resolveGeometry(params, result);
        return toWorld(geom.rPhys * Math.cos(geom.phi0), geom.rPhys * Math.sin(geom.phi0));
    }
};
