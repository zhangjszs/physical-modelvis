/**
 * L6: 参数面板物理有效范围自检
 *
 * 遍历全部 scene 的 parameters[], 验证结构性约束:
 *   1. min ≤ default ≤ max (允许相等, 如 h0=0 表示地面)
 *   2. step ≥ 0 (0 表示 "连续可调", 允许)
 *   3. description 非空
 *   4. 已知物理量范围白名单 (仅对明确无歧义的参数名触发):
 *      - g / gravity / gValue: min > 0 且 max < 100
 *      - T0 / T_initial / temperature: min ≥ 0 (开尔文)
 *      - duration / timeSpan: min > 0
 */

import { describe, it, expect } from 'vitest';
import { SCENES } from '../../src/scenes/sceneRegistry';

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
    nameTest: (n) => n === 'g' || n === 'gravity' || n === 'gValue',
    check: (p) => {
      if (p.min <= 0) return `重力 ${p.name} min ≤ 0`;
      if (p.max >= 100) return `重力 ${p.name} max ≥ 100 (高中物理不适用)`;
      return null;
    },
  },
  {
    nameTest: (n, _label, unit) => (n === 'T0' || n === 'T_initial') && unit !== '°C',
    check: (p) => {
      if (p.min < 0) return `开尔文温度 ${p.name} min < 0`;
      return null;
    },
  },
  {
    nameTest: (n) => n === 'duration' || n === 'timeSpan',
    check: (p) => {
      if (p.min <= 0) return `时长 ${p.name} min ≤ 0`;
      return null;
    },
  },
];

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
  it('所有 scene 的 parameters 数组非空', () => {
    for (const scene of SCENES) {
      expect(scene.parameters.length, `scene '${scene.id}' 无参数`).toBeGreaterThan(0);
    }
  });

  it('每个参数: min ≤ default ≤ max', () => {
    for (const scene of SCENES) {
      for (const p of scene.parameters) {
        expect(p.min, `scene '${scene.id}' param '${p.name}' min ≤ default`).toBeLessThanOrEqual(p.default);
        expect(p.default, `scene '${scene.id}' param '${p.name}' default ≤ max`).toBeLessThanOrEqual(p.max);
      }
    }
  });

  it('每个参数: step ≥ 0', () => {
    for (const scene of SCENES) {
      for (const p of scene.parameters) {
        expect(p.step, `scene '${scene.id}' param '${p.name}' step ≥ 0`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('每个参数: description 非空', () => {
    for (const scene of SCENES) {
      for (const p of scene.parameters) {
        expect(p.description.length, `scene '${scene.id}' param '${p.name}' description 非空`).toBeGreaterThan(0);
      }
    }
  });

  it('物理范围白名单 (g/T0/duration)', () => {
    const violations: string[] = [];
    for (const scene of SCENES) {
      for (const p of scene.parameters) {
        const v = checkPhysicsRange(p);
        if (v) violations.push(`[${scene.id}/${p.name}] ${v}`);
      }
    }
    expect(violations, `物理范围违规:\n${violations.join('\n')}`).toEqual([]);
  });

  it('所有参数 name 在同一 scene 内唯一', () => {
    for (const scene of SCENES) {
      const names = scene.parameters.map(p => p.name);
      const dup = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dup, `scene '${scene.id}' 有重复参数名: ${JSON.stringify(dup)}`).toEqual([]);
    }
  });

  it('所有参数 label 在同一 scene 内唯一', () => {
    for (const scene of SCENES) {
      const labels = scene.parameters.map(p => p.label);
      const dup = labels.filter((n, i) => labels.indexOf(n) !== i);
      expect(dup, `scene '${scene.id}' 有重复标签: ${JSON.stringify(dup)}`).toEqual([]);
    }
  });
});
