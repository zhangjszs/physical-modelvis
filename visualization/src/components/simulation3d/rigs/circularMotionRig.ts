/**
 * 匀速圆周运动 rig — 实验室向心力转台 + 径向牵引线 + 动态向心力矢量
 * 探究向心力公式 F_n = m·r·ω²
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const N = 72;
const CENTER_Y = 1.4;

interface CircularHandles {
    track: THREE.Line;
    radialArm: THREE.Line;
    centerSpindle: THREE.Mesh;
    forceArrow: THREE.ArrowHelper;
    infoLabel: THREE.Sprite;
}

const _center = new THREE.Vector3(0, CENTER_Y, 0);
const _forceDir = new THREE.Vector3();

export const circularMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 中心立轴
        const centerSpindle = makeCylinder(0.06, 0.28, 0xd97706, 0.4, 0.8);
        centerSpindle.position.set(0, CENTER_Y, 0);
        group.add(centerSpindle);

        // 2. 圆形轨道圈
        const rPhys = num(params.radius, 1.0);
        const r = rPhys * WORLD_SCALE;
        const trackPts = Array.from({ length: N }, (_, i) => {
            const a = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, 0);
        });
        const track = makeLine(trackPts, 0x94a3b8, 0.5);
        group.add(track);

        // 3. 径向牵引线 (连接中心与圆周运动球体)
        const radialArm = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, CENTER_Y, 0),
                new THREE.Vector3(r, CENTER_Y, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 2 })
        );
        group.add(radialArm);

        // 4. 向心力矢量箭头 (始终指向圆心)
        const forceArrow = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(r, CENTER_Y, 0),
            0.6,
            0xef4444,
            0.12,
            0.08
        );
        group.add(forceArrow);

        // 5. 测量状态标牌
        const m = num(params.mass, 0.2);
        const omega = num(params.omega, 3.0);
        const Fn = m * rPhys * omega * omega;
        const infoLabel = makeTextSprite(
            `F_n = m·r·ω² = ${Fn.toFixed(2)} N | r=${rPhys.toFixed(1)}m, ω=${omega.toFixed(1)}rad/s`,
            '#dc2626',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, CENTER_Y + r + 0.35, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: CircularHandles = {
            track,
            radialArm,
            centerSpindle,
            forceArrow,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CircularHandles;
        const rPhys = num(params.radius, 1.0);
        const r = rPhys * WORLD_SCALE;
        const pts = Array.from({ length: N }, (_, i) => {
            const a = (i / (N - 1)) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, 0);
        });
        h.track.geometry.dispose();
        h.track.geometry = new THREE.BufferGeometry().setFromPoints(pts);

        const m = num(params.mass, 0.2);
        const omega = num(params.omega, 3.0);
        const Fn = m * rPhys * omega * omega;
        const arrowLen = THREE.MathUtils.clamp(Fn * 0.08, 0.15, 1.2);
        h.forceArrow.setLength(arrowLen, 0.12, 0.08);

        setLabel(
            h.infoLabel,
            `F_n = m·r·ω² = ${Fn.toFixed(2)} N | r=${rPhys.toFixed(1)}m, ω=${omega.toFixed(1)}rad/s`,
            '#dc2626'
        );
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CircularHandles;

        // 径向连线就地更新顶点数组，避免反复分配 BufferGeometry
        const posAttr = h.radialArm.geometry.attributes['position'] as THREE.BufferAttribute | undefined;
        if (posAttr && posAttr.array) {
            const arr = posAttr.array as Float32Array;
            arr[0] = 0;
            arr[1] = CENTER_Y;
            arr[2] = 0;
            arr[3] = ctx.ballPos.x;
            arr[4] = ctx.ballPos.y;
            arr[5] = ctx.ballPos.z;
            posAttr.needsUpdate = true;
        }

        // 向心力箭头随动：复用模块级临时向量，直指圆心
        _forceDir.subVectors(_center, ctx.ballPos).normalize();
        h.forceArrow.position.copy(ctx.ballPos);
        h.forceArrow.setDirection(_forceDir);
    },

    getVisualPosition(pos, _params) {
        // 单一真源：与圆心 CENTER_Y 严格对齐
        return new THREE.Vector3(pos.x * WORLD_SCALE, CENTER_Y + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, CENTER_Y, 0);
    }
};
