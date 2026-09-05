/**
 * 曲线运动规律 3D 实验 Rig
 * 覆盖：
 * 1. curve-condition: 曲线运动条件（水平滚珠 + 侧向强磁铁引力偏转 + 合外力指向凹侧）
 * 2. curve-velocity-direction: 曲线运动速度方向（弯曲导轨 + 瞬时切线速度矢量 + 脱离切线直线外推）
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CurveMotionHandles {
    tableBoard: THREE.Mesh;
    magnet: THREE.Group;
    curvedTrack: THREE.Line;
    arrowVelocity: THREE.ArrowHelper;
    arrowForce: THREE.ArrowHelper;
    tangentLine: THREE.Line;
    statusLabel: THREE.Sprite;
    ruleLabel: THREE.Sprite;
    isConditionScene: boolean;
}

export const curveMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,

    buildEquipment(scene, params) {
        const group = new THREE.Group();
        const isCondition = 'forceAngle' in params || 'initialSpeed' in params;

        // 1. 水平平整光滑实验木板台面 (3.6m x 2.6m)
        const tableBoard = makeBox(3.6, 0.05, 2.6, 0xe2e8f0, 0.4, 0.2);
        tableBoard.position.set(1.4, 0.025, 0);
        tableBoard.receiveShadow = true;
        group.add(tableBoard);

        // 台面防滑实木边框
        const border1 = makeBox(3.68, 0.08, 0.04, 0x78350f, 0.5, 0.1);
        border1.position.set(1.4, 0.04, 1.32);
        group.add(border1);
        const border2 = makeBox(3.68, 0.08, 0.04, 0x78350f, 0.5, 0.1);
        border2.position.set(1.4, 0.04, -1.32);
        group.add(border2);

        // 2. 磁铁偏转装置 (用于 curve-condition)
        const magnet = new THREE.Group();
        // N 极 (红)
        const magN = makeBox(0.3, 0.1, 0.12, 0xef4444, 0.3, 0.4);
        magN.position.set(0.15, 0.08, 0);
        magnet.add(magN);
        // S 极 (蓝)
        const magS = makeBox(0.3, 0.1, 0.12, 0x3b82f6, 0.3, 0.4);
        magS.position.set(-0.15, 0.08, 0);
        magnet.add(magS);
        magnet.position.set(1.6, 0, 0.8);
        group.add(magnet);

        // 3. 弯曲导轨 (用于 curve-velocity-direction)
        const trackPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI;
            trackPoints.push(new THREE.Vector3(1.2 * Math.cos(a) + 1.2, 0.06, 1.2 * Math.sin(a)));
        }
        const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPoints);
        const trackMat = new THREE.LineBasicMaterial({ color: 0x64748b, linewidth: 2 });
        const curvedTrack = new THREE.Line(trackGeo, trackMat);
        group.add(curvedTrack);

        // 4. 切线虚线外推
        const tangentMat = new THREE.LineDashedMaterial({ color: 0x10b981, dashSize: 0.1, gapSize: 0.06 });
        const initialTangentPoints = [new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(1, 0.08, 0)];
        const tangentLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(initialTangentPoints), tangentMat);
        tangentLine.computeLineDistances();
        group.add(tangentLine);

        // 5. 动态矢量 (速度切线与合外力)
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

        // 6. 教学状态与物理规律标牌
        const statusLabel = makeTextSprite('曲线运动实验台', '#0f172a', 24, { x: 1.1, y: 0.24 });
        statusLabel.position.set(1.4, 1.6, 0);
        group.add(statusLabel);

        const ruleLabel = makeTextSprite('规律提示', '#059669', 20, { x: 1.2, y: 0.2 });
        ruleLabel.position.set(1.4, 1.35, 0);
        group.add(ruleLabel);

        scene.add(group);

        const handles: CurveMotionHandles = {
            tableBoard,
            magnet,
            curvedTrack,
            arrowVelocity,
            arrowForce,
            tangentLine,
            statusLabel,
            ruleLabel,
            isConditionScene: isCondition
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CurveMotionHandles;
        const isCondition = 'forceAngle' in params || 'initialSpeed' in params;
        h.isConditionScene = isCondition;

        if (isCondition) {
            // 条件场景：显示磁铁，隐藏预设弯曲导轨
            h.magnet.visible = true;
            h.curvedTrack.visible = false;
            h.arrowForce.visible = true;

            const angleDeg = num(params['forceAngle'], 45);
            const v0 = num(params['initialSpeed'], 5);
            const rad = (angleDeg * Math.PI) / 180;

            // 磁铁摆在力方向的前方吸引小球
            const dist = 1.0;
            h.magnet.position.set(1.2 + dist * Math.cos(rad), 0, dist * Math.sin(rad));
            h.magnet.rotation.y = -rad;

            if (h.statusLabel) {
                updateTextSprite(h.statusLabel, `初速度 v₀=${v0}m/s | 合力夹角 θ=${angleDeg}°`, '#2563eb', 24);
            }
            if (h.ruleLabel) {
                const desc =
                    angleDeg < 90
                        ? '夹角锐角: 速率增大'
                        : angleDeg > 90
                          ? '夹角钝角: 速率减小'
                          : '夹角垂直: 速率瞬时不变';
                updateTextSprite(h.ruleLabel, `合外力总指向轨迹弯曲的凹侧 (${desc})`, '#059669', 20);
            }
        } else {
            // 速度方向场景：显示弯曲导轨，隐藏磁铁
            h.magnet.visible = false;
            h.curvedTrack.visible = true;
            h.arrowForce.visible = false;

            const shapeIdx = Math.round(num(params['trackShape'], 0));
            const shapeName = shapeIdx === 0 ? '圆弧轨道' : shapeIdx === 1 ? '抛物线导轨' : '渐开螺旋导轨';

            if (h.statusLabel) {
                updateTextSprite(h.statusLabel, `${shapeName}速度方向演示`, '#2563eb', 24);
            }
            if (h.ruleLabel) {
                updateTextSprite(h.ruleLabel, '瞬时速度方向：沿质点轨迹在当前点的切线方向', '#10b981', 20);
            }
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CurveMotionHandles;
        if (!h.arrowVelocity) return;

        const ballPos = ctx.ballPos; // 3D 世界坐标 (x, y, z)
        const tableY = 0.08;
        const pos = new THREE.Vector3(ballPos.x, tableY, ballPos.z);

        // 速度切线方向更新
        // 从 ballPos 或速度参数计算切线
        let tangDir = new THREE.Vector3(1, 0, 0);
        if (h.isConditionScene) {
            const angleDeg = num(ctx.params['forceAngle'], 45);
            const v0 = num(ctx.params['initialSpeed'], 5);
            const rad = (angleDeg * Math.PI) / 180;
            const t = ctx.time;
            const fx = Math.cos(rad) * 4;
            const fz = Math.sin(rad) * 4;
            const vx = v0 + fx * t;
            const vz = fz * t;
            tangDir = new THREE.Vector3(vx, 0, vz).normalize();

            // 力矢量：指向磁铁
            if (h.arrowForce) {
                h.arrowForce.position.copy(pos);
                h.arrowForce.setDirection(new THREE.Vector3(Math.cos(rad), 0, Math.sin(rad)));
                h.arrowForce.setLength(0.65, 0.14, 0.07);
            }
        } else {
            // 速度方向场景：沿切线方向
            const t = ctx.time;
            tangDir = new THREE.Vector3(-Math.sin(t * 2), 0, Math.cos(t * 2)).normalize();
        }

        h.arrowVelocity.position.copy(pos);
        h.arrowVelocity.setDirection(tangDir);
        h.arrowVelocity.setLength(0.7, 0.15, 0.08);

        // 切线虚线延展
        if (h.tangentLine) {
            const endPt = pos.clone().addScaledVector(tangDir, 1.2);
            h.tangentLine.geometry.dispose();
            h.tangentLine.geometry = new THREE.BufferGeometry().setFromPoints([pos, endPt]);
            h.tangentLine.computeLineDistances();
        }
    },

    getVisualPosition(pos, _params) {
        // 水平木板 X-Z 平面运动
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.08, pos.y * WORLD_SCALE);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.08, 0);
    }
};
