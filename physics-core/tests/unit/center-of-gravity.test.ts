import { describe, it, expect } from 'vitest';
import { CenterOfGravityModel } from '../../src/models/center-of-gravity.js';
import type { PhysicsProblem } from '../../src/types/problem.js';
import type { Vector2D } from '../../src/types/common.js';

const model = new CenterOfGravityModel();

function makeProblem(
  vertices: Vector2D[],
  suspensionIndex1: number = 0,
  suspensionIndex2: number = vertices.length - 1,
): PhysicsProblem {
  return {
    id: 'center-of-gravity-test',
    model: 'center-of-gravity',
    bodies: [
      { id: 'plate', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    ],
    constraints: {
      centerOfGravity: { vertices, suspensionIndex1, suspensionIndex2 },
    },
    timeConfig: { duration: 1, sampleCount: 100 },
  };
}

describe('CenterOfGravityModel', () => {
  it('模型元数据正确', () => {
    expect(model.modelType).toBe('center-of-gravity');
    expect(model.name).toBe('悬挂法确定重心');
    expect(model.solver).toBeUndefined();
  });

  it('正方形形心 = 几何中心 (0.5, 0.5)', () => {
    // 顶点: (0,0) → (1,0) → (1,1) → (0,1)
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = model.solve(makeProblem(vertices));
    expect(r.diagnostics.maxValues.centroidX).toBeCloseTo(0.5, 6);
    expect(r.diagnostics.maxValues.centroidY).toBeCloseTo(0.5, 6);
    expect(r.diagnostics.maxValues.polygonArea).toBeCloseTo(1, 6);
  });

  it('L 形薄板形心落在 L 内部', () => {
    // L 形: (0,0) → (2,0) → (2,1) → (1,1) → (1,3) → (0,3)
    // 底方 (0,0)-(2,1) 面积=2, 竖方 (0,1)-(1,3) 面积=2, 总面积=4
    // 形心: Cx = (2×1 + 2×0.5)/4 = 3/4, Cy = (2×0.5 + 2×2)/4 = 5/4
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 },
      { x: 1, y: 3 }, { x: 0, y: 3 },
    ];
    const r = model.solve(makeProblem(vertices, 0, 5));
    const cx = r.diagnostics.maxValues.centroidX!;
    const cy = r.diagnostics.maxValues.centroidY!;
    // 形心范围检验: x 在 (0,2), y 在 (0,3)
    expect(cx).toBeGreaterThan(0);
    expect(cx).toBeLessThan(2);
    expect(cy).toBeGreaterThan(0);
    expect(cy).toBeLessThan(3);
    // 解析解: Cx=3/4=0.75, Cy=5/4=1.25
    expect(cx).toBeCloseTo(0.75, 6);
    expect(cy).toBeCloseTo(1.25, 6);
    expect(r.diagnostics.maxValues.polygonArea).toBeCloseTo(4, 6);
  });

  it('三角形形心 = 重心 = 顶点平均值', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 },
    ];
    const r = model.solve(makeProblem(vertices));
    // 形心 = ((0+3+0)/3, (0+0+3)/3) = (1, 1)
    expect(r.diagnostics.maxValues.centroidX).toBeCloseTo(1, 6);
    expect(r.diagnostics.maxValues.centroidY).toBeCloseTo(1, 6);
    expect(r.diagnostics.maxValues.polygonArea).toBeCloseTo(4.5, 6);
  });

  it('不规则五边形 — 形心与交点误差 < 1e-6', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 2 },
      { x: 2, y: 4 }, { x: -1, y: 3 },
    ];
    const r = model.solve(makeProblem(vertices, 0, 4));
    expect(r.diagnostics.maxValues.intersectionError).toBeLessThan(1e-6);
    expect(r.diagnostics.rangeCheck.withinRange).toBe(true);
  });

  it('自定义悬挂点 — 交点误差 < 1e-6', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 },
      { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 3 },
    ];
    // 悬挂顶点 1 和 3
    const r = model.solve(makeProblem(vertices, 1, 3));
    expect(r.diagnostics.maxValues.intersectionError).toBeLessThan(1e-6);
    // 悬挂点 1 = (2,0), 悬挂点 3 = (1,1)
    expect(r.diagnostics.maxValues.suspensionX1).toBeCloseTo(2, 6);
    expect(r.diagnostics.maxValues.suspensionY1).toBeCloseTo(0, 6);
    expect(r.diagnostics.maxValues.suspensionX2).toBeCloseTo(1, 6);
    expect(r.diagnostics.maxValues.suspensionY2).toBeCloseTo(1, 6);
  });

  it('静态示意图点数正确 (悬挂点标记)', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = model.solve(makeProblem(vertices));
    const chart = r.charts['static-diagram']!;
    expect(chart).toBeDefined();
    // 约定: n 顶点 + 2 (悬挂线1) + 2 (悬挂线2) + 3 (重心标记三角) = n+7
    const n = vertices.length;
    expect(chart.points).toHaveLength(n + 7);
  });

  it('关键帧顺序: 悬挂点1, 悬挂点2, 重心', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = model.solve(makeProblem(vertices));
    expect(r.keyframes).toHaveLength(3);
    expect(r.keyframes[0]!.label).toBe('悬挂点 1');
    expect(r.keyframes[1]!.label).toBe('悬挂点 2');
    expect(r.keyframes[2]!.label).toBe('重心 (交点)');
    // 重心 = (0.5, 0.5)
    expect(r.keyframes[2]!.position.x).toBeCloseTo(0.5, 6);
    expect(r.keyframes[2]!.position.y).toBeCloseTo(0.5, 6);
  });

  it('explanation 包含 4 步', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = model.solve(makeProblem(vertices));
    expect(r.explanation.steps).toHaveLength(4);
    expect(r.explanation.steps[0]!.order).toBe(1);
    // 第 1 步提及二力平衡
    expect(r.explanation.steps[0]!.description).toContain('二力平衡');
    // 第 4 步提及交点/重心
    expect(r.explanation.steps[3]!.description).toContain('交点');
  });

  it('formulas 至少包含 4 个公式', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = model.solve(makeProblem(vertices));
    const formulaNames = r.explanation.formulas.map(f => f.name);
    expect(formulaNames.some(n => n.includes('形心'))).toBe(true);
    expect(formulaNames.some(n => n.includes('面积'))).toBe(true);
    expect(formulaNames.some(n => n.includes('二力平衡'))).toBe(true);
  });

  it('缺少 centerOfGravity 约束抛错', () => {
    const problem: PhysicsProblem = {
      id: 'fail',
      model: 'center-of-gravity',
      bodies: [{ id: 'p', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
      constraints: {},
      timeConfig: { duration: 1, sampleCount: 100 },
    };
    expect(() => model.solve(problem)).toThrow('centerOfGravity');
  });

  it('顶点少于 3 个抛错', () => {
    const vertices: Vector2D[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(() => model.solve(makeProblem(vertices))).toThrow('多边形至少需要 3 个顶点');
  });

  it('悬挂点索引越界抛错', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    expect(() => model.solve(makeProblem(vertices, 10, 2))).toThrow('越界');
    expect(() => model.solve(makeProblem(vertices, 0, 10))).toThrow('越界');
  });

  it('两次悬挂点相同抛错', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    expect(() => model.solve(makeProblem(vertices, 2, 2))).toThrow('不能相同');
  });

  it('面积为零 (共线顶点) 抛错', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 },
    ];
    expect(() => model.solve(makeProblem(vertices))).toThrow('面积为零');
  });

  it('summary 包含面积、形心和误差信息', () => {
    const vertices: Vector2D[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const r = model.solve(makeProblem(vertices));
    expect(r.explanation.summary).toContain('A=');
    expect(r.explanation.summary).toContain('C=');
    expect(r.explanation.summary).toContain('ε=');
  });
});
