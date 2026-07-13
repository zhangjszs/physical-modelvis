/**
 * 力的合成 rig — 橡皮条 + 两个弹簧测力计互成角度拉
 * 验证平行四边形定则（force-composition）
 *
 * 参数响应：
 * - f1 / f2：两分力大小 → 对应力箭头长度
 * - angleDeg：F₁ 与 F₂ 夹角 → F₂ 箭头方向
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createSpringScale } from '../equipment/springScale';
import { makeCylinder } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

export const forceCompositionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, _params) {
        // 结点 O
        const node = makeCylinder(0.06, 0.04, 0xdc2626, 0.3, 0.3);
        node.rotation.x = Math.PI / 2;
        node.position.set(0, 0, 0);
        scene.add(node);

        // 两个弹簧测力计（互成角度）
        const scale1 = createSpringScale();
        scale1.group.rotation.z = -Math.PI / 4;
        scale1.group.position.set(-0.5, 0.5, 0);
        scene.add(scale1.group);

        const scale2 = createSpringScale();
        scale2.group.rotation.z = -Math.PI + Math.PI / 4;
        scale2.group.position.set(0.5, 0.5, 0);
        scene.add(scale2.group);

        // 橡皮条（连线）
        const rubberBand = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.5, 0.5, 0),
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.5, 0.5, 0)
            ]),
            new THREE.LineBasicMaterial({ color: 0x92400e, transparent: true, opacity: 0.5 })
        );
        scene.add(rubberBand);

        // 力的箭头（从结点 O 沿两分力方向）
        const arrow1 = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0xef4444,
            0.12,
            0.08
        );
        scene.add(arrow1);

        const arrow2 = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0x3b82f6,
            0.12,
            0.08
        );
        scene.add(arrow2);

        const group = new THREE.Group();
        return {
            group,
            handles: { node, rubberBand, scaleGroups: [scale1.group, scale2.group], arrow1, arrow2 }
        };
    },

    updateEquipment(handles, params) {
        const arrow1 = handles.arrow1 as THREE.ArrowHelper;
        const arrow2 = handles.arrow2 as THREE.ArrowHelper;
        const f1 = num(params['f1'], 3);
        const f2 = num(params['f2'], 4);
        const angleDeg = num(params['angleDeg'], 90);

        // 箭头长度随分力大小（F=0 时收为极短）
        const len1 = THREE.MathUtils.clamp(0.08 + f1 * 0.06, 0.08, 1.4);
        const len2 = THREE.MathUtils.clamp(0.08 + f2 * 0.06, 0.08, 1.4);
        arrow1.setLength(len1, 0.12, 0.08);
        arrow2.setLength(len2, 0.12, 0.08);

        // F₁ 沿 +x，F₂ 与之成 angleDeg
        arrow1.setDirection(new THREE.Vector3(1, 0, 0));
        const a = (angleDeg * Math.PI) / 180;
        arrow2.setDirection(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.5 - pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.5, 0);
    }
};
