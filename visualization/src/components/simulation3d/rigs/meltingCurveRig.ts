/**
 * 熔曲线 rig — 加热晶体熔化，温度-时间曲线出现平台
 * 酒精灯 + 试管(固体) + 温度计
 * 用于 melting-curve
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface MeltHandles {
    solid: THREE.Mesh;
    label: THREE.Sprite;
}

export const meltingCurveRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 酒精灯
        const burner = new THREE.Mesh(
            new THREE.ConeGeometry(0.35, 0.6, 24),
            new THREE.MeshStandardMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.85 })
        );
        burner.position.set(0, 0.3, 0);
        group.add(burner);
        const flame = makeCylinder(0.12, 0.3, 0xfbbf24, 0.8, 0.8);
        flame.position.set(0, 0.75, 0);
        group.add(flame);
        // 试管
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 1.2, 24, 1, true),
            new THREE.MeshPhysicalMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
        );
        tube.position.set(0, 1.6, 0);
        group.add(tube);
        // 固体
        const solid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.5, 20),
            new THREE.MeshStandardMaterial({ color: 0x64748b })
        );
        solid.position.set(0, 1.3, 0);
        group.add(solid);
        // 温度计
        const therm = makeCylinder(0.02, 1.0, 0xdc2626, 0.9, 0.9);
        therm.position.set(0.28, 1.6, 0);
        group.add(therm);
        const label = makeTextSprite('熔化曲线', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, 2.6, 0);
        group.add(label);
        scene.add(group);
        const handles: MeltHandles = { solid, label };
        updateMelt(handles, params);
        return { group, handles: { solid, label } };
    },

    updateEquipment(handles, params) {
        updateMelt(handles as unknown as MeltHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.6, 0);
    }
};

function updateMelt(h: MeltHandles, params: Record<string, number>): void {
    const mp = num(params['meltingPoint'], 0);
    const rate = num(params['heatingRate'], 1);
    setLabel(h.label, `熔点=${mp.toFixed(0)}°C 加热率=${rate.toFixed(1)}°C/min 平台段Δt`);
}
