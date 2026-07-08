/**
 * 验电器 / 静电实验 rig — 金属球 + 导体棒 + 箔片
 * 用于 electroscope、electrostatic-induction、electrostatic-shielding、coulomb-force-explore
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const electroscopeRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 金属球（顶部）
        const ball = makeSphere(0.12, 0x94a3b8, { metalness: 0.5 });
        ball.position.set(0, 2.0, 0);
        scene.add(ball);

        // 导体棒
        const rod = makeCylinder(0.02, 1.0, 0x64748b, 0.4, 0.3);
        rod.position.set(0, 1.5, 0);
        scene.add(rod);

        // 金属箔片（两片，张开）
        const foil1 = makeBox(0.08, 0.2, 0.005, 0xfbbf24, 0.3, 0.4);
        foil1.position.set(-0.06, 0.95, 0);
        foil1.rotation.z = 0.2;
        scene.add(foil1);

        const foil2 = makeBox(0.08, 0.2, 0.005, 0xfbbf24, 0.3, 0.4);
        foil2.position.set(0.06, 0.95, 0);
        foil2.rotation.z = -0.2;
        scene.add(foil2);

        // 外壳
        const shell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.8, 16, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            })
        );
        shell.position.set(0, 1.0, 0);
        scene.add(shell);

        // 底座
        const base = makeCylinder(0.2, 0.05, 0x334155, 0.3, 0.3);
        base.position.set(0, 0.55, 0);
        scene.add(base);

        const label = makeTextSprite('验电器', '#475569', 24, { x: 0.6, y: 0.2 });
        label.position.set(0, 2.3, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};
