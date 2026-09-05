/**
 * 单摆实验 rig — 牢固悬点横梁 + 量角分度盘 + 动态摆线 + 平衡位置光电门
 * 探究单摆周期公式 T = 2π√(L/g)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createPhotogate } from '../equipment/photogate';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.18;
const PIVOT_Y = 2.4;

interface PendulumHandles {
    beam: THREE.Group;
    string: THREE.Line;
    photogate: THREE.Group;
    infoLabel: THREE.Sprite;
}

export const pendulumRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: false,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 顶部悬挂横梁与悬挂夹
        const beam = new THREE.Group();
        const beamBar = makeBox(2.2, 0.08, 0.14, 0x334155, 0.4, 0.6);
        beamBar.position.set(0, PIVOT_Y + 0.08, 0);
        beam.add(beamBar);

        const clamp = makeCylinder(0.04, 0.12, 0xd97706, 0.3, 0.8);
        clamp.position.set(0, PIVOT_Y + 0.04, 0);
        beam.add(clamp);
        group.add(beam);

        // 2. 悬点量角分度弧 (小角度量角盘)
        const dialPts: THREE.Vector3[] = [];
        for (let a = -30; a <= 30; a += 5) {
            const rad = (a * Math.PI) / 180;
            dialPts.push(new THREE.Vector3(Math.sin(rad) * 0.35, PIVOT_Y - Math.cos(rad) * 0.35, 0.02));
        }
        const dialArc = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(dialPts),
            new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 })
        );
        group.add(dialArc);

        // 3. 动态单摆细绳 (无伸缩线)
        const L = num(params.length, num(params.L, 1.5)) * WORLD_SCALE;
        const string = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, PIVOT_Y, 0),
                new THREE.Vector3(0, PIVOT_Y - L, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 })
        );
        group.add(string);

        // 4. 平衡位置光电门计时探头
        const pg = createPhotogate();
        pg.group.position.set(0, Math.max(0.1, PIVOT_Y - L - 0.12), 0);
        group.add(pg.group);

        // 5. 测量标牌
        const lengthM = num(params.length, num(params.L, 1.5));
        const g = num(params.g, 9.8);
        const T = 2 * Math.PI * Math.sqrt(lengthM / Math.max(0.1, g));

        const infoLabel = makeTextSprite(
            `L = ${lengthM.toFixed(2)} m, g = ${g.toFixed(1)} m/s² → T = ${T.toFixed(2)} s`,
            '#2563eb',
            24,
            { x: 1.4, y: 0.22 }
        );
        infoLabel.position.set(0, PIVOT_Y + 0.45, 0.25);
        group.add(infoLabel);

        scene.add(group);

        const handles: PendulumHandles = {
            beam,
            string,
            photogate: pg.group,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as PendulumHandles;
        const lengthM = num(params.length, num(params.L, 1.5));
        const L = lengthM * WORLD_SCALE;
        const g = num(params.g, 9.8);
        const T = 2 * Math.PI * Math.sqrt(lengthM / Math.max(0.1, g));

        h.photogate.position.set(0, Math.max(0.1, PIVOT_Y - L - 0.12), 0);
        setLabel(
            h.infoLabel,
            `L = ${lengthM.toFixed(2)} m, g = ${g.toFixed(1)} m/s² → T = ${T.toFixed(2)} s`,
            '#2563eb'
        );
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as PendulumHandles;
        // 细绳每帧动态连线：从悬点直达摆球实时三维球心 (就地更新顶点数组，避免反复分配与释放 Geometry)
        const posAttr = h.string.geometry.attributes['position'] as THREE.BufferAttribute | undefined;
        if (posAttr && posAttr.array) {
            const arr = posAttr.array as Float32Array;
            arr[0] = 0;
            arr[1] = PIVOT_Y;
            arr[2] = 0;
            arr[3] = ctx.ballPos.x;
            arr[4] = ctx.ballPos.y;
            arr[5] = ctx.ballPos.z;
            posAttr.needsUpdate = true;
        }
    },

    getVisualPosition(pos, _params) {
        // 单摆圆弧物理坐标 (pos.x, pos.y) 严密对齐
        return new THREE.Vector3(pos.x * WORLD_SCALE, PIVOT_Y - Math.abs(pos.y) * WORLD_SCALE, 0);
    },

    getOrigin(params) {
        const L = num(params.length, num(params.L, 1.5));
        return new THREE.Vector3(0, PIVOT_Y - L * WORLD_SCALE, 0);
    }
};
