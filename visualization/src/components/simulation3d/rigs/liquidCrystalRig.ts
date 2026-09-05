/**
 * 液晶实验 rig — 双层导电玻璃盒 + 偏振片 + 向列型棒状分子取向阵列 + 外加电压与相变
 * 探究液晶的各向异性、电光效应 (TN 扭曲向列型电场取向) 以及温度升高时的清亮点相变 (向列相 ↔ 各向同性态)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface LcHandles {
    molecules: THREE.Mesh[];
    cellGlow: THREE.Mesh;
    voltageIndicator: THREE.Sprite;
    label: THREE.Sprite;
}

export const liquidCrystalRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.1;

        // ==================== 1. 液晶盒结构 (双层偏振片 + ITO 玻璃基板) ====================
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xbfdbfe,
            transparent: true,
            opacity: 0.32,
            roughness: 0.08,
            transmission: 0.88,
            ior: 1.5,
            side: THREE.DoubleSide
        });

        // 顶层检偏器与上玻璃基板
        const topGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.6), glassMat);
        topGlass.position.set(0, cy + 0.55, 0);
        group.add(topGlass);
        const topPolarizer = makeBox(2.42, 0.015, 1.62, 0x1e293b, 0.6, 0.2);
        topPolarizer.position.set(0, cy + 0.59, 0);
        group.add(topPolarizer);

        // 底层起偏器与下玻璃基板
        const botGlass = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.6), glassMat);
        botGlass.position.set(0, cy - 0.55, 0);
        group.add(botGlass);
        const botPolarizer = makeBox(2.42, 0.015, 1.62, 0x1e293b, 0.6, 0.2);
        botPolarizer.position.set(0, cy - 0.59, 0);
        group.add(botPolarizer);

        // 左右透明封接侧框与金属引线电极
        const electrodeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.85 });
        const elL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.6), electrodeMat);
        elL.position.set(-1.22, cy, 0);
        group.add(elL);
        const elR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 1.6), electrodeMat);
        elR.position.set(1.22, cy, 0);
        group.add(elR);

        // 液晶盒内部背光透射辉光面
        const cellGlow = new THREE.Mesh(
            new THREE.BoxGeometry(2.35, 1.0, 1.55),
            new THREE.MeshStandardMaterial({
                color: 0x22c55e,
                transparent: true,
                opacity: 0.45,
                roughness: 0.3
            })
        );
        cellGlow.position.set(0, cy, 0);
        group.add(cellGlow);

        // ==================== 2. 向列型棒状液晶分子微观阵列 ====================
        const molecules: THREE.Mesh[] = [];
        const rows = 4;
        const cols = 5;
        const layers = 3;

        for (let l = 0; l < layers; l++) {
            const y = cy - 0.3 + l * 0.3;
            for (let r = 0; r < rows; r++) {
                const z = -0.45 + r * 0.3;
                for (let c = 0; c < cols; c++) {
                    const x = -0.8 + c * 0.4;
                    // 棒状胶囊椭圆柱分子
                    const rod = makeCylinder(0.024, 0.22, 0x0284c7, 0.3, 0.4);
                    rod.position.set(x, y, z);
                    group.add(rod);
                    molecules.push(rod);
                }
            }
        }

        // ==================== 3. 驱动电压表头 HUD ====================
        const voltageIndicator = makeTextSprite('驱动电压: 0.0 V', '#0284c7', 26, { x: 1.5, y: 0.3 });
        voltageIndicator.position.set(-1.45, cy + 0.85, 0);
        group.add(voltageIndicator);

        // 状态 HUD
        const label = makeTextSprite('液晶各向异性与电光效应', '#0f172a', 26, { x: 2.4, y: 0.36 });
        label.position.set(0, cy + 1.25, 0);
        group.add(label);

        const handles: LcHandles = {
            molecules,
            cellGlow,
            voltageIndicator,
            label
        };
        updateLC(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateLC(handles as unknown as LcHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as LcHandles;
        if (!h.molecules) return;

        const V = num(ctx.params['voltage'], 3.0);
        const temp = num(ctx.params['startTemp'], 20);
        const Tc = 35.0; // 清亮点
        const isIsotropic = temp >= Tc;

        // 电压使棒状分子由水平扭曲转向沿电场垂直立起
        // V=0 -> 水平(rotation.z = Math.PI/2); V > 3V -> 垂直(rotation.z = 0)
        const vRatio = Math.max(0, Math.min(1, V / 5.0));
        const targetRotZ = (1 - vRatio) * (Math.PI / 2);

        for (let i = 0; i < h.molecules.length; i++) {
            const mol = h.molecules[i];
            if (!mol) continue;

            if (isIsotropic) {
                // 各向同性液体：杂乱无章快速热摆动
                mol.rotation.x = Math.sin(ctx.time * 6 + i) * 1.5;
                mol.rotation.y = Math.cos(ctx.time * 5 + i * 2) * 1.5;
                mol.rotation.z = Math.sin(ctx.time * 7 + i * 3) * 1.5;
            } else {
                // 向列相：随电压对齐，叠加微小热抖动
                const jitter = (temp / 300) * 0.12 * Math.sin(ctx.time * 12 + i);
                mol.rotation.x = jitter;
                mol.rotation.y = jitter;
                mol.rotation.z = targetRotZ + jitter;
            }
        }
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.1 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.1, 0);
    }
};

function updateLC(h: LcHandles, params: Record<string, number>): void {
    const V = num(params['voltage'], 3.0);
    const startT = num(params['startTemp'], 20);
    const endT = num(params['endTemp'], 40);
    const Tc = 35.0; // 典型清亮点

    const isIsotropic = startT >= Tc;
    const isTransmissive = V < 1.5 && !isIsotropic;

    // 透光率色彩更新 (透光时高亮绿蓝，暗态时灰黑)
    const glowMat = h.cellGlow.material as THREE.MeshStandardMaterial;
    if (isIsotropic) {
        glowMat.color.setHex(0x94a3b8);
        glowMat.opacity = 0.2; // 各向同性无双折射
    } else if (isTransmissive) {
        glowMat.color.setHex(0x22c55e); // 亮态
        glowMat.opacity = 0.55;
    } else {
        glowMat.color.setHex(0x0f172a); // 遮光暗态
        glowMat.opacity = 0.85;
    }

    setLabel(h.voltageIndicator, `偏置电压 U = ${V.toFixed(1)} V`, '#0284c7');

    const stateName = isIsotropic
        ? `各向同性液态 (T > Tc≈${Tc}°C，失去双折射与光学各向异性)`
        : `向列型液晶相 (T < Tc) | ${V > 2.0 ? '电场取向垂直排列 (透光关断 暗态)' : 'TN 90°自然扭曲导光 (透光开启 亮态)'}`;

    setLabel(h.label, `T=${startT.toFixed(0)}°C~${endT.toFixed(0)}°C  U=${V.toFixed(1)}V | ${stateName}`, '#0f172a');
}
