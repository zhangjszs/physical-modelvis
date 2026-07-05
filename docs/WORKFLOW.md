# PhysVis 全实验覆盖 — Loop 工作流规范

> 本文件是 `TASKS.md` 的补充参考，定义每个新 physics-core Model 的标准结构，供 `/loop` executor 遵循。

## 概述

- 6 册教材 / 27 章 / **176 个实验**
- 当前已有 **32 个 Model + 32 个 Scene**
- 目标: 补齐到 **~95 个 physics-core Model** (新建 63 个) + **~176 个 Scene** (新建 144 个)
- 工作流: A (清理) → B~H (7 个教科书阶段)，每阶段独立、独立 commit、独立 test

## Model 物理分类 (6 大类)

| 分类 | Model 计数 (新) | 典型公式 |
|------|---------------|---------|
| 1. 运动学 (kinematics) | 12 | x=v₀t+½at², v=v₀+at, Δx=aT² |
| 2. 力学 (mechanics) | 14 | F=ma, F=μN, F=BILsinθ, F=qvBsinθ |
| 3. 振动/波 (oscillation/wave) | 8 | x=Acos(ωt+φ), y=Asin(ωt-kx), I=I₀cos²θ |
| 4. 电磁场 (E-M field) | 12 | F=kq₁q₂/r², F=qE, ε=-dΦ/dt, V=IR |
| 5. 光学 (optics) | 8 | n=sinθ₁/sinθ₂, Δx=lλ/d, λ=h/p |
| 6. 原子/热学 (atom/thermal) | 10 | E=mcΔT, pV=nRT, E=hn-W₀, ½mv²=eU_c |

## 每个新 Model 的标准文件清单

实现一个新的 physics-core Model，需要以下 7 个步骤 (按顺序):

### Step 1: 注册 ModelType (`physics-core/src/types/problem.ts`)
```typescript
export type ModelType = ... | '<new-model-type>';  // 添加到联合类型

export interface <NewModel>Constraint { ... }      // 约束定义 (如果不存在)
// 同时在 PhysicsProblem['constraints'] 扩展中加一行:
readonly <newModel>?: <NewModel>Constraint;
```

### Step 2: 实现 Model (`physics-core/src/models/<new-model>.ts`)
```typescript
export class <NewModel>Model extends PhysicsModelBase {
  readonly name = '<中文名>';
  readonly version = '1.0.0';
  readonly description = '<一句话描述>';
  readonly modelType = '<new-model-type>' as const;
  readonly assumptions = ['<假设1>', '<假设2>', ...];
  readonly applicableRange = '<适用范围>';
  readonly errorSources = ['<误差来源>', ...];
  readonly requiredParameters: ParameterSpec[] = [
    { name: '<param>', description: '<中文>', unit: '<SI单位>', required: true, min: <n>, max: <n> },
  ];

  solve(problem: PhysicsProblem): SimulationResult {
    this.throwIfInvalid(problem);
    // 1. 从 problem.<constraint> 读参数
    // 2. 生成轨迹/数据
    // 3. 构造图表 (charts)
    // 4. 构造诊断 (diagnostics)
    // 5. 构造解释 (explanation)
    // 6. 返回完整 SimulationResult
  }
}
```

### Step 3: 写 unit test (`physics-core/tests/unit/<new-model>.test.ts`)
- 模型元数据断言
- 1+ 正例断言 (解析解或数值解)
- 1+ 边界/异常断言
- 守恒律断言 (如果有)

### Step 4: 注册到路由 (`physics-core/src/solver/solver-router.ts`)
```typescript
import { <NewModel>Model } from '../models/<new-model>.js';
registerModel(new <NewModel>Model());
```

### Step 5: 导出 (`physics-core/src/index.ts`)
```typescript
export { <NewModel>Model } from './models/<new-model>.js';
```

### Step 6: SceneConfig (`visualization/src/scenes/sceneRegistry.ts`)
```typescript
{
  id: '<sceneId>',           // 必唯一
  name: '<中文名>',           // 中文显示名
  model: '<model-type>',     // 对应 ModelType
  parameters: [
    { name: 'param', label: '<中文标签>', unit: '<SI单位>', value: <default>, min: <n>, max: <n>, step: <n>, default: <n>, description: '<tooltip>' },
    // 至少 2-5 个可调参数
    // duration 参数应始终存在
  ],
  buildProblem: (params) => {
    const <param> = params['<param>'] ?? <default>;
    return {
      id: `<sceneId>-${Date.now()}`,
      title: '<中文名>',
      model: '<model-type>',
      bodies: [{ id: 'obj1', mass: { value: <m>, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: <vx>, y: <vy> } }],
      constraints: { <constraintName>: { /* 参数 */ } },
      environment: { gravity: { enabled: true, value: 9.8 } },
      timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
    };
  },
},
```

### Step 7: SceneSelector 分类入口 (`visualization/src/components/layout/SceneSelector.tsx`)
在对应的 SCENE_CATEGORIES 的 scenes 数组中添加:
```typescript
{ id: '<sceneId>', name: '<中文名>' },
```

## SimulationResult 规范

每个 Model.solve() 必须返回完整的 SimulationResult:

```typescript
{
  meta: { model, solver: 'analytical' | 'numerical', computationTime: 0, timestamp: new Date().toISOString(), version },
  trajectories: [ /* 1+ 条 TrajectoryPoint[] */ ],
  keyframes: [ /* 3+ 个关键帧 */ ],
  charts: {
    /* 至少 2 种图表: */
    // x_t, y_t (位置-时间)
    // v_t (速度-时间)
    // energy_t (能量-时间)
    // 业务特定图 (p_t, F_theta, theta_t, wave_t 等)
  },
  diagnostics: {
    conservedQuantities: [ /* 守恒律检验 */ ],
    maxValues: { /* 峰值量 */ },
    rangeCheck: { withinRange: true, warnings: [] },
  },
  explanation: {
    summary: '<一句话总结>',
    steps: [
      { order: 1, description: '<步骤>', formula: '<公式>', calculation: '<代入>', result: '<结果>' },
      /* ≥ 3 步 */
    ],
    formulas: [
      { name: '<公式名>', formula: '<LaTeX-like>', variables: { ... } },
    ],
  },
  errors: [],
  warnings: [],
}
```

## 图表类型选择指引

| 物理领域 | 推荐图表 |
|---------|---------|
| 运动学 | x_t, y_t, v_t, energy_t |
| 力学 | x_t, v_t, energy_t, F_t |
| 振动/波 | theta_t, omega_t, energy_t, wave_t |
| 碰撞 | v1_t, v2_t, p_t, energy_t |
| 圆周运动 | theta_t, omega_t, energy_t, r_t |
| 电磁场 | x_t, y_t, v_t |
| 电路 | U-I 散点图或用户特定图 |
| 光学 | 缝衍射光强图、双缝干涉光强图 |
| 气体 p-V | p-V 曲线 (pV=C), p-1/V 直线 |
| 原子物理 | 能级图、光谱线图 |
| 热力学 | p-T, V-T, T-t (熔化曲线) |
| 衰变 | N-t (指数衰减), lnN-t 直线 |

## 命名约定

- **ModelType**: kebab-case, 如 `ticker-timer`, `reaction-time`, `overweight`
- **SceneId**: 与 ModelType 相同 (一般一 model 一 scene, 复用场景可以配多 scene 指向同一 model)
- **变量名**: camelCase, 英文; label 字段中文
- **文件样式**: 类名 PascalCase + Model 后缀, 如 `TickerTimerModel`
- **约束接口**: PascalCase + Constraint 后缀, 如 `TickerTimerConstraint`

## 流程门禁 (每阶段必须全部通过)

```
npm test                                          # physics-core + visualization 全绿
npm run build                                     # vite build 通过 (≤ 5s)
手动 spot check: 在 SceneSelector 中看到新场景      # 视觉确认
npx tsc --noEmit -p visualization/tsconfig.json    # TS 类型检查
```

Stage 验收后按 `AGENTS.md > 代码审查约定` 走一遍 review 维度 1-7，通过后 commit。

## 扩展模式的判断标准

一个实验是 "新建 Model" 还是 "复用 + 参数扩展"?

| 情况 | 处理方式 |
|------|---------|
| 实验原理 = 已有 Model, 仅参数/图形展示不同 | **复用 Model + 新建 Scene** |
| 实验使用新物理公式 (无法通过现有 constraint 参数化) | **新建 Model** |
| 实验不需要数值积分/解析解, 仅需静态图或测量读数 | **复用 Model (用简单的 trajectory 即可) 或新建极简 Model** |
| 实验需要新的 Chart 类型 | **在 result.ts 中添加新可选字段, 注册新 Model** |

## 已存在的 Model (不重建)

完整列表见 `physics-core/src/index.ts`。当前 **32 个 Model**:

uniform-linear, uniform-accelerated, projectile-horizontal, projectile-angular, inclined-plane, spring-oscillator, collision-elastic, collision-inelastic, point-charge-field, uniform-electric-field, uniform-magnetic-field, em-combined-field, uniform-circular-motion, force-composition, newton-third-law, sliding-friction, newton-second-law, projectile, orbital, momentum, simple-pendulum, mechanical-wave, refraction, interference, circuit, gas-law, photoelectric, bohr-model, radioactive-decay, magnetic-force, em-induction, ac-current, lc-oscillator
