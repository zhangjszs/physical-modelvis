# 高中电磁学可视化仿真系统 - 架构说明

## 系统概述

这是一个面向高中物理电磁学教学的交互式可视化仿真系统，基于 TypeScript 物理引擎和 Three.js 3D 渲染框架构建。

## 核心架构

### 1. 物理引擎层 (physim/)

**位置**: `physim/src/`

**核心模块**:
- **Vec3** (`vec3.ts`): 三维向量运算类，提供不可变和可变两种操作模式
- **ParticleState** (`particle.ts`): 粒子状态接口及工具函数（动能、动量、回旋半径等）
- **FieldSource** (`fields.ts`): 场源定义与实现
  - `UniformElectricField`: 匀强电场
  - `UniformMagneticField`: 匀强磁场
  - `PointChargeField`: 点电荷电场（库仑定律）
  - `DipoleField`: 电偶极子场
  - `CompositeField`: 复合场叠加
- **Integrator** (`integrators.ts`): 数值积分器
  - `BorisIntegrator`: Boris pusher（专为洛伦兹力设计，能量守恒优秀）
  - `VelocityVerletIntegrator`: 速度 Verlet 方法
  - `RK4Integrator`: 四阶 Runge-Kutta（支持自适应步长）
- **Boundary** (`boundaries.ts`): 边界检测
  - `VerticalPlatesBoundary`: 垂直平板边界
  - `HorizontalPlatesBoundary`: 水平平板边界
  - `BoxBoundary`: 长方体边界
  - `CylinderBoundary`: 圆柱形边界
- **Simulation** (`simulation.ts`): 仿真核心类，管理粒子生命周期和步进

**导出**: `physim/src/index.ts` 统一导出所有公共 API

### 2. 桥接层 (js/framework.js)

**职责**: 将高层场景描述转换为 PhysSim 引擎调用

**核心模块**:
- **SceneSpec**: 场景中间表示（版本 2.0）
- **ProblemConfig**: 题目配置标准化
- **SceneBuilder**: 场景构建引擎（支持模板注册）
- **SimulationManager**: 仿真管理器
  - `createSimulation()`: 创建仿真实例
  - `step()`: 单步推进
  - `run()`: 异步运行
  - `onRenderUpdate()`: 注册渲染回调
- **Integrators**: 积分器适配器（包含缓存优化）

**数据流**:
```
SceneSpec → buildPhysSimFields() → FieldSource[]
         → buildPhysSimBoundaries() → Boundary[]
         → SimulationManager.createSimulation() → Simulation instance
```

### 3. 场景模板层 (templates/)

**位置**: `templates/scene-templates.js`

**预定义模板**:
1. **parallelPlatesMagnetic**: 平行板 + 磁场（白银三模类题目）
2. **velocitySelector**: 速度选择器（E⊥B，v=E/B 直线通过）
3. **massSpectrometer**: 质谱仪
4. **cyclotron**: 回旋加速器
5. **parallelPlatesElectric**: 平行板电场（类平抛运动）
6. **dipoleField**: 电偶极子场

**模板使用**:
```javascript
// 自动注册（加载时执行）
SceneTemplates.registerAll();

// 手动构建
const spec = SceneTemplates.parallelPlatesMagnetic(problemConfig);
```

### 4. 渲染层 (index.html)

**技术栈**: Three.js 0.128.0

**Renderer3D 模块**:
- **场景管理**: scene, camera, renderer, controls
- **Group 分层**: plates, fields, particles, trails, hitPoints, annotations
- **对象创建**:
  - `addPlate()`: 极板（支持水平/垂直方向）
  - `addEmitter()`: 粒子发射源
  - `addPointCharge()`: 点电荷可视化
  - `addMagneticSymbols()`: 磁场符号（× 表示向里）
  - `addElectricArrows()`: 电场箭头
- **动态更新**:
  - `updateParticles()`: 更新粒子位置
  - `updateTrails()`: 更新轨迹线

**Simulator 模块**:
- 封装 PhysSim.SimulationManager 调用
- 管理粒子发射（单粒子/多角度/连续）
- 边界检测和击中统计

**UIManager 模块**:
- 题目面板（题干、选项、答案）
- 控制面板（播放/暂停、速度调节、发射模式）
- 信息面板（实时测量数据）
- 推导面板（分步骤公式推导）

### 5. 问题注册层 (problems/)

**示例**: `problems/baiyin-sanmo.js`

**结构**:
```javascript
const BaiyinSanmoProblem = {
    id: 'baiyin-sanmo-2025',
    source: '白银市三模 2025',
    title: '带电粒子在磁场中的运动',
    description: '...',
    given: { d: 0.01, B: ..., v0: ... },
    options: [...],
    answer: { correct: ['A', 'C'], explanation: '...' },
    sceneTemplate: 'parallel_plates_magnetic'
};
```

## 数据流图

```
用户交互 (UIManager)
    ↓
问题加载 (ProblemRegistry.get())
    ↓
场景构建 (SceneBuilder.build())
    ↓
SceneSpec (JSON 配置)
    ↓
┌───────────────────────────────┐
│  物理层                        │  渲染层
│                               │
│  SimulationManager             │  Renderer3D
│    ├─ createSimulation()      │    ├─ buildSceneFromSpec()
│    ├─ step()                  │    ├─ updateParticles()
│    └─ onRenderUpdate() ───────┼───→ ├─ updateTrails()
│                               │    └─ render()
└───────────────────────────────┘
    ↓
粒子状态 { position, velocity, trail, alive }
```

## 关键设计决策

### 1. 物理解耦

物理计算完全由 PhysSim 引擎负责，渲染层只负责可视化。通过 `SimulationManager.onRenderUpdate()` 回调传递粒子状态，确保两层之间的清晰边界。

### 2. 归一化单位制

由于真实物理常数（e=1.6e-19, me=9.1e-31）导致数值过小，framework.js 中实现了 `_getNormalizedChargeMass()` 函数，将电荷质量归一化到适合数值积分的范围：

```typescript
// R = mv/(|q|B) → m/|q| = RB/v
const mass = (R * Bmag) / v;
return { charge: q_sign, mass };
```

### 3. 场对象缓存

为避免每帧重复创建 FieldSource 对象，`getCachedComposite()` 函数基于字段配置的 JSON 字符串进行缓存：

```javascript
function getCachedComposite(fields) {
    const key = JSON.stringify(fields || []);
    if (key !== _cachedFieldKey || !_cachedComposite) {
        _cachedFieldKey = key;
        // 创建新的 CompositeField
    }
    return _cachedComposite;
}
```

### 4. 积分器选择策略

| 场景 | 推荐积分器 | 原因 |
|------|-----------|------|
| 纯磁场 | `analytic_circular` | 解析解，零误差 |
| 匀强电磁复合场 | `boris` | 能量守恒优秀 |
| 非均匀场 | `rk4` | 高精度，自适应步长 |

## 构建与运行

### 构建 physim

```bash
cd physim
npm install
npm run build
```

输出:
- `dist/physim.js` (IIFE 格式，浏览器 `<script>` 标签加载)
- `dist/physim.esm.js` (ES Module 格式)

### 运行系统

直接打开 `index.html` 即可（需要本地服务器或禁用浏览器 CORS 限制）：

```bash
npx http-server . -p 8080
# 访问 http://localhost:8080
```

## 扩展指南

### 添加新场景模板

1. 在 `templates/scene-templates.js` 中定义模板函数：

```javascript
const myNewScenario = function(config) {
    const given = config.given || {};
    return PhysVis.SceneSpec.create({
        id: config.id,
        viewport: { xRange: [-5, 5], yRange: [-5, 5] },
        objects: [...],
        fields: [...],
        particles: [...],
        boundaries: [...],
        solver: { integrator: 'boris', dt: 0.016 }
    });
};
```

2. 在 `registerAll()` 中注册：

```javascript
PhysVis.SceneBuilder.registerTemplate('my_scenario', myNewScenario);
```

### 添加新场类型

1. 在 `physim/src/fields.ts` 中实现 `FieldSource` 接口：

```typescript
class MyCustomField implements FieldSource {
    type = 'my_custom_field';
    
    electricFieldAt(position: Vec3, time: number): Vec3 {
        // 计算电场矢量
    }
    
    magneticFieldAt(position: Vec3, time: number): Vec3 {
        // 计算磁场矢量
    }
    
    isInsideRegion(position: Vec3): boolean {
        // 区域判断
    }
}
```

2. 在 `index.ts` 中导出
3. 在 `framework.js` 的 `buildPhysSimFields()` 中添加转换逻辑

### 添加新问题

在 `problems/` 目录下创建新文件，按照 `BaiyinSanmoProblem` 的格式定义问题配置，然后在 `index.html` 中注册：

```javascript
PhysVis.ProblemRegistry.register(MyNewProblem);
```

## 物理验证

运行测试套件验证物理计算准确性：

```bash
cd physim
npm test
```

测试覆盖：
1. 回旋半径 R = mv/(eB)
2. 回旋周期 T = 2πm/(eB)
3. 白银三模 R=2d 验证
4. 速度选择器 v=E/B
5. RK4 能量守恒
6. 100% 击中率验证

## 性能优化建议

1. **轨迹长度限制**: 默认 2000 点，可通过 `trailLength` 配置调整
2. **场符号密度**: 磁场 × 符号间距默认 1.2，可根据视口大小调整
3. **积分器步长**: `dt=0.016` (约 60 FPS)，可通过 `speed-slider` 动态调节
4. **粒子数量**: 多角度模式建议 ≤72 个粒子，避免轨迹线过多影响性能

## 技术栈总结

| 层级 | 技术 | 版本 |
|------|------|------|
| 物理引擎 | TypeScript + esbuild | 5.3 + 0.20 |
| 渲染框架 | Three.js | 0.128.0 |
| 运行时 | JavaScript (CommonJS) | ES2020 |
| 测试 | tsx | 4.21 |
| 包管理 | npm | - |

## 许可证

MIT
