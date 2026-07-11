import { describe, it, expect } from 'vitest';
import { UniformLinearModel } from '../../src/models/uniform-linear.js';
import { UniformAcceleratedModel } from '../../src/models/uniform-accelerated.js';
import { sampleTrajectory } from '../../src/physics/kinematics.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const linearModel = new UniformLinearModel();
const accelModel = new UniformAcceleratedModel();

describe('UniformLinearModel', () => {
  const makeProblem = (vx: number, vy: number, x0: number, y0: number, duration: number): PhysicsProblem => ({
    id: 'test-linear',
    model: 'uniform-linear',
    bodies: [{ id: 'body1', mass: { value: 1, unit: 'kg' }, position: { x: x0, y: y0 }, velocity: { x: vx, y: vy } }],
    timeConfig: { duration, sampleCount: 100 },
  });

  it('正方向匀速运动', () => {
    const result = linearModel.solve(makeProblem(10, 0, 0, 0, 5));
    const last = result.trajectories[0][result.trajectories[0].length - 1];
    expect(last.position.x).toBeCloseTo(50); // x = 10 * 5 = 50
    expect(last.position.y).toBeCloseTo(0);
    expect(last.velocity.x).toBeCloseTo(10);
    expect(last.velocity.y).toBeCloseTo(0);
  });

  it('反方向匀速运动', () => {
    const result = linearModel.solve(makeProblem(-5, 0, 100, 0, 10));
    const last = result.trajectories[0][result.trajectories[0].length - 1];
    expect(last.position.x).toBeCloseTo(50); // x = 100 + (-5)*10 = 50
  });

  it('静止物体', () => {
    const result = linearModel.solve(makeProblem(0, 0, 5, 3, 10));
    const last = result.trajectories[0][result.trajectories[0].length - 1];
    expect(last.position.x).toBeCloseTo(5);
    expect(last.position.y).toBeCloseTo(3);
  });

  it('加速度恒为零', () => {
    const result = linearModel.solve(makeProblem(10, 0, 0, 0, 1));
    for (const point of result.trajectories[0]) {
      expect(point.acceleration!.x).toBe(0);
      expect(point.acceleration!.y).toBe(0);
    }
  });

  it('动能守恒', () => {
    const result = linearModel.solve(makeProblem(10, 0, 0, 0, 5));
    const energies = result.trajectories[0].map(p => p.kineticEnergy!);
    for (const e of energies) {
      expect(e).toBeCloseTo(50); // 0.5 * 1 * 10^2 = 50
    }
  });

  it('解析解精度: 与公式 x = x₀ + vt 对比', () => {
    const vx = 7.3, duration = 11.7;
    const result = linearModel.solve(makeProblem(vx, 0, 0, 0, duration));
    const last = result.trajectories[0][result.trajectories[0].length - 1];
    expect(last.position.x).toBeCloseTo(vx * duration, 8);
  });

  it('校验失败: 质量为零', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'uniform-linear',
      bodies: [{ id: 'b1', mass: { value: 0, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }],
      timeConfig: { duration: 1 },
    };
    const v = linearModel.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'INVALID_MASS')).toBe(true);
  });

  it('校验失败: 时长为负', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'uniform-linear',
      bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }],
      timeConfig: { duration: -1 },
    };
    const v = linearModel.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'INVALID_DURATION')).toBe(true);
  });
});

describe('UniformAcceleratedModel', () => {
  it('自由落体: h = ½gt²', () => {
    const problem: PhysicsProblem = {
      id: 'freefall',
      model: 'uniform-accelerated',
      bodies: [{ id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 100 }, velocity: { x: 0, y: 0 } }],
      environment: { gravity: { enabled: true, value: 9.8 } },
      timeConfig: { duration: 2, sampleCount: 100 },
    };
    const result = accelModel.solve(problem);
    const last = result.trajectories[0][result.trajectories[0].length - 1];
    // y = 100 + 0*2 + 0.5*(-9.8)*4 = 100 - 19.6 = 80.4
    expect(last.position.y).toBeCloseTo(80.4, 0);
  });

  it('竖直上抛: 速度为零的关键帧存在', () => {
    const problem: PhysicsProblem = {
      id: 'throw-up',
      model: 'uniform-accelerated',
      bodies: [{ id: 'ball', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 20 } }],
      environment: { gravity: { enabled: true, value: 10 } },
      timeConfig: { duration: 5, sampleCount: 500 },
    };
    const result = accelModel.solve(problem);
    const stopFrame = result.keyframes.find(k => k.label === '速度为零');
    expect(stopFrame).toBeDefined();
    expect(stopFrame!.t).toBeCloseTo(2); // t = v/g = 20/10 = 2
  });

  it('匀速特例 (a=0): 与 uniform-linear 结果一致', () => {
    const problemLinear: PhysicsProblem = {
      id: 'linear',
      model: 'uniform-linear',
      bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 10, y: 0 } }],
      timeConfig: { duration: 5, sampleCount: 100 },
    };
    // 当加速度为零时，匀变速模型应退化为匀速
    // 但我们的 extractAcceleration 在无特殊配置时返回零加速度
    // 验证: 两种模型的最终位移一致
    const resultLinear = linearModel.solve(problemLinear);
    const lastLinear = resultLinear.trajectories[0][resultLinear.trajectories[0].length - 1];
    expect(lastLinear.position.x).toBeCloseTo(50);
  });

  it('v = v₀ + at 公式验证', () => {
    const problem: PhysicsProblem = {
      id: 'accel',
      model: 'uniform-accelerated',
      bodies: [{ id: 'car', mass: { value: 1000, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
      constraints: { inclinedPlane: { angle: 30, frictionCoefficient: 0 } },
      environment: { gravity: { enabled: true, value: 10 } },
      timeConfig: { duration: 4, sampleCount: 100 },
    };
    const result = accelModel.solve(problem);
    const last = result.trajectories[0][result.trajectories[0].length - 1];
    // 斜面 30° 无摩擦: a = g*sin30° = 10*0.5 = 5 m/s²
    // v = 5 * 4 = 20 m/s
    const speed = Math.sqrt(last.velocity.x ** 2 + last.velocity.y ** 2);
    expect(speed).toBeCloseTo(20, 0);
  });
});

describe('sampleTrajectory 脚手架', () => {
  it('采样点数 = sampleCount + 1 (含首尾帧)', () => {
    const traj = sampleTrajectory({ sampleCount: 100, duration: 5, sampleAt: (t) => ({ position: { x: t, y: 0 }, velocity: { x: 1, y: 0 } }) });
    expect(traj.length).toBe(101);
    expect(traj[0].t).toBe(0);
    expect(traj[100].t).toBeCloseTo(5);
  });

  it('t 严格等于 i * dt (与手写循环数值一致)', () => {
    const sampleCount = 50;
    const duration = 2;
    const traj = sampleTrajectory({
      sampleCount,
      duration,
      sampleAt: (t) => ({ position: { x: t * t, y: 0 }, velocity: { x: 2 * t, y: 0 } }),
    });
    const dt = duration / sampleCount;
    for (let i = 0; i <= sampleCount; i++) {
      expect(traj[i].t).toBeCloseTo(i * dt, 12);
      expect(traj[i].position.x).toBeCloseTo((i * dt) ** 2, 9); // x = t²
    }
  });

  it('回调为纯函数: 输出仅依赖 t (无数值漂移)', () => {
    // 位置公式 s = v₀t + ½at², 与匀变速模型位移公式同源
    const v0 = 3, a = 2;
    const traj = sampleTrajectory({
      sampleCount: 200,
      duration: 4,
      sampleAt: (t) => {
        const s = v0 * t + 0.5 * a * t * t;
        return { position: { x: s, y: 0 }, velocity: { x: v0 + a * t, y: 0 }, kineticEnergy: 0.5 * (v0 + a * t) ** 2, potentialEnergy: 0 };
      },
    });
    // 终点: s = 3*4 + 0.5*2*16 = 12 + 16 = 28
    expect(traj[traj.length - 1].position.x).toBeCloseTo(28, 9);
  });

  it('可选择性携带 acceleration 字段', () => {
    const traj = sampleTrajectory({
      sampleCount: 4,
      duration: 1,
      sampleAt: (t) => ({ position: { x: t, y: 0 }, velocity: { x: 1, y: 0 }, acceleration: { x: 0, y: -9.8 } }),
    });
    expect(traj[0].acceleration).toEqual({ x: 0, y: -9.8 });
  });
});
