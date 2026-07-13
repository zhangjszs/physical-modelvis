/**
 * 中子发现 rig — 查德威克实验两级碰撞
 * α 源(Ra+Be) → 铍靶产生中子 → 石蜡靶反冲质子
 * 用于 neutron-discovery
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeArrow, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface NeutronHandles {
    label: THREE.Sprite;
}

export const neutronDiscoveryRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.4;

        // α 放射源 (Ra+Be) 左
        const source = makeCylinder(0.18, 0.4, 0x7c2d12, 0.4, 0.4);
        source.rotation.z = Math.PI / 2;
        source.position.set(-2.4, cy, 0);
        group.add(source);
        const srcLabel = makeTextSprite('Ra+Be 源', '#7c2d12', 24, { x: 0.8, y: 0.2 });
        srcLabel.position.set(-2.4, cy + 0.5, 0);
        group.add(srcLabel);

        // 铍靶 (中)
        const beTarget = makeBox(0.4, 0.7, 0.7, 0x64748b, 0.4, 0.3);
        beTarget.position.set(-0.9, cy, 0);
        group.add(beTarget);
        const beLabel = makeTextSprite('Be 靶', '#334155', 24, { x: 0.5, y: 0.18 });
        beLabel.position.set(-0.9, cy + 0.6, 0);
        group.add(beLabel);

        // 石蜡靶 (右) + 质子探测器
        const paraffin = makeBox(0.4, 0.7, 0.7, 0xfde68a, 0.5, 0.05);
        paraffin.position.set(1.0, cy, 0);
        group.add(paraffin);
        const paLabel = makeTextSprite('石蜡靶', '#92400e', 24, { x: 0.5, y: 0.18 });
        paLabel.position.set(1.0, cy + 0.6, 0);
        group.add(paLabel);
        const detector = makeSphere(0.16, 0x22c55e, { emissive: 0x14532d, emissiveIntensity: 0.3 });
        detector.position.set(2.0, cy, 0);
        group.add(detector);

        // 碰撞箭头：α → Be，n → 石蜡，p 反冲 → 探测器
        group.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-2.0, cy, 0), 1.0, 0xef4444, 0.2, 0.1));
        group.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.6, cy, 0), 1.4, 0x3b82f6, 0.2, 0.1));
        group.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(1.3, cy, 0), 0.6, 0x22c55e, 0.2, 0.1));

        const label = makeTextSprite('查德威克实验', '#334155', 26, { x: 1.0, y: 0.24 });
        label.position.set(0, cy + 1.2, 0);
        group.add(label);

        scene.add(group);

        const handles: NeutronHandles = { label };
        updateNeutron(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updateNeutron(handles as unknown as NeutronHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.4, 0);
    }
};

function updateNeutron(h: NeutronHandles, params: Record<string, number>): void {
    const E = num(params['alphaEnergy'], 5);
    const m = num(params['targetMass'], 1);
    const txt = `α 能量 ${E.toFixed(1)} MeV  靶核 ${m === 1 ? '氢' : m === 14 ? '氮' : m + 'u'}`;
    const canvas = (h.label.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '600 26px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2);
        (h.label.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
}
