/**
 * 热学 rig — 气体/热传递/相变/分子运动
 * 用于 gas-law、diffusion、brownian-motion、oil-film、melting-curve、
 * surface-tension、capillary、wetting、liquid-crystal、
 * joule-mechanical、joule-electrical、adiabatic-compression、
 * heat-transfer、energy-transformation、perpetuum-mobile、heat-direction
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const thermalRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 容器（玻璃烧杯近似）
        const container = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.4, 1.2, 24, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            })
        );
        container.position.set(0, 0.6, 0);
        scene.add(container);

        // 内部粒子（分子运动可视化）
        for (let i = 0; i < 8; i++) {
            const particle = makeSphere(0.04, 0x3b82f6, {});
            particle.position.set(
                (Math.sin(i * 1.3) * 0.3),
                0.3 + (i * 0.1),
                (Math.cos(i * 1.7) * 0.2)
            );
            scene.add(particle);
        }

        // 温度计
        const thermometer = makeCylinder(0.02, 0.8, 0xdc2626, 0.3, 0.3);
        thermometer.position.set(0.6, 0.6, 0);
        scene.add(thermometer);

        const label = makeTextSprite('T', '#dc2626', 22, { x: 0.25, y: 0.16 });
        label.position.set(0.6, 1.1, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.6, 0);
    }
};
