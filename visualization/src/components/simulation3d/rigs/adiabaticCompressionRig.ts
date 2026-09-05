/**
 * 绝热压缩引火仪实验 rig — 加厚有机玻璃气缸 + 双密封圈活塞 + 掌压大手柄 + 底部硝化棉闪燃火花
 * 演示热力学第一定律绝热过程: Q = 0 时, 外界对气体做功全部转化为气体内能 ΔU = W > 0, 气体温度急剧升高点燃硝化棉
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface AdiabaticHandles {
    pistonGroup: THREE.Group;
    gasMesh: THREE.Mesh;
    cotton: THREE.Mesh;
    fireFlash: THREE.Mesh;
    label: THREE.Sprite;
}

export const adiabaticCompressionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cylinderH = 2.2;
        const cylinderR = 0.44;

        // ==================== 1. 加厚耐压透明有机玻璃气缸 ====================
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(cylinderR, cylinderR, cylinderH, 36, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.32,
                roughness: 0.08,
                transmission: 0.88,
                ior: 1.49,
                side: THREE.DoubleSide
            })
        );
        wall.position.set(0, cylinderH / 2 + 0.1, 0);
        group.add(wall);

        // 重型加固金属底座与底部点火凹槽
        const base = makeCylinder(0.75, 0.14, 0x1e293b, 0.4, 0.3);
        base.position.set(0, 0.07, 0);
        group.add(base);

        const combustionCup = makeCylinder(0.24, 0.06, 0x334155, 0.3, 0.5);
        combustionCup.position.set(0, 0.14, 0);
        group.add(combustionCup);

        // 底部干燥硝化棉团 (白黄色小纤维球)
        const cotton = makeSphere(0.08, 0xfef08a, { roughness: 0.9, metalness: 0.05 });
        cotton.position.set(0, 0.18, 0);
        group.add(cotton);

        // 闪燃爆鸣火光 (压缩到极限时爆发)
        const fireFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 24, 20),
            new THREE.MeshStandardMaterial({
                color: 0xfbbf24,
                emissive: 0xef4444,
                emissiveIntensity: 2.0,
                transparent: true,
                opacity: 0.0
            })
        );
        fireFlash.position.set(0, 0.25, 0);
        group.add(fireFlash);

        // ==================== 2. 气缸内封闭空气体 (随温度快速变色) ====================
        const gasMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(cylinderR * 0.96, cylinderR * 0.96, 1.0, 32),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.35,
                roughness: 0.4
            })
        );
        group.add(gasMesh);

        // ==================== 3. 强力推进密封活塞与掌压把手 ====================
        const pistonGroup = new THREE.Group();

        // 活塞头金属块
        const pHead = makeCylinder(cylinderR * 0.96, 0.12, 0x334155, 0.3, 0.8);
        pistonGroup.add(pHead);

        // 双层红色耐磨氟橡胶密封圈
        const oRing1 = makeCylinder(cylinderR * 0.98, 0.02, 0xdc2626, 0.2, 0.8);
        oRing1.position.set(0, 0.03, 0);
        pistonGroup.add(oRing1);
        const oRing2 = makeCylinder(cylinderR * 0.98, 0.02, 0xdc2626, 0.2, 0.8);
        oRing2.position.set(0, -0.03, 0);
        pistonGroup.add(oRing2);

        // 粗实不锈钢活塞杆
        const rod = makeCylinder(0.048, 1.15, 0xd4d4d8, 0.2, 0.9);
        rod.position.set(0, 0.65, 0);
        pistonGroup.add(rod);

        // 掌压扁圆实木把手
        const palmKnob = makeSphere(0.22, 0x78350f, { roughness: 0.5, metalness: 0.1 });
        palmKnob.scale.set(1.4, 0.7, 1.4);
        palmKnob.position.set(0, 1.25, 0);
        pistonGroup.add(palmKnob);
        group.add(pistonGroup);

        // 状态 HUD
        const label = makeTextSprite('绝热压缩引火仪 (Q = 0, ΔU = W > 0)', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0, cylinderH + 0.95, 0);
        group.add(label);

        const handles: AdiabaticHandles = {
            pistonGroup,
            gasMesh,
            cotton,
            fireFlash,
            label
        };
        updateAdiabatic(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateAdiabatic(handles as unknown as AdiabaticHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as AdiabaticHandles;
        if (!h.pistonGroup || !h.gasMesh) return;

        // 快速下压循环 (周期 3.0s: 2.2s 缓慢复位, 0.3s 极速下压压缩, 0.5s 闪燃停留)
        const cycle = (ctx.time % 3.0) / 3.0;
        const ratio = Math.max(3, num(ctx.params['compressionRatio'], 9));
        const hMax = 1.95;
        const hMin = hMax / ratio;

        let curH = hMax;
        let isFlashing = false;

        if (cycle < 0.6) {
            // 复位等待在顶端
            curH = hMax;
        } else if (cycle < 0.75) {
            // 迅猛下压
            const pressProg = (cycle - 0.6) / 0.15;
            curH = hMax - pressProg * (hMax - hMin);
        } else if (cycle < 0.88) {
            // 压到最低点，棉花闪燃火花爆发！
            curH = hMin;
            isFlashing = true;
        } else {
            // 缓慢回升
            const releaseProg = (cycle - 0.88) / 0.12;
            curH = hMin + releaseProg * (hMax - hMin);
        }

        // 更新气体与活塞
        h.gasMesh.scale.y = curH / 1.0;
        h.gasMesh.position.y = 0.12 + curH / 2;
        h.pistonGroup.position.y = 0.12 + curH + 0.06;

        // 气体受压升温色调变化 (压缩越剧烈越深红)
        const tempRatio = Math.min(1.0, (hMax - curH) / (hMax - hMin));
        const c = new THREE.Color();
        c.setHSL(0.55 * (1.0 - tempRatio), 0.85, 0.5);
        (h.gasMesh.material as THREE.MeshStandardMaterial).color.copy(c);

        // 火花闪燃效果
        const fireMat = h.fireFlash.material as THREE.MeshStandardMaterial;
        if (isFlashing) {
            fireMat.opacity = 0.85;
            const flicker = 1.0 + Math.sin(ctx.time * 40.0) * 0.2;
            h.fireFlash.scale.set(flicker, flicker, flicker);
            (h.cotton.material as THREE.MeshStandardMaterial).color.setHex(0x1e293b); // 烧焦
        } else {
            fireMat.opacity = 0.0;
            if (cycle < 0.5) {
                (h.cotton.material as THREE.MeshStandardMaterial).color.setHex(0xfef08a); // 恢复白棉
            }
        }
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.2 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.2, 0);
    }
};

function updateAdiabatic(h: AdiabaticHandles, params: Record<string, number>): void {
    const T0 = num(params['initialTemp'], 300); // K
    const ratio = Math.max(3, num(params['compressionRatio'], 9)); // V1/V2
    // 绝热状态方程 T2 = T1 * r^(gamma - 1), 理想双原子气体 gamma = 1.4 -> 0.4
    const T2 = T0 * Math.pow(ratio, 0.4);
    const T2_C = T2 - 273.15;

    const isIgnited = T2 >= 480; // 乙醚棉/硝化棉着火点约 180°C ~ 210°C (450~480K)

    setLabel(
        h.label,
        `初温 T₁=${T0.toFixed(0)}K  压缩比 r=${ratio.toFixed(1)} | 绝热压缩终温 T₂=${T2.toFixed(0)}K (${T2_C.toFixed(0)}°C) | ${isIgnited ? '已超燃点 (闪燃点火!)' : '未达燃点'} | Q=0, ΔU=W`,
        '#0f172a'
    );
}
