/**
 * 油膜 rig — 薄膜干涉（虹彩环）
 * 水盘 + 表面油膜(彩色同心环) + 上方滴管
 * 用于 oil-film
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface OilHandles {
    label: THREE.Sprite;
}

const FILM_COLORS = [0xff5d5d, 0xffb14e, 0xffe14e, 0x5dff7a, 0x4ec3ff, 0x9b6bff];

export const oilFilmRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        // 水盘
        const tray = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 0.18, 48),
            new THREE.MeshStandardMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.85 })
        );
        tray.position.set(0, 0.5, 0);
        group.add(tray);
        // 油膜（虹彩同心环）
        for (let i = 0; i < FILM_COLORS.length; i++) {
            const r = 1.5 - i * 0.25;
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(Math.max(0.05, r - 0.25), r, 48),
                new THREE.MeshStandardMaterial({
                    color: FILM_COLORS[i],
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                })
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.62, 0);
            group.add(ring);
        }
        // 滴管
        const dropper = makeCylinder(0.05, 0.9, 0x94a3b8, 0.7, 0.7);
        dropper.position.set(0.8, 1.6, 0);
        group.add(dropper);
        const label = makeTextSprite('油膜干涉', '#334155', 26, { x: 1.2, y: 0.22 });
        label.position.set(0, 2.4, 0);
        group.add(label);
        scene.add(group);
        const handles: OilHandles = { label };
        updateOil(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updateOil(handles as unknown as OilHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.6 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.6, 0);
    }
};

function updateOil(h: OilHandles, params: Record<string, number>): void {
    const conc = num(params['oilConcentration'], 1);
    const area = num(params['filmArea'], 50);
    setLabel(h.label, `油浓度=${conc.toFixed(2)} 膜面积=${area.toFixed(0)}cm²  2nd·cosθ=kλ`);
}
