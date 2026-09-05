/**
 * 胡克定律 rig — 铁架台 + 真实螺旋弹簧 + 钩码 + 毫米刻度标尺
 * 探究弹簧弹力与形变量关系 F = kx
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createHelicalSpring, updateHelicalSpring, HelicalSpringHandles } from '../equipment/helicalSpring';
import { createWeight } from '../equipment/weight';
import { makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const ANCHOR_Y = 2.2;
const SPRING_L0 = 0.6; // 弹簧原长 (3D 世界单位)

interface HookeHandles {
    standGroup: THREE.Group;
    springHandles: HelicalSpringHandles;
    weightGroup: THREE.Group;
    scaleGroup: THREE.Group;
    readoutLabel: THREE.Sprite;
}

export const hookeLawRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        // 1. 铁架台
        const { group: standGroup } = createIronStand(2.6);
        standGroup.position.set(-0.6, 0, 0);
        scene.add(standGroup);

        // 横杆固定夹
        const crossClamp = makeCylinder(0.04, 0.7, 0x475569, 0.4, 0.6);
        crossClamp.rotation.z = Math.PI / 2;
        crossClamp.position.set(-0.25, ANCHOR_Y + 0.05, 0);
        scene.add(crossClamp);

        // 2. 真实螺旋弹簧 (顶端固定在 ANCHOR_Y)
        const { group: springGroup, handles: springHandles } = createHelicalSpring(
            SPRING_L0,
            0.055,
            12,
            0.008,
            0x94a3b8
        );
        springGroup.position.set(0, 0, 0);
        scene.add(springGroup);

        // 3. 悬挂钩码托盘
        const { group: weightGroup } = createWeight(0.06, 0xd97706);
        weightGroup.position.set(0, ANCHOR_Y - SPRING_L0, 0);
        scene.add(weightGroup);

        // 4. 侧边平行刻度尺
        const scaleGroup = createPrecisionScale();
        scaleGroup.position.set(0.35, 0.4, 0);
        scene.add(scaleGroup);

        // 5. 测量标牌
        const m = num(params['m'], 0.5);
        const k = num(params['k'], 20);
        const deltaX = (m * 9.8) / k;
        const readoutLabel = makeTextSprite(
            `F = ${(m * 9.8).toFixed(2)} N | Δx = ${(deltaX * 100).toFixed(1)} cm (k=${k.toFixed(0)} N/m)`,
            '#16a34a',
            24,
            { x: 1.3, y: 0.22 }
        );
        readoutLabel.position.set(0, ANCHOR_Y + 0.35, 0.2);
        scene.add(readoutLabel);

        const group = new THREE.Group();
        const handles: HookeHandles = {
            standGroup,
            springHandles,
            weightGroup,
            scaleGroup,
            readoutLabel
        };

        // 初始更新几何形变
        updateHooke(handles, m, k);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as HookeHandles;
        const m = num(params['m'], 0.5);
        const k = num(params['k'], 20);
        updateHooke(h, m, k);
    },

    getVisualPosition(pos, params) {
        const m = num(params['m'], 0.5);
        const k = num(params['k'], 20);
        const deltaX = (m * 9.8) / k;
        const visualLen = SPRING_L0 + deltaX * WORLD_SCALE * 4;
        return new THREE.Vector3(pos.x * WORLD_SCALE, ANCHOR_Y - visualLen, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, ANCHOR_Y - SPRING_L0, 0);
    }
};

function updateHooke(h: HookeHandles, m: number, k: number): void {
    const F = m * 9.8;
    const deltaX = k > 0 ? F / k : 0;
    // 视觉形变量缩放
    const visualLen = SPRING_L0 + deltaX * WORLD_SCALE * 4;
    const start = new THREE.Vector3(0, ANCHOR_Y, 0);
    const end = new THREE.Vector3(0, ANCHOR_Y - visualLen, 0);

    updateHelicalSpring(h.springHandles, start, end);
    h.weightGroup.position.set(0, ANCHOR_Y - visualLen, 0);

    setLabel(
        h.readoutLabel,
        `F = ${F.toFixed(2)} N | Δx = ${(deltaX * 100).toFixed(1)} cm (k=${k.toFixed(0)} N/m)`,
        '#16a34a'
    );
}

function createPrecisionScale(): THREE.Group {
    const group = new THREE.Group();
    const rod = makeCylinder(0.018, 1.8, 0x334155, 0.4, 0.3);
    rod.position.set(0, 0.9, 0);
    group.add(rod);

    for (let i = 0; i <= 15; i++) {
        const tick = makeCylinder(0.006, i % 5 === 0 ? 0.09 : 0.05, 0x94a3b8, 0.4, 0.3);
        tick.rotation.z = Math.PI / 2;
        tick.position.set(0.03, i * 0.11, 0);
        group.add(tick);

        if (i % 5 === 0) {
            const label = makeTextSprite(`${i * 2}`, '#334155', 18, { x: 0.22, y: 0.12 });
            label.position.set(0.12, i * 0.11, 0);
            group.add(label);
        }
    }

    const unit = makeTextSprite('cm', '#334155', 20, { x: 0.25, y: 0.14 });
    unit.position.set(0.12, 1.8, 0);
    group.add(unit);

    return group;
}
