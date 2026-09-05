/**
 * 曲线运动条件 3D 实验 Rig (curve-condition)
 * 教材经典实验原型：水平光滑木板台面上，小球自导引喷管射出，
 * 侧边放置强力条形磁铁，受侧向磁引力作用发生偏转，
 * 直观验证：做曲线运动的条件是合外力与初速度不在同一直线上，且合外力总指向轨迹弯曲的凹侧。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CurveConditionHandles {
    tableBoard: THREE.Mesh;
    launchNozzle: THREE.Group;
    magnetGroup: THREE.Group;
    fieldLinesGroup: THREE.Group;
    arrowVelocity: THREE.ArrowHelper;
    arrowForce: THREE.ArrowHelper;
    tangentLine: THREE.Line;
    statusLabel: THREE.Sprite;
    ruleLabel: THREE.Sprite;
}

export const curveConditionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.07, // 钢球半径

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 水平抛光实木实验木板台面 (3.6m x 2.6m)
        const tableBoard = makeBox(3.8, 0.06, 2.8, 0xd4a373, 0.45, 0.15);
        tableBoard.position.set(1.4, 0.03, 0);
        tableBoard.receiveShadow = true;
        group.add(tableBoard);

        // 台面四周金属防滚边框
        const borderZ1 = makeBox(3.88, 0.08, 0.05, 0x475569, 0.4, 0.6);
        borderZ1.position.set(1.4, 0.05, 1.425);
        group.add(borderZ1);

        const borderZ2 = makeBox(3.88, 0.08, 0.05, 0x475569, 0.4, 0.6);
        borderZ2.position.set(1.4, 0.05, -1.425);
        group.add(borderZ2);

        const borderX2 = makeBox(0.05, 0.08, 2.9, 0x475569, 0.4, 0.6);
        borderX2.position.set(3.315, 0.05, 0);
        group.add(borderX2);

        // 2. 金属滚球释放喷管/引导斜槽 (位于发射点 x<=0 侧)
        const launchNozzle = new THREE.Group();
        const nozzleTube = makeCylinder(0.085, 0.4, 0x94a3b8, 0.3, 0.85);
        nozzleTube.rotation.z = Math.PI / 2;
        nozzleTube.position.set(-0.2, 0.08, 0);
        launchNozzle.add(nozzleTube);

        // 喷管喇叭口法兰
        const flange = makeCylinder(0.12, 0.03, 0xd97706, 0.3, 0.8);
        flange.rotation.z = Math.PI / 2;
        flange.position.set(-0.01, 0.08, 0);
        launchNozzle.add(flange);

        // 喷管基座固定支架
        const nozzleStand = makeBox(0.16, 0.08, 0.2, 0x334155, 0.5, 0.5);
        nozzleStand.position.set(-0.25, 0.04, 0);
        launchNozzle.add(nozzleStand);
        group.add(launchNozzle);

        // 3. 强力钕铁硼条形磁铁 (N 极红，S 极蓝)
        const magnetGroup = new THREE.Group();
        const magN = makeBox(0.35, 0.12, 0.14, 0xef4444, 0.3, 0.5);
        magN.position.set(0.175, 0.1, 0);
        magnetGroup.add(magN);

        const magS = makeBox(0.35, 0.12, 0.14, 0x3b82f6, 0.3, 0.5);
        magS.position.set(-0.175, 0.1, 0);
        magnetGroup.add(magS);

        // 磁铁底座吸附垫
        const magPad = makeBox(0.72, 0.04, 0.16, 0x1e293b, 0.6, 0.3);
        magPad.position.set(0, 0.02, 0);
        magnetGroup.add(magPad);

        magnetGroup.position.set(1.5, 0, 0.9);
        group.add(magnetGroup);

        // 4. 空间磁感线分布弧线 (展示磁吸引场)
        const fieldLinesGroup = new THREE.Group();
        for (let i = -2; i <= 2; i++) {
            const curvePts: THREE.Vector3[] = [];
            const radius = 0.3 + Math.abs(i) * 0.15;
            for (let step = 0; step <= 24; step++) {
                const phi = (step / 24) * Math.PI;
                curvePts.push(
                    new THREE.Vector3(
                        radius * Math.cos(phi) * 1.5,
                        0.08 + Math.sin(phi) * 0.15,
                        i * 0.12 + Math.sin(phi) * 0.35
                    )
                );
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x60a5fa,
                transparent: true,
                opacity: 0.5
            });
            const arcLine = new THREE.Line(lineGeo, lineMat);
            fieldLinesGroup.add(arcLine);
        }
        magnetGroup.add(fieldLinesGroup);

        // 5. 切线虚线外推
        const tangentMat = new THREE.LineDashedMaterial({ color: 0x10b981, dashSize: 0.1, gapSize: 0.06 });
        const initialTangentPoints = [new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(1, 0.08, 0)];
        const tangentLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(initialTangentPoints), tangentMat);
        tangentLine.computeLineDistances();
        group.add(tangentLine);

        // 6. 动态受力与速度矢量
        const arrowVelocity = makeArrow(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            0.6,
            0x10b981,
            0.14,
            0.08
        );
        const arrowForce = makeArrow(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.6, 0x3b82f6, 0.14, 0.08);
        group.add(arrowVelocity);
        group.add(arrowForce);

        // 7. 教学状态与物理规律标牌
        const statusLabel = makeTextSprite('曲线运动条件实验', '#0f172a', 24, { x: 1.1, y: 0.24 });
        statusLabel.position.set(1.4, 1.65, 0);
        group.add(statusLabel);

        const ruleLabel = makeTextSprite('规律判定', '#059669', 20, { x: 1.25, y: 0.2 });
        ruleLabel.position.set(1.4, 1.38, 0);
        group.add(ruleLabel);

        scene.add(group);

        const handles: CurveConditionHandles = {
            tableBoard,
            launchNozzle,
            magnetGroup,
            fieldLinesGroup,
            arrowVelocity,
            arrowForce,
            tangentLine,
            statusLabel,
            ruleLabel
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CurveConditionHandles;
        const angleDeg = num(params['forceAngle'], 45);
        const v0 = num(params['initialSpeed'], 5);
        const m = num(params['mass'], 1);
        const rad = (angleDeg * Math.PI) / 180;

        // 磁铁根据力方向角度动态摆放在小球侧前方
        const dist = 1.2;
        const magX = 1.2 + dist * Math.cos(rad);
        const magZ = dist * Math.sin(rad);
        h.magnetGroup.position.set(magX, 0, magZ);
        h.magnetGroup.rotation.y = -rad;

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `初速度 v₀=${v0}m/s | 磁力夹角 θ=${angleDeg}° | 质量 m=${m}kg`,
                '#2563eb',
                24
            );
        }

        if (h.ruleLabel) {
            let desc = '';
            if (angleDeg < 90) {
                desc = '夹角为锐角: 切向加速度与速度同向，速率增大';
            } else if (angleDeg > 90) {
                desc = '夹角为钝角: 切向加速度与速度反向，速率减小';
            } else {
                desc = '夹角为直角: 仅有向心加速度，速率瞬时不变';
            }
            updateTextSprite(h.ruleLabel, `合外力指向曲线凹侧 (${desc})`, '#059669', 20);
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CurveConditionHandles;
        if (!h.arrowVelocity || !h.arrowForce) return;

        const ballPos = ctx.ballPos; // 3D 世界坐标 (x, y, z)
        const tableY = 0.08;
        const currentPos = new THREE.Vector3(ballPos.x, tableY, ballPos.z);

        const angleDeg = num(ctx.params['forceAngle'], 45);
        const v0 = num(ctx.params['initialSpeed'], 5);
        const m = Math.max(1e-3, num(ctx.params['mass'], 1));
        const rad = (angleDeg * Math.PI) / 180;
        const t = ctx.time;

        // 动力学速度与受力计算
        const fMag = m * 2.5; // 磁吸力大小
        const fx = fMag * Math.cos(rad);
        const fz = fMag * Math.sin(rad);

        const vx = v0 + (fx / m) * t;
        const vz = (fz / m) * t;
        const currentV = Math.hypot(vx, vz);
        const tangDir = new THREE.Vector3(vx, 0, vz).normalize();

        // 1. 速度矢量随动 (绿色，沿切线)
        h.arrowVelocity.position.copy(currentPos);
        h.arrowVelocity.setDirection(tangDir);
        h.arrowVelocity.setLength(Math.min(1.0, Math.max(0.1, currentV * 0.12)), 0.14, 0.07);

        // 2. 合外力矢量随动 (蓝色，指向磁铁)
        const toMagnet = new THREE.Vector3().subVectors(h.magnetGroup.position, currentPos).setY(0).normalize();
        h.arrowForce.position.copy(currentPos);
        h.arrowForce.setDirection(toMagnet);
        h.arrowForce.setLength(0.65, 0.13, 0.07);

        // 3. 切线虚线外推
        if (h.tangentLine) {
            const endPt = currentPos.clone().addScaledVector(tangDir, 1.4);
            const posAttr = h.tangentLine.geometry.getAttribute('position') as THREE.BufferAttribute;
            if (posAttr && posAttr.count >= 2) {
                posAttr.setXYZ(0, currentPos.x, currentPos.y, currentPos.z);
                posAttr.setXYZ(1, endPt.x, endPt.y, endPt.z);
                posAttr.needsUpdate = true;
                h.tangentLine.computeLineDistances();
            }
        }
    },

    getVisualPosition(pos, _params) {
        // 水平木板 X-Z 平面运动 (物理二维坐标 (x, y) 映射到 3D 世界坐标 (x, 0.08, z))
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.08, pos.y * WORLD_SCALE);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.08, 0);
    }
};
