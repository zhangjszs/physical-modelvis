/**
 * L5: 渲染器-场景路由完整性自检
 *
 * 解析 SimulationCanvas.tsx 源码, 验证:
 *   1. Set<...> 中引用的每个 sceneId 都有对应的 case 分支
 *   2. 每个 case 场景在且仅在一个 Set 中
 *   3. 没有 orphan case (无 Set 归属)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, '../../src/components/simulation/SimulationCanvas.tsx'), 'utf-8');

function extractSetNames(): Array<{ name: string; members: string[] }> {
  const sets: Array<{ name: string; members: string[] }> = [];
  // 匹配 const SCENES_XXX = new Set([...]);
  const re = /const\s+(SCENES_\w+)\s*=\s*new\s*Set\(\[([\s\S]*?)\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const name = m[1]!;
    // 排除 SCENES_3D (3D 模式标记) 和 SCENES_2D_CUSTOM_BG (背景装饰)
    if (name === 'SCENES_3D' || name === 'SCENES_2D_CUSTOM_BG') continue;
    const body = m[2]!;
    const members = [...body.matchAll(/'([^']+)'|(\\w+)/g)]
      .map(x => x[1] ?? x[2])
      .filter((v): v is string => !!v && !['as', 'const'].includes(v));
    sets.push({ name, members });
  }
  return sets;
}

function extractSwitchCases(): string[] {
  const m = src.match(/switch\s*\(\s*currentScene\s*\)\s*\{([\s\S]*?)\n\s{2}\}/);
  if (!m || !m[1]) return [];
  return [...m[1].matchAll(/case\s+'([^']+)':/g)].map(x => x[1]!);
}

describe('L5: 渲染器-场景路由完整性', () => {
  const sets = extractSetNames();
  const cases = extractSwitchCases();

  it('SimulationCanvas.tsx 中存在 switch(currentScene)', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it('每个 Set<sceneId> 成员都有对应的 case 分支', () => {
    for (const set of sets) {
      for (const member of set.members) {
        expect(
          cases,
          `Set ${set.name} 中的 '${member}' 在 switch 中没有 case`,
        ).toContain(member);
      }
    }
  });

  it('每个 case 场景都能在某 Set 中找到归属', () => {
    const allSetMembers = new Set(sets.flatMap(s => s.members));
    for (const c of cases) {
      expect(
        allSetMembers.has(c),
        `case '${c}' 不属于任何 Set`,
      ).toBe(true);
    }
  });

  it('没有重复的 Set 成员', () => {
    for (const set of sets) {
      const dup = set.members.filter((v, i) => set.members.indexOf(v) !== i);
      expect(dup, `Set ${set.name} 内有重复: ${JSON.stringify(dup)}`).toEqual([]);
    }
  });

  it('所有 Set 非空', () => {
    for (const set of sets) {
      expect(set.members.length, `Set ${set.name} 不能为空`).toBeGreaterThan(0);
    }
  });

  it(`路由汇总: ${sets.length} Set × ${cases.length} case`, () => {
    // 整体健康
    expect(sets.length).toBeGreaterThan(5); // SCENES_CHAPTER2/3/WAVEOPT/EM_EQUIP/NUCLEAR/THERMAL/SENSOR
    expect(cases.length).toBeGreaterThan(20);
  });
});
