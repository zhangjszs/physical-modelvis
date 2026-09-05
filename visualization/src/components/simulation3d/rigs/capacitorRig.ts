/**
 * 平行板电容器 3D 实验 Rig
 * 覆盖：
 * 1. parallel-plate-capacitor: 极板间距 d、正对面积 S、插入介质板 ε_r 对电容 C 的影响
 * 2. capacitor-charge: 电容器充放电过程与两极板动态电场线
 * 包含：双轨毫米刻度滑床、固定正极板、手摇可动负极板、可插入有机玻璃介质板、
 * 静电计指针偏转示数、动态电场线组与电容公式 C = εS/(4πkd) 实时 HUD。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CapacitorHandles {
    rootGroup: THREE.Group;
    plateFixed: THREE.Mesh;
    plateMoving: THREE.Group; // 可沿滑轨沿 X 轴平移的活动负极板总成
    dielectricSlab: THREE.Mesh; // 插入极板间的有机玻璃介质板
    meterNeedle: THREE.Mesh; // 静电计偏转指针
    fieldArrows: THREE.ArrowHelper[];
    statusLabel: THREE.Sprite;
    formulaLabel: THREE.Sprite;
    distanceMm: number;
    areaCm2: number;
    dielectricConstant: number;
    voltage: number;
}

export const capacitorRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 绝缘基座与双不锈钢导轨滑床 (长 3.2m, 宽 0.8m)
        const base = makeBox(3.2, 0.08, 0.8, 0x1e293b, 0.5, 0.3);
        base.position.set(0, 0.04, 0);
        base.receiveShadow = true;
        group.add(base);

        // 双导轨
        [-0.25, 0.25].forEach(rz => {
            const rail = makeCylinder(0.018, 3.0, 0xd1d5db, 0.2, 0.85);
            rail.rotation.z = Math.PI / 2;
            rail.position.set(0, 0.1, rz);
            group.add(rail);
        });

        // 毫米距离标尺带
        const ruler = makeBox(2.8, 0.02, 0.002, 0xf8fafc, 0.8, 0.1);
        ruler.position.set(0, 0.05, 0.401);
        group.add(ruler);

        // 2. 固定正极板总成 (位于 x = -0.6)
        const fixedCarrier = makeBox(0.25, 0.08, 0.6, 0x334155, 0.4, 0.5);
        fixedCarrier.position.set(-0.6, 0.12, 0);
        group.add(fixedCarrier);

        const fixedInsulator = makeCylinder(0.04, 0.35, 0xf8fafc, 0.1, 0.1);
        fixedInsulator.position.set(-0.6, 0.32, 0);
        group.add(fixedInsulator);

        // 阳极氧化红铜极板 (正极板，长 0.03m, 高 1.2m, 宽 0.9m)
        const plateFixed = makeBox(0.025, 1.2, 0.9, 0xdc2626, 0.3, 0.6);
        plateFixed.position.set(-0.6, 1.05, 0);
        plateFixed.castShadow = true;
        group.add(plateFixed);

        // 正极红接线柱
        const termPos = makeCylinder(0.025, 0.08, 0xef4444, 0.3, 0.8);
        termPos.rotation.z = Math.PI / 2;
        termPos.position.set(-0.64, 1.55, 0);
        group.add(termPos);

        // 3. 沿导轨滑动的活动负极板总成 (初始 x = 0.6)
        const plateMoving = new THREE.Group();
        plateMoving.position.set(0.6, 0, 0);

        const movingCarrier = makeBox(0.25, 0.08, 0.6, 0x334155, 0.4, 0.5);
        movingCarrier.position.set(0, 0.12, 0);
        plateMoving.add(movingCarrier);

        const movingInsulator = makeCylinder(0.04, 0.35, 0xf8fafc, 0.1, 0.1);
        movingInsulator.position.set(0, 0.32, 0);
        plateMoving.add(movingInsulator);

        // 阴极氧化铝合金极板 (负极板)
        const plateNeg = makeBox(0.025, 1.2, 0.9, 0x2563eb, 0.3, 0.6);
        plateNeg.position.set(0, 1.05, 0);
        plateNeg.castShadow = true;
        plateMoving.add(plateNeg);

        // 负极黑接线柱
        const termNeg = makeCylinder(0.025, 0.08, 0x0f172a, 0.3, 0.8);
        termNeg.rotation.z = Math.PI / 2;
        termNeg.position.set(0.04, 1.55, 0);
        plateMoving.add(termNeg);

        // 绝缘微调推拉手柄
        const handleGrip = makeCylinder(0.025, 0.25, 0x0f172a, 0.5, 0.2);
        handleGrip.rotation.z = Math.PI / 2;
        handleGrip.position.set(0.18, 1.05, 0);
        plateMoving.add(handleGrip);

        group.add(plateMoving);

        // 4. 有机玻璃介质板 (可插入板间，展示相对介电常数 ε_r)
        const slabGeo = new THREE.BoxGeometry(0.12, 1.15, 0.85);
        const slabMat = new THREE.MeshPhysicalMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0.05,
            transmission: 0.8
        });
        const dielectricSlab = new THREE.Mesh(slabGeo, slabMat);
        dielectricSlab.position.set(0, 1.05, 0);
        group.add(dielectricSlab);

        // 5. 高灵敏静电计 (显示极板间电压 U)
        const meterStand = makeCylinder(0.03, 0.5, 0x334155, 0.4, 0.5);
        meterStand.position.set(-1.25, 0.28, 0);
        group.add(meterStand);

        const meterDial = makeCylinder(0.24, 0.06, 0xf8fafc, 0.8, 0.1);
        meterDial.rotation.x = Math.PI / 2;
        meterDial.position.set(-1.25, 0.72, 0);
        group.add(meterDial);

        // 静电计偏转指针 (绕刻度中心旋转)
        const meterNeedle = makeBox(0.008, 0.36, 0.01, 0xef4444, 0.3, 0.2);
        meterNeedle.position.set(-1.25, 0.72, 0.035);
        group.add(meterNeedle);

        // 6. 极板间匀强电场线箭头组
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let row = -1; row <= 1; row++) {
            for (let col = -1; col <= 1; col++) {
                const arrow = new THREE.ArrowHelper(
                    new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(-0.6, 1.05 + row * 0.35, col * 0.25),
                    0.8,
                    0x3b82f6,
                    0.12,
                    0.06
                );
                group.add(arrow);
                fieldArrows.push(arrow);
            }
        }

        // 7. 原理与数据 HUD
        const statusLabel = makeTextSprite('平行板电容器特性', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 1.95, 0);
        group.add(statusLabel);

        const formulaLabel = makeTextSprite('电容决定式：C = εS / (4πkd)', '#2563eb', 20, { x: 1.8, y: 0.24 });
        formulaLabel.position.set(0, 1.75, 0);
        group.add(formulaLabel);

        scene.add(group);

        const handles: CapacitorHandles = {
            rootGroup: group,
            plateFixed,
            plateMoving,
            dielectricSlab,
            meterNeedle,
            fieldArrows,
            statusLabel,
            formulaLabel,
            distanceMm: 10,
            areaCm2: 100,
            dielectricConstant: 1,
            voltage: 100
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CapacitorHandles;
        // 支持两种场景参数格式：
        // parallel-plate-capacitor: distance (mm), area (cm²), dielectric / eps
        // capacitor-charge: emf (V), capacitance (μF)
        const distMm = num(params['distance'] ?? params['d'] ?? 10, 10);
        const areaCm2 = num(params['area'] ?? params['S'] ?? 100, 100);
        const eps = num(params['dielectric'] ?? params['eps'] ?? params['dielectricConstant'] ?? 1, 1);
        const emf = num(params['emf'] ?? params['voltage'] ?? 100, 100);

        h.distanceMm = distMm;
        h.areaCm2 = areaCm2;
        h.dielectricConstant = eps;

        // 电容相对值 C ∝ ε * S / d
        const C_rel = (eps * areaCm2) / Math.max(1, distMm);
        // 若固定电荷 Q (断开电源)，则电压 U ∝ 1/C ∝ d / (εS)
        const U_val = (emf * 10) / Math.max(1, C_rel);
        h.voltage = U_val;

        // 视觉映射极板间距 (0.2m ~ 1.2m)
        const visD = THREE.MathUtils.clamp((distMm / 50) * 1.0, 0.25, 1.2);
        h.plateMoving.position.x = -0.6 + visD;

        // 介质板在 eps > 1 时插入极板之间，否则退移到侧边
        if (eps > 1.2) {
            h.dielectricSlab.visible = true;
            h.dielectricSlab.position.set(-0.6 + visD * 0.5, 1.05, 0);
            h.dielectricSlab.scale.set(visD * 0.7, 1, 1);
        } else {
            h.dielectricSlab.visible = false;
        }

        // 电场线长度与位置更新 (从固定板指向活动板)
        const midX = -0.6;
        h.fieldArrows.forEach(arrow => {
            arrow.position.x = midX;
            arrow.setLength(visD, 0.1, 0.05);
        });

        // 静电计指针偏转角 θ ∝ U
        const needleAngle = THREE.MathUtils.clamp((U_val / 200) * (Math.PI / 3), 0.08, Math.PI / 3);
        h.meterNeedle.rotation.z = -needleAngle;

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `板间距 d=${distMm}mm | 正对面积 S=${areaCm2}cm² | 相对介电常数 ε_r=${eps.toFixed(1)}`,
                '#0f172a',
                22
            );
        }

        if (h.formulaLabel) {
            updateTextSprite(
                h.formulaLabel,
                `电容 C ∝ εS/d ⇛ 静电计测得极板电势差 U ∝ d/(εS) (指针偏角 ${((needleAngle * 180) / Math.PI).toFixed(1)}°)`,
                '#2563eb',
                19
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CapacitorHandles;
        if (!h.fieldArrows) return;

        const { time } = ctx;
        // 电场微抖动与高压微晕
        const pulse = 1.0 + Math.sin(time * 4) * 0.03;
        h.fieldArrows.forEach(arrow => {
            const mat = arrow.line.material as THREE.LineBasicMaterial;
            if (mat) mat.opacity = 0.8 * pulse;
        });
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.05 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.05, 0);
    }
};
