/**
 * 竖直平面圆周运动 3D 实验 Rig（轻绳 / 轻杆 / 圆环过山车模型）
 * 专用竖直圆环导轨与刚性轻杆/悬绳 + 最高点临界通过条件 + 动态向心力矢量
 */
import * as THREE from 'three';
import { PHYSICS_CONSTANTS } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { findFrameIndex, interpolateFrame } from '../../../utils/frameUtils';
import { num } from './params';

const WORLD_SCALE = 0.16;

export interface VerticalCircleHandles {
    centerHub: THREE.Mesh;
    ringTrack: THREE.Mesh;
    rodMesh: THREE.Mesh;
    stringLine: THREE.Line;
    arrowGravity: THREE.ArrowHelper;
    arrowTension: THREE.ArrowHelper;
    arrowFn: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    critLabel: THREE.Sprite;
    pivotY: number;
    radius: number;
    modelType: number;
}

export const verticalCircleRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.08, // 质点滑块半径

    buildEquipment(scene, params, result) {
        const group = new THREE.Group();
        const r = num(params['length'], 1.0);
        const modelType = Math.round(num(params['modelType'], 0));
        const pivotY = r + 0.4;

        // 1. 重型后置固定支撑立柱与基座
        const basePlate = makeBox(1.6, 0.05, 0.8, 0x1e293b, 0.4, 0.3);
        basePlate.position.set(0, 0.025, -0.2);
        basePlate.receiveShadow = true;
        group.add(basePlate);

        const pillar = makeBox(0.12, pivotY + 0.3, 0.12, 0x334155, 0.4, 0.6);
        pillar.position.set(0, (pivotY + 0.3) / 2, -0.2);
        pillar.castShadow = true;
        group.add(pillar);

        // 中央旋转轴承套筒
        const centerHub = makeCylinder(0.12, 0.28, 0xd97706, 0.3, 0.85);
        centerHub.rotation.x = Math.PI / 2;
        centerHub.position.set(0, pivotY, -0.06);
        group.add(centerHub);

        // 2. 约束模型几何体
        // 2.1 圆环模型：钢质竖直环形导轨 (TorusGeometry)
        const ringGeo = new THREE.TorusGeometry(r, 0.028, 16, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.3,
            metalness: 0.8
        });
        const ringTrack = new THREE.Mesh(ringGeo, ringMat);
        ringTrack.position.set(0, pivotY, 0);
        group.add(ringTrack);

        // 2.2 杆模型：轻质金属连杆
        const rodGeo = new THREE.CylinderGeometry(0.016, 0.016, r, 16);
        const rodMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.4,
            metalness: 0.7
        });
        const rodMesh = new THREE.Mesh(rodGeo, rodMat);
        rodMesh.position.set(0, pivotY - r / 2, 0);
        group.add(rodMesh);

        // 2.3 绳模型：高强度轻绳 (预分配带 2 顶点的 Line)
        const stringLine = makeLine(
            [new THREE.Vector3(0, pivotY, 0), new THREE.Vector3(0, pivotY - r, 0)],
            0x38bdf8,
            0.9
        );
        group.add(stringLine);

        // 3. 动态受力分析矢量
        // 重力 G (向下，红色)
        const arrowGravity = makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            0.5,
            0xef4444,
            0.12,
            0.07
        );
        // 绳拉力 T (蓝色)
        const arrowTension = makeArrow(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0x3b82f6,
            0.14,
            0.08
        );
        // 轨道法向正压力 F_N (绿色)
        const arrowFn = makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.6, 0x10b981, 0.14, 0.08);
        group.add(arrowGravity);
        group.add(arrowTension);
        group.add(arrowFn);

        // 4. 临界条件与最高点状态标牌
        const statusLabel = makeTextSprite('竖直圆周模型', '#0f172a', 24, { x: 1.0, y: 0.22 });
        statusLabel.position.set(0, pivotY + r + 0.5, 0);
        group.add(statusLabel);

        const critLabel = makeTextSprite('最高点临界', '#059669', 20, { x: 0.9, y: 0.2 });
        critLabel.position.set(0, pivotY + r + 0.22, 0);
        group.add(critLabel);

        scene.add(group);

        const handles: VerticalCircleHandles = {
            centerHub,
            ringTrack,
            rodMesh,
            stringLine,
            arrowGravity,
            arrowTension,
            arrowFn,
            statusLabel,
            critLabel,
            pivotY,
            radius: r,
            modelType
        };

        this.updateEquipment(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as VerticalCircleHandles;
        const mv = result?.diagnostics?.maxValues;
        const flags = result?.diagnostics?.flags;
        const r = typeof mv?.['r'] === 'number' && mv['r'] > 0 ? mv['r'] : num(params['length'], 1.0);
        const modelType = Math.round(num(params['modelType'], 0));
        const isRod = modelType === 1;
        const v0 = typeof mv?.['v0'] === 'number' && mv['v0'] >= 0 ? mv['v0'] : num(params['initialSpeed'], 7.5);
        const g = typeof mv?.['g'] === 'number' && mv['g'] > 0 ? mv['g'] : PHYSICS_CONSTANTS.g.value;
        h.radius = r;
        h.modelType = modelType;

        // 根据约束模型类型切换显示部件
        // 0=绳: 显示绳，隐藏导轨与杆
        // 1=杆: 显示杆，隐藏导轨与绳
        // 2=圆环: 显示圆环轨道，隐藏绳与杆
        h.stringLine.visible = modelType === 0;
        h.rodMesh.visible = modelType === 1;
        h.ringTrack.visible = modelType === 2;

        // 最高点临界速度与底端通过判据 (绳与圆环均为单向约束 v₀ ≥ √(5gR), 杆为双向约束 v₀ ≥ √(4gR))
        const vCrit = typeof mv?.['vMin'] === 'number' && mv['vMin'] >= 0 ? mv['vMin'] : isRod ? 0 : Math.sqrt(g * r);
        const v0Crit = Math.sqrt((isRod ? 4 : 5) * g * r);
        const canPass = typeof flags?.['passesTop'] === 'boolean' ? flags['passesTop'] : v0 >= v0Crit - 1e-3;

        const modelName = modelType === 0 ? '轻绳模型' : modelType === 1 ? '轻杆模型' : '圆环轨道模型';
        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, `${modelName} | 最低点初速 v₀=${v0} m/s`, '#2563eb', 24);
        }
        if (h.critLabel) {
            const passText = canPass ? '✅ 能完整越过最高点' : '❌ 无法越过最高点 (中途折返/脱轨)';
            const critText = isRod
                ? `v_top ≥ 0 (v₀ ≥ √(4gR)=${v0Crit.toFixed(2)} m/s)`
                : `v_top ≥ √(gR)=${vCrit.toFixed(2)} m/s`;
            updateTextSprite(h.critLabel, `${passText} (临界: ${critText})`, canPass ? '#059669' : '#ef4444', 20);
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as VerticalCircleHandles;
        if (!h.centerHub) return;

        const ballPos = ctx.ballPos; // 3D 世界坐标
        const pivot = new THREE.Vector3(0, h.pivotY, 0);
        const toBall = new THREE.Vector3().subVectors(ballPos, pivot);
        const dist = toBall.length();
        const mv = ctx.result?.diagnostics?.maxValues;
        const r = Math.max(1e-3, typeof mv?.['r'] === 'number' && mv['r'] > 0 ? mv['r'] : h.radius);
        const g = typeof mv?.['g'] === 'number' && mv['g'] > 0 ? mv['g'] : PHYSICS_CONSTANTS.g.value;
        const m = typeof mv?.['m'] === 'number' && mv['m'] > 0 ? mv['m'] : num(ctx.params['mass'], 1.0);
        const v0 = typeof mv?.['v0'] === 'number' && mv['v0'] >= 0 ? mv['v0'] : num(ctx.params['initialSpeed'], 7.5);
        const modelType = h.modelType;
        const isRod = modelType === 1;

        // 1. 绳模型每帧随动连接 (复用 BufferAttribute，杜绝每帧 GC 分配)
        if (h.stringLine && h.stringLine.visible) {
            const attr = h.stringLine.geometry.getAttribute('position') as THREE.BufferAttribute;
            if (attr && attr.count >= 2) {
                attr.setXYZ(0, pivot.x, pivot.y, pivot.z);
                attr.setXYZ(1, ballPos.x, ballPos.y, ballPos.z);
                attr.needsUpdate = true;
            }
        }

        // 2. 杆模型每帧刚性旋转
        if (h.rodMesh && h.rodMesh.visible && dist > 1e-4) {
            h.rodMesh.position.copy(pivot).addScaledVector(toBall, 0.5);
            h.rodMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toBall.clone().normalize());
        }

        // 3. 动力学物理量 (优先消费引擎轨迹帧的速度与加速度, 无结果时回退能量守恒)
        const radInward = dist > 1e-4 ? toBall.clone().negate().normalize() : new THREE.Vector3(0, 1, 0);
        const traj = ctx.result?.trajectories?.[0];
        let v: number;
        let aCent: number;
        let normalForce: number;
        if (traj && traj.length > 0) {
            const tClamped = Math.max(traj[0]!.t, Math.min(traj[traj.length - 1]!.t, ctx.time));
            const idx = findFrameIndex([traj], tClamped);
            const frame = idx > 0 ? interpolateFrame(traj[idx - 1]!, traj[idx]!, tClamped) : traj[0]!;
            v = Math.hypot(frame.velocity.x, frame.velocity.y);
            if (frame.acceleration) {
                // 牛顿第二定律: F_constraint = m(a - g_vec), 其中 g_vec = (0, -g)
                const fcX = m * frame.acceleration.x;
                const fcY = m * (frame.acceleration.y + g);
                const inFreeFall = Math.hypot(fcX, fcY) < 1e-4 && dist < r - 1e-3;
                aCent = inFreeFall ? 0 : (v * v) / r;
                let fRad = fcX * radInward.x + fcY * radInward.y;
                if (!isRod && (inFreeFall || fRad < 0)) {
                    fRad = 0;
                }
                normalForce = fRad;
            } else {
                aCent = (v * v) / r;
                const cosTheta = -(ballPos.y - h.pivotY) / r;
                const rawForce = m * (aCent + g * cosTheta);
                normalForce = isRod ? rawForce : Math.max(0, rawForce);
            }
        } else {
            const heightAboveBottom = Math.max(0, ballPos.y - (h.pivotY - r));
            const vSq = Math.max(0, v0 * v0 - 2 * g * heightAboveBottom);
            v = Math.sqrt(vSq);
            aCent = vSq / r;
            const cosTheta = -(ballPos.y - h.pivotY) / r; // 最低点 cosθ=1，最高点 cosθ=-1
            const rawForce = m * (aCent + g * cosTheta); // 指向圆心为正
            normalForce = isRod ? rawForce : Math.max(0, rawForce);
        }

        // 4. 受力矢量随动
        if (h.arrowGravity) {
            h.arrowGravity.position.copy(ballPos);
        }

        if (modelType === 0) {
            // 绳模型：仅显示拉力 T (指向圆心, 松弛归零时隐藏)
            if (h.arrowFn) h.arrowFn.visible = false;
            if (h.arrowTension && dist > 1e-4) {
                h.arrowTension.visible = normalForce > 1e-4;
                if (h.arrowTension.visible) {
                    h.arrowTension.position.copy(ballPos);
                    h.arrowTension.setDirection(radInward);
                    h.arrowTension.setLength(Math.min(1.2, Math.max(0.01, (normalForce / (m * g)) * 0.16)), 0.12, 0.06);
                }
            }
        } else {
            // 杆/圆环模型：显示轨道正压力/杆力 F_N (脱离归零时隐藏)
            if (h.arrowTension) h.arrowTension.visible = false;
            if (h.arrowFn && dist > 1e-4) {
                h.arrowFn.visible = Math.abs(normalForce) > 1e-4;
                if (h.arrowFn.visible) {
                    h.arrowFn.position.copy(ballPos);
                    if (normalForce >= 0) {
                        h.arrowFn.setDirection(radInward);
                    } else {
                        h.arrowFn.setDirection(radInward.clone().negate());
                    }
                    h.arrowFn.setLength(
                        Math.min(1.2, Math.max(0.01, (Math.abs(normalForce) / (m * g)) * 0.16)),
                        0.12,
                        0.06
                    );
                }
            }
        }

        // 5. 动态实时 HUD 读数
        if (h.statusLabel) {
            const modelName = modelType === 0 ? '轻绳' : modelType === 1 ? '轻杆' : '圆环轨道';
            updateTextSprite(
                h.statusLabel,
                `[${modelName}] 速度 v=${v.toFixed(2)}m/s | 向心 a_n=${aCent.toFixed(2)}m/s² | 力 F=${Math.abs(normalForce).toFixed(1)}N`,
                '#2563eb',
                22
            );
        }
    },

    getVisualPosition(pos, params, result) {
        const mvR = result?.diagnostics?.maxValues?.['r'];
        const r = typeof mvR === 'number' && mvR > 0 ? mvR : num(params['length'], 1.0);
        const pivotY = r + 0.4;
        return new THREE.Vector3(pos.x, pivotY - r + pos.y, 0);
    },

    getOrigin(params, result) {
        const mvR = result?.diagnostics?.maxValues?.['r'];
        const r = typeof mvR === 'number' && mvR > 0 ? mvR : num(params['length'], 1.0);
        const pivotY = r + 0.4;
        return new THREE.Vector3(0, pivotY - r, 0);
    }
};
