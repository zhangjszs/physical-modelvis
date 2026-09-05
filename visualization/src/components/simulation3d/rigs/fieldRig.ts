/**
 * 空间电磁场与霍尔效应 3D 实验 Rig
 * 覆盖：
 * 1. efield-lines: 静电场线与电力线空间分布
 * 2. current-magnetic: 通电导线周围环形磁场 (安培定则)
 * 3. hall-effect: 霍尔效应（半导体霍尔片置于磁场中，载流子受洛伦兹力偏转产生横向霍尔电压 U_H）
 * 包含：透明三维空间场腔、正交电场/磁场矢量阵列、霍尔半导体薄片与差分测压探头。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface FieldHandles {
    rootGroup: THREE.Group;
    chamber: THREE.Mesh;
    hallSlab: THREE.Mesh;
    fieldArrows: THREE.ArrowHelper[];
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    Ey: number;
    Bz: number;
    hallVoltage: number;
}

export const fieldRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 三维空间实验底座 (长 3.2m, 宽 1.8m)
        const base = makeBox(3.2, 0.08, 1.8, 0x1e293b, 0.4, 0.4);
        base.position.set(0, 0.04, 0);
        base.receiveShadow = true;
        group.add(base);

        // 2. 空间场区半透明立方体
        const chamberGeo = new THREE.BoxGeometry(2.6, 1.8, 1.4);
        const chamberMat = new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.12,
            transmission: 0.85,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
        const chamber = new THREE.Mesh(chamberGeo, chamberMat);
        chamber.position.set(0, 1.05, 0);
        group.add(chamber);

        // 立方体金属边框线
        const wireframeGeo = new THREE.BoxGeometry(2.6, 1.8, 1.4);
        const wireMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true });
        const boxFrame = new THREE.Mesh(wireframeGeo, wireMat);
        boxFrame.position.set(0, 1.05, 0);
        group.add(boxFrame);

        // 3. 霍尔半导体薄片探头 (位于中心 (0, 1.05, 0))
        const hallSlab = makeBox(0.4, 0.22, 0.05, 0xd97706, 0.3, 0.7);
        hallSlab.position.set(0, 1.05, 0);
        hallSlab.castShadow = true;
        group.add(hallSlab);

        // 霍尔上下电极测压导线
        const wireTop = makeCylinder(0.008, 0.2, 0xef4444, 0.3, 0.3);
        wireTop.position.set(0, 1.25, 0);
        group.add(wireTop);

        const wireBottom = makeCylinder(0.008, 0.2, 0x3b82f6, 0.3, 0.3);
        wireBottom.position.set(0, 0.85, 0);
        group.add(wireBottom);

        // 4. 三维空间矢量箭头阵列 (3x3 网格)
        const fieldArrows: THREE.ArrowHelper[] = [];
        for (let ix = -1; ix <= 1; ix++) {
            for (let iz = -1; iz <= 1; iz++) {
                const arr = makeArrow(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(ix * 0.8, 0.65, iz * 0.45),
                    0.65,
                    0x3b82f6,
                    0.12,
                    0.06
                );
                group.add(arr);
                fieldArrows.push(arr);
            }
        }

        // 5. 原理与数据 HUD
        const statusLabel = makeTextSprite('空间电磁场与霍尔效应', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.2, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('霍尔电压 U_H = k_H · (I·B / d)', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 1.95, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: FieldHandles = {
            rootGroup: group,
            chamber,
            hallSlab,
            fieldArrows,
            statusLabel,
            measureLabel,
            Ey: 100,
            Bz: 0.5,
            hallVoltage: 2.5
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as FieldHandles;
        const Ey = num(params['Ey'] ?? params['E'], NaN);
        const Bz = num(params['Bz'] ?? params['B'], NaN);

        h.Ey = isNaN(Ey) ? 0 : Ey;
        h.Bz = isNaN(Bz) ? 0 : Bz;

        // 判断主要展示场类型：电场还是磁场
        const isEField = !isNaN(Ey) && Math.abs(Ey) > 1e-4;
        const isBField = !isNaN(Bz) && Math.abs(Bz) > 1e-4;

        if (isEField) {
            // 匀强电场：箭头沿 Y 轴竖直
            const dirY = Ey >= 0 ? 1 : -1;
            const arrowLen = THREE.MathUtils.clamp((Math.abs(Ey) / 200) * 0.8, 0.2, 0.9);
            h.fieldArrows.forEach(arr => {
                arr.setDirection(new THREE.Vector3(0, dirY, 0));
                arr.setLength(arrowLen, 0.12, 0.06);
                arr.setColor(0x3b82f6); // 蓝色电场
            });
        } else if (isBField) {
            // 匀强磁场：箭头沿 Z 轴或 X 轴
            const dirZ = Bz >= 0 ? 1 : -1;
            const arrowLen = THREE.MathUtils.clamp((Math.abs(Bz) / 2) * 0.8, 0.2, 0.9);
            h.fieldArrows.forEach(arr => {
                arr.setDirection(new THREE.Vector3(0, 0, dirZ));
                arr.setLength(arrowLen, 0.12, 0.06);
                arr.setColor(0xf59e0b); // 黄色磁场
            });
        }

        // 霍尔电压计算：U_H ∝ I * B
        const I = num(params['current'] ?? params['I'], 1.0);
        const B = isBField ? Math.abs(Bz) : 0.5;
        const UH = (I * B * 2.5).toFixed(2);

        if (h.statusLabel) {
            const desc = isEField
                ? `匀强电场：场强 Ey=${Ey.toFixed(1)}V/m (电场力 F_e = qE)`
                : isBField
                  ? `匀强磁场：磁感应强度 Bz=${Bz.toFixed(2)}T (洛伦兹力 F_B = qvB)`
                  : `霍尔效应：载流子偏转产生横向霍尔电势差`;
            updateTextSprite(h.statusLabel, desc, '#0f172a', 22);
        }

        if (h.measureLabel) {
            updateTextSprite(h.measureLabel, `霍尔传感器输出电压 U_H = ${UH} mV (载流子洛伦兹力平衡)`, '#2563eb', 19);
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as FieldHandles;
        if (!h.fieldArrows) return;

        const { time } = ctx;
        // 场线能量律动
        const sway = 1.0 + Math.sin(time * 3) * 0.04;
        h.fieldArrows.forEach(arr => {
            const mat = arr.line.material as THREE.LineBasicMaterial;
            if (mat) mat.opacity = 0.85 * sway;
        });
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.05 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.05, 0);
    }
};
