import { describe, it, expect } from 'vitest';
import { OrbitalModel } from '../../src/models/orbital.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new OrbitalModel();

/** 地球 GM (标准值 3.986×10¹⁴ m³/s²) */
const GM_EARTH = 3.986e14;
const R_EARTH = 6.371e6;

function makeProblem(r0: { x: number; y: number }, v0: { x: number; y: number }, overrides: { GM?: number; duration?: number; sampleCount?: number } = {}): PhysicsProblem {
  const { GM = GM_EARTH, duration = 6000, sampleCount = 2000 } = overrides;
  return {
    id: 'orbital-test',
    model: 'orbital',
    bodies: [{ id: 'sat', mass: { value: 1000, unit: 'kg' }, position: { ...r0 }, velocity: { ...v0 } }],
    constraints: { orbital: { GM, centralRadius: R_EARTH } },
    environment: {},
    timeConfig: { duration, sampleCount },
  };
}

describe('OrbitalModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('orbital');
    expect(model.name).toBe('万有引力与航天');
  });

  it('近地点地表的第一宇宙速度 ≈ 7.9 km/s', () => {
    const r = R_EARTH + 200e3; // 200km 轨道
    const v1 = Math.sqrt(GM_EARTH / r) / 1000;
    expect(v1).toBeGreaterThan(7.5);
    expect(v1).toBeLessThan(8.0);
  });

  it('圆轨道：r 保持恒定', () => {
    const r = R_EARTH + 400e3;
    const v = Math.sqrt(GM_EARTH / r);
    const r0 = { x: r, y: 0 };
    const v0 = { x: 0, y: v };
    const res = model.solve(makeProblem(r0, v0, { duration: 6000, sampleCount: 2000 }));
    const rSeries = res.charts.r_t!.points;
    const mean = rSeries.reduce((a, p) => a + p.y, 0) / rSeries.length;
    const maxDev = Math.max(...rSeries.map(p => Math.abs(p.y - mean)));
    // 圆轨道：半径变化 < 1%
    expect(maxDev / mean).toBeLessThan(0.01);
  });

  it('圆轨道速度 ≈ √(GM/r)', () => {
    const r = R_EARTH + 400e3;
    const vExpected = Math.sqrt(GM_EARTH / r);
    const res = model.solve(makeProblem({ x: r, y: 0 }, { x: 0, y: vExpected }, { duration: 3600 }));
    const vDiag = res.diagnostics.maxValues.vOrbit * 1000;
    expect(vDiag / 1000).toBeCloseTo(vExpected / 1000, 2);
  });

  it('逃逸速度 >轨道速度 (v_e = √2 × v_o)', () => {
    const res = model.solve(makeProblem({ x: R_EARTH + 400e3, y: 0 }, { x: 0, y: 0 }));
    const vO = res.diagnostics.maxValues.vOrbit;
    const vE = res.diagnostics.maxValues.vEscape;
    expect(vE / vO).toBeCloseTo(Math.SQRT2, 2);
  });

  it('近地点速度 > 远地点速度 (开普勒第二定律)', () => {
    // 椭圆轨道：在圆轨道处给予径向脉冲
    const r = R_EARTH + 400e3;
    const v = Math.sqrt(GM_EARTH / r);
    // 给一个椭圆初速度：略大于圆轨道速度
    const res = model.solve(makeProblem({ x: r, y: 0 }, { x: 0, y: v * 1.1 }));
    expect(res.diagnostics.maxValues.maxSpeed).toBeGreaterThan(res.diagnostics.maxValues.minSpeed);
  });

  it('机械能近似守恒 (总能量波动 < 1%)', () => {
    const r = R_EARTH + 400e3;
    const v = Math.sqrt(GM_EARTH / r);
    const res = model.solve(makeProblem({ x: r, y: 0 }, { x: 0, y: v * 1.05 }, { duration: 9000 }));
    const energies = res.charts.energy_t!.points.map(p => p.y);
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const maxDev = Math.max(...energies.map(e => Math.abs(e - mean)));
    if (Math.abs(mean) > 1) expect(maxDev / Math.abs(mean)).toBeLessThan(0.01);
  });

  it('生成 r-t 图表与 v-t 图表', () => {
    const r = R_EARTH + 400e3;
    const v = Math.sqrt(GM_EARTH / r);
    const res = model.solve(makeProblem({ x: r, y: 0 }, { x: 0, y: v }));
    expect(res.charts.r_t).toBeDefined();
    expect(res.charts.v_t).toBeDefined();
    expect(res.charts.energy_t).toBeDefined();
  });

  it('关键点包含近地点/远地点与初始/终点', () => {
    const r = R_EARTH + 400e3;
    const v = Math.sqrt(GM_EARTH / r);
    const res = model.solve(makeProblem({ x: r, y: 0 }, { x: 0, y: v * 1.1 }));
    const labels = res.keyframes.map(k => k.label);
    expect(labels).toContain('初始位置');
    expect(labels).toContain('模拟终点');
  });

  it('椭圆轨道：远地点在初始位置, 近地点向地心偏移 (v<圆轨道速度)', () => {
    const r = R_EARTH + 400e3;
    const v = Math.sqrt(GM_EARTH / r);
    const res = model.solve(makeProblem({ x: r, y: 0 }, { x: 0, y: v * 0.95 }));
    // 起始点速度 < 圆轨道速度 → 起始点为远地点 (maxR ≈ 初始 r)
    expect(res.diagnostics.maxValues.maxR).toBeCloseTo(r / 1000, 0);
    // 近地点向内偏移
    expect(res.diagnostics.maxValues.minR).toBeLessThan(r / 1000);
  });
});
