/**
 * 曲线运动速度方向 3D 实验 Rig (curve-velocity-direction)
 * 教材经典实验原型：
 * 1. 高速旋转磨刀砂轮：炽热的微粒沿着砂轮的切线方向飞溅 (明亮粒子束系统)
 * 2. 弯曲轨道脱离：质点脱离弯曲导轨后沿切线方向做匀速直线运动
 * 直观印证：做曲线运动的质点在某一时刻（或某一位置）的速度方向，就是质点在这一点的切线方向。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const SPARK_COUNT = 70;

interface SparkData {
    life: number; // 0 ~ 1
    speed: number;
    jitterX: number;
    jitterY: number;
    jitterZ: number;
}

interface CurveVelocityDirectionHandles {
    grinderGroup: THREE.Group;
    wheelMesh: THREE.Mesh;
    sparkSystem: THREE.Points;
    sparkData: SparkData[];
    curvedTrackGroup: THREE.Group;
    tangentLine: THREE.Line;
    arrowVelocity: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    ruleLabel: THREE.Sprite;
    contactPoint: THREE.Vector3;
    tangentDir: THREE.Vector3;
}

export const curveVelocityDirectionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.001, // 由砂轮接触火花束及轨道质点主导视觉

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 砂轮机台铸铁机座
        const grinderGroup = new THREE.Group();
        const base = makeBox(1.8, 0.08, 1.2, 0x1e293b, 0.5, 0.4);
        base.position.set(0, 0.04, 0);
        base.receiveShadow = true;
        grinderGroup.add(base);

        // 电机壳体与立柱
        const motorPillar = makeBox(0.35, 0.75, 0.45, 0x334155, 0.4, 0.6);
        motorPillar.position.set(-0.25, 0.45, 0);
        motorPillar.castShadow = true;
        grinderGroup.add(motorPillar);

        const motorHousing = makeCylinder(0.22, 0.5, 0x475569, 0.35, 0.7);
        motorHousing.rotation.x = Math.PI / 2;
        motorHousing.position.set(-0.25, 0.85, 0);
        grinderGroup.add(motorHousing);

        // 砂轮主轴
        const shaft = makeCylinder(0.04, 0.45, 0xd97706, 0.25, 0.85);
        shaft.rotation.x = Math.PI / 2;
        shaft.position.set(-0.02, 0.85, 0);
        grinderGroup.add(shaft);

        // 2. 碳化硅高速磨砂轮盘 (半径 R=0.5m, 厚度 0.08m)
        const wheelRadius = 0.5;
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.09, 48);
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x52525b,
            roughness: 0.85,
            metalness: 0.15
        });
        const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
        wheelMesh.rotation.x = Math.PI / 2;
        wheelMesh.position.set(0.18, 0.85, 0);
        wheelMesh.castShadow = true;
        grinderGroup.add(wheelMesh);

        // 砂轮防护安全罩 (3/4 保护罩)
        const guardGeo = new THREE.TorusGeometry(wheelRadius + 0.03, 0.065, 12, 36, Math.PI * 1.4);
        const guardMat = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            roughness: 0.4,
            metalness: 0.6
        });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.set(0.18, 0.85, 0);
        guard.rotation.z = Math.PI * 0.45;
        grinderGroup.add(guard);

        // 磨刀支架与金属刀具工件
        const toolRest = makeBox(0.2, 0.04, 0.16, 0x64748b, 0.4, 0.5);
        toolRest.position.set(0.18 + wheelRadius + 0.06, 0.83, 0);
        grinderGroup.add(toolRest);

        const blade = makeBox(0.22, 0.02, 0.08, 0xe2e8f0, 0.2, 0.9);
        blade.position.set(0.18 + wheelRadius - 0.02, 0.85, 0);
        grinderGroup.add(blade);

        // 接触点位置 (砂轮右侧边缘切点)
        const contactPoint = new THREE.Vector3(0.18 + wheelRadius, 0.85, 0);
        // 顺时针旋转时，右侧切点的切线速度竖直向下 (-Y)
        const tangentDir = new THREE.Vector3(0, -1, 0);

        // 3. 切线火花粒子系统 (Glowing Incandescent Spark Particles)
        const sparkPositions = new Float32Array(SPARK_COUNT * 3);
        const sparkColors = new Float32Array(SPARK_COUNT * 3);
        const sparkData: SparkData[] = [];

        for (let i = 0; i < SPARK_COUNT; i++) {
            sparkPositions[i * 3] = contactPoint.x;
            sparkPositions[i * 3 + 1] = contactPoint.y;
            sparkPositions[i * 3 + 2] = contactPoint.z;

            // 炽热金色/橙红火花颜色渐变
            sparkColors[i * 3] = 1.0;
            sparkColors[i * 3 + 1] = 0.6 + Math.random() * 0.35;
            sparkColors[i * 3 + 2] = 0.1;

            sparkData.push({
                life: Math.random(),
                speed: 1.8 + Math.random() * 1.6,
                jitterX: (Math.random() - 0.5) * 0.08,
                jitterY: -1.0,
                jitterZ: (Math.random() - 0.5) * 0.12
            });
        }

        const sparkGeo = new THREE.BufferGeometry();
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
        sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

        const sparkMat = new THREE.PointsMaterial({
            size: 0.045,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        });
        const sparkSystem = new THREE.Points(sparkGeo, sparkMat);
        grinderGroup.add(sparkSystem);

        group.add(grinderGroup);

        // 4. 教材弯曲轨道脱离模型 (用于 trackShape > 0 场景)
        const curvedTrackGroup = new THREE.Group();
        curvedTrackGroup.position.set(0, 0.08, 0);

        const trackPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 48; i++) {
            const a = (i / 48) * Math.PI * 0.8;
            trackPoints.push(new THREE.Vector3(1.1 * Math.cos(a) + 0.2, 0, 1.1 * Math.sin(a)));
        }
        const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPoints);
        const trackLine = new THREE.Line(trackGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
        curvedTrackGroup.add(trackLine);
        curvedTrackGroup.visible = false;
        group.add(curvedTrackGroup);

        // 5. 瞬时切线速度矢量 (亮绿色) 与切线虚线外推
        const arrowVelocity = makeArrow(tangentDir, contactPoint, 0.75, 0x10b981, 0.16, 0.08);
        group.add(arrowVelocity);

        const tangentMat = new THREE.LineDashedMaterial({ color: 0x10b981, dashSize: 0.08, gapSize: 0.05 });
        const tangentEnd = contactPoint.clone().addScaledVector(tangentDir, 1.4);
        const tangentLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([contactPoint, tangentEnd]),
            tangentMat
        );
        tangentLine.computeLineDistances();
        group.add(tangentLine);

        // 6. 教学状态与物理规律标牌
        const statusLabel = makeTextSprite('曲线运动速度方向演示', '#0f172a', 24, { x: 1.2, y: 0.24 });
        statusLabel.position.set(0.2, 1.68, 0);
        group.add(statusLabel);

        const ruleLabel = makeTextSprite('切线规律', '#059669', 20, { x: 1.35, y: 0.2 });
        ruleLabel.position.set(0.2, 1.42, 0);
        group.add(ruleLabel);

        scene.add(group);

        const handles: CurveVelocityDirectionHandles = {
            grinderGroup,
            wheelMesh,
            sparkSystem,
            sparkData,
            curvedTrackGroup,
            tangentLine,
            arrowVelocity,
            statusLabel,
            ruleLabel,
            contactPoint,
            tangentDir
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CurveVelocityDirectionHandles;
        const shapeIdx = Math.round(num(params['trackShape'], 0));
        const omega = num(params['angularSpeed'], 1);

        if (shapeIdx === 0) {
            // 默认砂轮切线火花模式
            h.grinderGroup.visible = true;
            h.curvedTrackGroup.visible = false;
            h.sparkSystem.visible = true;
            if (h.statusLabel) {
                updateTextSprite(h.statusLabel, `砂轮磨刀实验 | 转速 ω=${omega}rad/s`, '#2563eb', 24);
            }
            if (h.ruleLabel) {
                updateTextSprite(h.ruleLabel, '炽热火花微粒沿切线飞溅 — 证明速度方向在切线上', '#059669', 20);
            }
        } else {
            // 弯曲轨道脱离模式
            h.grinderGroup.visible = false;
            h.curvedTrackGroup.visible = true;
            h.sparkSystem.visible = false;
            const shapeName = shapeIdx === 1 ? '抛物线导轨' : '螺旋导轨';
            if (h.statusLabel) {
                updateTextSprite(h.statusLabel, `${shapeName}脱离点速度方向演示`, '#2563eb', 24);
            }
            if (h.ruleLabel) {
                updateTextSprite(h.ruleLabel, '质点脱离弯曲轨道瞬间，沿当前点切线方向匀速飞出', '#059669', 20);
            }
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CurveVelocityDirectionHandles;
        if (!h.wheelMesh || !h.sparkSystem) return;

        const omega = num(ctx.params['angularSpeed'], 1);
        const t = ctx.time;
        const dt = 0.025; // 粒子积分步长

        // 1. 砂轮高速旋转 (绕 Z 轴顺时针旋转)
        const rotAngle = -(omega * 12 * t) % (Math.PI * 2);
        h.wheelMesh.rotation.z = rotAngle;

        // 2. 炽热火花粒子系统随动飞溅 (沿切向 -Y 方向高速喷射并衰减)
        const posAttr = h.sparkSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;

        for (let i = 0; i < SPARK_COUNT; i++) {
            const p = h.sparkData[i];
            if (!p) continue;
            p.life += dt * p.speed;

            if (p.life > 1.0) {
                // 重置到接触点
                p.life = 0;
                positions[i * 3] = h.contactPoint.x;
                positions[i * 3 + 1] = h.contactPoint.y;
                positions[i * 3 + 2] = h.contactPoint.z;
            } else {
                // 沿切线方向高速向前，并受轻微空气阻力与重力影响
                const travelDist = p.life * 1.3;
                positions[i * 3] = h.contactPoint.x + p.jitterX * travelDist;
                positions[i * 3 + 1] = h.contactPoint.y - travelDist - 0.5 * 1.2 * p.life * p.life;
                positions[i * 3 + 2] = h.contactPoint.z + p.jitterZ * travelDist;
            }
        }
        posAttr.needsUpdate = true;

        // 3. 切线矢量与虚线随动
        h.arrowVelocity.position.copy(h.contactPoint);
        h.arrowVelocity.setDirection(h.tangentDir);
        h.arrowVelocity.setLength(0.75, 0.16, 0.08);

        const endPt = h.contactPoint.clone().addScaledVector(h.tangentDir, 1.4);
        const linePosAttr = h.tangentLine.geometry.getAttribute('position') as THREE.BufferAttribute;
        if (linePosAttr && linePosAttr.count >= 2) {
            linePosAttr.setXYZ(0, h.contactPoint.x, h.contactPoint.y, h.contactPoint.z);
            linePosAttr.setXYZ(1, endPt.x, endPt.y, endPt.z);
            linePosAttr.needsUpdate = true;
            h.tangentLine.computeLineDistances();
        }
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.85, pos.y * WORLD_SCALE);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.68, 0.85, 0);
    }
};
