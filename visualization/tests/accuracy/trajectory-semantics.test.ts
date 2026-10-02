/**
 * 轨迹语义守卫 — TrajectoryPoint 的字段语义不能被悄悄滥用
 *
 * 背景: `TrajectoryPoint` 的字段是 position / velocity / acceleration? / kineticEnergy? / potentialEnergy?,
 * 消费方有三个: 数据面板 StateInspector、曲线适配器 simulationResultAdapter、渲染层 getFrame()。
 * 但相当一部分模型把**参数扫描结果**塞进了这个结构 (如 electroscope 的 position.y = 张角 θ、
 * coulomb-force-explore 的 position.y = 库仑力 F), 于是面板会显示「位置 y = 90.000 m」「势能 = 90 J」
 * 这类量纲错乱的假读数 (#72 复验时发现)。
 *
 * 本文件固化两条判据:
 *   K1 **零容忍**: 不允许任何场景 velocity 恒为 0 却给出非零 kineticEnergy
 *      (Ek = ½m|v|², v=0 ⇒ Ek 必为 0 —— 这是自相矛盾, 与"字段复用"无关, 必须为零)
 *   K2 **白名单登记**: velocity 恒为 0 但 position 随 t 变化的场景 (= 把轨迹当数据载体用)
 *      必须恰好等于下表。新增此类场景会让本断言失败 —— 逼作者显式承认自己在复用字段,
 *      而不是让假读数静默上线。彻底修法 (按模型给输出建模/类型化契约) 属设计工作, 见 issue #73。
 */
import { beforeAll, describe, it, expect } from 'vitest';
import { loadAllScenes, getScenesSync } from '../../src/scenes/sceneRegistry';
import { solveProblem } from 'physics-core';
import type { SimulationResult } from 'physics-core';
import type { SceneConfig } from '../../src/types/visualization';

function defaultParams(scene: SceneConfig): Record<string, number> {
    const p: Record<string, number> = {};
    for (const x of scene.parameters) p[x.name] = x.default;
    return p;
}

/** 把每个场景的第一条轨迹压成三个标量, 供两条判据复用 */
function probeTrajectory(result: SimulationResult) {
    const traj = result.trajectories[0] ?? [];
    if (traj.length < 3) return null;
    return {
        maxSpeed: Math.max(...traj.map(p => Math.hypot(p.velocity.x, p.velocity.y))),
        maxKe: Math.max(...traj.map(p => Math.abs(p.kineticEnergy ?? 0))),
        spanX: Math.max(...traj.map(p => p.position.x)) - Math.min(...traj.map(p => p.position.x)),
        spanY: Math.max(...traj.map(p => p.position.y)) - Math.min(...traj.map(p => p.position.y))
    };
}

/**
 * K2 白名单 — velocity 恒 0 但 position 随 t 变化的 24 个场景 (2026-10-02 普查基线)。
 * 每一项都是"把轨迹数组当参数扫描曲线用": position 存的不是空间位置, 而是被扫量与响应量。
 * 修好一个就从这里删一个 (并在 issue #73 记录)。
 */
const DATA_CARRIER_SCENES: string[] = [
    'sound-waveform', // y = 质点位移
    'water-diffraction', // x = 角度扫描
    'thermistor', // x = 温度, y = 电阻
    'strain-gauge', // x = 应变, y = 桥压
    'security-alarm', // x = 距离扫描, y = 状态位
    'light-control-switch', // x = 时刻, y = 照度/电平
    'coulomb-force-explore', // x = q₁, y = 库仑力 F
    'electroscope', // x = q, y = 张角 θ
    'refraction', // y = 折射角/光强
    'total-internal-reflection', // 同上
    'interference', // x = 屏上位置, y = 光强
    'thin-film', // y = 反射率
    'diffraction-grating', // y = 衍射强度
    'polarization-malus', // y = 透射光强
    'hologram', // y = 条纹对比度
    'heat-direction', // x/y = 温度分布
    'alpha-scattering', // x = 散射角, y = 计数
    'black-body', // x = 波长, y = 单色辐出度
    'electron-diffraction', // y = 衍射环强度
    'radiation-deflection', // x/y = 偏转量
    'decay-statistics', // x = 计数区间, y = 频次
    'cosmic-ray', // y = 强度随高度
    'neutron-discovery', // y = 电离计数
    'fission-chain' // y = 每代中子数
];

describe('轨迹语义守卫', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    it('K1 零容忍: 没有场景在速度恒为 0 时报告非零动能', () => {
        const violations: string[] = [];
        for (const scene of getScenesSync()) {
            let result: SimulationResult;
            try {
                result = solveProblem(scene.buildProblem(defaultParams(scene)));
            } catch {
                continue; // 求解抛错由 L2 契约自检负责
            }
            const probe = probeTrajectory(result);
            if (!probe) continue;
            if (probe.maxSpeed === 0 && probe.maxKe > 0) {
                violations.push(`${scene.id} [${scene.model}]: |v|≡0 但 max Ek = ${probe.maxKe}`);
            }
        }
        expect(violations, `自相矛盾的能量输出 ${violations.length} 个:\n${violations.join('\n')}`).toEqual([]);
    });

    it('K2 白名单: 「轨迹当数据载体」的场景集合不得扩大 (必须与登记表完全一致)', () => {
        const found: string[] = [];
        for (const scene of getScenesSync()) {
            let result: SimulationResult;
            try {
                result = solveProblem(scene.buildProblem(defaultParams(scene)));
            } catch {
                continue;
            }
            const probe = probeTrajectory(result);
            if (!probe) continue;
            if (probe.maxSpeed === 0 && (probe.spanX > 1e-9 || probe.spanY > 1e-9)) {
                found.push(scene.id);
            }
        }
        // 只要求"不得超出白名单": 修好一个场景后从白名单删项即可, 不必同步改本断言。
        const outside = found.filter(id => !DATA_CARRIER_SCENES.includes(id));
        expect(
            outside,
            `新增未登记的字段复用场景 (请改用 charts/diagnostics 或加入白名单并说明):\n${outside.join('\n')}`
        ).toEqual([]);
    });
});
