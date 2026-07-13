/**
 * 热传递 rig — 传导/对流/辐射三种方式
 * 热源(红) + 冷端(蓝) + 中间介质(随 mode 切换外观)
 * 用于 heat-transfer
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface HtHandles {
    label: THREE.Sprite;
}

export const heatTransferRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const mode = Math.round(num(params['mode'], 0));
        // 热源（左，红）
        const hot = makeSphere(0.4, 0xdc2626, { emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
        hot.position.set(-1.4, 1.0, 0);
        group.add(hot);
        // 冷端（右，蓝）
        const cold = makeSphere(0.4, 0x2563eb, { emissive: 0x1e3a8a, emissiveIntensity: 0.4 });
        cold.position.set(1.4, 1.0, 0);
        group.add(cold);
        // 传导介质
        let bar: THREE.Mesh;
        if (mode === 1) {
            bar = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 1.2, 1.0),
                new THREE.MeshPhysicalMaterial({
                    color: 0xbfdbfe,
                    transparent: true,
                    opacity: 0.18,
                    side: THREE.DoubleSide
                })
            );
        } else if (mode === 2) {
            bar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 2.8, 8),
                new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
            );
        } else {
            bar = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 0.3, 0.3),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
            );
        }
        bar.position.set(0, 1.0, 0);
        group.add(bar);
        const label = makeTextSprite('热传递', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.2, 0);
        group.add(label);
        scene.add(group);
        const handles: HtHandles = { label };
        updateHT(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updateHT(handles as unknown as HtHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateHT(h: HtHandles, params: Record<string, number>): void {
    const mode = Math.round(num(params['mode'], 0));
    const mName = mode === 0 ? '传导' : mode === 1 ? '对流' : '辐射';
    setLabel(h.label, `${mName}：热量自发高温→低温`);
}
