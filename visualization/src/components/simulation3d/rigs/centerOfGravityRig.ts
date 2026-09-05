/**
 * 悬挂法确定重心 3D 实验 Rig
 * 包含：重型铁架台与十字紧固夹、水平悬挂插销针、
 * 不规则形状均质亚克力薄板 (L形/三角形/不规则四边形)、
 * 悬挂小孔、真重力红白双色编织铅垂线与纯铜垂锤、
 * 两次悬挂铅垂基准交点线与重心 G (Centroid) 靶心高亮标示。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeLine, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface CenterOfGravityHandles {
    rootGroup: THREE.Group;
    plateGroup: THREE.Group; // 薄板组（挂在销钉上，以悬挂孔为支点旋转）
    plateMesh: THREE.Mesh;
    plumbLine: THREE.Line;
    dashedLine2: THREE.Line;
    plumbBob: THREE.Mesh;
    cogSpot: THREE.Mesh;
    statusLabel: THREE.Sprite;
    dataLabel: THREE.Sprite;
    shapeType: number;
    centroid: THREE.Vector2;
    suspensionPoint: THREE.Vector2;
}

export const centerOfGravityRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实验室铁架台 (底座 + 竖直不锈钢立柱 + 悬臂与插销)
        const standBase = makeBox(0.6, 0.05, 0.45, 0x1e293b, 0.5, 0.4);
        standBase.position.set(0.3, 0.025, 0);
        standBase.receiveShadow = true;
        group.add(standBase);

        const standRod = makeCylinder(0.016, 2.2, 0xd1d5db, 0.2, 0.85);
        standRod.position.set(0.48, 1.1, 0);
        standRod.castShadow = true;
        group.add(standRod);

        // 十字紧固夹套
        const clamp = makeBox(0.06, 0.06, 0.06, 0x475569, 0.3, 0.7);
        clamp.position.set(0.48, 1.85, 0);
        group.add(clamp);

        // 水平悬挂销针 (从立柱向前伸出)
        const pin = makeCylinder(0.008, 0.35, 0xd97706, 0.3, 0.85);
        pin.rotation.x = Math.PI / 2;
        pin.position.set(0.48, 1.85, 0.12);
        group.add(pin);

        // 销钉前端卡扣帽
        const pinCap = makeCylinder(0.02, 0.02, 0xb45309, 0.3, 0.85);
        pinCap.rotation.x = Math.PI / 2;
        pinCap.position.set(0.48, 1.85, 0.29);
        group.add(pinCap);

        // 2. 悬挂薄板摆动总成 (plateGroup 以销钉处 (0, 1.85, 0.2) 为原点旋转)
        const plateGroup = new THREE.Group();
        plateGroup.position.set(0, 1.85, 0.2);

        // 初始假几何占位（随后由 updateEquipment 构建真实形状）
        const initShape = new THREE.Shape();
        initShape.moveTo(-0.5, -0.5);
        initShape.lineTo(0.5, -0.5);
        initShape.lineTo(0, 0.5);
        initShape.closePath();
        const extrudeSettings = {
            depth: 0.025,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.005,
            bevelThickness: 0.005
        };
        const initGeo = new THREE.ExtrudeGeometry(initShape, extrudeSettings);
        const plateMat = new THREE.MeshPhysicalMaterial({
            color: 0xf59e0b,
            roughness: 0.2,
            metalness: 0.1,
            transmission: 0.6,
            transparent: true,
            opacity: 0.85
        });
        const plateMesh = new THREE.Mesh(initGeo, plateMat);
        plateMesh.castShadow = true;
        plateGroup.add(plateMesh);

        // 两次悬挂的第一条基准铅垂线 (红色实线，画在薄板表面)
        const plumbLine = makeLine([new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(0, -1.1, 0.02)], 0xef4444, 0.95);
        plateGroup.add(plumbLine);

        // 第二次悬挂记录的辅助基准线 (蓝色虚线，经过重心)
        const dashedLine2 = makeLine(
            [new THREE.Vector3(0.3, 0.2, 0.02), new THREE.Vector3(-0.3, -0.8, 0.02)],
            0x3b82f6,
            0.8
        );
        plateGroup.add(dashedLine2);

        // 重心交点靶心 G (红黄双环高亮)
        const cogSpot = makeSphere(0.025, 0xef4444, { emissive: 0xff0000, emissiveIntensity: 0.8 });
        cogSpot.position.set(0, -0.4, 0.025);
        plateGroup.add(cogSpot);

        group.add(plateGroup);

        // 3. 悬挂在销钉上的外部真铅垂线与纯铜垂锤
        const plumbCord = makeLine([new THREE.Vector3(0, 1.85, 0.24), new THREE.Vector3(0, 0.7, 0.24)], 0xef4444, 0.9);
        group.add(plumbCord);

        // 纯铜锥形垂锤
        const plumbBobGeo = new THREE.ConeGeometry(0.04, 0.12, 24);
        const plumbBobMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85 });
        const plumbBob = new THREE.Mesh(plumbBobGeo, plumbBobMat);
        plumbBob.rotation.x = Math.PI; // 尖端朝下
        plumbBob.position.set(0, 0.64, 0.24);
        plumbBob.castShadow = true;
        group.add(plumbBob);

        // 4. 实验原理与数据 HUD
        const statusLabel = makeTextSprite('悬挂法确定薄板重心', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.3, 0);
        group.add(statusLabel);

        const dataLabel = makeTextSprite('交点 G 为重心所在位置', '#2563eb', 20, { x: 1.8, y: 0.24 });
        dataLabel.position.set(0, 2.05, 0);
        group.add(dataLabel);

        scene.add(group);

        const handles: CenterOfGravityHandles = {
            rootGroup: group,
            plateGroup,
            plateMesh,
            plumbLine,
            dashedLine2,
            plumbBob,
            cogSpot,
            statusLabel,
            dataLabel,
            shapeType: 0,
            centroid: new THREE.Vector2(0, 0),
            suspensionPoint: new THREE.Vector2(0, 0)
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CenterOfGravityHandles;
        const shapeType = Math.round(num(params['shapeType'], 0));
        h.shapeType = shapeType;

        // 3 种几何薄板顶点配置 (归一化在 ~1.0m 范围内)
        const shapesVertices: THREE.Vector2[][] = [
            // 0: L形
            [
                new THREE.Vector2(-0.45, -0.45),
                new THREE.Vector2(0.45, -0.45),
                new THREE.Vector2(0.45, 0),
                new THREE.Vector2(0, 0),
                new THREE.Vector2(0, 0.45),
                new THREE.Vector2(-0.45, 0.45)
            ],
            // 1: 三角形
            [new THREE.Vector2(-0.45, -0.35), new THREE.Vector2(0.45, -0.35), new THREE.Vector2(-0.1, 0.45)],
            // 2: 不规则四边形
            [
                new THREE.Vector2(-0.45, -0.2),
                new THREE.Vector2(0.35, -0.4),
                new THREE.Vector2(0.48, 0.35),
                new THREE.Vector2(-0.25, 0.45)
            ]
        ];

        const pts = shapesVertices[shapeType] ?? shapesVertices[0]!;

        // 计算多边形质心与面积
        let signedArea = 0;
        let cx = 0;
        let cy = 0;
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const p0 = pts[i]!;
            const p1 = pts[(i + 1) % n]!;
            const a = p0.x * p1.y - p1.x * p0.y;
            signedArea += a;
            cx += (p0.x + p1.x) * a;
            cy += (p0.y + p1.y) * a;
        }
        signedArea *= 0.5;
        cx /= 6 * signedArea;
        cy /= 6 * signedArea;
        h.centroid.set(cx, cy);

        // 选定顶点 0 为悬挂点 1，顶点 1 (或最后一个顶点) 为悬挂点 2
        const susp1 = pts[0]!;
        const susp2 = pts[n - 1]!;
        h.suspensionPoint.copy(susp1);

        // 重建薄板 ExtrudeGeometry，薄板平移使得悬挂点对齐坐标原点 (0, 0)
        const shape = new THREE.Shape();
        shape.moveTo(pts[0]!.x - susp1.x, pts[0]!.y - susp1.y);
        for (let i = 1; i < n; i++) {
            shape.lineTo(pts[i]!.x - susp1.x, pts[i]!.y - susp1.y);
        }
        shape.closePath();

        // 钻出悬挂小孔
        const hole1 = new THREE.Path();
        hole1.absarc(0, 0, 0.015, 0, Math.PI * 2, true);
        shape.holes.push(hole1);

        const hole2Pos = new THREE.Vector2(susp2.x - susp1.x, susp2.y - susp1.y);
        const hole2 = new THREE.Path();
        hole2.absarc(hole2Pos.x, hole2Pos.y, 0.015, 0, Math.PI * 2, true);
        shape.holes.push(hole2);

        h.plateMesh.geometry.dispose();
        h.plateMesh.geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 0.025,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.005,
            bevelThickness: 0.005
        });

        // 质心相对于悬挂点 1 的相对坐标
        const relCx = cx - susp1.x;
        const relCy = cy - susp1.y;

        // 标定重心位置
        h.cogSpot.position.set(relCx, relCy, 0.028);

        // 更新第一次悬挂的铅垂基线 (过悬挂点与质心)
        const dir1 = new THREE.Vector2(relCx, relCy).normalize();
        const pLineGeo = h.plumbLine.geometry as THREE.BufferGeometry;
        const pLineAttr = pLineGeo.getAttribute('position') as THREE.BufferAttribute;
        pLineAttr.setXYZ(0, 0, 0, 0.026);
        pLineAttr.setXYZ(1, dir1.x * 0.9, dir1.y * 0.9, 0.026);
        pLineAttr.needsUpdate = true;

        // 更新第二次悬挂记录的基线 (过悬挂点2与质心)
        const dir2 = new THREE.Vector2(relCx - hole2Pos.x, relCy - hole2Pos.y).normalize();
        const dLineGeo = h.dashedLine2.geometry as THREE.BufferGeometry;
        const dLineAttr = dLineGeo.getAttribute('position') as THREE.BufferAttribute;
        dLineAttr.setXYZ(0, hole2Pos.x - dir2.x * 0.2, hole2Pos.y - dir2.y * 0.2, 0.026);
        dLineAttr.setXYZ(1, hole2Pos.x + dir2.x * 0.8, hole2Pos.y + dir2.y * 0.8, 0.026);
        dLineAttr.needsUpdate = true;

        const shapeNames = ['L 形薄板', '任意三角形薄板', '不规则四边形薄板'];
        if (h.statusLabel) {
            updateTextSprite(h.statusLabel, `悬挂法测重心：${shapeNames[shapeType]}`, '#0f172a', 24);
        }

        if (h.dataLabel) {
            updateTextSprite(
                h.dataLabel,
                `几何面积 S=${Math.abs(signedArea).toFixed(3)}m² | 重心 G 坐标 (${cx.toFixed(2)}, ${cy.toFixed(2)})`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CenterOfGravityHandles;
        if (!h.plateGroup) return;

        const { time } = ctx;

        // 平衡状态物理规律：
        // 悬挂在孔 1 时，重心 G 必须位于悬挂点正下方（竖直线上）！
        // 计算从悬挂点到质心的向量与负 Y 轴夹角
        const relX = h.cogSpot.position.x;
        const relY = h.cogSpot.position.y;
        const targetAngle = Math.atan2(relX, -relY);

        // 初始悬挂微摆动阻尼衰减至严格竖直平衡
        const swing = 0.25 * Math.exp(-0.8 * time) * Math.cos(2.8 * time);
        h.plateGroup.rotation.z = -(targetAngle + swing);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.4 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.4, 0);
    }
};
