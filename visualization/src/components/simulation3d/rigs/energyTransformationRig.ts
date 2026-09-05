/**
 * 能量转化与守恒实验 rig — 输入机构 + 能量转换机组 + 有用输出 + 耗散内能 + 能量守恒流向
 * 验证能量守恒定律 E_in = E_out + Q_loss 与转化效率 η = E_out / E_in < 1
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface EnergyTransHandles {
    inputUnit: THREE.Mesh;
    converterUnit: THREE.Group;
    outputUnit: THREE.Mesh;
    wasteHeatMesh: THREE.Mesh;
    inArrow: THREE.ArrowHelper;
    outArrow: THREE.ArrowHelper;
    wasteArrow: THREE.ArrowHelper;
    label: THREE.Sprite;
}

export const energyTransformationRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.0;

        // 实验底座平台
        const bench = makeBox(3.6, 0.12, 1.4, 0x1e293b, 0.5, 0.2);
        bench.position.set(0, cy - 0.55, 0);
        group.add(bench);

        // ==================== 1. 输入能量装置 (左侧) ====================
        const inputUnit = makeBox(0.7, 0.75, 0.7, 0x15803d, 0.4, 0.3);
        inputUnit.position.set(-1.25, cy, 0);
        group.add(inputUnit);

        // ==================== 2. 核心能量转换机组 (中置机箱与转子) ====================
        const converterUnit = new THREE.Group();
        const converterBody = makeBox(0.9, 0.85, 0.8, 0x334155, 0.3, 0.5);
        converterUnit.add(converterBody);
        const rotor = makeCylinder(0.24, 0.2, 0xd97706, 0.2, 0.9);
        rotor.rotation.x = Math.PI / 2;
        rotor.position.set(0, 0.05, 0.42);
        converterUnit.add(rotor);
        converterUnit.position.set(0, cy, 0);
        group.add(converterUnit);

        // ==================== 3. 有用功输出装置 (右侧) ====================
        const outputUnit = makeBox(0.7, 0.75, 0.7, 0x0284c7, 0.4, 0.3);
        outputUnit.position.set(1.25, cy, 0);
        group.add(outputUnit);

        // ==================== 4. 耗散废热内能装置 (转换机组顶部散热片) ====================
        const wasteHeatMesh = makeBox(0.65, 0.18, 0.65, 0xdc2626, 0.3, 0.4);
        wasteHeatMesh.position.set(0, cy + 0.52, 0);
        group.add(wasteHeatMesh);

        // ==================== 5. 能量流矢量箭头 ====================
        // 输入流 E_in (绿)
        const inArrow = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-0.9, cy, 0),
            0.45,
            0x22c55e,
            0.14,
            0.08
        );
        group.add(inArrow);

        // 有用输出流 E_out (蓝)
        const outArrow = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0.45, cy, 0),
            0.45,
            0x38bdf8,
            0.14,
            0.08
        );
        group.add(outArrow);

        // 耗散热流 Q_loss (红, 向上发射)
        const wasteArrow = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, cy + 0.62, 0),
            0.45,
            0xef4444,
            0.14,
            0.08
        );
        group.add(wasteArrow);

        // 状态 HUD
        const label = makeTextSprite('能量转化与守恒定律', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0, cy + 1.25, 0);
        group.add(label);

        const handles: EnergyTransHandles = {
            inputUnit,
            converterUnit,
            outputUnit,
            wasteHeatMesh,
            inArrow,
            outArrow,
            wasteArrow,
            label
        };
        updateEnergyTrans(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateEnergyTrans(handles as unknown as EnergyTransHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as EnergyTransHandles;
        if (!h.converterUnit) return;

        // 内部转子旋转
        h.converterUnit.rotation.y = ctx.time * 4.0;

        // 箭头脉动
        const pulse = 1.0 + Math.sin(ctx.time * 6.0) * 0.1;
        h.inArrow.scale.set(pulse, 1, 1);
        h.outArrow.scale.set(pulse, 1, 1);
        h.wasteArrow.scale.set(1, pulse, 1);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateEnergyTrans(h: EnergyTransHandles, params: Record<string, number>): void {
    const mode = Math.round(num(params['mode'], 0)); // 0=单摆, 1=发电机, 2=光伏电池
    const Ein = num(params['inputEnergy'], 100); // J
    const eta = num(params['efficiency'], 0.85); // 0~1

    const Eout = Ein * eta;
    const Qloss = Ein * (1 - eta);

    const modeNames = ['机械能(势能↔动能)', '机械能→电能(发电机)', '光能→电能(光伏)'];
    const modeName = modeNames[mode] ?? '发电机';

    // 调整输出与耗散箭头比例
    const outLen = Math.max(0.2, Math.min(0.7, eta * 0.55));
    h.outArrow.scale.set(outLen / 0.45, 1, 1);
    const wasteLen = Math.max(0.15, Math.min(0.7, (1 - eta) * 0.55));
    h.wasteArrow.scale.set(1, wasteLen / 0.45, 1);

    setLabel(
        h.label,
        `过程: ${modeName} | 输入 E_in=${Ein.toFixed(0)}J | 有用输出 E_out=${Eout.toFixed(1)}J (η=${(eta * 100).toFixed(1)}%) | 耗散热 Q=${Qloss.toFixed(1)}J (守恒)`,
        '#0f172a'
    );
}
