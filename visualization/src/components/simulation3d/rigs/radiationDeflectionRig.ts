/**
 * 放射线磁场偏转 rig — α/β/γ 在匀强磁场中的径迹
 * α(正)下弯、β(负电子)上弯、γ(光子)直线;
 * 曲率半径 r ∝ √(2mK)/(qB), 动能越大越直、磁场越强越弯
 * 用于 radiation-deflection
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

const TYPE_NAME = ['α (氦核)', 'β (电子)', 'γ (光子)'];

function buildDeflectionPoints(type: number, B: number, E: number): THREE.Vector3[] {
    const sx = -2.2;
    const sy = 1.4;
    if (type === 2) {
        // γ 不带电，直线
        return [new THREE.Vector3(sx, sy, 0), new THREE.Vector3(2.4, sy, 0)];
    }
    const dir = type === 1 ? 1 : -1; // β 上弯(+1), α 下弯(-1)
    const r = Math.max(0.4, Math.min(3.2, (0.5 * Math.sqrt(E)) / Math.max(0.05, B)));
    const cx = sx;
    const cy = sy - dir * r; // 圆心
    const a0 = dir > 0 ? Math.PI / 2 : -Math.PI / 2; // 起点角 (上/下)
    const sweep = dir > 0 ? -1.3 : 1.3; // 扫角方向
    const N = 44;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= N; i++) {
        const a = a0 + sweep * (i / N);
        pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0));
    }
    return pts;
}

interface RadiationHandles {
    curve: THREE.Line;
    label: THREE.Sprite;
    poles: THREE.Object3D[];
}

export const radiationDeflectionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const sy = 1.4;

        // 放射源 (左)
        const source = makeBox(0.3, 0.4, 0.4, 0x334155, 0.4, 0.4);
        source.position.set(-2.4, sy, 0);
        group.add(source);

        // 磁场极板 (上/下)，示意匀强磁场
        const poleTop = makeBox(3.0, 0.12, 1.2, 0xb91c1c, 0.5, 0.1);
        poleTop.position.set(0, sy + 1.1, 0);
        group.add(poleTop);
        const poleBot = makeBox(3.0, 0.12, 1.2, 0x1d4ed8, 0.5, 0.1);
        poleBot.position.set(0, sy - 1.1, 0);
        group.add(poleBot);
        const poles: THREE.Object3D[] = [poleTop, poleBot];

        // 偏转径迹 (动态)
        const curve = makeLine(buildDeflectionPoints(0, 0.5, 5), 0xef4444, 0.85);
        group.add(curve);

        const label = makeTextSprite('α 射线', '#b91c1c', 28, { x: 0.7, y: 0.22 });
        label.position.set(0, sy + 1.5, 0);
        group.add(label);

        scene.add(group);

        const handles: RadiationHandles = { curve, label, poles };
        updateRadiation(handles, params);
        return { group, handles: { curve, label, poles } };
    },

    updateEquipment(handles, params) {
        updateRadiation(handles as unknown as RadiationHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.4, 0);
    }
};

function updateRadiation(h: RadiationHandles, params: Record<string, number>): void {
    const type = Math.round(num(params['particleType'], 0));
    const B = num(params['Bfield'], 0.5);
    const E = num(params['particleEnergy'], 5);
    const color = type === 1 ? 0x22c55e : type === 2 ? 0x6b7280 : 0xef4444;
    h.curve.geometry.dispose();
    h.curve.geometry = new THREE.BufferGeometry().setFromPoints(buildDeflectionPoints(type, B, E));
    (h.curve.material as THREE.LineBasicMaterial).color.setHex(color);
    const name = TYPE_NAME[type] ?? 'α (氦核)';
    const txt = `${name}  B=${B.toFixed(2)}T  E=${E.toFixed(1)}MeV`;
    const canvas = (h.label.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 28px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = type === 1 ? '#15803d' : type === 2 ? '#374151' : '#b91c1c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
        (h.label.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
}
