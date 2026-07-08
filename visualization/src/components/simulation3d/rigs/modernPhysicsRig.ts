/**
 * 现代物理 rig — 黑体辐射/电子衍射/法拉第筒/液体混合/分子力/宇宙射线/中子发现/放射线偏转
 * 通用粒子/量子/原子物理可视化
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

export const modernPhysicsRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 中心源/靶
        const target = makeSphere(0.12, 0xfbbf24, { emissive: 0xb45309, emissiveIntensity: 0.15 });
        target.position.set(0, 1.5, 0);
        scene.add(target);

        // 粒子径迹（散射/偏转轨迹）
        for (let i = 0; i < 3; i++) {
            const angle = -0.4 + i * 0.4;
            const track = makeLine(
                [
                    new THREE.Vector3(-1.5, 1.5 + i * 0.2, 0),
                    new THREE.Vector3(0, 1.5, 0),
                    new THREE.Vector3(1.5, 1.5 + Math.sin(angle) * 0.8, 0)
                ],
                0x3b82f6,
                0.5 - i * 0.1
            );
            scene.add(track);
        }

        const label = makeTextSprite('粒子径迹', '#475569', 24, { x: 0.6, y: 0.2 });
        label.position.set(0, 2.3, 0);
        scene.add(label);

        return { group: new THREE.Group(), handles: {} };
    },

    updateEquipment(_handles, _params) {},

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.5 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.5, 0);
    }
};
