import { describe, it, expect } from 'vitest';
import { CurveVelocityDirectionModel } from '../../src/models/curve-velocity-direction.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new CurveVelocityDirectionModel();

function makeProblem(overrides: Partial<{
  trackShape: 'circle' | 'parabola' | 'spiral';
  angularSpeed: number;
  sampleCount: number;
  radius: number;
  duration: number;
  sampleCountSteps: number;
}> = {}): PhysicsProblem {
  const {
    trackShape = 'circle',
    angularSpeed = 2,
    sampleCount = 4,
    radius = 2,
    duration = 3,
    sampleCountSteps = 400,
  } = overrides;
  return {
    id: 'curve-vel-test',
    title: '曲线运动速度方向',
    model: 'curve-velocity-direction',
    bodies: [{ id: 'p', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
    constraints: { curveVelocity: { trackShape, angularSpeed, sampleCount, radius } },
    timeConfig: { duration, sampleCount: sampleCountSteps },
  };
}

describe('CurveVelocityDirectionModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('curve-velocity-direction');
    expect(model.name).toBe('曲线运动速度方向');
  });

  it('被约束数量 ≥ 1 (失败时抛出)', () => {
    expect(() => model.solve({
      ...makeProblem(),
      bodies: [],
    } as any)).toThrow();
  });

  it('缺少必要约束时抛出', () => {
    const p = makeProblem();
    (p as any).constraints = undefined;
    expect(() => model.solve(p)).toThrow(/curveVelocity/);
  });

  it('生成 3-5 条子轨迹 (由 sampleCount 控制)', () => {
    const r = model.solve(makeProblem({ sampleCount: 5 }));
    expect(r.trajectories.length).toBe(5);
  });

  it('每条轨迹长度 = totalSamples+1 (含起点和终点)', () => {
    const r = model.solve(makeProblem({ sampleCountSteps: 400 }));
    for (const traj of r.trajectories) {
      expect(traj.length).toBe(401);
    }
  });

  it('x_t / vx_t / vy_t 三个图表必须存在', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.vx_t).toBeDefined();
    expect(r.charts.vy_t).toBeDefined();
  });

  it('x_t 的点数等于轨迹点数', () => {
    const r = model.solve(makeProblem({ sampleCountSteps: 400 }));
    expect(r.charts.x_t!.points.length).toBe(401);
  });

  it('vy_t (法向速度) 全为 0', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.vy_t!.points.every(p => p.y === 0)).toBe(true);
  });

  it('vx_t (切向速度) 非负', () => {
    const r = model.solve(makeProblem());
    expect(r.charts.vx_t!.points.every(p => p.y >= 0)).toBe(true);
  });

  it('vx_t (切向速度) 圆周情况恒定 (=ωR)', () => {
    const omega = 3;
    const radius = 2;
    const r = model.solve(makeProblem({ trackShape: 'circle', angularSpeed: omega, radius }));
    const expected = omega * radius;
    const first = r.charts.vx_t!.points[0]!.y;
    expect(first).toBeCloseTo(expected, 5);
    // 沿切线速度大小恒定 (匀速)
    for (const pt of r.charts.vx_t!.points) {
      expect(pt.y).toBeCloseTo(expected, 4);
    }
  });

  it('支持 parabola 形状', () => {
    const r = model.solve(makeProblem({ trackShape: 'parabola' }));
    expect(r.trajectories.length).toBe(4);
    expect(r.explanation.summary).toContain('抛物线');
  });

  it('支持 spiral 形状', () => {
    const r = model.solve(makeProblem({ trackShape: 'spiral' }));
    expect(r.trajectories.length).toBe(4);
    expect(r.explanation.summary).toContain('螺线');
  });

  it('关键帧包含起点、脱离点、末点', () => {
    const r = model.solve(makeProblem());
    const labels = r.keyframes.map(k => k.label);
    expect(labels.some(l => l.includes('起点'))).toBe(true);
    expect(labels.some(l => l.includes('脱离'))).toBe(true);
    expect(labels.some(l => l.includes('末点'))).toBe(true);
  });

  it('sampleCount 被夹紧在 [3,5]', () => {
    const r1 = model.solve(makeProblem({ sampleCount: 10 }));
    expect(r1.trajectories.length).toBe(5);
    const r2 = model.solve(makeProblem({ sampleCount: 1 }));
    expect(r2.trajectories.length).toBe(3);
  });

  it('解释中包含切线方向公式', () => {
    const r = model.solve(makeProblem());
    const text = r.explanation.summary + r.explanation.steps.map(s => s.description).join('');
    expect(text).toContain('切线');
  });

  it('maxValues 包含 subTrajectories 和 speed', () => {
    const r = model.solve(makeProblem({ sampleCount: 3 }));
    expect(r.diagnostics.maxValues.subTrajectories).toBe(3);
    expect(r.diagnostics.maxValues.speed).toBeGreaterThan(0);
  });
});
