import { describe, it, expect } from 'vitest';
import { ProjectileModel } from '../../src/models/projectile.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new ProjectileModel();

function makeProblem(overrides: { v0x?: number; v0y?: number; h0?: number; g?: number; duration?: number; sampleCount?: number } = {}): PhysicsProblem {
  const { v0x = 10, v0y = 10, h0 = 0, g = 9.8, duration = 3, sampleCount = 300 } = overrides;
  return {
    id: 'proj-test',
    title: '抛体运动',
    model: 'projectile',
    bodies: [{ id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: h0 }, velocity: { x: v0x, y: v0y } }],
    environment: { gravity: { enabled: true, value: g }, ground: { enabled: true, y: 0 } },
    timeConfig: { duration, sampleCount },
  };
}

describe('ProjectileModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('projectile');
    expect(model.name).toBe('抛体运动');
  });

  it('水平射程验证：v₀x=10, v₀y=10, h₀=0 → R = v₀x·(2·v₀y/g)', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 10, h0: 0, g: 10 }));
    // 简化 g=10: t = 2·10/10 = 2s, R = 10·2 = 20m
    const R = r.diagnostics.maxValues.range;
    expect(R).toBeCloseTo(20, 5);
  });

  it('最高点验证：v₀y=10, g=10, h₀=0 → H = v₀y²/(2g) = 5m', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 10, h0: 0, g: 10 }));
    const H = r.diagnostics.maxValues.apexHeight;
    expect(H).toBeCloseTo(5, 5);
  });

  it('飞行时间验证：v₀y=10, g=10, h₀=0 → t = 2·v₀y/g = 2s', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 10, h0: 0, g: 10 }));
    const t = r.diagnostics.maxValues.flightTime;
    expect(t).toBeCloseTo(2, 5);
  });

  it('水平分速度保持不变', () => {
    const r = model.solve(makeProblem({ v0x: 15, v0y: 20, h0: 0 }));
    const traj = r.trajectories[0];
    for (const p of traj) {
      expect(p.velocity.x).toBeCloseTo(15, 5);
    }
  });

  it('轨迹方程 y = h₀ + v₀y·t − ½gt²', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 10, h0: 5, g: 10, duration: 0.5 }));
    const p = r.trajectories[0][100]!;  // t = 0.5*100/300 → not exact, use any
    const t = p.t;
    const expectedY = 5 + 10 * t - 0.5 * 10 * t * t;
    expect(p.position.y).toBeCloseTo(expectedY, 5);
  });

  it('初始高度 h₀=10m：射程比 h₀=0 大', () => {
    const r0 = model.solve(makeProblem({ v0x: 10, v0y: 10, h0: 0, g: 10 }));
    const r10 = model.solve(makeProblem({ v0x: 10, v0y: 10, h0: 10, g: 10 }));
    expect(r10.diagnostics.maxValues.range).toBeGreaterThan(r0.diagnostics.maxValues.range);
  });

  it('最高点时竖直分速度为零', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 10, g: 10 }));
    const apexKf = r.keyframes.find(k => k.label === '最高点');
    expect(apexKf).toBeDefined();
    expect(apexKf!.velocity.y).toBeCloseTo(0, 5);
  });

  it('生成 vx-t 与 vy-t 图表', () => {
    const r = model.solve(makeProblem({}));
    expect(r.charts.vx_t).toBeDefined();
    expect(r.charts.vy_t).toBeDefined();
    expect(r.charts.energy_t).toBeDefined();
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.y_t).toBeDefined();
  });

  it('总机械能守恒 (忽略空气阻力)', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 15, h0: 5 }));
    const energies = r.charts.energy_t!.points.map(p => p.y);
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const maxDev = Math.max(...energies.map(e => Math.abs(e - mean)));
    expect(maxDev / mean).toBeLessThan(0.01);  // <1% 误差
  });

  it('解释中包含射程、最高点、飞行时间', () => {
    const r = model.solve(makeProblem({ v0x: 10, v0y: 10, g: 10 }));
    const s = r.explanation.summary;
    expect(s).toContain('射程');
    expect(s).toContain('最高点');
    expect(s).toContain('飞行');
  });
});
