/**
 * 滑动摩擦力 rig — 长木板 + 滑块 + 弹簧测力计 + 不同接触面
 * 探究 f=μN 及影响因素
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createBench } from '../equipment/bench';
import { createSpringScale } from '../equipment/springScale';
import { makeBox, makeTextSprite } from '../primitives';

const WORLD_SCALE = 0.16;

interface FrictionHandles {
    bench: THREE.Group;
    block: THREE.Mesh;
    scaleGroup: THREE.Group;
    surface: THREE.Mesh;
}

export const slidingFrictionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const mu = params['mu'] ?? 0.3;

        // 长木板（接触面颜色随 μ 变化）
        const { group: bench } = createBench(3.0, 0.08);
        bench.position.set(0, 0, 0);
        scene.add(bench);

        // 接触面材质标记
        const surfaceColor = mu < 0.2 ? 0xd4d4d8 : mu < 0.5 ? 0xa8a29e : 0x78716c;
        const surface = makeBox(3.0, 0.01, 0.8, surfaceColor, 0.5, 0.05);
        surface.position.set(0, 0.085, 0);
        scene.add(surface);

        // 滑块
        const block = makeBox(0.3, 0.16, 0.25, 0x2563eb, 0.35, 0.1);
        block.position.set(0, 0.18, 0);
        scene.add(block);

        // 弹簧测力计（水平牵引）
        const { group: scaleGroup } = createSpringScale();
        scaleGroup.rotation.z = -Math.PI / 2;
        scaleGroup.position.set(0.4, 0.18, 0);
        scene.add(scaleGroup);

        // μ 值标签
        const muLabel = makeTextSprite(`μ = ${mu.toFixed(2)}`, '#92400e', 24, { x: 0.6, y: 0.2 });
        muLabel.position.set(0, 0.42, 0);
        scene.add(muLabel);

        const group = new THREE.Group();
        return { group, handles: { bench, block, scaleGroup, surface } };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as FrictionHandles;
        const mu = params['mu'] ?? 0.3;
        const surfaceColor = mu < 0.2 ? 0xd4d4d8 : mu < 0.5 ? 0xa8a29e : 0x78716c;
        (h.surface.material as THREE.MeshStandardMaterial).color.setHex(surfaceColor);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.18, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.18, 0);
    }
};
