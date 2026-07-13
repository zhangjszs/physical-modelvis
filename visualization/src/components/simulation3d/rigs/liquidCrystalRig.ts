/**
 * 液晶 rig — 液晶随温度/电压相变（向列相↔各向同性）
 * 两玻璃板夹液晶 + 两侧电极
 * 用于 liquid-crystal
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface LcHandles {
    lc: THREE.Mesh;
    label: THREE.Sprite;
}

export const liquidCrystalRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xbfdbfe,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.2), glassMat);
        top.position.set(0, 1.2, 0);
        group.add(top);
        const bot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.2), glassMat);
        bot.position.set(0, 0.6, 0);
        group.add(bot);
        // 液晶层
        const lc = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.4, 1.1),
            new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.7 })
        );
        lc.position.set(0, 0.9, 0);
        group.add(lc);
        // 电极
        const elMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
        const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.1), elMat);
        e1.position.set(-0.82, 0.9, 0);
        group.add(e1);
        const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.1), elMat);
        e2.position.set(0.82, 0.9, 0);
        group.add(e2);
        const label = makeTextSprite('液晶', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 1.8, 0);
        group.add(label);
        scene.add(group);
        const handles: LcHandles = { lc, label };
        updateLC(handles, params);
        return { group, handles: { lc, label } };
    },

    updateEquipment(handles, params) {
        updateLC(handles as unknown as LcHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.9 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.9, 0);
    }
};

function updateLC(h: LcHandles, params: Record<string, number>): void {
    const T = num(params['endTemp'], 40);
    const V = num(params['voltage'], 5);
    const t = Math.max(0, Math.min(1, (T - 20) / 60));
    const c = new THREE.Color();
    c.setHSL(0.33 - t * 0.33, 0.6, 0.5);
    (h.lc.material as THREE.MeshStandardMaterial).color.copy(c);
    setLabel(h.label, `T=${T.toFixed(0)}°C U=${V.toFixed(1)}V 向列相↔各向同性`);
}
