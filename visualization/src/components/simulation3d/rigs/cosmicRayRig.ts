/**
 * 宇宙射线 rig — 原初宇宙线 → 大气簇射 → 屏蔽层 → 地面探测器
 * 屏蔽材料: 0=空气(透明) 1=铅(灰) 2=水(蓝); 海拔越高次级粒子越多
 * 用于 cosmic-ray
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeArrow, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CosmicHandles {
    shielding: THREE.Mesh;
    label: THREE.Sprite;
}

const SHIELD_COLOR = [0x93c5fd, 0x6b7280, 0x2563eb]; // air/lead/water
const SHIELD_OPACITY = [0.06, 0.82, 0.5];

export const cosmicRayRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 原初宇宙线 (顶部入射)
        const primary = makeArrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 3.4, 0), 0.8, 0xfbbf24, 0.22, 0.12);
        group.add(primary);

        // 大气电离层 (半透明蓝板)
        const atm = makeBox(5.0, 0.06, 3.0, 0xbfdbfe, 0.6, 0.0);
        (atm.material as THREE.MeshStandardMaterial).transparent = true;
        (atm.material as THREE.MeshStandardMaterial).opacity = 0.18;
        atm.position.set(0, 2.6, 0);
        group.add(atm);

        // 大气簇射 (从顶点分叉)
        const vertex = new THREE.Vector3(0, 2.5, 0);
        for (let i = 0; i < 5; i++) {
            const a = Math.PI / 2 + (i - 2) * 0.32;
            const end = new THREE.Vector3(Math.cos(a) * 2.2, 2.5 - Math.sin(a) * 2.2, 0);
            const color = i % 2 === 0 ? 0x3b82f6 : 0x22c55e;
            group.add(makeLine([vertex.clone(), end], color, 0.7));
        }

        // 屏蔽层 (材质/颜色随参数)
        const shielding = makeBox(5.0, 0.5, 3.0, 0x93c5fd, 0.3, 0.1);
        shielding.position.set(0, 1.0, 0);
        group.add(shielding);

        // 地面探测器
        const detector = makeBox(1.2, 0.3, 1.2, 0x0f172a, 0.6, 0.2);
        detector.position.set(0, 0.15, 0);
        group.add(detector);

        const label = makeTextSprite('空气屏蔽', '#334155', 26, { x: 1.1, y: 0.22 });
        label.position.set(2.6, 1.0, 0);
        group.add(label);

        scene.add(group);

        const handles: CosmicHandles = { shielding, label };
        updateCosmic(handles, params);
        return { group, handles: { shielding, label } };
    },

    updateEquipment(handles, params) {
        updateCosmic(handles as unknown as CosmicHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.2, 0);
    }
};

function updateCosmic(h: CosmicHandles, params: Record<string, number>): void {
    const mode = Math.round(num(params['shieldingMode'], 0));
    const alt = num(params['altitude'], 0);
    const mat = h.shielding.material as THREE.MeshStandardMaterial;
    mat.color.setHex(SHIELD_COLOR[mode] ?? 0x93c5fd);
    mat.transparent = true;
    mat.opacity = SHIELD_OPACITY[mode] ?? 0.06;
    const name = mode === 1 ? '铅屏蔽' : mode === 2 ? '水屏蔽' : '空气屏蔽';
    const txt = `${name}  海拔 ${Math.round(alt)} m`;
    const canvas = (h.label.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 26px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
        (h.label.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
}
