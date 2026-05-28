import { describe, it, expect } from 'vitest';
import { CollisionModel, InelasticCollisionModel } from '../../src/models/collision.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const elasticModel = new CollisionModel();
const inelasticModel = new InelasticCollisionModel();

function makeElasticProblem(
  m1: number, m2: number, v1: number, v2: number,
  x1 = 0, x2 = 10, duration = 2, sampleCount = 1000,
): PhysicsProblem {
  return {
    id: 'test-collision',
    model: 'collision-elastic',
    bodies: [
      { id: 'body1', mass: { value: m1, unit: 'kg' }, position: { x: x1, y: 0 }, velocity: { x: v1, y: 0 } },
      { id: 'body2', mass: { value: m2, unit: 'kg' }, position: { x: x2, y: 0 }, velocity: { x: v2, y: 0 } },
    ],
    timeConfig: { duration, sampleCount },
  };
}

function makeInelasticProblem(
  m1: number, m2: number, v1: number, v2: number,
  x1 = 0, x2 = 10, duration = 2, sampleCount = 1000,
): PhysicsProblem {
  return {
    id: 'test-collision-inelastic',
    model: 'collision-inelastic',
    bodies: [
      { id: 'body1', mass: { value: m1, unit: 'kg' }, position: { x: x1, y: 0 }, velocity: { x: v1, y: 0 } },
      { id: 'body2', mass: { value: m2, unit: 'kg' }, position: { x: x2, y: 0 }, velocity: { x: v2, y: 0 } },
    ],
    timeConfig: { duration, sampleCount },
  };
}

describe('CollisionModel (elastic)', () => {
  it('等质量弹性碰撞: 速度交换', () => {
    // m1=m2=1, v1=10, v2=0 → v1'=0, v2'=10
    const result = elasticModel.solve(makeElasticProblem(1, 1, 10, 0));
    expect(result.trajectories).toHaveLength(2);
    const final1 = result.trajectories[0][result.trajectories[0].length - 1];
    const final2 = result.trajectories[1][result.trajectories[1].length - 1];
    expect(final1.velocity.x).toBeCloseTo(0);
    expect(final2.velocity.x).toBeCloseTo(10);
  });

  it('质量不等弹性碰撞: 公式验证', () => {
    // m1=2, m2=1, v1=6, v2=0
    // v1' = (2-1)/(2+1)*6 + 2*1/(2+1)*0 = 1/3*6 = 2
    // v2' = 2*2/(2+1)*6 + (1-2)/(2+1)*0 = 4/3*6 = 8
    const result = elasticModel.solve(makeElasticProblem(2, 1, 6, 0));
    const final1 = result.trajectories[0][result.trajectories[0].length - 1];
    const final2 = result.trajectories[1][result.trajectories[1].length - 1];
    expect(final1.velocity.x).toBeCloseTo(2);
    expect(final2.velocity.x).toBeCloseTo(8);
  });

  it('动量守恒: 弹性碰撞前后动量相等', () => {
    const result = elasticModel.solve(makeElasticProblem(3, 2, 10, -5));
    const pConserved = result.diagnostics.conservedQuantities.find(q => q.name === '总动量');
    expect(pConserved).toBeDefined();
    expect(pConserved!.conserved).toBe(true);
    expect(pConserved!.maxDeviation).toBeLessThan(1e-10);
  });

  it('动能守恒: 弹性碰撞前后动能相等', () => {
    const result = elasticModel.solve(makeElasticProblem(3, 2, 10, -5));
    const keConserved = result.diagnostics.conservedQuantities.find(q => q.name === '总动能');
    expect(keConserved).toBeDefined();
    expect(keConserved!.conserved).toBe(true);
    expect(keConserved!.maxDeviation).toBeLessThan(1e-10);
  });

  it('y 分量始终为 0 (1D 约束)', () => {
    const result = elasticModel.solve(makeElasticProblem(1, 1, 5, -3));
    for (const traj of result.trajectories) {
      for (const point of traj) {
        expect(point.position.y).toBe(0);
        expect(point.velocity.y).toBe(0);
      }
    }
  });

  it('碰撞前后速度不变 (无碰撞发生)', () => {
    // 两物体同向运动且不会相遇
    const result = elasticModel.solve(makeElasticProblem(1, 1, 5, 10, 0, 100, 1));
    const final1 = result.trajectories[0][result.trajectories[0].length - 1];
    expect(final1.velocity.x).toBeCloseTo(5);
  });

  it('图表包含 v_t, p_t, ke_t', () => {
    const result = elasticModel.solve(makeElasticProblem(1, 2, 8, 0));
    expect(result.charts.v_t).toBeDefined();
    expect(result.charts.p_t).toBeDefined();
    expect(result.charts.ke_t).toBeDefined();
    expect(result.charts.v_t!.points.length).toBeGreaterThan(0);
  });

  it('关键帧包含碰撞瞬间', () => {
    const result = elasticModel.solve(makeElasticProblem(1, 1, 10, 0));
    const collisionFrame = result.keyframes.find(k => k.label === '碰撞瞬间');
    expect(collisionFrame).toBeDefined();
    expect(collisionFrame!.t).toBeGreaterThan(0);
  });

  it('校验失败: 质量为零', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'collision-elastic',
      bodies: [
        { id: 'b1', mass: { value: 0, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } },
        { id: 'b2', mass: { value: 1, unit: 'kg' }, position: { x: 10, y: 0 }, velocity: { x: 0, y: 0 } },
      ],
      timeConfig: { duration: 1 },
    };
    const v = elasticModel.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'INVALID_MASS')).toBe(true);
  });

  it('解析精度: v1\' = (m1-m2)/(m1+m2)*v1 + 2*m2/(m1+m2)*v2', () => {
    const m1 = 7.3, m2 = 4.1, v1 = 12.5, v2 = -3.2;
    const result = elasticModel.solve(makeElasticProblem(m1, m2, v1, v2, 0, 20, 2));
    const final1 = result.trajectories[0][result.trajectories[0].length - 1];
    const expectedV1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
    expect(final1.velocity.x).toBeCloseTo(expectedV1, 8);
  });
});

describe('InelasticCollisionModel', () => {
  it('完全非弹性碰撞: 两物体共速', () => {
    // e=0: v1'=v2'=(m1*v1+m2*v2)/(m1+m2)
    const result = inelasticModel.solve(makeInelasticProblem(1, 1, 10, 0));
    const final1 = result.trajectories[0][result.trajectories[0].length - 1];
    const final2 = result.trajectories[1][result.trajectories[1].length - 1];
    expect(final1.velocity.x).toBeCloseTo(5); // (1*10+1*0)/(1+1) = 5
    expect(final2.velocity.x).toBeCloseTo(5);
  });

  it('动量守恒: 非弹性碰撞前后动量相等', () => {
    const result = inelasticModel.solve(makeInelasticProblem(2, 3, 8, -4));
    const pConserved = result.diagnostics.conservedQuantities.find(q => q.name === '总动量');
    expect(pConserved).toBeDefined();
    expect(pConserved!.conserved).toBe(true);
  });

  it('动能不守恒: 非弹性碰撞', () => {
    const result = inelasticModel.solve(makeInelasticProblem(1, 1, 10, 0));
    const keConserved = result.diagnostics.conservedQuantities.find(q => q.name === '总动能');
    // 非弹性碰撞不记录动能守恒
    expect(keConserved).toBeUndefined();
  });

  it('校验失败: 时长为负', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'collision-inelastic',
      bodies: [
        { id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } },
        { id: 'b2', mass: { value: 1, unit: 'kg' }, position: { x: 10, y: 0 }, velocity: { x: 0, y: 0 } },
      ],
      timeConfig: { duration: -1 },
    };
    const v = inelasticModel.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'INVALID_DURATION')).toBe(true);
  });
});
