/**
 * 卡文迪什引力微小扭秤与光放大装置 3D 实验 Rig
 * 包含：重型铸铁减震基座、透明防风圆柱玻璃罩、黄铜悬丝顶管与微调旋钮、
 * 灵敏石英/铍青铜悬丝、中央微型平面反射镜、轻质 T 形悬臂与对称小铅球 (m₂)、
 * 外部旋转引力支架与对称大铅球 (m₁)、精密半导体激光管与远端毫米刻度光屏、
 * 满足光杠杆倍率放大规律（镜偏转 θ，光束偏转 2θ，光斑位移 Δs = 2Dθ）。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import {
    makeBox,
    makeCylinder,
    makeSphere,
    makeLine,
    makeArrow,
    makeTextSprite,
    updateTextSprite
} from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;
const G_CONST = 6.6743e-11;

interface CavendishHandles {
    rootGroup: THREE.Group;
    suspensionGroup: THREE.Group; // 可绕 Y 轴扭转的摆动悬挂系统 (悬丝下端、镜子、横杆、小球)
    wireLine: THREE.Line;
    mirrorMesh: THREE.Mesh;
    beamMesh: THREE.Mesh;
    smallBall1: THREE.Mesh;
    smallBall2: THREE.Mesh;
    bigBall1: THREE.Mesh;
    bigBall2: THREE.Mesh;
    bigBallsGroup: THREE.Group; // 大球转架
    incidentLaser: THREE.Line;
    reflectedLaser: THREE.Line;
    laserSpot: THREE.Mesh;
    scalePlate: THREE.Mesh;
    arrowF1: THREE.ArrowHelper;
    arrowF2: THREE.ArrowHelper;
    infoLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    // 物理参数缓存
    m1: number;
    m2: number;
    distance: number;
    torsionConst: number;
    mirrorDist: number;
    armLength: number;
    thetaEq: number; // 平衡偏转角 (rad)
}

export const cavendishRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.001, // 扭秤内双大铅球与双小铅球主导视觉
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 重型铸铁防震基座与调平支脚
        const basePlate = makeCylinder(1.1, 0.08, 0x1e293b, 0.4, 0.5);
        basePlate.position.set(0, 0.04, 0);
        basePlate.receiveShadow = true;
        group.add(basePlate);

        // 调平脚螺丝 (3点分布)
        for (let i = 0; i < 3; i++) {
            const angle = (i * 2 * Math.PI) / 3;
            const foot = makeCylinder(0.08, 0.06, 0xd97706, 0.4, 0.8);
            foot.position.set(Math.cos(angle) * 0.95, 0.03, Math.sin(angle) * 0.95);
            group.add(foot);
        }

        // 2. 透明防风玻璃罩 (防止环境微气流扰动极微弱扭秤)
        const glassGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.4, 48, 1, true);
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xe2e8f0,
            transparent: true,
            opacity: 0.22,
            roughness: 0.05,
            metalness: 0.1,
            transmission: 0.9,
            ior: 1.5,
            side: THREE.DoubleSide
        });
        const glassCover = new THREE.Mesh(glassGeo, glassMat);
        glassCover.position.set(0, 0.78, 0);
        group.add(glassCover);

        // 玻璃罩金属边框环
        const ringBottom = makeCylinder(0.86, 0.03, 0x475569, 0.5, 0.6);
        ringBottom.position.set(0, 0.09, 0);
        group.add(ringBottom);

        const ringTop = makeCylinder(0.86, 0.03, 0x475569, 0.5, 0.6);
        ringTop.position.set(0, 1.48, 0);
        group.add(ringTop);

        // 3. 黄铜悬丝护管与顶端微调旋钮
        const columnGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 32);
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.25 });
        const brassColumn = new THREE.Mesh(columnGeo, brassMat);
        brassColumn.position.set(0, 2.05, 0);
        brassColumn.castShadow = true;
        group.add(brassColumn);

        const micrometerHead = makeCylinder(0.12, 0.12, 0xb45309, 0.6, 0.7);
        micrometerHead.position.set(0, 2.65, 0);
        group.add(micrometerHead);

        // 4. 内部扭转摆动总成 (绕原点 Y 轴偏转)
        const suspensionGroup = new THREE.Group();
        suspensionGroup.position.set(0, 0, 0);

        // 石英悬丝 (细金属银灰色高反光线条, 从 y=2.6 到 y=0.9)
        const wireLine = makeLine([new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(0, 0.9, 0)], 0x94a3b8, 0.9);
        suspensionGroup.add(wireLine);

        // 中央微型平面反射镜 (镀金/高反光镜片, 置于 y=1.2)
        const mirrorFrame = makeBox(0.12, 0.14, 0.02, 0xd97706, 0.3, 0.8);
        mirrorFrame.position.set(0, 1.25, 0);
        const mirrorGlass = makeBox(0.1, 0.12, 0.005, 0x38bdf8, 0.05, 0.95);
        mirrorGlass.position.set(0, 1.25, 0.012);
        const mirrorMesh = new THREE.Mesh();
        mirrorMesh.add(mirrorFrame);
        mirrorMesh.add(mirrorGlass);
        suspensionGroup.add(mirrorMesh);

        // T 形轻质横杆 (碳纤/铝合金细杆, 长度约 1.2m, 半臂长 0.6m, y=0.9)
        const beamMesh = makeBox(1.2, 0.025, 0.025, 0x475569, 0.4, 0.5);
        beamMesh.position.set(0, 0.9, 0);
        beamMesh.castShadow = true;
        suspensionGroup.add(beamMesh);

        // 悬挂吊钩连接
        const hook = makeCylinder(0.018, 0.15, 0xd97706, 0.6, 0.7);
        hook.position.set(0, 0.98, 0);
        suspensionGroup.add(hook);

        // 对称小铅球 (m₂, 半径约 0.05m, 位于横杆两端 x = ±0.6)
        const smallBallMat = { roughness: 0.35, metalness: 0.65 };
        const smallBall1 = makeSphere(0.055, 0x64748b, smallBallMat);
        smallBall1.position.set(-0.6, 0.9, 0);
        suspensionGroup.add(smallBall1);

        const smallBall2 = makeSphere(0.055, 0x64748b, smallBallMat);
        smallBall2.position.set(0.6, 0.9, 0);
        suspensionGroup.add(smallBall2);

        // 底部防气流阻尼片 (阻尼叶片浸入阻尼杯以快速达到平衡)
        const damperVane = makeBox(0.08, 0.1, 0.01, 0x64748b, 0.5, 0.3);
        damperVane.position.set(0, 0.78, 0);
        suspensionGroup.add(damperVane);

        group.add(suspensionGroup);

        // 5. 外部大铅球旋转支架与对称大球 (m₁, 位于外部靠近小球处)
        const bigBallsGroup = new THREE.Group();
        const bigTurretArm = makeBox(2.2, 0.05, 0.08, 0x334155, 0.5, 0.4);
        bigTurretArm.position.set(0, 0.9, 0);
        bigBallsGroup.add(bigTurretArm);

        const bigBallMat = { roughness: 0.28, metalness: 0.72 };
        const bigBall1 = makeSphere(0.14, 0x1e293b, bigBallMat);
        // 大球1靠近小球1 (-0.6, 0.9, +0.22)
        bigBall1.position.set(-0.6, 0.9, 0.22);
        bigBallsGroup.add(bigBall1);

        const bigBall2 = makeSphere(0.14, 0x1e293b, bigBallMat);
        // 大球2靠近小球2 (+0.6, 0.9, -0.22)
        bigBall2.position.set(0.6, 0.9, -0.22);
        bigBallsGroup.add(bigBall2);

        group.add(bigBallsGroup);

        // 6. 光杠杆系统 (半导体激光发射器 + 入射光路 + 反射光路 + 远端刻度标尺屏)
        // 激光发射管安装在光学立柱上
        const laserStand = makeCylinder(0.03, 1.25, 0x334155, 0.3, 0.6);
        laserStand.position.set(-1.8, 0.625, 1.2);
        group.add(laserStand);

        const laserHead = makeBox(0.2, 0.08, 0.08, 0x0f172a, 0.4, 0.5);
        laserHead.position.set(-1.8, 1.25, 1.2);
        group.add(laserHead);

        // 红色入射光线 (从 (-1.8, 1.25, 1.2) 指向中央镜面 (0, 1.25, 0))
        const incidentLaser = makeLine(
            [new THREE.Vector3(-1.8, 1.25, 1.2), new THREE.Vector3(0, 1.25, 0)],
            0xef4444,
            0.95
        );
        group.add(incidentLaser);

        // 远端刻度光屏 (弧形或平直标尺, 放置在 z ≈ 2.2 处)
        const scaleStand = makeCylinder(0.04, 1.5, 0x334155, 0.4, 0.5);
        scaleStand.position.set(1.4, 0.75, 2.2);
        group.add(scaleStand);

        const scalePlate = makeBox(2.2, 0.45, 0.04, 0xf8fafc, 0.9, 0.05);
        scalePlate.position.set(1.4, 1.25, 2.2);
        scalePlate.rotation.y = -0.3; // 略微迎向中央镜面
        group.add(scalePlate);

        // 标尺中心零刻度线
        const zeroLine = makeBox(0.02, 0.4, 0.05, 0x3b82f6, 0.3, 0.1);
        zeroLine.position.set(1.4, 1.25, 2.21);
        zeroLine.rotation.y = -0.3;
        group.add(zeroLine);

        // 标尺上实时光斑 (激光红斑)
        const laserSpot = makeSphere(0.03, 0xff0000, { emissive: 0xff0000, emissiveIntensity: 1.0 });
        laserSpot.position.set(1.4, 1.25, 2.23);
        group.add(laserSpot);

        // 红色反射光束 (从镜面 (0, 1.25, 0) 射向光斑)
        const reflectedLaser = makeLine([new THREE.Vector3(0, 1.25, 0), laserSpot.position.clone()], 0xef4444, 0.95);
        group.add(reflectedLaser);

        // 7. 万有引力相互作用矢量箭头 (指向大球与小球之间)
        const arrowF1 = makeArrow(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(-0.6, 0.9, 0),
            0.2,
            0x3b82f6,
            0.08,
            0.04
        );
        const arrowF2 = makeArrow(
            new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(0.6, 0.9, 0),
            0.2,
            0x3b82f6,
            0.08,
            0.04
        );
        group.add(arrowF1);
        group.add(arrowF2);

        // 8. 标注牌与物理量读数 HUD
        const infoLabel = makeTextSprite('卡文迪什扭秤 (测引力常量 G)', '#0f172a', 24, { x: 1.6, y: 0.28 });
        infoLabel.position.set(0, 2.85, 0);
        group.add(infoLabel);

        const measureLabel = makeTextSprite('引力 F | 扭转角 θ | 光斑位移 Δs', '#2563eb', 20, { x: 1.8, y: 0.25 });
        measureLabel.position.set(0, 2.5, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: CavendishHandles = {
            rootGroup: group,
            suspensionGroup,
            wireLine,
            mirrorMesh,
            beamMesh,
            smallBall1,
            smallBall2,
            bigBall1,
            bigBall2,
            bigBallsGroup,
            incidentLaser,
            reflectedLaser,
            laserSpot,
            scalePlate,
            arrowF1,
            arrowF2,
            infoLabel,
            measureLabel,
            m1: 10,
            m2: 0.5,
            distance: 0.1,
            torsionConst: 1e-4,
            mirrorDist: 5,
            armLength: 0.6,
            thetaEq: 0
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as CavendishHandles;
        const m1 = num(params['m1'], 10);
        const m2 = num(params['m2'], 0.5);
        const r = num(params['distance'], 0.1);
        const k = num(params['torsionConst'], 1e-4);
        const D = num(params['mirrorDist'], 5);
        const L = 0.6; // 半臂长

        h.m1 = m1;
        h.m2 = m2;
        h.distance = r;
        h.torsionConst = k;
        h.mirrorDist = D;
        h.armLength = L;

        // 计算真实万有引力 F = G * m1 * m2 / r²
        const F = (G_CONST * m1 * m2) / Math.max(1e-4, r * r);
        const torque = 2 * F * L; // 双侧力矩
        const thetaEq = torque / Math.max(1e-12, k); // 真实平衡扭角 (rad)
        h.thetaEq = thetaEq;

        // 大球尺寸与位置随参数动态调整
        // 视觉映射：两球球心间距在 3D 中直观展示为 0.18 + r * 0.4
        const visualOffset = 0.12 + Math.min(0.35, r * 0.5);
        h.bigBall1.position.set(-0.6, 0.9, visualOffset);
        h.bigBall2.position.set(0.6, 0.9, -visualOffset);

        // 大球半径随质量等比微调 (0.1 ~ 0.22)
        const bigRadius = THREE.MathUtils.clamp(0.08 + Math.cbrt(m1) * 0.03, 0.08, 0.25);
        h.bigBall1.geometry.dispose();
        h.bigBall1.geometry = new THREE.SphereGeometry(bigRadius, 32, 32);

        h.bigBall2.geometry.dispose();
        h.bigBall2.geometry = new THREE.SphereGeometry(bigRadius, 32, 32);

        // 小球半径随质量微调 (0.04 ~ 0.08)
        const smallRadius = THREE.MathUtils.clamp(0.04 + Math.cbrt(m2) * 0.02, 0.03, 0.09);
        h.smallBall1.geometry.dispose();
        h.smallBall1.geometry = new THREE.SphereGeometry(smallRadius, 24, 24);

        h.smallBall2.geometry.dispose();
        h.smallBall2.geometry = new THREE.SphereGeometry(smallRadius, 24, 24);

        const deltaSpot = 2 * D * thetaEq; // 真实物理位移 (m)

        if (h.infoLabel) {
            updateTextSprite(
                h.infoLabel,
                `大球 m₁=${m1}kg | 小球 m₂=${m2}kg | 间距 r=${r}m | 臂长 2L=1.2m`,
                '#0f172a',
                22
            );
        }

        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `引力 F=${F.toExponential(3)}N | 扭角 θ=${(thetaEq * 1e6).toFixed(2)}μrad | 光斑位移 Δs=${(deltaSpot * 1e3).toFixed(2)}mm`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as CavendishHandles;
        if (!h || !h.suspensionGroup) return;

        const currentTime = ctx.time;

        // 物理扭转振荡模拟：阻尼微小振荡趋向于平衡角度
        // 扭秤固有周期 T = 2π √(I / k)
        const omega0 = 1.8;
        const damping = 0.35;
        // 偏转角动态过渡：
        const visualThetaMax = Math.min(0.22, Math.max(0.03, h.thetaEq * 1e5));
        const envelope = 1 - Math.exp(-damping * currentTime) * Math.cos(omega0 * currentTime);
        const currentTheta = visualThetaMax * Math.min(1.2, envelope);

        // 1. 悬挂总成绕 Y 轴偏转 θ
        h.suspensionGroup.rotation.y = currentTheta;

        // 2. 光杠杆物理规律：
        // 中央镜面偏转 θ，法线偏转 θ，则反射光线偏转 2θ！
        const baseReflectDir = new THREE.Vector3(0.85, 0, 1.4).normalize();
        const rotMatrix = new THREE.Matrix4().makeRotationY(2 * currentTheta);
        const deflectedDir = baseReflectDir.clone().applyMatrix4(rotMatrix);

        // 光屏距离 D 映射在 3D 舞台中
        const rayDist = 2.4;
        const spotPos = new THREE.Vector3(0, 1.25, 0).add(deflectedDir.clone().multiplyScalar(rayDist));
        h.laserSpot.position.copy(spotPos);

        // 更新反射光线顶点
        const reflGeo = h.reflectedLaser.geometry as THREE.BufferGeometry;
        const posAttr = reflGeo.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, 0, 1.25, 0);
        posAttr.setXYZ(1, spotPos.x, spotPos.y, spotPos.z);
        posAttr.needsUpdate = true;

        // 3. 引力矢量箭头动态对齐与更新
        // 从小球指向对应大球
        const pSmall1 = new THREE.Vector3();
        h.smallBall1.getWorldPosition(pSmall1);
        const pBig1 = new THREE.Vector3();
        h.bigBall1.getWorldPosition(pBig1);

        const dir1 = pBig1.clone().sub(pSmall1).normalize();
        h.arrowF1.position.copy(pSmall1);
        h.arrowF1.setDirection(dir1);
        h.arrowF1.setLength(0.18, 0.05, 0.03);

        const pSmall2 = new THREE.Vector3();
        h.smallBall2.getWorldPosition(pSmall2);
        const pBig2 = new THREE.Vector3();
        h.bigBall2.getWorldPosition(pBig2);

        const dir2 = pBig2.clone().sub(pSmall2).normalize();
        h.arrowF2.position.copy(pSmall2);
        h.arrowF2.setDirection(dir2);
        h.arrowF2.setLength(0.18, 0.05, 0.03);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.9 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.9, 0);
    }
};
