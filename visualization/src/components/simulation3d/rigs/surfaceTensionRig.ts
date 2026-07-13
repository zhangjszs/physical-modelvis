/**
 * 表面张力 rig — U 形金属框拉出液膜测表面张力
 * U 形框 + 可滑动横丝 + 肥皂膜 + 向上拉力箭头
 * 用于 surface-tension
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface StHandles {
    slider: THREE.Mesh;
    fArrow: THREE.ArrowHelper;
    label: THREE.Sprite;
}

export const surfaceTensionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const h = 1.6;
        const w = 1.0;
        const barMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), barMat);
        left.position.set(-w / 2, h / 2 + 0.2, 0);
        group.add(left);
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), barMat);
        right.position.set(w / 2, h / 2 + 0.2, 0);
        group.add(right);
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.06, 0.06), barMat);
        bottom.position.set(0, 0.2, 0);
        group.add(bottom);
        // 肥皂膜
        const film = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshStandardMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide
            })
        );
        film.position.set(0, h / 2 + 0.2, 0);
        group.add(film);
        // 可滑动横丝
        const slider = makeCylinder(0.05, w + 0.06, 0x475569, 0.9, 0.9);
        slider.rotation.z = Math.PI / 2;
        slider.position.set(0, h + 0.2, 0);
        group.add(slider);
        // 向上拉力箭头
        const fArrow = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, h + 0.3, 0),
            0.5,
            0xdc2626,
            0.16,
            0.09
        );
        group.add(fArrow);
        const label = makeTextSprite('表面张力', '#334155', 26, { x: 1.0, y: 0.22 });
        label.position.set(0, h + 1.2, 0);
        group.add(label);
        scene.add(group);
        const handles: StHandles = { slider, fArrow, label };
        updateST(handles, params);
        return { group, handles: { slider, fArrow, label } };
    },

    updateEquipment(handles, params) {
        updateST(handles as unknown as StHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateST(h: StHandles, params: Record<string, number>): void {
    const L = num(params['sliderLength'], 1);
    const T = num(params['temperature'], 300);
    setLabel(h.label, `丝长=${L.toFixed(2)}m T=${T.toFixed(0)}K F=2σL`);
}
