/**
 * 布朗运动 rig — 显微镜下微粒受液体分子撞击抖动
 * 圆形视野 + 花粉微粒(多个) + 周围小分子随机分布
 * 用于 brownian-motion
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface BrownHandles {
    label: THREE.Sprite;
}

export const brownianMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const cy = 1.4;
        // 显微镜视野圆
        const field = new THREE.Mesh(
            new THREE.CircleGeometry(1.6, 48),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
        );
        field.position.set(0, cy, 0);
        group.add(field);
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.6, 0.06, 12, 48),
            new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        ring.position.set(0, cy, 0);
        group.add(ring);
        // 花粉微粒（大球，多个）
        const n = Math.max(1, Math.min(12, Math.round(num(params['nParticles'], 10))));
        for (let i = 0; i < n; i++) {
            const r = 0.12 + (num(params['particleRadius'], 1) / 10) * 0.25;
            const p = makeSphere(r, 0xf59e0b, { emissive: 0x92400e, emissiveIntensity: 0.2 });
            const a = (i / n) * Math.PI * 2;
            p.position.set(Math.cos(a) * 0.8, cy + Math.sin(a) * 0.5, 0.1);
            group.add(p);
        }
        // 液体分子（随机小球）
        for (let i = 0; i < 60; i++) {
            const m = makeSphere(0.04, 0x93c5fd, {});
            const rr = Math.random();
            const a = Math.random() * Math.PI * 2;
            m.position.set(Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr * 1.5, 0.05);
            group.add(m);
        }
        const label = makeTextSprite('布朗运动', '#334155', 26, { x: 1.2, y: 0.22 });
        label.position.set(0, cy + 1.8, 0);
        group.add(label);
        scene.add(group);
        const handles: BrownHandles = { label };
        updateBrown(handles, params);
        return { group, handles: { label } };
    },

    updateEquipment(handles, params) {
        updateBrown(handles as unknown as BrownHandles, params);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.4, 0);
    }
};

function updateBrown(h: BrownHandles, params: Record<string, number>): void {
    const T = num(params['liquidTemp'], 300);
    const eta = num(params['fluidViscosity'], 1);
    setLabel(h.label, `T=${T.toFixed(0)}K  η=${eta.toFixed(1)}cP  D=kT/(6πηr)`);
}
