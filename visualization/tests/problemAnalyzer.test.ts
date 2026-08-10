import { describe, expect, it } from 'vitest';
import { analyzePhysicsProblem } from '../src/analysis/problemAnalyzer';

describe('problemAnalyzer', () => {
  it('builds a projectile scene from a horizontal launch problem', async () => {
    const analysis = await analyzePhysicsProblem('从距地面20m高处以10m/s的速度水平抛出一小球，取g=9.8m/s²。');

    expect(analysis.sceneId).toBe('projectile');
    expect(analysis.parameters.v0).toBe(10);
    expect(analysis.parameters.angle).toBe(0);
    expect(analysis.parameters.g).toBe(9.8);
    expect(analysis.formulas).toContain('x = vx t');
    expect(analysis.checks.length).toBeGreaterThan(0);
  });

  it('extracts free-fall height and keeps SI units', async () => {
    const analysis = await analyzePhysicsProblem('小球从45m高处静止释放，做自由落体运动，求落地时间。');

    expect(analysis.sceneId).toBe('free-fall');
    expect(analysis.parameters.height).toBe(45);
    expect(analysis.checks[0]).toContain('落地时间');
  });

  it('converts centimeters and grams for spring oscillator setup', async () => {
    const analysis = await analyzePhysicsProblem('质量为500g的物体连接劲度系数k=20N/m的弹簧，振幅为10cm，做简谐运动。');

    expect(analysis.sceneId).toBe('spring');
    expect(analysis.parameters.m).toBe(0.5);
    expect(analysis.parameters.k).toBe(20);
    expect(analysis.parameters.A).toBe(0.1);
  });

  it('extracts inclined plane angle and friction coefficient', async () => {
    const analysis = await analyzePhysicsProblem('物块在倾角30°的粗糙斜面上下滑，摩擦系数μ=0.2，初速度为0m/s。');

    expect(analysis.sceneId).toBe('inclined-plane');
    expect(analysis.parameters.theta).toBe(30);
    expect(analysis.parameters.mu).toBe(0.2);
    expect(analysis.parameters.v0).toBe(0);
  });

  it('extracts collision parameters and restitution', async () => {
    const analysis = await analyzePhysicsProblem('甲质量m1=1kg，速度v1=5m/s，乙质量m2=2kg，速度v2=0m/s，发生碰撞，恢复系数e=0.8。');

    expect(analysis.sceneId).toBe('collision');
    expect(analysis.parameters.m1).toBe(1);
    expect(analysis.parameters.m2).toBe(2);
    expect(analysis.parameters.v1).toBe(5);
    expect(analysis.parameters.v2).toBe(0);
    expect(analysis.parameters.e).toBe(0.8);
  });
});