import { describe, it, expect } from 'vitest';
import { InertiaModel } from '../../src/models/inertia.js';
import { solveProblem } from '../../src/solver/solver-router.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new InertiaModel();

function makeProblem(mode: 'stroke' | 'stop' | 'smoothPull', overrides: Partial<{
  massRatio: number;
  initialSpeed: number;
  frictionCoeff: number;
  duration: number;
  sampleCount: number;
}> = {}): PhysicsProblem {
  const {
    massRatio = 0.1,
    initialSpeed = 2,
    frictionCoeff = 0.3,
    duration = 2,
    sampleCount = 500,
  } = overrides;
  return {
    id: `inertia-${mode}-test`,
    model: 'inertia',
    bodies: [
      { id: 'top', mass: { value: 1 * massRatio, unit: 'kg' }, position: { x: 0, y: 1 }, velocity: { x: 0, y: 0 } },
      { id: 'bottom', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: initialSpeed, y: 0 } },
    ],
    environment: { gravity: { enabled: true, value: 9.8 } },
    constraints: { inertia: { mode, massRatio, initialSpeed, frictionCoeff } },
    timeConfig: { duration, sampleCount },
  };
}

describe('InertiaModel — 模型元数据', () => {
  it('modelType 为 inertia', () => {
    expect(model.modelType).toBe('inertia');
  });
  it('名称正确', () => {
    expect(model.name).toBe('惯性实验组合');
  });
  it('description 提及牛顿第一定律', () => {
    expect(model.description).toContain('牛顿第一定律');
  });
  it('assumptions 非空', () => {
    expect(model.assumptions.length).toBeGreaterThan(0);
  });
});

describe('InertiaModel — stroke 模式 (棋子打击)', () => {
  it('元数据正确', () => {
    const r = model.solve(makeProblem('stroke'));
    expect(r.trajectories).toHaveLength(2); // 上方 + 下方
  });

  it('上方棋子 x 坐标始终为 0 (水平惯性)', () => {
    const r = model.solve(makeProblem('stroke', { initialSpeed: 3 }));
    const topTraj = r.trajectories[0]; // 上方棋子轨迹
    for (const pt of topTraj) {
      expect(pt.position.x).toBeCloseTo(0, 5);
    }
  });

  it('上方棋子最终 y = 0 (落到下方)', () => {
    const r = model.solve(makeProblem('stroke', { duration: 2, sampleCount: 1000 }));
    const topTraj = r.trajectories[0];
    const lastPt = topTraj[topTraj.length - 1];
    expect(lastPt.position.y).toBeCloseTo(0, 1);
  });

  it('下方棋子飞出 (x 增大)', () => {
    const r = model.solve(makeProblem('stroke', { initialSpeed: 2 }));
    const botTraj = r.trajectories[1];
    const firstX = botTraj[0].position.x;
    const maxX = Math.max(...botTraj.map(p => p.position.x));
    expect(maxX).toBeGreaterThan(firstX + 0.1);
  });

  it('duration 与 sampleCount 与轨迹长度一致', () => {
    const sampleCount = 800;
    const r = model.solve(makeProblem('stroke', { sampleCount }));
    expect(r.trajectories[0]).toHaveLength(sampleCount + 1);
  });

  it('explanation 包含 5 步', () => {
    const r = model.solve(makeProblem('stroke'));
    expect(r.explanation.steps.length).toBe(5);
    expect(r.explanation.steps[0].description).toContain('惯性');
  });

  it('v_t 与 x_t 图表存在', () => {
    const r = model.solve(makeProblem('stroke'));
    expect(r.charts.v_t).toBeDefined();
    expect(r.charts.x_t).toBeDefined();
    expect(r.charts.v_t!.points.length).toBeGreaterThan(0);
    expect(r.charts.x_t!.points.length).toBeGreaterThan(0);
  });
});

describe('InertiaModel — stop 模式 (小车急停)', () => {
  it('生成 2 条轨迹', () => {
    const r = model.solve(makeProblem('stop'));
    expect(r.trajectories).toHaveLength(2);
  });

  it('顶部 (木块上方) 继续向前 (x 单调不减)', () => {
    const r = model.solve(makeProblem('stop'));
    const topTraj = r.trajectories[0];
    for (let i = 1; i < topTraj.length; i++) {
      expect(topTraj[i].position.x).toBeGreaterThanOrEqual(topTraj[i - 1].position.x);
    }
  });

  it('底部 (小车) 最终停止 (v=0)', () => {
    const r = model.solve(makeProblem('stop'));
    const botTraj = r.trajectories[1];
    const lastV = botTraj[botTraj.length - 1].velocity.x;
    expect(Math.abs(lastV)).toBeLessThan(0.01);
  });

  it('summary 提及急停或木块', () => {
    const r = model.solve(makeProblem('stop'));
    expect(r.explanation.summary).toMatch(/急停|木块|小车/);
  });
});

describe('InertiaModel — smoothPull 模式 (鸡蛋落水)', () => {
  it('生成 2 条轨迹', () => {
    const r = model.solve(makeProblem('smoothPull'));
    expect(r.trajectories).toHaveLength(2);
  });

  it('鸡蛋 (上方) x 坐标始终为 0 (水平惯性)', () => {
    const r = model.solve(makeProblem('smoothPull'));
    const eggTraj = r.trajectories[0]; // 鸡蛋
    for (const pt of eggTraj) {
      expect(pt.position.x).toBeCloseTo(0, 5);
    }
  });

  it('纸板 (底部) 向右飞出 (x 增大)', () => {
    const r = model.solve(makeProblem('smoothPull'));
    const cardTraj = r.trajectories[1];
    const firstX = cardTraj[0].position.x;
    const lastX = cardTraj[cardTraj.length - 1].position.x;
    expect(lastX).toBeGreaterThan(firstX + 0.5);
  });

  it('鸡蛋最终落下到 y=0 (落入水中)', () => {
    const r = model.solve(makeProblem('smoothPull', { duration: 2 }));
    const eggTraj = r.trajectories[0];
    const lastY = eggTraj[eggTraj.length - 1].position.y;
    expect(lastY).toBeLessThan(0.1);
  });

  it('diagnostics 包含惯性保持时间', () => {
    const r = model.solve(makeProblem('smoothPull'));
    expect(r.diagnostics.maxValues.inertiaPreserveTime).toBeGreaterThan(0);
  });
});

describe('InertiaModel — 边界条件', () => {
  it('massRatio 极小正值仍可工作 (质量 > 0)', () => {
    const r = model.solve(makeProblem('stroke', { massRatio: 1e-6 }));
    expect(r.trajectories).toHaveLength(2);
    expect(r.diagnostics.maxValues.topMass).toBeGreaterThan(0);
  });

  it('massRatio = 1 (等质量)', () => {
    const r = model.solve(makeProblem('stroke', { massRatio: 1 }));
    expect(r.trajectories).toHaveLength(2);
    expect(r.diagnostics.maxValues.topMass).toBeCloseTo(1, 5);
  });

  it('massRatio 为负时 base 校验拒绝 (质量不能为负)', () => {
    // massRatio = -0.1 → bodies[0].mass < 0 → throwIfInvalid 抛出
    expect(() => model.solve(makeProblem('stroke', { massRatio: -0.1 }))).toThrow(/超出范围|质量/);
  });

  it('massRatio 为极大值时 rangeCheck 给出警告', () => {
    // massRatio=100 虽然合法, 但 inertia 模型自身的 rangeCheck 应给出警告
    const r = model.solve(makeProblem('smoothPull', { massRatio: 10 }));
    expect(r.diagnostics.rangeCheck).toBeDefined();
  });

  it('缺少 inertia 约束抛错', () => {
    const problem: PhysicsProblem = {
      id: 'no-constraint',
      model: 'inertia',
      bodies: [
        { id: 't', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 1 }, velocity: { x: 0, y: 0 } },
        { id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
      ],
      constraints: {},
      timeConfig: { duration: 1, sampleCount: 100 },
    };
    expect(() => model.solve(problem)).toThrow('inertia');
  });

  it('非法 mode 报错或走到 else 分支 (smoothPull 作为兜底)', () => {
    const problem: PhysicsProblem = {
      id: 'bad-mode',
      model: 'inertia',
      bodies: [
        { id: 't', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 1 }, velocity: { x: 0, y: 0 } },
        { id: 'b', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
      ],
      // @ts-expect-error 故意传入非法 mode 触发 default 分支
      constraints: { inertia: { mode: 'unknown' as never } },
      timeConfig: { duration: 1, sampleCount: 100 },
    };
    // 不应崩溃 (走到 else 分支 = smoothPull)
    const r = model.solve(problem);
    expect(r.trajectories).toHaveLength(2);
  });
});

describe('InertiaModel — 集成测试 (通过 solveProblem)', () => {
  it('通过 solver-router 调用可解', () => {
    const problem = makeProblem('stroke');
    const r = solveProblem(problem);
    expect(r.trajectories).toHaveLength(2);
  });

  it('计算时间 meta 存在', () => {
    const problem = makeProblem('smoothPull');
    const r = solveProblem(problem);
    expect(typeof r.meta.computationTime).toBe('number');
    expect(r.meta.computationTime).toBeGreaterThanOrEqual(0);
  });
});
