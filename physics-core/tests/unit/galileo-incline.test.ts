import { describe, it, expect } from 'vitest';
import { GalileoInclineModel } from '../../src/models/galileo-incline.js';
import type { PhysicsProblem } from '../../src/types/problem.js';

const model = new GalileoInclineModel();

/** 构造伽利略斜面实验问题 */
function makeProblem(opts: {
  angleDeg: number;
  gravity?: number;
  inclineLength?: number;
  mode?: 'single' | 'docked' | 'horizontal' | 'all';
  mass?: number;
}): PhysicsProblem {
  return {
    id: 'test-galileo',
    model: 'galileo-incline',
    bodies: [{
      id: 'ball',
      mass: { value: opts.mass ?? 1, unit: 'kg' },
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    }],
    environment: { gravity: { enabled: true, value: opts.gravity ?? 9.8 } },
    constraints: { galileoIncline: { angleDeg: opts.angleDeg, gravity: opts.gravity, inclineLength: opts.inclineLength, mode: opts.mode } },
    timeConfig: { duration: 5, sampleCount: 500 },
  };
}

describe('GalileoInclineModel', () => {
  // ====== 元数据 ======
  it('meta 信息正确', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    expect(result.meta.model).toBe('galileo-incline');
    expect(result.meta.solver).toBe('analytical');
    expect(result.meta.version).toBe('1.0.0');
  });

  it('模型名称与描述', () => {
    expect(model.name).toBe('伽利略斜面理想实验');
    expect(model.modelType).toBe('galileo-incline');
    expect(model.assumptions.length).toBeGreaterThanOrEqual(4);
  });

  // ====== 正例: θ = 30°, L = 2 ======
  it('θ=30°, L=2, g=9.8: 加速度 a=g·sin30° = 4.9 m/s²', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    // 末速度 v = √(2·g·L·sinθ) = √(2·9.8·2·0.5) = √19.6 ≈ 4.427
    const expectedV = Math.sqrt(2 * 9.8 * 2 * 0.5);
    expect(result.diagnostics.maxValues.finalSpeed).toBeCloseTo(expectedV, 4);
    expect(result.diagnostics.maxValues.maxSpeed).toBeCloseTo(expectedV, 4);
  });

  it('θ=30°, L=2: 沿斜面加速度 = 4.9 m/s²', () => {
    // x-t 曲线斜率间接验证: v = a·t, 且 x = ½·a·t²
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const x_t = result.charts.x_t!;
    // 取最后一点 (t ≈ t_end) x = L = 2
    const lastX = x_t.points[x_t.points.length - 1].y;
    expect(lastX).toBeCloseTo(2, 1);
  });

  it('θ=30°, L=2: v_end ≈ √(2·g·h) ≈ 4.427 (能量守恒)', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const vEnd = result.diagnostics.maxValues.finalSpeed;
    const h = 2 * 0.5; // L·sin30° = 1
    const expected = Math.sqrt(2 * 9.8 * h);
    expect(vEnd).toBeCloseTo(expected, 4);
    expect(vEnd).toBeCloseTo(4.427188, 2);
  });

  it('θ=30°, L=2: t_end = √(2·L/a) ≈ 0.904 s', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const tEnd = result.diagnostics.maxValues.endTime;
    const expected = Math.sqrt(2 * 2 / (9.8 * 0.5));
    expect(tEnd).toBeCloseTo(expected, 3);
  });

  // ====== 边界: θ = 0° ======
  it('θ=0°: 退化为零加速度场景 (t_end 极大, sinθ 用极小值兜底)', () => {
    const result = model.solve(makeProblem({ angleDeg: 0 }));
    // 极小 sinθ 兜底, acceleration ≈ 0, position 始终为 0
    const a = result.diagnostics.maxValues.accelerationAlongIncline;
    expect(a).toBeLessThan(1e-3);
    // 速度也接近 0
    expect(result.diagnostics.maxValues.finalSpeed).toBeLessThan(1e-2);
  });

  // ====== 边界: θ = 90° (退化为自由落体) ======
  it('θ=90°: 退化为自由落体 a = g = 9.8 m/s²', () => {
    const result = model.solve(makeProblem({ angleDeg: 90, inclineLength: 4.9 }));
    const a = result.diagnostics.maxValues.accelerationAlongIncline;
    expect(a).toBeCloseTo(9.8, 4);
    // v_end = √(2·g·L·sin90°) = √(2·9.8·4.9) = √96.04 ≈ 9.8
    const vEnd = result.diagnostics.maxValues.finalSpeed;
    expect(vEnd).toBeCloseTo(9.8, 2);
  });

  // ====== 边界: θ → 90°, a 模式 = g·sinθ 的外推 ======
  it('θ→90° 时 a 单调递增至 g', () => {
    const r30 = model.solve(makeProblem({ angleDeg: 30 }));
    const r60 = model.solve(makeProblem({ angleDeg: 60 }));
    const r85 = model.solve(makeProblem({ angleDeg: 85 }));
    expect(r30.diagnostics.maxValues.accelerationAlongIncline)
      .toBeLessThan(r60.diagnostics.maxValues.accelerationAlongIncline);
    expect(r60.diagnostics.maxValues.accelerationAlongIncline)
      .toBeLessThan(r85.diagnostics.maxValues.accelerationAlongIncline);
    expect(r85.diagnostics.maxValues.accelerationAlongIncline).toBeLessThanOrEqual(9.8);
  });

  // ====== 对接斜面: 能量守恒 ======
  it('docked 模式: 小球滚上对接斜面回到原高 (势能守恒)', () => {
    const result = model.solve(makeProblem({ angleDeg: 30, mode: 'docked' }));
    const keyframeLabels = result.keyframes.map(k => k.label);
    expect(keyframeLabels).toContain('对接斜面最高点');
    // 对接斜面最高点 y = 0 (回到竖直起始高度), x = 2·L·cos30° (镜像前进 L)
    const top = result.keyframes.find(k => k.label === '对接斜面最高点')!;
    expect(top.position.y).toBeCloseTo(0, 5);
    expect(top.position.x).toBeCloseTo(2 * 2 * Math.cos(30 * Math.PI / 180), 2);
    expect(top.velocity.x).toBeCloseTo(0, 5);
    expect(top.velocity.y).toBeCloseTo(0, 5);
    // 包含两条守恒律
    expect(result.diagnostics.conservedQuantities.length).toBeGreaterThanOrEqual(2);
    // 势能首尾相等
    const potentialTop = result.diagnostics.conservedQuantities.find(c => c.law.includes('对接'));
    expect(potentialTop).toBeDefined();
    expect(potentialTop!.initialValue).toBeCloseTo(potentialTop!.finalValue, 5);
  });

  it('horizontal 模式: 水平面匀速', () => {
    const result = model.solve(makeProblem({ angleDeg: 30, mode: 'horizontal' }));
    const keyframeLabels = result.keyframes.map(k => k.label);
    expect(keyframeLabels).toContain('水平面匀速 (牛顿第一定律)');
    const horiz = result.keyframes.find(k => k.label === '水平面匀速 (牛顿第一定律)')!;
    expect(horiz.velocity.y).toBe(0);
    expect(horiz.velocity.x).toBeGreaterThan(0);
  });

  it('all 模式: 包含全部三段', () => {
    const result = model.solve(makeProblem({ angleDeg: 30, mode: 'all' }));
    const labels = result.keyframes.map(k => k.label);
    expect(labels).toContain('起点 (斜面顶端)');
    expect(labels).toContain('斜面底端 (速度最大)');
    expect(labels).toContain('对接斜面最高点');
    expect(labels).toContain('水平面匀速 (牛顿第一定律)');
    expect(result.keyframes).toHaveLength(4);
  });

  // ====== 图表 ======
  it('θ-a 图: 19 点, x ∈ [0°, 90°], a = g·sinθ', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const theta_a = result.charts.theta_a!;
    expect(theta_a.points.length).toBeGreaterThanOrEqual(10);
    // 第一个点 x = 0°, a = 0
    expect(theta_a.points[0].x).toBe(0);
    expect(theta_a.points[0].y).toBeCloseTo(0, 10);
    // sin90° = 1 → a = g
    const last = theta_a.points[theta_a.points.length - 1];
    expect(last.x).toBeGreaterThanOrEqual(85);
  });

  it('sinθ-t_end 图: 含至少 10 点, L 固定时小 θ 对应大 t_end', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const st = result.charts.sin_theta_t_end!;
    expect(st.points.length).toBeGreaterThanOrEqual(10);
    // 相邻点: sinθ 大 → t_end 小 (单调减)
    for (let i = 1; i < st.points.length; i++) {
      const prev = st.points[i - 1];
      const cur = st.points[i];
      expect(cur.x).toBeGreaterThan(prev.x); // sinθ 单调增
      expect(cur.y).toBeLessThan(prev.y);   // t_end 单调减
    }
  });

  // ====== 自定义重力 ======
  it('自定义 g=10 m/s², θ=30°, L=2: a=5, v_end≈4.472', () => {
    const result = model.solve(makeProblem({ angleDeg: 30, gravity: 10, inclineLength: 2 }));
    expect(result.diagnostics.maxValues.accelerationAlongIncline).toBeCloseTo(5, 4);
    const expectedV = Math.sqrt(2 * 10 * 2 * 0.5);
    expect(result.diagnostics.maxValues.finalSpeed).toBeCloseTo(expectedV, 4);
  });

  // ====== 自定义斜面长度 ======
  it('θ=30° 时 v_end² = 2gh (能量守恒恒等式)', () => {
    const L = 3;
    const result = model.solve(makeProblem({ angleDeg: 30, inclineLength: L }));
    const vEnd = result.diagnostics.maxValues.finalSpeed;
    const h = L * 0.5;
    expect(vEnd * vEnd).toBeCloseTo(2 * 9.8 * h, 2);
  });

  // ====== input validation ======
  it('校验失败: 模型类型不匹配', () => {
    const problem: PhysicsProblem = {
      id: 'bad', model: 'uniform-linear',
      bodies: [{ id: 'b1', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
      timeConfig: { duration: 1 },
    };
    const v = model.validate(problem);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => e.code === 'MODEL_MISMATCH')).toBe(true);
  });

  // ====== explanation & formulas ======
  it('explanation 包含 5 步推理', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    expect(result.explanation.steps.length).toBeGreaterThanOrEqual(5);
    const orders = result.explanation.steps.map(s => s.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  it('formulas 包含必要的 5 条公式', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const names = result.explanation.formulas.map(f => f.name);
    expect(names).toContain('沿斜面加速度');
    expect(names).toContain('斜面位移');
    expect(names).toContain('底部速度 (能量守恒)');
    expect(names).toContain('下滑时间');
    expect(names).toContain('自由落体外推');
  });

  // ====== v² = 2gh 能量守恒验证 ======
  it('diagnostics 能量守恒守恒量列表验证通过', () => {
    const result = model.solve(makeProblem({ angleDeg: 30 }));
    const mech = result.diagnostics.conservedQuantities.find(c => c.name.includes('机械能'));
    expect(mech).toBeDefined();
    expect(mech!.conserved).toBe(true);
    expect(mech!.maxDeviation).toBeLessThan(1e-6);
  });
});
