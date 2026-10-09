/**
 * L6: 参数面板物理有效范围自检
 *
 * 遍历全部 scene 的 parameters[], 验证结构性约束:
 *   1. min ≤ default ≤ max (允许相等, 如 h0=0 表示地面)
 *   2. step ≥ 0 (0 表示 "连续可调", 允许) 且 default 落在 step 网格 (#96:
 *      滑块 step 属性会把首次交互的值吸附到 min + k·step, default 脱网格时
 *      学生拖动前看到的初值与拖动后的值不是同一个数 — 静默漂移)
 *   3. description 非空
 *   4. 已知物理量范围白名单 (仅对明确无歧义的参数名触发):
 *      - g / gravity / gValue: min > 0 且 max < 100
 *      - T0 / T_initial / temperature: min ≥ 0 (开尔文)
 *      - duration / timeSpan: min > 0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAllScenes, getScenesSync } from '../../src/scenes/sceneRegistry';

interface ParamLike {
    name: string;
    label: string;
    unit: string;
    value: number;
    min: number;
    max: number;
    step: number;
    default: number;
    description: string;
}

/** 仅对明确无歧义的参数名做物理范围检查, 避免标签正则的误判 */
const PHYSICS_RULES: Array<{
    nameTest: (n: string, label: string, unit: string) => boolean;
    check: (p: ParamLike) => string | null;
}> = [
    {
        nameTest: n => n === 'g' || n === 'gravity' || n === 'gValue',
        check: p => {
            if (p.min <= 0) return `重力 ${p.name} min ≤ 0`;
            if (p.max >= 100) return `重力 ${p.name} max ≥ 100 (高中物理不适用)`;
            return null;
        }
    },
    {
        nameTest: (n, _label, unit) => (n === 'T0' || n === 'T_initial') && unit !== '°C',
        check: p => {
            if (p.min < 0) return `开尔文温度 ${p.name} min < 0`;
            return null;
        }
    },
    {
        nameTest: n => n === 'duration' || n === 'timeSpan',
        check: p => {
            if (p.min <= 0) return `时长 ${p.name} min ≤ 0`;
            return null;
        }
    }
];

/**
 * 连续可调参数登记表 (#96): step ≤ 0 的参数跳过 default 网格检查, 但必须在此显式登记
 * ('sceneId/paramName'), 未登记的新 step=0 参数会被门禁拦下 (逼其显式声明意图)。
 */
const CONTINUOUS_PARAMS: ReadonlyArray<string> = [
    // 卡文迪什悬丝扭转常数: 量程跨 8 个数量级 (1e-10 ~ 1e-2), 任何线性 step 都无意义,
    // 连续可调是刻意选择 (网格检查不适用)
    'cavendish/torsionConst'
];

/** default 落网格判据的相对容差 (k = (default-min)/step 与最近整数的距离) */
const GRID_TOL = 1e-6;

function checkPhysicsRange(p: ParamLike): string | null {
    for (const rule of PHYSICS_RULES) {
        if (rule.nameTest(p.name, p.label, p.unit)) {
            const v = rule.check(p);
            if (v) return v;
        }
    }
    return null;
}

describe('L6: 参数面板物理有效范围', () => {
    beforeAll(async () => {
        await loadAllScenes();
    });

    it('所有 scene 的 parameters 数组非空', () => {
        for (const scene of getScenesSync()) {
            expect(scene.parameters.length, `scene '${scene.id}' 无参数`).toBeGreaterThan(0);
        }
    });

    it('每个参数: min ≤ default ≤ max', () => {
        for (const scene of getScenesSync()) {
            for (const p of scene.parameters) {
                expect(p.min, `scene '${scene.id}' param '${p.name}' min ≤ default`).toBeLessThanOrEqual(p.default);
                expect(p.default, `scene '${scene.id}' param '${p.name}' default ≤ max`).toBeLessThanOrEqual(p.max);
            }
        }
    });

    it('每个参数: step ≥ 0 且 default 落在 step 网格 (连续可调参数须显式登记)', () => {
        const offGrid: string[] = [];
        const unregistered: string[] = [];
        const registered = new Set(CONTINUOUS_PARAMS);
        for (const scene of getScenesSync()) {
            for (const p of scene.parameters) {
                expect(p.step, `scene '${scene.id}' param '${p.name}' step ≥ 0`).toBeGreaterThanOrEqual(0);
                if (!(p.step > 0)) {
                    const key = `${scene.id}/${p.name}`;
                    if (!registered.has(key)) unregistered.push(`${key} (step=${p.step})`);
                    continue;
                }
                const k = (p.default - p.min) / p.step;
                if (Math.abs(k - Math.round(k)) > GRID_TOL * Math.max(1, Math.abs(k))) {
                    offGrid.push(
                        `${scene.id}/${p.name}: default=${p.default} 不在网格 min=${p.min} + k·step=${p.step} (k=${k})`
                    );
                }
            }
        }
        expect(
            unregistered,
            `未登记的连续可调参数 (step≤0), 请加入 CONTINUOUS_PARAMS 或补 step:\n${unregistered.join('\n')}`
        ).toEqual([]);
        expect(offGrid, `default 不在 step 网格 (只改 min/step, 不动 default):\n${offGrid.join('\n')}`).toEqual([]);
    });

    it('每个参数: description 非空', () => {
        for (const scene of getScenesSync()) {
            for (const p of scene.parameters) {
                expect(p.description.length, `scene '${scene.id}' param '${p.name}' description 非空`).toBeGreaterThan(
                    0
                );
            }
        }
    });

    it('物理范围白名单 (g/T0/duration)', () => {
        const violations: string[] = [];
        for (const scene of getScenesSync()) {
            for (const p of scene.parameters) {
                const v = checkPhysicsRange(p);
                if (v) violations.push(`[${scene.id}/${p.name}] ${v}`);
            }
        }
        expect(violations, `物理范围违规:\n${violations.join('\n')}`).toEqual([]);
    });

    it('所有参数 name 在同一 scene 内唯一', () => {
        for (const scene of getScenesSync()) {
            const names = scene.parameters.map(p => p.name);
            const dup = names.filter((n, i) => names.indexOf(n) !== i);
            expect(dup, `scene '${scene.id}' 有重复参数名: ${JSON.stringify(dup)}`).toEqual([]);
        }
    });

    it('所有参数 label 在同一 scene 内唯一', () => {
        for (const scene of getScenesSync()) {
            const labels = scene.parameters.map(p => p.label);
            const dup = labels.filter((n, i) => labels.indexOf(n) !== i);
            expect(dup, `scene '${scene.id}' 有重复标签: ${JSON.stringify(dup)}`).toEqual([]);
        }
    });
});
