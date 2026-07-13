/**
 * 验电器 / 静电实验 rig — 金属球 + 导体棒 + 箔片
 * 用于 electroscope、electrostatic-induction、electrostatic-shielding、coulomb-force-explore
 *
 * 参数响应：
 * - charge / chargeC：带电量 → 箔片张角（张角 ∝ 电荷，∝1/质量，∝1/√箔长）
 * - foilLength：箔片长度 → 箔片几何高度
 * - foilMass：箔片质量 → 张角反比
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

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

        return { group: new THREE.Group(), handles: { foil1, foil2 } };
    },

    updateEquipment(handles, params) {
        const foil1 = handles.foil1 as THREE.Mesh;
        const foil2 = handles.foil2 as THREE.Mesh;
        // 兼容 electroscope(charge) 与 electrostatic-induction/coulomb(chargeC)
        const q = num(params['charge'], num(params['chargeC'], 1));
        const foilLen = num(params['foilLength'], 5); // cm
        const foilMass = num(params['foilMass'], 1); // g

        // 箔片几何高度随箔长变化（基准 5cm → 高度 0.2）
        const lenScale = THREE.MathUtils.clamp(foilLen / 5, 0.2, 4);
        foil1.scale.y = lenScale;
        foil2.scale.y = lenScale;

        // 张角 ∝ q / (m·√L)，电荷越大张得越开，质量越大/箔越长收得越拢
        const theta = THREE.MathUtils.clamp((0.03 * q) / (foilMass * Math.sqrt(foilLen)), 0, 0.75);
        foil1.rotation.z = -theta;
        foil2.rotation.z = theta;
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};
