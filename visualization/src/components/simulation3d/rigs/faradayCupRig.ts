/**
 * 法拉第圆筒 rig — 空腔导体: 内表面净电荷=0, 电荷全在外表面
 * 用于 faraday-cup
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeLine, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface FaradayHandles {
    shell: THREE.Mesh;
    innerProbe: THREE.Mesh;
    outerProbe: THREE.Mesh;
    innerLabel: THREE.Sprite;
    outerLabel: THREE.Sprite;
}

export const faradayCupRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.3;

        // 金属圆筒外壳 (开口圆柱)
        const shell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 1.3, 36, 1, true),
            new THREE.MeshStandardMaterial({
                color: 0x94a3b8,
                metalness: 0.7,
                roughness: 0.3,
                side: THREE.DoubleSide
            })
        );
        shell.position.set(0, cy, 0);
        group.add(shell);
        // 筒底
        const bottom = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.06, 36),
            new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 })
        );
        bottom.position.set(0, cy - 0.65, 0);
        group.add(bottom);

        // 内壁探针 (小球+细杆)
        const innerProbe = makeSphere(0.1, 0x22c55e, { emissive: 0x14532d, emissiveIntensity: 0.3 });
        group.add(innerProbe);
        const innerRod = makeLine([new THREE.Vector3(0, cy + 0.8, 0), new THREE.Vector3(0, cy, 0)], 0x22c55e, 0.6);
        group.add(innerRod);

        // 外壁探针
        const outerProbe = makeSphere(0.1, 0xef4444, { emissive: 0x7f1d1d, emissiveIntensity: 0.3 });
        group.add(outerProbe);
        const outerRod = makeLine([new THREE.Vector3(0.9, cy + 0.8, 0), new THREE.Vector3(0.55, cy, 0)], 0xef4444, 0.6);
        group.add(outerRod);

        const innerLabel = makeTextSprite('内壁 Q=0', '#15803d', 24, { x: 0.7, y: 0.18 });
        innerLabel.position.set(0, cy + 1.1, 0);
        group.add(innerLabel);
        const outerLabel = makeTextSprite('外壁 Q=5μC', '#b91c1c', 24, { x: 0.8, y: 0.18 });
        outerLabel.position.set(0.9, cy - 0.9, 0);
        group.add(outerLabel);

        scene.add(group);

        const handles: FaradayHandles = { shell, innerProbe, outerProbe, innerLabel, outerLabel };
        updateFaraday(handles, params);
        return { group, handles: { shell, innerProbe, outerProbe, innerLabel, outerLabel } };
    },

    updateEquipment(handles, params) {
        updateFaraday(handles as unknown as FaradayHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.3 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.3, 0);
    }
};

function updateFaraday(h: FaradayHandles, params: Record<string, number>): void {
    const Q = num(params['totalCharge'], 5);
    const innerD = num(params['innerProbeDepth'], 0);
    const outerD = num(params['outerProbeDepth'], 1);

    // 内壁探针位置 (0=贴内壁, 1=腔体深处)
    h.innerProbe.position.set(0, 1.3 - 0.55 + innerD * 0.45, 0);
    // 外壁探针 (0=表面, 1=外侧)
    h.outerProbe.position.set(0.55 + outerD * 0.35, 1.3, 0);

    // 外壳电荷辉光随 Q
    const mat = h.shell.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0xef4444);
    mat.emissiveIntensity = Math.min(0.8, Q / 100);

    const outerTxt = `外壁 Q=${Q.toFixed(1)}μC`;
    const oCanvas = (h.outerLabel.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (oCanvas) {
        const ctx = oCanvas.getContext('2d')!;
        ctx.clearRect(0, 0, oCanvas.width, oCanvas.height);
        ctx.font = '600 24px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#b91c1c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(outerTxt, oCanvas.width / 2, oCanvas.height / 2);
        (h.outerLabel.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
}
