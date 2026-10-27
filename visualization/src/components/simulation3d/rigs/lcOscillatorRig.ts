/**
 * LC 振荡电路 rig — 密绕电感线圈 + 平行板电容器 + 双刀双掷开关 + 电磁振荡标牌
 * 演示电场能与磁场能的相互周期性转化 T = 2π√(LC)
 *
 * #159 逐节审计修复:
 *   1. 旧实现读 `params['L'] ?? params['inductance']` —— 场景参数名是 **`Lind`**,
 *      两个名字都不存在 → `num(..., 0.1)` 静默回退 0.1 H (真实 10 μH, **差 1 万倍**);
 *   2. 旧实现读 `params['C']` (场景单位 **pF**) 却当成 **F** → 差 1e12 倍;
 *      两者相乘, 标牌显示 `T = 19869.06 ms | f = 0.1 Hz`, 而引擎真值是
 *      `T = 0.19869 μs | f = 5.0332 MHz` —— **偏差 1.0×10⁸**。
 *   现在: 全部读数走**引擎 `diagnostics.maxValues`** (period/frequency/inductance/capacitance),
 *   场景参数只用于单位换算与兜底。
 *
 *   3. 引擎轨迹只有 1 个点 (0,0) —— 电荷 q(t) 走的是 charts `x_t`, 不是轨迹。
 *      rig 改为在 `onAnimate` 里读引擎 chart 的 q(t)/i(t), 驱动电容极板间隙的
 *      「电荷指示球」与能量柱, 让「电场能 ↔ 磁场能往返振荡」真正可见。
 */
import * as THREE from 'three';
import type { SimulationResult } from 'physics-core';
import { chartsOf } from 'physics-core';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeLine, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
/** 电荷指示球在电容极板间的最大偏移 (世界单位) */
const CHARGE_INDICATOR_SPAN = 0.26;

export interface LCHandles {
    coil: THREE.Group;
    capacitor: THREE.Group;
    switchLever: THREE.Mesh;
    infoLabel: THREE.Sprite;
    /** 电荷指示球 (随 q(t) 在极板间往返) */
    chargeBall: THREE.Mesh;
    /** 电场能指示条 (高度 ∝ Ee) */
    energyBar: THREE.Mesh;
}

/**
 * LC 振荡读数 — **单一真源: 引擎 `diagnostics.maxValues`** (#159 逐节审计)
 */
export interface LCOscillatorReadouts {
    /** 电感 (H) */
    inductance: number;
    /** 电容 (F) */
    capacitance: number;
    /** 角频率 (rad/s) */
    omega: number;
    /** 频率 (Hz) */
    frequency: number;
    /** 周期 (s) */
    period: number;
    /** 初始电荷 (C) */
    maxCharge: number;
    /** 最大电流 (A) */
    maxCurrent: number;
    /** 总能量 (J) */
    totalEnergy: number;
    /** 读数来源 */
    source: 'engine' | 'fallback';
}

export function lcOscillatorReadouts(
    params: Record<string, number>,
    result?: SimulationResult | null
): LCOscillatorReadouts {
    // 场景单位: C = pF, Lind = μH, Q0 = μC
    const capFromParams = num(params['C'], 100) * 1e-12;
    const indFromParams = num(params['Lind'], 10) * 1e-6;
    const q0FromParams = num(params['Q0'], 1) * 1e-6;

    const mv = result?.diagnostics?.maxValues as Record<string, number> | undefined;
    if (mv && typeof mv['period'] === 'number' && typeof mv['frequency'] === 'number') {
        return {
            inductance: typeof mv['inductance'] === 'number' ? mv['inductance'] : indFromParams,
            capacitance: typeof mv['capacitance'] === 'number' ? mv['capacitance'] : capFromParams,
            omega: typeof mv['omega'] === 'number' ? mv['omega'] : 0,
            frequency: mv['frequency'],
            period: mv['period'],
            maxCharge: typeof mv['maxCharge'] === 'number' ? mv['maxCharge'] : q0FromParams,
            maxCurrent: typeof mv['maxCurrent'] === 'number' ? mv['maxCurrent'] : 0,
            totalEnergy: typeof mv['totalEnergy'] === 'number' ? mv['totalEnergy'] : 0,
            source: 'engine'
        };
    }
    const omega = Math.sqrt(1 / (indFromParams * capFromParams));
    const period = (2 * Math.PI) / omega;
    return {
        inductance: indFromParams,
        capacitance: capFromParams,
        omega,
        frequency: 1 / period,
        period,
        maxCharge: q0FromParams,
        maxCurrent: omega * q0FromParams,
        totalEnergy: (q0FromParams * q0FromParams) / (2 * capFromParams),
        source: 'fallback'
    };
}

/** 标牌文案: 周期/频率按量级自适应单位 (μs / ms / s; Hz / kHz / MHz) */
export function lcOscillatorLabel(read: LCOscillatorReadouts): string {
    const T = read.period;
    const tText =
        T >= 1e-3
            ? `${(T * 1e3).toFixed(3)} ms`
            : T >= 1e-6
              ? `${(T * 1e6).toFixed(4)} μs`
              : `${(T * 1e9).toFixed(2)} ns`;
    const f = read.frequency;
    const fText =
        f >= 1e6 ? `${(f / 1e6).toFixed(4)} MHz` : f >= 1e3 ? `${(f / 1e3).toFixed(4)} kHz` : `${f.toFixed(3)} Hz`;
    const lText =
        read.inductance >= 1e-3
            ? `${(read.inductance * 1e3).toFixed(3)} mH`
            : `${(read.inductance * 1e6).toFixed(3)} μH`;
    const cText =
        read.capacitance >= 1e-6
            ? `${(read.capacitance * 1e6).toFixed(3)} μF`
            : `${(read.capacitance * 1e12).toFixed(3)} pF`;
    return `T = 2π√(LC) = ${tText} | f = ${fText} | L=${lText} C=${cText}`;
}

/** 从引擎 charts 读当前时刻的电荷 q(t) 与电流 i(t) (归一化到 [-1,1]) */
export function lcOscillatorState(result: SimulationResult | null | undefined, time: number): { q: number; i: number } {
    if (!result) return { q: 0, i: 0 };
    const charts = chartsOf(result, 'lc-oscillator');
    const qSeries = charts?.['x_t'];
    const iSeries = charts?.['y_t'];
    const sample = (series: typeof qSeries): number => {
        if (!series || !series.points || series.points.length === 0) return 0;
        const pts = series.points;
        if (time <= pts[0]!.x) return pts[0]!.y;
        const last = pts[pts.length - 1]!;
        if (time >= last.x) return last.y;
        let lo = 0;
        let hi = pts.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (pts[mid]!.x <= time) lo = mid;
            else hi = mid;
        }
        const p0 = pts[lo]!;
        const p1 = pts[hi]!;
        const span = p1.x - p0.x;
        const r = span > 0 ? (time - p0.x) / span : 0;
        return p0.y + (p1.y - p0.y) * r;
    };
    return { q: sample(qSeries), i: sample(iSeries) };
}

export const lcOscillatorRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,
    /** rig 自绘电荷指示球 → 舞台不生成默认占位球 */
    ownParticles: true,

    /**
     * 显式取景 (#165 逐节复核 · 问题二·视觉 · 严重)
     *
     * 背景: 本 rig 是 24 节里**唯一**同时满足「`ownParticles: true` + 没有 `framing`」的 rig。
     *   舞台的自动取景 (EquipmentStage 的轨迹包围盒 → 相机) 依赖 `getVisualPosition` 产出的
     *   轨迹点, 而本 rig 自绘电荷指示球, 舞台拿不到轨迹点 ⇒ 自动取景整体失效 ⇒
     *   相机退回默认远景 ⇒ 3.0 宽的实验底板只占视口 ~30%, 顶部读数标牌还被视口上沿切掉。
     *
     * 修复: 显式给出 framing —— 目标点对准装置中心 (世界 x = 0, 与 magneticFieldRig 同口径),
     *   距离按「底板宽 3.0 约占视口宽度 60%」反推, 并把目标点抬到 y = 0.62,
     *   让顶部读数标牌 (y ≈ 0.85) 落在视口工具条下方。
     */
    framing() {
        const target: [number, number, number] = [0, 0.62, 0];
        const distance = 5.0;
        return {
            target,
            position: [target[0] + distance * 0.22, target[1] + distance * 0.3, distance * 0.92],
            distance
        };
    },

    buildEquipment(scene, params, result) {
        const group = new THREE.Group();

        // 1. 绝缘实验底板
        const board = makeBox(3.0, 0.05, 1.6, 0x1e293b, 0.5, 0.1);
        board.position.set(0, 0.025, 0);
        group.add(board);

        // 2. 密绕空心/铁芯电感线圈 L (左侧)
        const coil = new THREE.Group();
        const core = makeCylinder(0.12, 0.8, 0x334155, 0.6, 0.4);
        core.rotation.z = Math.PI / 2;
        coil.add(core);

        // 铜线匝圈
        for (let i = -6; i <= 6; i++) {
            const turn = new THREE.Mesh(
                new THREE.TorusGeometry(0.14, 0.015, 12, 32),
                new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 })
            );
            turn.rotation.y = Math.PI / 2;
            turn.position.set(i * 0.05, 0, 0);
            coil.add(turn);
        }
        coil.position.set(-0.8, 0.22, 0.25);
        group.add(coil);

        const coilLabel = makeTextSprite('电感线圈 L', '#d97706', 20, { x: 0.6, y: 0.15 });
        coilLabel.position.set(-0.8, 0.45, 0.25);
        group.add(coilLabel);

        // 3. 电容器 C (右侧两块平行金属极板)
        const capacitor = new THREE.Group();
        const plateL = makeBox(0.04, 0.45, 0.45, 0x94a3b8, 0.3, 0.85);
        plateL.position.set(-0.08, 0, 0);
        capacitor.add(plateL);

        const plateR = makeBox(0.04, 0.45, 0.45, 0x94a3b8, 0.3, 0.85);
        plateR.position.set(0.08, 0, 0);
        capacitor.add(plateR);
        capacitor.position.set(0.8, 0.25, 0.25);
        group.add(capacitor);

        const capLabel = makeTextSprite('电容器 C', '#3b82f6', 20, { x: 0.6, y: 0.15 });
        capLabel.position.set(0.8, 0.55, 0.25);
        group.add(capLabel);

        // 4. 双刀双掷开关与导线回路
        const switchBase = makeBox(0.35, 0.06, 0.25, 0x0f172a, 0.6, 0.2);
        switchBase.position.set(0, 0.06, -0.4);
        group.add(switchBase);

        const switchLever = makeBox(0.02, 0.16, 0.02, 0xdc2626, 0.4, 0.3);
        switchLever.rotation.z = Math.PI / 5;
        switchLever.position.set(0, 0.14, -0.4);
        group.add(switchLever);

        // 铜导线闭合环路
        const loopPts = [
            new THREE.Vector3(-0.8, 0.22, 0.25),
            new THREE.Vector3(-0.8, 0.1, -0.4),
            new THREE.Vector3(0.8, 0.1, -0.4),
            new THREE.Vector3(0.8, 0.25, 0.25)
        ];
        const loopWire = makeLine(loopPts, 0xeab308, 0.8);
        group.add(loopWire);

        // 5. 电荷指示球 (在电容极板间往返, 位置 = 引擎 q(t))
        const chargeBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 })
        );
        chargeBall.position.set(0.8, 0.25, 0.25);
        group.add(chargeBall);

        // 6. 电场能指示条 (高度 ∝ Ee/E_total, 与磁场能互补)
        const energyBar = makeBox(0.06, 0.5, 0.06, 0x22c55e, 0.5, 0.2);
        energyBar.position.set(1.15, 0.25, 0.25);
        group.add(energyBar);
        const barLabel = makeTextSprite('电场能 Ee', '#22c55e', 18, { x: 0.55, y: 0.13 });
        barLabel.position.set(1.15, 0.58, 0.25);
        group.add(barLabel);

        // 7. 振荡周期与频率标牌 (读引擎)
        const read = lcOscillatorReadouts(params, result);
        const infoLabel = makeTextSprite(lcOscillatorLabel(read), '#2563eb', 24, { x: 1.5, y: 0.22 });
        infoLabel.position.set(0, 0.85, 0.1);
        group.add(infoLabel);

        scene.add(group);

        const handles: LCHandles = {
            coil,
            capacitor,
            switchLever,
            infoLabel,
            chargeBall,
            energyBar
        };

        return { group, handles };
    },

    updateEquipment(handles, params, result) {
        const h = handles as LCHandles;
        setLabel(h.infoLabel, lcOscillatorLabel(lcOscillatorReadouts(params, result)), '#2563eb');
    },

    onAnimate(handles, ctx) {
        const h = handles as LCHandles;
        const { q, i } = lcOscillatorState(ctx.result, ctx.time);
        // 电荷指示球: q(t) ∈ [-Q₀, Q₀] → 在极板间往返
        const qNorm = Math.max(-1, Math.min(1, q));
        h.chargeBall.position.set(0.8 + qNorm * CHARGE_INDICATOR_SPAN, 0.25, 0.25);
        // 开关摆杆随电流摆动 (±0.35 rad), 表示回路中有电流
        h.switchLever.rotation.z = Math.PI / 5 + Math.max(-1, Math.min(1, i)) * 0.35;
        // 电场能指示条: Ee/E_total = 1 − (i/i_max)² (电荷全部转为磁场能时为 0)
        const iNorm = Math.max(-1, Math.min(1, i));
        const eeRatio = Math.max(0.02, 1 - iNorm * iNorm);
        h.energyBar.scale.y = eeRatio;
        h.energyBar.position.y = 0.25;
    },

    getVisualPosition(_pos, _params, _result) {
        // 电荷指示球由 onAnimate 按引擎 chart 驱动, 这里只给电容中心作为轨迹原点
        return new THREE.Vector3(0.8, 0.25, 0.25);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0.8, 0.25, 0.25);
    }
};
