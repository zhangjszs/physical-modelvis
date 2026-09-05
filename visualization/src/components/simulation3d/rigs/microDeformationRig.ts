/**
 * 光杠杆放大微小形变 3D 实验 Rig
 * 包含：实木/玻璃实验桌台、中央受压配重块、下压微形变下凹、
 * 双平面镜支架 (M₁ 与 M₂)、半导体激光发射器、
 * 多重反射动态激光束路、远端带毫米刻度光屏与发光光斑、
 * 严格体现光杠杆物理规律：桌面微形变倾角 θ ⇛ 反射光束偏转 2θ ⇛ 远端光斑位移 Δs = 2Dθ。
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeArrow, makeTextSprite, updateTextSprite } from '../primitives';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface MicroDeformationHandles {
    rootGroup: THREE.Group;
    tableBoard: THREE.Mesh;
    loadWeight: THREE.Mesh;
    mirror1Group: THREE.Group;
    mirror2Group: THREE.Group;
    laserBeamLine: THREE.Line;
    laserSpot: THREE.Mesh;
    scaleBoard: THREE.Mesh;
    arrowPress: THREE.ArrowHelper;
    statusLabel: THREE.Sprite;
    measureLabel: THREE.Sprite;
    pressure: number;
    youngModulus: number;
    mirrorDist: number;
    tiltAngle: number;
}

export const microDeformationRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        // 1. 实木/金属实验桌台 (长 3.2m, 宽 1.0m, 台面厚度 0.08m)
        const tableBoard = makeBox(3.2, 0.08, 1.0, 0x57534e, 0.6, 0.2);
        tableBoard.position.set(0, 0.76, 0);
        tableBoard.receiveShadow = true;
        group.add(tableBoard);

        // 4根重型方钢桌腿
        [
            [-1.5, -0.4],
            [-1.5, 0.4],
            [1.5, -0.4],
            [1.5, 0.4]
        ].forEach(([tx, tz]) => {
            const leg = makeBox(0.08, 0.72, 0.08, 0x292524, 0.5, 0.4);
            leg.position.set(tx ?? 0, 0.36, tz ?? 0);
            leg.castShadow = true;
            group.add(leg);
        });

        // 2. 中央压力配重装置 (重砝码 / 压杆，施加压力 F)
        const weightBase = makeCylinder(0.22, 0.06, 0x1e293b, 0.4, 0.5);
        weightBase.position.set(0, 0.83, 0);
        group.add(weightBase);

        const loadWeight = makeCylinder(0.18, 0.22, 0x475569, 0.3, 0.7);
        loadWeight.position.set(0, 0.97, 0);
        loadWeight.castShadow = true;
        group.add(loadWeight);

        // 压力矢量箭头 (竖直向下红色)
        const arrowPress = makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 1.65, 0),
            0.5,
            0xef4444,
            0.12,
            0.06
        );
        group.add(arrowPress);

        // 3. 双平面镜光杠杆装置 (M1 置于形变区 x=-0.6，M2 置于参考端 x=0.6)
        const mirror1Group = new THREE.Group();
        mirror1Group.position.set(-0.6, 0.8, 0);
        const m1Stand = makeCylinder(0.02, 0.1, 0xd97706, 0.3, 0.8);
        m1Stand.position.set(0, 0.05, 0);
        mirror1Group.add(m1Stand);

        const m1Frame = makeBox(0.02, 0.14, 0.14, 0x334155, 0.4, 0.6);
        m1Frame.position.set(0, 0.17, 0);
        mirror1Group.add(m1Frame);

        const m1Glass = makeBox(0.005, 0.12, 0.12, 0x38bdf8, 0.05, 0.95);
        m1Glass.position.set(-0.012, 0.17, 0);
        mirror1Group.add(m1Glass);
        group.add(mirror1Group);

        const mirror2Group = new THREE.Group();
        mirror2Group.position.set(0.6, 0.8, 0);
        const m2Stand = makeCylinder(0.02, 0.1, 0xd97706, 0.3, 0.8);
        m2Stand.position.set(0, 0.05, 0);
        mirror2Group.add(m2Stand);

        const m2Frame = makeBox(0.02, 0.14, 0.14, 0x334155, 0.4, 0.6);
        m2Frame.position.set(0, 0.17, 0);
        mirror2Group.add(m2Frame);

        const m2Glass = makeBox(0.005, 0.12, 0.12, 0x38bdf8, 0.05, 0.95);
        m2Glass.position.set(0.012, 0.17, 0);
        mirror2Group.add(m2Glass);
        group.add(mirror2Group);

        // 4. 激光管与入射光路 (半导体激光器固定在左侧立柱)
        const laserStand = makeCylinder(0.03, 1.0, 0x1e293b, 0.4, 0.5);
        laserStand.position.set(-1.8, 0.5, 0.35);
        group.add(laserStand);

        const laserEmitter = makeCylinder(0.03, 0.22, 0x0f172a, 0.3, 0.7);
        laserEmitter.rotation.z = Math.PI / 2;
        laserEmitter.position.set(-1.8, 1.0, 0.35);
        group.add(laserEmitter);

        // 5. 远端带毫米刻度光屏 (位于右侧远处 x = 2.2)
        const screenStand = makeCylinder(0.04, 1.8, 0x334155, 0.4, 0.5);
        screenStand.position.set(2.2, 0.9, 0);
        group.add(screenStand);

        const scaleBoard = makeBox(0.04, 1.4, 0.6, 0xf8fafc, 0.9, 0.05);
        scaleBoard.position.set(2.2, 1.0, 0);
        scaleBoard.receiveShadow = true;
        group.add(scaleBoard);

        // 零刻度基准线
        const zeroLine = makeBox(0.045, 0.008, 0.55, 0x3b82f6, 0.3, 0.1);
        zeroLine.position.set(2.2, 1.0, 0);
        group.add(zeroLine);

        // 发光激光光斑
        const laserSpot = makeSphere(0.025, 0xff0000, { emissive: 0xff0000, emissiveIntensity: 1.0 });
        laserSpot.position.set(2.21, 1.0, 0);
        group.add(laserSpot);

        // 完整折线激光束路径 (激光笔 -> M1 -> M2 -> 光屏)
        const beamGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-1.7, 1.0, 0.35),
            new THREE.Vector3(-0.6, 0.97, 0),
            new THREE.Vector3(0.6, 0.97, 0),
            new THREE.Vector3(2.21, 1.0, 0)
        ]);
        const beamMat = new THREE.LineBasicMaterial({
            color: 0xef4444,
            linewidth: 2,
            transparent: true,
            opacity: 0.95
        });
        const laserBeamLine = new THREE.Line(beamGeo, beamMat);
        group.add(laserBeamLine);

        // 6. 原理与数据 HUD
        const statusLabel = makeTextSprite('光杠杆放大微小形变', '#0f172a', 24, { x: 1.5, y: 0.28 });
        statusLabel.position.set(0, 2.25, 0);
        group.add(statusLabel);

        const measureLabel = makeTextSprite('光学放大倍率：A = 2D/L', '#2563eb', 20, { x: 1.8, y: 0.24 });
        measureLabel.position.set(0, 1.95, 0);
        group.add(measureLabel);

        scene.add(group);

        const handles: MicroDeformationHandles = {
            rootGroup: group,
            tableBoard,
            loadWeight,
            mirror1Group,
            mirror2Group,
            laserBeamLine,
            laserSpot,
            scaleBoard,
            arrowPress,
            statusLabel,
            measureLabel,
            pressure: 100,
            youngModulus: 10,
            mirrorDist: 5,
            tiltAngle: 0
        };

        this.updateEquipment(handles as unknown as Record<string, unknown>, params);
        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as MicroDeformationHandles;
        const pressure = num(params['pressure'], 100);
        const youngGPa = num(params['youngModulus'], 10);
        const D = num(params['mirrorDist'], 5);

        h.pressure = pressure;
        h.youngModulus = youngGPa;
        h.mirrorDist = D;

        // 物理微小形变理论计算：
        // 桌面受力挠度 y ∝ F / (E * I)
        // 镜面倾角 θ ∝ F / E
        // 真实微小形变量级：θ ≈ 10⁻⁵ rad
        const trueTheta = (pressure * 1e-6) / Math.max(1, youngGPa);
        // 视觉放大演示系数 (让微观形变在 3D 画面中直观可察，微调 0 ~ 0.18 rad)
        const visualTilt = THREE.MathUtils.clamp((pressure / (youngGPa * 10)) * 0.012, 0, 0.16);
        h.tiltAngle = visualTilt;

        // 平面镜 M1 随形变倾斜
        h.mirror1Group.rotation.z = visualTilt;

        // 远端光斑垂直位移 Δs = 2 * D * trueTheta
        const deltaSpotMm = 2 * D * trueTheta * 1e3; // 毫米

        // 视觉光斑在标尺上的垂直偏移
        const spotShiftY = visualTilt * 2.8;
        h.laserSpot.position.y = 1.0 - spotShiftY;

        // 更新激光折线路径顶点
        const beamGeo = h.laserBeamLine.geometry as THREE.BufferGeometry;
        const posAttr = beamGeo.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, -1.7, 1.0, 0.35);
        posAttr.setXYZ(1, -0.6, 0.97, 0);
        posAttr.setXYZ(2, 0.6, 0.97, 0);
        posAttr.setXYZ(3, 2.21, 1.0 - spotShiftY, 0);
        posAttr.needsUpdate = true;

        // 压力矢量长度随压力大小变化
        const arrowLen = Math.max(0.2, (pressure / 500) * 0.7);
        h.arrowPress.setLength(arrowLen, 0.12, 0.06);

        if (h.statusLabel) {
            updateTextSprite(
                h.statusLabel,
                `微小形变放大法：压力 F=${pressure}N | 杨氏模量 E=${youngGPa}GPa | 光屏距离 D=${D}m`,
                '#0f172a',
                22
            );
        }

        if (h.measureLabel) {
            updateTextSprite(
                h.measureLabel,
                `微小形变倾角 θ=${(trueTheta * 1e6).toFixed(2)}μrad ⇛ 光斑位移 Δs=${deltaSpotMm.toFixed(2)}mm (光学倍增放大)`,
                '#2563eb',
                20
            );
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as MicroDeformationHandles;
        if (!h.loadWeight) return;

        const { time } = ctx;
        // 施力加压动态微动呼吸效果 (模拟人手施压或重物沉降)
        const pressSway = Math.sin(time * 3) * 0.008;
        h.loadWeight.position.y = 0.97 + pressSway;
        h.arrowPress.position.set(0, 1.65 + pressSway, 0);
    },

    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 0.8 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 0.8, 0);
    }
};
