/**
 * LC 振荡电路 rig — 密绕电感线圈 + 平行板电容器 + 双刀双掷开关 + 电磁振荡标牌
 * 演示电场能与磁场能的相互周期性转化 T = 2π√(LC)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface LCHandles {
    coil: THREE.Group;
    capacitor: THREE.Group;
    switchLever: THREE.Mesh;
    infoLabel: THREE.Sprite;
}

export const lcOscillatorRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 绝缘实验底板
        const board = makeBox(3.0, 0.05, 1.6, 0x1e293b, 0.5, 0.1);
        board.position.set(0, 0.025, 0);
        group.add(board);

        // 2. 密绕空心/铁芯电感线圈 L (左侧)
        const coil = new THREE.Group();
        const core = makeCylinder(0.12, 0.8, 0x334155, 0.6, 0.4);
        core.rotation.z = Math.PI / 2;
        coil.add(core);

        // 铜线匝圈
        for (let i = -6; i <= 6; i++) {
            const turn = new THREE.Mesh(
                new THREE.TorusGeometry(0.14, 0.015, 12, 32),
                new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 })
            );
            turn.rotation.y = Math.PI / 2;
            turn.position.set(i * 0.05, 0, 0);
            coil.add(turn);
        }
        coil.position.set(-0.8, 0.22, 0.25);
        group.add(coil);

        const coilLabel = makeTextSprite('电感线圈 L', '#d97706', 20, { x: 0.6, y: 0.15 });
        coilLabel.position.set(-0.8, 0.45, 0.25);
        group.add(coilLabel);

        // 3. 电容器 C (右侧两块平行金属极板)
        const capacitor = new THREE.Group();
        const plateL = makeBox(0.04, 0.45, 0.45, 0x94a3b8, 0.3, 0.85);
        plateL.position.set(-0.08, 0, 0);
        capacitor.add(plateL);

        const plateR = makeBox(0.04, 0.45, 0.45, 0x94a3b8, 0.3, 0.85);
        plateR.position.set(0.08, 0, 0);
        capacitor.add(plateR);
        capacitor.position.set(0.8, 0.25, 0.25);
        group.add(capacitor);

        const capLabel = makeTextSprite('电容器 C', '#3b82f6', 20, { x: 0.6, y: 0.15 });
        capLabel.position.set(0.8, 0.55, 0.25);
        group.add(capLabel);

        // 4. 双刀双掷开关与导线回路
        const switchBase = makeBox(0.35, 0.06, 0.25, 0x0f172a, 0.6, 0.2);
        switchBase.position.set(0, 0.06, -0.4);
        group.add(switchBase);

        const switchLever = makeBox(0.02, 0.16, 0.02, 0xdc2626, 0.4, 0.3);
        switchLever.rotation.z = Math.PI / 5;
        switchLever.position.set(0, 0.14, -0.4);
        group.add(switchLever);

        // 铜导线闭合环路
        const loopPts = [
            new THREE.Vector3(-0.8, 0.22, 0.25),
            new THREE.Vector3(-0.8, 0.1, -0.4),
            new THREE.Vector3(0.8, 0.1, -0.4),
            new THREE.Vector3(0.8, 0.25, 0.25)
        ];
        const loopWire = makeLine(loopPts, 0xeab308, 0.8);
        group.add(loopWire);

        // 5. 振荡周期与频率标牌
        const LVal = num(params['L'] ?? params['inductance'], 0.1);
        const CVal = num(params['C'] ?? params['capacitance'], 10e-6);
        const T = 2 * Math.PI * Math.sqrt(LVal * CVal);
        const f = T > 0 ? 1 / T : 0;

        const infoLabel = makeTextSprite(
            `T = 2π√(LC) = ${(T * 1e3).toFixed(2)} ms | f = ${f.toFixed(1)} Hz (电磁能量往返振荡)`,
            '#2563eb',
            24,
            { x: 1.5, y: 0.22 }
        );
        infoLabel.position.set(0, 0.85, 0.1);
        group.add(infoLabel);

        scene.add(group);

        const handles: LCHandles = {
            coil,
            capacitor,
            switchLever,
            infoLabel
        };

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as LCHandles;
        const LVal = num(params['L'] ?? params['inductance'], 0.1);
        const CVal = num(params['C'] ?? params['capacitance'], 10e-6);
        const T = 2 * Math.PI * Math.sqrt(LVal * CVal);
        const f = T > 0 ? 1 / T : 0;

        setLabel(
            h.infoLabel,
            `T = 2π√(LC) = ${(T * 1e3).toFixed(2)} ms | f = ${f.toFixed(1)} Hz (电磁能量往返振荡)`,
            '#2563eb'
        );
    },

    getVisualPosition(pos, _params) {
        // 电荷量 q(t) 在电容极板间往返振荡
        return new THREE.Vector3(0.8 + pos.x * WORLD_SCALE * 0.5, 0.25, 0.25);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.8, 0.25, 0.25);
    }
};
