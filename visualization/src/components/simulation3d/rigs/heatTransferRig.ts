/**
 * 热传递实验 rig — 恒温热源 + 低温冷端 + 热传导棒/对流流场/热辐射腔 + 测温探针
 * 演示热传递的三种基本形式: 热传导 (傅里叶定律 dQ/dt = -kA·dT/dx)、热对流 (循环流动) 与热辐射 (斯忒藩-玻尔兹曼定律 E = εσT⁴)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface HeatTransferHandles {
    hotBlock: THREE.Mesh;
    coldBlock: THREE.Mesh;
    conductionBar: THREE.Mesh;
    convectionBox: THREE.Mesh;
    fluxArrows: THREE.ArrowHelper[];
    thermometerProbes: THREE.Mesh[];
    label: THREE.Sprite;
}

export const heatTransferRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.1;
        const barLen = 2.4;

        // 实验台底座
        const bench = makeBox(barLen + 1.8, 0.12, 1.2, 0x1e293b, 0.6, 0.2);
        bench.position.set(0, cy - 0.55, 0);
        group.add(bench);

        // ==================== 1. 高温热源 (左侧发热恒温铜块) ====================
        const hotBlock = makeBox(0.8, 0.8, 0.8, 0xdc2626, 0.3, 0.2);
        hotBlock.position.set(-barLen / 2 - 0.45, cy, 0);
        group.add(hotBlock);

        // ==================== 2. 低温冷端 (右侧冰水循环散热铝块) ====================
        const coldBlock = makeBox(0.8, 0.8, 0.8, 0x2563eb, 0.3, 0.3);
        coldBlock.position.set(barLen / 2 + 0.45, cy, 0);
        group.add(coldBlock);

        // ==================== 3. 传热介质主体 ====================
        // 热传导实心圆柱导热棒
        const conductionBar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, barLen, 32),
            new THREE.MeshStandardMaterial({
                color: 0xd97706,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        conductionBar.rotation.z = Math.PI / 2;
        conductionBar.position.set(0, cy, 0);
        group.add(conductionBar);

        // 对流/辐射透明腔体
        const convectionBox = new THREE.Mesh(
            new THREE.BoxGeometry(barLen, 0.65, 0.65),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.18,
                roughness: 0.1,
                transmission: 0.85
            })
        );
        convectionBox.position.set(0, cy, 0);
        convectionBox.visible = false;
        group.add(convectionBox);

        // ==================== 4. 沿程等距数字测温探针 ====================
        const thermometerProbes: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
            const probeX = -barLen / 2 + 0.3 + (i * (barLen - 0.6)) / 3;
            const probe = makeCylinder(0.016, 0.45, 0xd4d4d8, 0.2, 0.8);
            probe.position.set(probeX, cy + 0.32, 0);
            group.add(probe);
            thermometerProbes.push(probe);
        }

        // ==================== 5. 热流热通量矢量箭头阵列 ====================
        const fluxArrows: THREE.ArrowHelper[] = [];
        for (let i = 0; i < 3; i++) {
            const arrowX = -0.6 + i * 0.6;
            const arr = makeArrow(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(arrowX, cy + 0.22, 0),
                0.45,
                0xf59e0b,
                0.14,
                0.08
            );
            group.add(arr);
            fluxArrows.push(arr);
        }

        // 状态 HUD
        const label = makeTextSprite('热传递实验 (传导/对流/辐射)', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0, cy + 1.15, 0);
        group.add(label);

        const handles: HeatTransferHandles = {
            hotBlock,
            coldBlock,
            conductionBar,
            convectionBox,
            fluxArrows,
            thermometerProbes,
            label
        };
        updateHeatTransfer(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateHeatTransfer(handles as unknown as HeatTransferHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as HeatTransferHandles;
        if (!h.fluxArrows || h.fluxArrows.length === 0) return;

        // 热流箭头动态脉动波
        for (let i = 0; i < h.fluxArrows.length; i++) {
            const arr = h.fluxArrows[i];
            if (!arr) continue;
            const wave = 1.0 + Math.sin(ctx.time * 6.0 - i * 1.2) * 0.15;
            arr.scale.set(wave, 1, 1);
        }
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.1 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.1, 0);
    }
};

function updateHeatTransfer(h: HeatTransferHandles, params: Record<string, number>): void {
    const mode = Math.round(num(params['mode'], 0)); // 0=传导, 1=对流, 2=辐射
    const matIndex = Math.round(num(params['medium'], 0)); // 0=铜, 1=玻璃, 2=钢, 3=聚苯乙烯
    const Th = num(params['ambientTemp'], 350); // K
    const Tc = num(params['initialTemp'], 300); // K

    // 材料导热系数 k [W/(m*K)]
    const kValues = [401, 1.0, 50, 0.033];
    const matNames = ['紫铜 (k=401)', '玻璃 (k=1.0)', '碳钢 (k=50)', '泡沫塑料 (k=0.033)'];
    const k = kValues[matIndex] ?? 401;
    const matName = matNames[matIndex] ?? '紫铜';

    if (mode === 0) {
        // 热传导
        h.conductionBar.visible = true;
        h.convectionBox.visible = false;
        // 导热材料外观
        const barMat = h.conductionBar.material as THREE.MeshStandardMaterial;
        if (matIndex === 0)
            barMat.color.setHex(0xb45309); // 铜
        else if (matIndex === 1)
            barMat.color.setHex(0x93c5fd); // 玻璃
        else if (matIndex === 2)
            barMat.color.setHex(0x64748b); // 钢
        else barMat.color.setHex(0xf8fafc); // 塑料
    } else if (mode === 1) {
        // 热对流
        h.conductionBar.visible = false;
        h.convectionBox.visible = true;
    } else {
        // 热辐射
        h.conductionBar.visible = false;
        h.convectionBox.visible = true;
    }

    const modeName =
        mode === 0 ? `热传导 [材料: ${matName}]` : mode === 1 ? '热对流 (流体循环)' : '热辐射 (电磁波辐射)';
    const formulaInfo =
        mode === 0
            ? `傅里叶定律: dQ/dt = -kA·(dT/dx) (k=${k}W/m·K) | 稳态温差 ΔT=${(Th - Tc).toFixed(0)}K`
            : mode === 1
              ? '牛顿冷却定律: dQ/dt = hA·(T - T_env)'
              : '斯忒藩-玻尔兹曼定律: E = ε·σ·T⁴';

    setLabel(
        h.label,
        `方式: ${modeName} | 热源 T_h=${Th.toFixed(0)}K  冷端 T_c=${Tc.toFixed(0)}K | ${formulaInfo}`,
        '#0f172a'
    );
}
