/**
 * 气体定律实验 rig — 刻度玻璃气缸 + 密封活塞 + 恒温水浴加热套箱 + 指针气压表 + 分子群
 * 验证玻意耳定律 (pV=C)、查理定律 (p/T=C)、盖-吕萨克定律 (V/T=C) 及理想气体状态方程 pV = nRT
 *
 * 单一真源 (#159 逐节审计 · 批次 F-3 气体定律):
 *   旧版本有三个阻断级问题:
 *   1. `getVisualPosition` 把引擎轨迹的 x (体积 V, 单位 **L**, 且是升序) 当成米用,
 *      `pos.x * 0.16` ⇒ 22.4 L ⇒ 3.58 世界单位 —— 默认小球直接飘到气缸外面,
 *      还拖出一条从气缸连到小球的蓝色轨迹线。引擎轨迹是 **p-V 状态点**, 不是空间轨迹。
 *      ⇒ 改 `ownParticles: true`, 舞台不再生成默认球/轨迹线/投影线。
 *   2. 活塞高度旧版只按**初始体积**线性定高 (V0/100 × 2.0), 整个过程纹丝不动 ——
 *      「压缩 → 压强升高」这个实验要演示的过程在画面上完全缺席。
 *      ⇒ 活塞高度改由**引擎过程插值**的当前体积驱动 (共享 utils/gasLawProcess)。
 *   3. 标牌读的是场景参数 (p0/V0/T0) 而非引擎结果, 且没有终态信息。
 *      ⇒ 读数全部改走引擎 maxValues + 引擎过程曲线。
 *   另外: 刻度线用的是**实心圆盘** (`makeCylinder` 默认封顶), 叠起来像一摞黑盘;
 *   本版改成细圆环 (Torus)。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import type { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeArrow, makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { setLabel, STAGE_CENTER_X } from './params';
import { gasLawProcessState, type GasLawMode, type GasLawProcessState } from '../../../utils/gasLawProcess';

/** 气缸内径 (世界单位) 与刻度筒高 */
const CYL_RADIUS = 0.5;
const CYL_HEIGHT = 2.3;
const CYL_BASE_Y = 0.1;
/** 气体柱最大高度 (初态体积映射到此) */
const GAS_MAX_H = 1.75;

interface GasHandles {
    pistonGroup: THREE.Group;
    gasMesh: THREE.Mesh;
    gaugeNeedle: THREE.Mesh;
    gaugeLabel: THREE.Sprite;
    stateLabel: THREE.Sprite;
    pArrow: THREE.ArrowHelper;
    label: THREE.Sprite;
    particles: THREE.Points;
    particleVelocities: Float32Array;
    /** 上次应用状态时的时间 (updateEquipment 复用, 保证与 2D 板书同拍) */
    lastTime: number;
}

const MODE_NAME: Record<GasLawMode, string> = {
    0: '等温 pV=C',
    1: '等压 V/T=C',
    2: '等容 p/T=C'
};

/** 3D rig 读数 — 单一真源: 引擎 maxValues + 引擎过程曲线 (与 2D 板书共用 utils/gasLawProcess) */
export interface GasLawRigReadouts extends GasLawProcessState {
    modeName: string;
    /** 当前气体柱高度 (世界单位) */
    gasHeight: number;
}

export function gasLawRigReadouts(
    result: SimulationResult | null | undefined,
    params: Record<string, number>,
    time: number
): GasLawRigReadouts {
    const state = gasLawProcessState(result, params, time);
    // 体积 → 气体柱高度: 截面积不变, 高度与体积成正比
    const vRef = Math.max(state.initial.volume_L, state.final.volume_L, 1e-9);
    const gasHeight = GAS_MAX_H * Math.max(0.05, Math.min(1, state.volume_L / vRef));
    return { ...state, modeName: MODE_NAME[state.mode], gasHeight };
}

/** 温度 → 气体颜色 (冷蓝 → 热红) */
function tempColor(T: number, T0: number, T1: number): number {
    const span = Math.abs(T1 - T0) < 1e-6 ? 1 : T1 - T0;
    const t = Math.max(0, Math.min(1, (T - T0) / span));
    const c = new THREE.Color();
    c.setHSL((1 - t) * 0.62, 0.82, 0.52);
    return c.getHex();
}

function framingFor(): SceneFraming {
    // 装置高 ~3.1 (含顶部两条标牌), 宽 ~1.8 —— 显式取景, 不再按 (p-V) 状态点轨迹自动取景。
    // 目标点抬高到 y=1.5: 顶部两条标牌 (y=2.62 / 2.98) 才不会被视口顶部的
    // 「3D 透视 / 正面 / 俯视」工具条压住。
    const target: [number, number, number] = [STAGE_CENTER_X + 0.15, 1.78, 0];
    const distance = 5.2;
    return {
        target,
        position: [target[0] - distance * 0.16, target[1] + distance * 0.2, distance * 0.96],
        distance
    };
}

export const gasLawRig: SceneRig = {
    worldScale: 0.16,
    // 引擎轨迹是 p-V 状态点 (不是空间轨迹) ⇒ 舞台不生成默认球/轨迹线
    ownParticles: true,
    clampToGround: true,

    framing() {
        return framingFor();
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        group.position.x = STAGE_CENTER_X;

        // 1. 厚壁精密刻度玻璃气缸
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(CYL_RADIUS, CYL_RADIUS, CYL_HEIGHT, 40, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.42,
                roughness: 0.08,
                metalness: 0.05,
                transmission: 0.88,
                ior: 1.5,
                side: THREE.DoubleSide
            })
        );
        wall.position.set(0, CYL_BASE_Y + CYL_HEIGHT / 2, 0);
        group.add(wall);

        // 重型合金底座
        const base = makeCylinder(0.66, 0.1, 0x1e293b, 0.5, 0.3);
        base.position.set(0, 0.05, 0);
        group.add(base);

        // 刻度线: **短弧刻度** (旧版实心圆盘叠成一摞黑盘; 改整圈细环又读成线圈)。
        // 只在朝向相机的一侧画一段弧 —— 与真实刻度玻璃筒的刻线一致。
        for (let i = 1; i <= 9; i++) {
            const y = CYL_BASE_Y + (i * CYL_HEIGHT) / 10;
            const tick = new THREE.Mesh(
                new THREE.TorusGeometry(CYL_RADIUS + 0.004, 0.008, 8, 20, 0.85),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.3 })
            );
            // 先在自身平面内把弧转到朝向相机的一侧 (局部 +y ⇒ 世界 +z), 再放平到 XZ 平面
            tick.rotation.set(Math.PI / 2, 0, 1.45);
            tick.position.set(0, y, 0);
            group.add(tick);
        }

        // 2. 密封活塞组件 (金属主体 + 红色双密封圈 + 操作手柄)
        const pistonGroup = new THREE.Group();
        const pistonHead = makeCylinder(CYL_RADIUS - 0.02, 0.11, 0x334155, 0.4, 0.7);
        pistonGroup.add(pistonHead);

        const ring1 = makeCylinder(CYL_RADIUS - 0.005, 0.016, 0xdc2626, 0.2, 0.8);
        ring1.position.set(0, 0.032, 0);
        pistonGroup.add(ring1);
        const ring2 = makeCylinder(CYL_RADIUS - 0.005, 0.016, 0xdc2626, 0.2, 0.8);
        ring2.position.set(0, -0.032, 0);
        pistonGroup.add(ring2);

        const rod = makeCylinder(0.04, 0.8, 0x94a3b8, 0.2, 0.9);
        rod.position.set(0, 0.48, 0);
        pistonGroup.add(rod);
        const handleBar = makeBox(0.4, 0.055, 0.055, 0x0f172a, 0.6, 0.2);
        handleBar.position.set(0, 0.9, 0);
        pistonGroup.add(handleBar);
        group.add(pistonGroup);

        // 3. 封闭气体介质柱 (随温度变化色调, 随体积变高)
        const gasMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(CYL_RADIUS - 0.03, CYL_RADIUS - 0.03, 1, 32),
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.42,
                roughness: 0.3
            })
        );
        group.add(gasMesh);

        // 气体分子微观粒子群
        const particleCount = 70;
        const particleGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(particleCount * 3);
        const particleVelocities = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const r = Math.sqrt(Math.random()) * (CYL_RADIUS - 0.08);
            posArray[i * 3] = Math.cos(theta) * r;
            posArray[i * 3 + 1] = CYL_BASE_Y + Math.random() * GAS_MAX_H;
            posArray[i * 3 + 2] = Math.sin(theta) * r;

            particleVelocities[i * 3] = (Math.random() - 0.5) * 1.5;
            particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
            particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x67e8f9,
            size: 0.04,
            transparent: true,
            opacity: 0.85
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        group.add(particles);

        // 4. 精密弹簧管指针气压表 (侧装)
        const gaugeGroup = new THREE.Group();
        const gaugePipe = makeCylinder(0.024, 0.32, 0xd97706, 0.3, 0.8);
        gaugePipe.rotation.z = Math.PI / 2;
        gaugePipe.position.set(-0.16, 0, 0);
        gaugeGroup.add(gaugePipe);

        const gaugeCasing = makeCylinder(0.24, 0.075, 0x1e293b, 0.4, 0.5);
        gaugeCasing.rotation.x = Math.PI / 2;
        gaugeGroup.add(gaugeCasing);
        const gaugeDial = makeCylinder(0.22, 0.08, 0xf8fafc, 0.3, 0.1);
        gaugeDial.rotation.x = Math.PI / 2;
        gaugeGroup.add(gaugeDial);
        const centerPin = makeCylinder(0.022, 0.085, 0xdc2626, 0.2, 0.8);
        centerPin.rotation.x = Math.PI / 2;
        gaugeGroup.add(centerPin);
        const gaugeNeedle = makeBox(0.014, 0.16, 0.014, 0xdc2626, 0.3, 0.6);
        gaugeNeedle.position.set(0, 0.06, 0.042);
        gaugeGroup.add(gaugeNeedle);

        const gaugeLabel = makeTextSprite('101 kPa', '#0f172a', 26, { x: 0.7, y: 0.22 });
        gaugeLabel.position.set(0, -0.33, 0.05);
        gaugeGroup.add(gaugeLabel);

        gaugeGroup.position.set(0.78, 0.82, 0);
        group.add(gaugeGroup);

        // 5. 恒温水浴加热套箱 (透明加热槽 + 底部加热盘)
        const bathGroup = new THREE.Group();
        const bathGlass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.68, 0.68, 0.8, 36, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.2,
                roughness: 0.1,
                transmission: 0.85,
                side: THREE.DoubleSide
            })
        );
        bathGlass.position.set(0, 0.5, 0);
        bathGroup.add(bathGlass);

        const heaterBase = makeCylinder(0.72, 0.07, 0x334155, 0.4, 0.3);
        heaterBase.position.set(0, 0.07, 0);
        bathGroup.add(heaterBase);
        group.add(bathGroup);

        // 6. 活塞受力/外压矢量箭头
        const pArrow = makeArrow(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0.1, 0), 0.6, 0xdc2626, 0.18, 0.1);
        group.add(pArrow);

        // 7. 状态标牌 (读引擎初末态)
        const label = makeTextSprite('pV = nRT', '#0f172a', 24, { x: 2.0, y: 0.34 });
        label.position.set(0, 2.62, 0);
        group.add(label);

        const stateLabel = makeTextSprite('', '#1d4ed8', 22, { x: 2.0, y: 0.32 });
        stateLabel.position.set(0, 2.98, 0);
        group.add(stateLabel);

        const handles: GasHandles = {
            pistonGroup,
            gasMesh,
            gaugeNeedle,
            gaugeLabel,
            stateLabel,
            pArrow,
            label,
            particles,
            particleVelocities,
            lastTime: 0
        };
        applyGasState(handles, params, result, 0);

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as GasHandles;
        applyGasState(h, params, result, h.lastTime);
    },

    onAnimate(handles, ctx) {
        const h = handles as GasHandles;
        h.lastTime = ctx.time;
        applyGasState(h, ctx.params, ctx.result, ctx.time);
        animateParticles(h, ctx.result, ctx.params, ctx.time);
    },

    getVisualPosition(_pos, _params) {
        // 引擎轨迹是 p-V 状态点 (不是空间轨迹) —— 装置运动由 rig 自建动画承担
        return new THREE.Vector3(STAGE_CENTER_X, CYL_BASE_Y + GAS_MAX_H / 2, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(STAGE_CENTER_X, CYL_BASE_Y + GAS_MAX_H / 2, 0);
    }
};

/** 把引擎过程状态应用到装置几何与标牌 */
function applyGasState(
    h: GasHandles,
    params: Record<string, number>,
    result: SimulationResult | null | undefined,
    time: number
): void {
    const read = gasLawRigReadouts(result, params, time);

    // 气体柱高度 = 当前体积 (截面积不变 ⇒ 高 ∝ V)
    const gasH = read.gasHeight;
    h.gasMesh.scale.set(1, gasH, 1);
    h.gasMesh.position.set(0, CYL_BASE_Y + gasH / 2, 0);

    // 活塞随气体高度上移
    h.pistonGroup.position.set(0, CYL_BASE_Y + gasH + 0.06, 0);

    // 气体颜色随温度
    const color = tempColor(read.temperature_K, read.initial.temperature_K, read.final.temperature_K);
    (h.gasMesh.material as THREE.MeshStandardMaterial).color.setHex(color);

    // 气压表指针偏转角 (0 ~ 500 kPa 对应 -120° ~ +120°)
    const p = read.pressure_kPa;
    const angle = ((p - 10) / 490) * (Math.PI * 1.33) - Math.PI * 0.66;
    h.gaugeNeedle.rotation.z = -angle;
    setLabel(h.gaugeLabel, `${p.toFixed(0)} kPa`, '#dc2626');

    // 压强外力箭头
    const arrowLen = Math.min(1.0, Math.max(0.2, (p / 250) * 0.6));
    h.pArrow.scale.set(1, arrowLen / 0.6, 1);
    h.pArrow.position.set(0, CYL_BASE_Y + gasH + 0.16, 0);

    // 标牌: 当前状态 + 引擎初末态
    setLabel(
        h.label,
        `${read.modeName}  |  p=${p.toFixed(1)}kPa  V=${read.volume_L.toFixed(1)}L  T=${read.temperature_K.toFixed(0)}K  n=${read.moles.toFixed(1)}mol`,
        '#0f172a'
    );
    setLabel(
        h.stateLabel,
        `初态 V${read.initial.volume_L.toFixed(1)}L p${read.initial.pressure_kPa.toFixed(0)}kPa T${read.initial.temperature_K.toFixed(0)}K → 终态 V${read.final.volume_L.toFixed(1)}L p${read.final.pressure_kPa.toFixed(0)}kPa T${read.final.temperature_K.toFixed(0)}K`,
        '#1d4ed8'
    );
}

/** 分子运动: 速度 ∝ √T, 反弹限制在气缸内 */
function animateParticles(
    h: GasHandles,
    result: SimulationResult | null | undefined,
    params: Record<string, number>,
    time: number
): void {
    if (!h.particles) return;
    const read = gasLawRigReadouts(result, params, time);
    const speedScale = Math.sqrt(Math.max(10, read.temperature_K) / 273.15) * 0.015;
    const gasTop = CYL_BASE_Y + read.gasHeight;
    const posAttr = h.particles.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const v = h.particleVelocities;
    const rMax = CYL_RADIUS - 0.06;

    for (let i = 0; i < arr.length / 3; i++) {
        let x = arr[i * 3] ?? 0;
        let y = arr[i * 3 + 1] ?? 0;
        let z = arr[i * 3 + 2] ?? 0;
        let vx = v[i * 3] ?? 0;
        let vy = v[i * 3 + 1] ?? 0;
        let vz = v[i * 3 + 2] ?? 0;

        x += vx * speedScale;
        y += vy * speedScale;
        z += vz * speedScale;

        const r = Math.hypot(x, z);
        if (r > rMax) {
            const normX = x / r;
            const normZ = z / r;
            const dot = vx * normX + vz * normZ;
            vx -= 2 * dot * normX;
            vz -= 2 * dot * normZ;
            x = normX * rMax * 0.98;
            z = normZ * rMax * 0.98;
        }

        if (y < CYL_BASE_Y + 0.02) {
            y = CYL_BASE_Y + 0.02;
            vy = Math.abs(vy);
        } else if (y > gasTop - 0.04) {
            y = gasTop - 0.04;
            vy = -Math.abs(vy);
        }

        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = z;
        v[i * 3] = vx;
        v[i * 3 + 1] = vy;
        v[i * 3 + 2] = vz;
    }
    posAttr.needsUpdate = true;
}
