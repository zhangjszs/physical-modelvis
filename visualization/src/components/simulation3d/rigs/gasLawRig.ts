/**
 * 气体定律 rig — 理想气体状态方程 pV=nRT
 * 气缸活塞示意：气体柱高度 ∝ V，颜色随 T 蓝→红，向下压强箭头 ∝ p
 * 用于 gas-law
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

// 温度 → 颜色（蓝 200K → 红 600K）
function tempColor(T: number): number {
    const t = Math.max(0, Math.min(1, (T - 200) / 400));
    const c = new THREE.Color();
    c.setHSL((1 - t) * 0.62, 0.7, 0.55);
    return c.getHex();
}

interface GasHandles {
    piston: THREE.Mesh;
    gas: THREE.Mesh;
    pArrow: THREE.ArrowHelper;
    label: THREE.Sprite;
}

export const gasLawRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 气缸壁（透明）
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.45, 2.0, 32, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.18,
                side: THREE.DoubleSide
            })
        );
        wall.position.set(0, 1.0, 0);
        group.add(wall);
        // 活塞
        const piston = makeCylinder(0.42, 0.08, 0x475569, 0.9, 0.9);
        group.add(piston);
        // 气体柱
        const gas = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 1.0, 32),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 })
        );
        group.add(gas);
        // 压强向下箭头
        const pArrow = makeArrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0.1, 0), 0.6, 0xdc2626, 0.18, 0.1);
        group.add(pArrow);
        const label = makeTextSprite('pV = nRT', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(1.4, 1.9, 0);
        group.add(label);
        scene.add(group);
        const handles: GasHandles = { piston, gas, pArrow, label };
        updateGas(handles, params);
        return { group, handles: { piston, gas, pArrow, label } };
    },

    updateEquipment(handles, params) {
        updateGas(handles as unknown as GasHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateGas(h: GasHandles, params: Record<string, number>): void {
    const n = num(params['n'], 1);
    const mode = Math.round(num(params['modeG'], 0));
    const p0 = num(params['p0'], 101.3);
    const V0 = num(params['V0'], 22.4);
    const T0 = num(params['T0'], 273.15);
    const hMax = 1.8;
    const hGas = Math.max(0.05, (V0 / 100) * hMax);
    h.gas.scale.y = hGas / 1.0;
    h.gas.position.set(0, 0.1 + hGas / 2, 0);
    h.piston.position.set(0, 0.1 + hGas + 0.04, 0);
    (h.gas.material as THREE.MeshStandardMaterial).color.setHex(tempColor(T0));
    const aLen = Math.min(0.9, (p0 / 200) * 0.6);
    h.pArrow.scale.set(1, aLen / 0.6, 1);
    h.pArrow.position.set(0, 0.1 + hGas + 0.06, 0);
    const mName = mode === 0 ? '等温' : mode === 1 ? '等压' : '等容';
    setLabel(h.label, `n=${n.toFixed(1)}mol ${mName} p=${p0.toFixed(0)}kPa V=${V0.toFixed(1)}L T=${T0.toFixed(0)}K`);
}
