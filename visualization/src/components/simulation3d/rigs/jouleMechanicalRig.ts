/**
 * 焦耳热功当量 (机械法) 实验 rig — 双层绝热铜量热器 + 搅拌叶轮与固定阻流板 + 双对称滑轮下落重物
 * 验证重力做功转化为水与量热器的内能 W = n·m·g·h = Q = c·M·ΔT，测定机械能与热量当量的转换比 J ≈ 4.184 J/cal
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface JouleMechHandles {
    spindleGroup: THREE.Group;
    weightLeft: THREE.Mesh;
    weightRight: THREE.Mesh;
    ropeLeft: THREE.Line;
    ropeRight: THREE.Line;
    waterMesh: THREE.Mesh;
    label: THREE.Sprite;
}

export const jouleMechanicalRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 0.55;

        // ==================== 1. 双层绝热量热铜筒 ====================
        // 木质隔热外罩底座
        const woodBase = makeCylinder(0.72, 0.12, 0x78350f, 0.7, 0.1);
        woodBase.position.set(0, 0.06, 0);
        group.add(woodBase);

        // 紫铜量热器外壁
        const copperOuter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.95, 36, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide })
        );
        copperOuter.position.set(0, cy, 0);
        group.add(copperOuter);

        // 量热器内水体
        const waterMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.75, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.65,
                roughness: 0.1,
                transmission: 0.8
            })
        );
        waterMesh.position.set(0, cy - 0.05, 0);
        group.add(waterMesh);

        // 顶盖与温度计
        const lid = makeCylinder(0.58, 0.04, 0x92400e, 0.4, 0.7);
        lid.position.set(0, cy + 0.48, 0);
        group.add(lid);

        const thermometer = makeCylinder(0.015, 0.9, 0xdc2626, 0.2, 0.8);
        thermometer.position.set(0.28, cy + 0.5, 0);
        group.add(thermometer);

        // ==================== 2. 中央旋转转轴与搅拌桨叶 ====================
        const spindleGroup = new THREE.Group();
        // 黄铜主轴
        const shaft = makeCylinder(0.035, 1.35, 0xd97706, 0.2, 0.9);
        shaft.position.set(0, cy + 0.4, 0);
        spindleGroup.add(shaft);

        // 搅拌叶片 (4 组十字交叉铜桨叶)
        for (let i = 0; i < 4; i++) {
            const paddle = makeBox(0.42, 0.06, 0.02, 0xd97706, 0.3, 0.85);
            paddle.rotation.y = (i * Math.PI) / 4;
            paddle.position.set(0, cy - 0.15 + i * 0.12, 0);
            spindleGroup.add(paddle);
        }

        // 轴顶绕线轮
        const spool = makeCylinder(0.09, 0.18, 0x475569, 0.3, 0.7);
        spool.position.set(0, cy + 0.95, 0);
        spindleGroup.add(spool);
        group.add(spindleGroup);

        // ==================== 3. 左右双滑轮与立柱支架 ====================
        const pulleyDist = 1.85;
        const pulleyY = cy + 0.95;

        for (const side of [-1, 1]) {
            // 立柱
            const column = makeCylinder(0.025, 1.8, 0x475569, 0.4, 0.6);
            column.position.set(side * pulleyDist, 0.9, 0);
            group.add(column);
            const colBase = makeCylinder(0.22, 0.06, 0x1e293b, 0.5, 0.2);
            colBase.position.set(side * pulleyDist, 0.03, 0);
            group.add(colBase);

            // 滑轮
            const pulley = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24),
                new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.85 })
            );
            pulley.rotation.x = Math.PI / 2;
            pulley.position.set(side * pulleyDist, pulleyY, 0);
            group.add(pulley);
        }

        // ==================== 4. 左右对称重物与悬挂绳索 ====================
        const weightMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
        const weightLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.35, 24), weightMat);
        weightLeft.position.set(-pulleyDist, 1.1, 0);
        group.add(weightLeft);

        const weightRight = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.35, 24), weightMat);
        weightRight.position.set(pulleyDist, 1.1, 0);
        group.add(weightRight);

        // 左右绳索
        const lineMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
        const ropeLeft = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, pulleyY, 0),
                new THREE.Vector3(-pulleyDist, pulleyY, 0),
                new THREE.Vector3(-pulleyDist, 1.1, 0)
            ]),
            lineMat
        );
        group.add(ropeLeft);

        const ropeRight = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, pulleyY, 0),
                new THREE.Vector3(pulleyDist, pulleyY, 0),
                new THREE.Vector3(pulleyDist, 1.1, 0)
            ]),
            lineMat
        );
        group.add(ropeRight);

        // 状态 HUD
        const label = makeTextSprite('焦耳热功当量 (机械法)', '#0f172a', 26, { x: 2.4, y: 0.36 });
        label.position.set(0, cy + 1.85, 0);
        group.add(label);

        const handles: JouleMechHandles = {
            spindleGroup,
            weightLeft,
            weightRight,
            ropeLeft,
            ropeRight,
            waterMesh,
            label
        };
        updateJM(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateJM(handles as unknown as JouleMechHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as JouleMechHandles;
        if (!h.spindleGroup || !h.weightLeft) return;

        // 重锤下落驱动叶片旋转循环 (周期 4s)
        const cycle = (ctx.time % 4.0) / 4.0;
        const pulleyDist = 1.85;
        const pulleyY = 0.55 + 0.95;

        // 叶轮旋转
        h.spindleGroup.rotation.y = ctx.time * 6.5;

        // 重锤下落高度 h(t)
        const hMax = 1.0;
        const dropProg = Math.sin(cycle * Math.PI); // 上下往复
        const weightY = 1.35 - dropProg * hMax;

        h.weightLeft.position.y = weightY;
        h.weightRight.position.y = weightY;

        // 更新绳索折线
        h.ropeLeft.geometry.setFromPoints([
            new THREE.Vector3(0, pulleyY, 0),
            new THREE.Vector3(-pulleyDist, pulleyY, 0),
            new THREE.Vector3(-pulleyDist, weightY + 0.18, 0)
        ]);
        h.ropeRight.geometry.setFromPoints([
            new THREE.Vector3(0, pulleyY, 0),
            new THREE.Vector3(pulleyDist, pulleyY, 0),
            new THREE.Vector3(pulleyDist, weightY + 0.18, 0)
        ]);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.55 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 0.9, 0);
    }
};

function updateJM(h: JouleMechHandles, params: Record<string, number>): void {
    const m = num(params['mass'], 5); // kg
    const hgt = num(params['height'], 1.5); // m
    const n = num(params['drops'], 100); // 次数
    const M_water = num(params['waterMass'], 0.5); // kg
    const c_water = num(params['specificHeat'], 4184); // J/(kg*K)

    // 总机械功 W = 2 * n * m * g * h (左右两重物)
    const W_total = 2 * n * m * 9.8 * hgt;
    // 理论水温升高 ΔT = W / (c * M)
    const deltaT = W_total / (c_water * M_water);

    setLabel(
        h.label,
        `重锤 2×${m.toFixed(1)}kg  下落 ${n}次 (h=${hgt.toFixed(1)}m) | 功 W = ${W_total.toFixed(0)}J | ΔT = ${deltaT.toFixed(2)}°C | 热功当量 J = W/Q ≈ 4.184 J/cal`,
        '#0f172a'
    );
}
