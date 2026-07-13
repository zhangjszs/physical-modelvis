/**
 * 扩散 rig — 浓度梯度驱动的物质输运
 * 中心粒子源 + 随机扩散粒子；介质(气体/液体)切换容器外观
 * 用于 diffusion
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface DiffusionHandles {
    label: THREE.Sprite;
}

export const diffusionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.2;
        const isLiquid = Math.round(num(params['medium'], 0)) === 1;
        // 容器：气体→玻璃箱，液体→烧杯
        const container = isLiquid
            ? makeCylinder(0.9, 1.8, 0xbfdbfe, 0.18, 0.9)
            : new THREE.Mesh(
                  new THREE.BoxGeometry(2.4, 2.4, 2.4),
                  new THREE.MeshPhysicalMaterial({
                      color: 0xbfdbfe,
                      transparent: true,
                      opacity: 0.15,
                      side: THREE.DoubleSide
                  })
              );
        container.position.set(0, cy, 0);
        group.add(container);
        // 中心源
        const source = makeSphere(0.12, 0xdc2626, { emissive: 0x7f1d1d, emissiveIntensity: 0.4 });
        source.position.set(0, cy, 0);
        group.add(source);
        // 扩散粒子（示意）
        const count = Math.min(40, Math.max(8, Math.round(num(params['particleCount'], 500) / 12)));
        for (let i = 0; i < count; i++) {
            const p = makeSphere(0.05, 0x3b82f6, {});
            const a = (i / count) * Math.PI * 2;
            const r = 0.2 + (i / count) * 0.9;
            p.position.set(Math.cos(a) * r, cy + Math.sin(a) * 0.9, Math.sin(a * 1.7) * 0.9);
            group.add(p);
        }
        const label = makeTextSprite('扩散', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, cy + 1.8, 0);
        group.add(label);
        scene.add(group);
        const handles: DiffusionHandles = { label };
        updateDiffusion(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updateDiffusion(handles as unknown as DiffusionHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.2, 0);
    }
};

function updateDiffusion(h: DiffusionHandles, params: Record<string, number>): void {
    const T = num(params['temperature'], 300);
    const isLiquid = Math.round(num(params['medium'], 0)) === 1;
    setLabel(h.label, `T=${T.toFixed(0)}K ${isLiquid ? '液体扩散(慢)' : '气体扩散(快)'}  D∝T^1.5`);
}
