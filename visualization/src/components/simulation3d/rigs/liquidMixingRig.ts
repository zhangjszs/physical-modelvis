/**
 * 液体混合实验 rig — 细颈刻度长试管 (水 + 酒精混合体积缩小) + 磨砂玻璃塞 + 分子间隙验证
 * 演示 50mL 水与 50mL 酒精混合后总体积小于 100mL (ΔV < 0)，直接证实分子间存在间隙
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface LiquidMixingHandles {
    tubeGroup: THREE.Group;
    waterLayer: THREE.Mesh;
    alcoholLayer: THREE.Mesh;
    mixedLiquid: THREE.Mesh;
    mark100Line: THREE.Mesh;
    label: THREE.Sprite;
}

export const liquidMixingRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.25;

        // 实验台底座
        const base = makeBox(1.2, 0.1, 0.8, 0x1e293b, 0.5, 0.2);
        base.position.set(0, 0.05, 0);
        group.add(base);

        // ==================== 1. 混合玻璃管组 (支持旋转倒置混合) ====================
        const tubeGroup = new THREE.Group();
        tubeGroup.position.set(0, cy, 0);

        const tubeR = 0.26;
        const tubeH = 2.2;

        // 加厚透明刻度玻璃管
        const glassWall = new THREE.Mesh(
            new THREE.CylinderGeometry(tubeR, tubeR, tubeH, 32, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.28,
                roughness: 0.06,
                transmission: 0.9,
                ior: 1.48,
                side: THREE.DoubleSide
            })
        );
        tubeGroup.add(glassWall);

        // 玻璃管底与磨砂玻璃塞
        const tubeBottom = makeCylinder(tubeR, 0.04, 0x334155, 0.3, 0.4);
        tubeBottom.position.set(0, -tubeH / 2, 0);
        tubeGroup.add(tubeBottom);

        const stopper = makeCylinder(tubeR * 0.95, 0.16, 0xd4d4d8, 0.4, 0.3);
        stopper.position.set(0, tubeH / 2 + 0.08, 0);
        tubeGroup.add(stopper);

        // 刻度线 (50 mL 与 100 mL 基准刻度线)
        const tick50 = makeCylinder(tubeR + 0.005, 0.006, 0x475569, 0.2, 0.2);
        tick50.position.set(0, -0.15, 0);
        tubeGroup.add(tick50);

        // 100 mL 红色初始液面基准警戒线
        const mark100Line = makeCylinder(tubeR + 0.008, 0.012, 0xdc2626, 0.2, 0.8);
        mark100Line.position.set(0, 0.72, 0);
        tubeGroup.add(mark100Line);

        // ==================== 2. 液体分层与混合后液体 ====================
        // 下层水 (蓝, 50 mL)
        const waterLayer = new THREE.Mesh(
            new THREE.CylinderGeometry(tubeR * 0.95, tubeR * 0.95, 0.85, 28),
            new THREE.MeshStandardMaterial({
                color: 0x2563eb,
                transparent: true,
                opacity: 0.85,
                roughness: 0.1
            })
        );
        waterLayer.position.set(0, -0.58, 0);
        tubeGroup.add(waterLayer);

        // 上层无水乙醇 (浅琥珀/淡黄色, 50 mL)
        const alcoholLayer = new THREE.Mesh(
            new THREE.CylinderGeometry(tubeR * 0.95, tubeR * 0.95, 0.85, 28),
            new THREE.MeshStandardMaterial({
                color: 0xfef08a,
                transparent: true,
                opacity: 0.75,
                roughness: 0.1
            })
        );
        alcoholLayer.position.set(0, 0.28, 0);
        tubeGroup.add(alcoholLayer);

        // 充分混合后的均匀淡蓝绿混合液 (初始隐藏，混合后显现并体现体积缩小)
        const mixedLiquid = new THREE.Mesh(
            new THREE.CylinderGeometry(tubeR * 0.95, tubeR * 0.95, 1.62, 28),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.0,
                roughness: 0.1
            })
        );
        mixedLiquid.position.set(0, -0.2, 0);
        tubeGroup.add(mixedLiquid);

        group.add(tubeGroup);

        // 状态 HUD
        const label = makeTextSprite('水和酒精混合实验 (分子间隙)', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0, cy + tubeH / 2 + 0.45, 0);
        group.add(label);

        const handles: LiquidMixingHandles = {
            tubeGroup,
            waterLayer,
            alcoholLayer,
            mixedLiquid,
            mark100Line,
            label
        };
        updateLiquidMixing(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateLiquidMixing(handles as unknown as LiquidMixingHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as LiquidMixingHandles;
        if (!h.tubeGroup || !h.mixedLiquid) return;

        // 演示动画: 前半段管子缓慢上下翻转混合，后半段混合液面明显下降
        const cycle = (ctx.time % 6.0) / 6.0;

        if (cycle < 0.5) {
            // 翻转混合
            const tiltProg = cycle / 0.5;
            h.tubeGroup.rotation.z = Math.sin(tiltProg * Math.PI * 2) * 0.85;
            (h.waterLayer.material as THREE.MeshStandardMaterial).opacity = 0.85 * (1 - tiltProg);
            (h.alcoholLayer.material as THREE.MeshStandardMaterial).opacity = 0.75 * (1 - tiltProg);
            (h.mixedLiquid.material as THREE.MeshStandardMaterial).opacity = 0.82 * tiltProg;
        } else {
            // 静置展示：液面显著低于 100mL 红色标线
            h.tubeGroup.rotation.z = 0;
            (h.waterLayer.material as THREE.MeshStandardMaterial).opacity = 0.0;
            (h.alcoholLayer.material as THREE.MeshStandardMaterial).opacity = 0.0;
            (h.mixedLiquid.material as THREE.MeshStandardMaterial).opacity = 0.82;

            // 体积收缩使得混合液顶面下沉约 0.12 (相当于 3.5%)
            h.mixedLiquid.scale.y = 0.94;
            h.mixedLiquid.position.y = -0.25;
        }
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.25 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.25, 0);
    }
};

function updateLiquidMixing(h: LiquidMixingHandles, params: Record<string, number>): void {
    const V_water = num(params['volumeWater'], 50); // mL
    const V_alcohol = num(params['volumeAlcohol'], 50); // mL

    const V_sum = V_water + V_alcohol;
    // 典型收缩率约 3.5%
    const contraction = 0.035 * Math.min(V_water, V_alcohol) * 2;
    const V_final = V_sum - contraction;

    setLabel(
        h.label,
        `水 V₁=${V_water.toFixed(0)}mL + 酒精 V₂=${V_alcohol.toFixed(0)}mL | 算术和=${V_sum.toFixed(0)}mL → 混合实际体积 V=${V_final.toFixed(1)}mL (ΔV=-${contraction.toFixed(1)}mL)`,
        '#0f172a'
    );
}
