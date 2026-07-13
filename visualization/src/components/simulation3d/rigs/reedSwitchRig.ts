/**
 * 干簧管 (磁控开关) rig — 玻璃管 + 两铁簧片 + 磁体 + 指示灯
 * 用于 reed-switch
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeSphere, makeTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

type ReedHandles = {
    magnet: THREE.Mesh;
    magnetS: THREE.Mesh;
    led: THREE.Mesh;
    reedL: THREE.Mesh;
    reedR: THREE.Mesh;
};

export const reedSwitchRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const base = makeBox(2.4, 0.06, 1.0, 0xe2e8f0, 0.8, 0);
        base.position.set(0, 0.03, 0);
        group.add(base);

        // 密封玻璃管
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 1.0, 24, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.22,
                side: THREE.DoubleSide
            })
        );
        tube.rotation.z = Math.PI / 2;
        tube.position.set(0, 0.4, 0);
        group.add(tube);

        // 两片铁簧（管中央近乎搭接）
        const reedL = makeBox(0.45, 0.04, 0.04, 0xb0b8c4, 0.3, 0.8);
        reedL.position.set(-0.25, 0.4, 0);
        group.add(reedL);

        const reedR = makeBox(0.45, 0.04, 0.04, 0xb0b8c4, 0.3, 0.8);
        reedR.position.set(0.25, 0.4, 0);
        group.add(reedR);

        // 条形磁体（红=N 蓝=S）
        const magnet = makeBox(0.3, 0.18, 0.18, 0xdc2626, 0.4, 0.3);
        magnet.position.set(-1.0, 0.4, 0);
        group.add(magnet);

        const magnetS = makeBox(0.15, 0.18, 0.18, 0x2563eb, 0.4, 0.3);
        magnetS.position.set(-1.15, 0.4, 0);
        group.add(magnetS);

        // 指示灯（吸合点亮）
        const led = makeSphere(0.1, 0x22c55e, { emissive: 0x16a34a, emissiveIntensity: 0.2 });
        led.position.set(0.95, 0.5, 0);
        group.add(led);

        const ledLabel = makeTextSprite('指示', '#16a34a', 20, { x: 0.4, y: 0.16 });
        ledLabel.position.set(0.95, 0.74, 0);
        group.add(ledLabel);

        const label = makeTextSprite('干簧管', '#475569', 24, { x: 0.5, y: 0.2 });
        label.position.set(0, 0.78, 0);
        group.add(label);

        scene.add(group);
        const handles: ReedHandles = { magnet, magnetS, led, reedL, reedR };
        applyMagnet(handles, num(params['magnetDistance'], 5));
        return { group, handles };
    },

    updateEquipment(handles, params) {
        applyMagnet(handles as unknown as ReedHandles, num(params['magnetDistance'], 5));
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.4, 0);
    }
};

function applyMagnet(h: ReedHandles, d: number): void {
    // 距离越小磁体越靠近；足够近 (d<25mm) 吸合：簧片接触、灯亮
    const closed = d < 25;
    const bx = Math.max(-1.85, -0.6 - (d / 100) * 1.1);
    h.magnet.position.x = bx;
    h.magnetS.position.x = bx - 0.15;
    const bend = closed ? 0.06 : 0.0;
    h.reedL.position.x = -0.25 + bend;
    h.reedR.position.x = 0.25 - bend;
    const lmat = h.led.material as THREE.MeshStandardMaterial;
    lmat.emissiveIntensity = closed ? 1.5 : 0.15;
}
