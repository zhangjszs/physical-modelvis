/**
 * 液体混合 rig — 水 + 酒精 在量筒中混合 (体积收缩)
 * 用于 liquid-mixing
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface LiquidHandles {
    water: THREE.Mesh;
    alcohol: THREE.Mesh;
    label: THREE.Sprite;
}

export const liquidMixingRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.0;

        // 量筒 (透明外壁)
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 2.0, 32, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.18,
                side: THREE.DoubleSide
            })
        );
        tube.position.set(0, cy, 0);
        group.add(tube);

        // 水层 (下, 蓝)
        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.46, 1.0, 32),
            new THREE.MeshStandardMaterial({ color: 0x2563eb, transparent: true, opacity: 0.85 })
        );
        group.add(water);

        // 酒精层 (上, 浅黄)
        const alcohol = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.46, 1.0, 32),
            new THREE.MeshStandardMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.8 })
        );
        group.add(alcohol);

        const label = makeTextSprite('水 + 酒精', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(1.4, cy + 0.9, 0);
        group.add(label);

        scene.add(group);

        const handles: LiquidHandles = { water, alcohol, label };
        updateLiquid(handles, params);
        return { group, handles: { water, alcohol, label } };
    },

    updateEquipment(handles, params) {
        updateLiquid(handles as unknown as LiquidHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateLiquid(h: LiquidHandles, params: Record<string, number>): void {
    const vw = num(params['volumeWater'], 50);
    const va = num(params['volumeAlcohol'], 50);
    // 体积映射：满量程 200mL → 1.9 高
    const scale = 1.9 / 200;
    const hWater = Math.max(0.02, vw * scale);
    const hAlcohol = Math.max(0.02, va * scale);

    h.water.scale.y = hWater / 1.0;
    h.water.position.set(0, 0.1 + hWater / 2, 0);
    h.alcohol.scale.y = hAlcohol / 1.0;
    h.alcohol.position.set(0, 0.1 + hWater + hAlcohol / 2, 0);

    const txt = `V水=${vw.toFixed(0)} V酒=${va.toFixed(0)} 混合后↓${((vw + va) * 0.04).toFixed(1)}mL`;
    const canvas = (h.label.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 24px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
        (h.label.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
}
