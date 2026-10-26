/**
 * 机械波演示 rig — 波源活塞 + 介质质点群 + 平衡基准面 + 波长标尺
 *
 * 单一真源：质点位置与波形全部消费引擎结果 (extra.waveMedium + 追踪质点轨迹)，
 * rig **不**自算 `y = A·sin(ωt − kx)`。
 *
 * 比例尺：横向 1 世界单位 = 1 米 (介质 4 m → 4 个单位)，
 * 纵向为看清波形按 waveVerticalGain 放大 (上限 ×4)，放大倍数显示在标牌上。
 * 早期实现把介质 4 m 画进 0.64 个世界单位、波形又自算，
 * 结果「彩虹柱」挤在左侧、波形与引擎完全脱节 (#160)。
 */
import * as THREE from 'three';
import { SceneFraming, SceneRig } from '../EquipmentStage';
import { makeBox, makeLine, makeTextSprite } from '../primitives';
import { readWaveMediumFromResult } from '../../../rendering/engineExtraAccess';
import {
    WAVE_WORLD_SCALE,
    readWaveMediumView,
    waveVerticalGain,
    type WaveMediumView
} from '../../../rendering/waveMediumView';
import { STAGE_CENTER_X, num, setLabel } from './params';

/** 介质平衡面高度 (世界单位 = 米) */
export const BASE_Y = 1.15;
/** 介质质点半径 (米) —— 必须小于追踪采样间距的一半, 否则相邻质点糊成一团 */
const PARTICLE_RADIUS = 0.024;
/** 波源活塞与介质左端的水平距离 (米) */
const SOURCE_GAP = 0.34;
/** 波形线加密段数 (每两个追踪质点之间插入的线段数) */
const WAVE_SUBDIV = 4;
/** 波形线相对质点平面的前移量 (米) —— 波形必须画在质点之前才看得见 */
const WAVE_LINE_Z = 0.08;

const MODE_LABEL: Record<string, string> = {
    transverse: '横波 (振动方向 ⊥ 传播方向)',
    longitudinal: '纵波 (振动方向 ∥ 传播方向)',
    interference: '干涉 (两列波叠加)'
};

export interface WaveHandles {
    group: THREE.Group;
    /** 介质底座 (长度随介质实长变化) */
    base: THREE.Mesh;
    /** 底座支腿 (把介质台架到地面上, 不悬空) */
    legs: THREE.Mesh[];
    /** 平衡位置基准线 (虚线) */
    equilibrium: THREE.Line;
    /** 介质质点 (共享 geometry / material) */
    particles: THREE.Mesh[];
    particleGeometry: THREE.SphereGeometry;
    particleMaterial: THREE.MeshStandardMaterial;
    /** 波形线 (顶点按引擎数据逐帧刷新) */
    waveLine: THREE.Line;
    /** 波源活塞 */
    sourcePiston: THREE.Mesh;
    /** 波传播方向箭头 */
    propArrow: THREE.ArrowHelper;
    /** 波传播方向文字 */
    propLabel: THREE.Sprite;
    /** 波长标尺 + 标签 */
    lambdaBar: THREE.Line;
    lambdaLabel: THREE.Sprite;
    /** 说明标牌 (三行) */
    labelA: THREE.Sprite;
    labelB: THREE.Sprite;
    labelC: THREE.Sprite;
    /** 介质中心横坐标 (m) —— 引擎 extra 缺失时用场景默认值 1 m */
    xCenter: number;
}

/** 物理横坐标 → 世界横坐标 (1 单位 = 1 米, 介质居中于舞台中心) */
function worldX(xPhys: number, xCenter: number): number {
    return STAGE_CENTER_X + (xPhys - xCenter) * WAVE_WORLD_SCALE;
}

/** 引擎坐标 → 世界坐标 (接口要求; ownParticles 场景下舞台不再调用) */
function toWorld(pos: { x: number; y: number }, xCenter: number, gain: number): THREE.Vector3 {
    // 引擎 y 向下为正 → 世界 y 向上为正, 取反
    return new THREE.Vector3(worldX(pos.x, xCenter), BASE_Y - pos.y * gain, 0);
}

/** 介质几何 (区间 / 中心) —— 引擎 extra 优先, 缺失时用场景默认值 */
function resolveMedium(result: Parameters<SceneRig['updateEquipment']>[2]) {
    const medium = readWaveMediumFromResult(result);
    const xStart = medium?.xStart ?? -1;
    const xEnd = medium?.xEnd ?? 3;
    return {
        medium,
        xStart,
        xEnd,
        xCenter: (xStart + xEnd) / 2,
        span: (xEnd - xStart) * WAVE_WORLD_SCALE
    };
}

/** 质点数量对齐 (引擎追踪点数随波长变化) */
function syncParticles(h: WaveHandles, count: number): void {
    while (h.particles.length < count) {
        const mesh = new THREE.Mesh(h.particleGeometry, h.particleMaterial);
        // 质点密集 (追踪间距 ≈ 0.05 m), 投影会连成一片脏污 —— 不投影
        mesh.castShadow = false;
        h.group.add(mesh);
        h.particles.push(mesh);
    }
    while (h.particles.length > count) {
        const extra = h.particles.pop();
        if (extra) h.group.remove(extra);
    }
}

/** 波形线顶点刷新 (引擎质点位置线性加密, 不引入新公式) */
function updateWaveLine(h: WaveHandles, view: WaveMediumView, gain: number): void {
    const pts = view.particles;
    if (pts.length < 2) {
        h.waveLine.visible = false;
        return;
    }
    h.waveLine.visible = true;
    const count = (pts.length - 1) * WAVE_SUBDIV + 1;
    let attr = h.waveLine.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attr || attr.count !== count) {
        h.waveLine.geometry.dispose();
        h.waveLine.geometry = new THREE.BufferGeometry();
        h.waveLine.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        attr = h.waveLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    }
    const arr = attr.array as Float32Array;
    let w = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        const ax = worldX(a.x, h.xCenter);
        const ay = BASE_Y + a.yUp * gain;
        const bx = worldX(b.x, h.xCenter);
        const by = BASE_Y + b.yUp * gain;
        for (let s = 0; s < WAVE_SUBDIV; s++) {
            const t = s / WAVE_SUBDIV;
            arr[w++] = ax + (bx - ax) * t;
            arr[w++] = ay + (by - ay) * t;
            arr[w++] = 0;
        }
    }
    const last = pts[pts.length - 1]!;
    arr[w++] = worldX(last.x, h.xCenter);
    arr[w++] = BASE_Y + last.yUp * gain;
    arr[w++] = 0;
    attr.needsUpdate = true;
    h.waveLine.geometry.computeBoundingSphere();
}

export const waveRig: SceneRig = {
    worldScale: WAVE_WORLD_SCALE,
    clampToGround: false,
    // 介质质点群由 rig 自绘 (一条引擎轨迹 = 介质上的一个质点, 不是一个物体)
    ownParticles: true,

    framing(_params, result): SceneFraming {
        const { span } = resolveMedium(result);
        // 取景需覆盖: 波长标尺 (BASE_Y−0.6) ~ 顶部标牌 (BASE_Y+2.0) 与介质全长
        const distance = Math.max(5.4, span * 1.35);
        const target: [number, number, number] = [STAGE_CENTER_X, BASE_Y + 0.75, 0];
        return {
            target,
            position: [target[0] + distance * 0.18, target[1] + distance * 0.22, distance * 0.95],
            distance
        };
    },

    buildEquipment(_scene, params, result) {
        const group = new THREE.Group();
        const { xStart, xEnd, xCenter, span } = resolveMedium(result);

        // 1. 介质底座 (长度 = 介质实长)
        const base = makeBox(1, 0.06, 0.42, 0xe2e8f0, 0.62, 0.05);
        base.scale.x = span;
        base.position.set(STAGE_CENTER_X, BASE_Y - 0.04, 0);
        base.castShadow = false;
        group.add(base);

        // 1b. 支腿 —— 介质台架高到实验台面高度, 两端落地, 不悬空
        const legs: THREE.Mesh[] = [];
        const legHeight = BASE_Y - 0.07;
        for (const lx of [worldX(xStart, xCenter) + 0.35, worldX(xEnd, xCenter) - 0.35]) {
            const leg = makeBox(0.1, legHeight, 0.1, 0x94a3b8, 0.45, 0.4);
            leg.position.set(lx, legHeight / 2, 0);
            leg.castShadow = false;
            group.add(leg);
            legs.push(leg);
        }

        // 2. 平衡位置基准线 (点划线)
        const equilibrium = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(worldX(xStart, xCenter), BASE_Y, -0.12),
                new THREE.Vector3(worldX(xEnd, xCenter), BASE_Y, -0.12)
            ]),
            new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.08, gapSize: 0.05 })
        );
        equilibrium.computeLineDistances();
        group.add(equilibrium);

        // 3. 介质质点 (统一颜色 —— 同一介质, 不是多物体)
        const particleGeometry = new THREE.SphereGeometry(PARTICLE_RADIUS, 20, 14);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.38,
            metalness: 0.12,
            emissive: 0x7c2d12,
            emissiveIntensity: 0.12
        });
        const particles: THREE.Mesh[] = [];

        // 4. 波形线 (顶点由引擎数据逐帧刷新; 无引擎数据时隐藏)
        //    z 前移: 波形画在质点之前, 否则被质点球面遮住只剩尖刺
        const waveLine = makeLine([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)], 0x2563eb, 0.9);
        waveLine.position.z = WAVE_LINE_Z;
        waveLine.visible = false;
        group.add(waveLine);

        // 5. 波源活塞 (与介质左端第一个质点同相振动)
        const sourcePiston = makeBox(0.14, 0.26, 0.26, 0x334155, 0.5, 0.3);
        sourcePiston.position.set(worldX(xStart, xCenter) - SOURCE_GAP, BASE_Y, 0);
        group.add(sourcePiston);
        const sourceArm = makeBox(SOURCE_GAP, 0.06, 0.06, 0x64748b, 0.5, 0.3);
        sourceArm.position.set(worldX(xStart, xCenter) - SOURCE_GAP / 2, BASE_Y, 0);
        group.add(sourceArm);

        // 6. 波传播方向箭头 (居中于介质上方, 与顶部标牌分行, 避免文字叠字)
        const propArrowLen = Math.min(1.3, span * 0.32);
        const propArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(worldX(xCenter, xCenter) - propArrowLen / 2, BASE_Y + 0.72, 0),
            propArrowLen,
            0x16a34a,
            0.14,
            0.09
        );
        group.add(propArrow);
        // 画布 384×128 → 单行中文标签要不变形, 横向 scale 取纵向的 3 倍
        const propLabel = makeTextSprite('波传播方向', '#16a34a', 20, { x: 0.78, y: 0.26 });
        propLabel.position.set(worldX(xCenter, xCenter), BASE_Y + 0.94, 0);
        group.add(propLabel);

        // 7. 波长标尺 (横轴实长 1 单位 = 1 米) —— 居中放在台架下方, 避开两端支腿
        const lambda = num(params['wavelength'], 0.5);
        const lambdaLen = Math.min(lambda * WAVE_WORLD_SCALE, span);
        const lambdaX0 = worldX(xCenter, xCenter) - lambdaLen / 2;
        const lambdaBar = makeLine(
            [new THREE.Vector3(lambdaX0, BASE_Y - 0.34, 0), new THREE.Vector3(lambdaX0 + lambdaLen, BASE_Y - 0.34, 0)],
            0xf59e0b,
            0.95
        );
        group.add(lambdaBar);
        const lambdaLabel = makeTextSprite(`λ = ${lambda.toFixed(2)} m`, '#b45309', 22, { x: 0.84, y: 0.28 });
        lambdaLabel.position.set(lambdaX0 + lambdaLen / 2, BASE_Y - 0.58, 0);
        group.add(lambdaLabel);

        // 8. 说明标牌 (三行)
        const labelA = makeTextSprite('', '#1e293b', 22, { x: 2.6, y: 0.4 });
        const labelB = makeTextSprite('', '#334155', 22, { x: 2.6, y: 0.4 });
        const labelC = makeTextSprite('', '#64748b', 22, { x: 2.6, y: 0.4 });
        labelA.position.set(STAGE_CENTER_X, BASE_Y + 1.95, 0.2);
        labelB.position.set(STAGE_CENTER_X, BASE_Y + 1.62, 0.2);
        labelC.position.set(STAGE_CENTER_X, BASE_Y + 1.35, 0.2);
        group.add(labelA, labelB, labelC);

        const handles: WaveHandles = {
            group,
            base,
            legs,
            equilibrium,
            particles,
            particleGeometry,
            particleMaterial,
            waveLine,
            sourcePiston,
            propArrow,
            propLabel,
            lambdaBar,
            lambdaLabel,
            labelA,
            labelB,
            labelC,
            xCenter
        };

        // 初始布局 + 标牌
        applyLayout(handles, params, result);
        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        applyLayout(handles as WaveHandles, params, result);
    },

    onAnimate(handles, ctx) {
        const h = handles as WaveHandles;
        const view = readWaveMediumView(ctx.result, ctx.time);
        if (!view) return;
        const gain = waveVerticalGain(view.amplitude);

        // 介质质点位置 (引擎数据)
        for (let i = 0; i < h.particles.length && i < view.particles.length; i++) {
            const p = view.particles[i]!;
            h.particles[i]!.position.set(worldX(p.x, h.xCenter), BASE_Y + p.yUp * gain, 0);
        }

        // 波形线
        updateWaveLine(h, view, gain);

        // 波源活塞与介质左端质点同相
        const first = view.particles[0];
        if (first) {
            h.sourcePiston.position.y = BASE_Y + first.yUp * gain;
        }
    },

    getVisualPosition(pos, _params, result) {
        const { xCenter, medium } = resolveMedium(result);
        const gain = waveVerticalGain(medium?.amplitude ?? 0.1);
        return toWorld(pos, xCenter, gain);
    },

    getOrigin(_params, result) {
        const { xStart, xCenter } = resolveMedium(result);
        return new THREE.Vector3(worldX(xStart, xCenter), BASE_Y, 0);
    }
};

/**
 * 参数 / 结果变化时的布局刷新 (介质长度、波长标尺、质点数量、标牌文本)。
 */
function applyLayout(
    h: WaveHandles,
    params: Record<string, number>,
    result: Parameters<SceneRig['updateEquipment']>[2]
): void {
    const { medium, xStart, xEnd, xCenter, span } = resolveMedium(result);
    h.xCenter = xCenter;

    // 介质底座 + 平衡线
    h.base.scale.x = span;
    h.base.position.x = STAGE_CENTER_X;
    // 支腿跟着介质两端走
    const legXs = [worldX(xStart, xCenter) + 0.35, worldX(xEnd, xCenter) - 0.35];
    h.legs.forEach((leg, i) => {
        const lx = legXs[i];
        if (lx !== undefined) leg.position.x = lx;
    });
    const eqPts = [
        new THREE.Vector3(worldX(xStart, xCenter), BASE_Y, -0.12),
        new THREE.Vector3(worldX(xEnd, xCenter), BASE_Y, -0.12)
    ];
    h.equilibrium.geometry.dispose();
    h.equilibrium.geometry = new THREE.BufferGeometry().setFromPoints(eqPts);
    h.equilibrium.computeLineDistances();

    // 波传播方向箭头 + 文字 (居中于介质上方, 介质长度变了要跟着走)
    const propArrowLen = Math.min(1.3, span * 0.32);
    h.propArrow.position.set(worldX(xCenter, xCenter) - propArrowLen / 2, BASE_Y + 0.72, 0);
    h.propArrow.setLength(propArrowLen, 0.14, 0.09);
    h.propLabel.position.set(worldX(xCenter, xCenter), BASE_Y + 0.94, 0);

    // 波长标尺 (居中于介质, 避开两端支腿)
    const lambda = num(params['wavelength'], 0.5);
    const lambdaLen = Math.min(lambda * WAVE_WORLD_SCALE, span);
    const lambdaX0 = worldX(xCenter, xCenter) - lambdaLen / 2;
    h.lambdaBar.geometry.dispose();
    h.lambdaBar.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lambdaX0, BASE_Y - 0.34, 0),
        new THREE.Vector3(lambdaX0 + lambdaLen, BASE_Y - 0.34, 0)
    ]);
    h.lambdaLabel.position.set(lambdaX0 + lambdaLen / 2, BASE_Y - 0.58, 0);
    setLabel(h.lambdaLabel, `λ = ${lambda.toFixed(2)} m`, '#b45309');

    // 质点数量 (引擎追踪点数随波长自适应)
    syncParticles(h, medium?.trackedCount ?? 0);

    // 标牌: 真实参数 + 引擎几何事实 + 纵向放大倍数 (放大必须写明, 否则比例失真)
    const amplitude = medium?.amplitude ?? num(params['amplitude'], 0.1);
    const frequency = medium?.frequency ?? num(params['frequency'], 2);
    const waveSpeed = medium?.waveSpeed ?? lambda * frequency;
    const gain = waveVerticalGain(amplitude);
    const mode = medium?.mode ?? 'transverse';
    const tracked = medium?.trackedCount ?? 0;
    setLabel(
        h.labelA,
        `A = ${amplitude.toFixed(2)} m   λ = ${lambda.toFixed(2)} m   f = ${frequency.toFixed(1)} Hz`,
        '#1e293b'
    );
    setLabel(
        h.labelB,
        `v = λf = ${waveSpeed.toFixed(2)} m/s   ${MODE_LABEL[mode] ?? mode}   纵向放大 ×${gain.toFixed(1)}`,
        '#334155'
    );
    setLabel(h.labelC, `横向 1 单位 = 1 m   追踪质点 ${tracked} 个 (间距 ≤ λ/8)`, '#64748b');
}
