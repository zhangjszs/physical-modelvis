# PhysVis 物理教学可视化平台 - 开发交接指南

## 📋 项目概述

面向高中物理教学的交互式可视化仿真系统，采用双层架构：physics-core 引擎 (TypeScript, 零依赖) → React + Canvas 2D 可视化前端。

**访问地址**: http://localhost:3000（启动后）  
**技术栈**: React 18 + TypeScript + Vite + Zustand + Canvas 2D

---

## 🏗️ 架构总览

```
physics-core/          — 零依赖物理引擎
  src/models/          — 物理模型 (匀速/匀变速/电场/磁场/碰撞/弹簧/电磁复合等)
  src/math/            — Vec2D 向量运算
  src/types/           — 类型定义 (PhysicsProblem, SimulationResult)
  src/units/           — 单位换算和物理常数
  src/solver/          — 求解器路由 (自动注册模型)
  tests/               — 单元测试

visualization/         — React 可视化前端
  src/components/      — UI 组件 (SimulationCanvas, 控制面板, OCR)
  src/scenes/          — 场景配置 + buildProblem
  src/rendering/       — Canvas 渲染器 (核心绘图逻辑)
  src/adapters/        — physics-core 适配器
  src/store/           — Zustand 状态管理
```

### 数据流

```
用户点击目录按钮
  → store.setScene(sceneId)
  → App.tsx → ProjectileScene (主编排组件)
  → scene.buildProblem(params) → PhysicsProblem
  → solveProblem() → SimulationResult
  → SimulationCanvas 内部路由 → drawXxxScene() [自定义] | 标准轨迹管线
```

---

## 🎨 渲染管线机制

### SceneConfig 结构

每个场景由 `SceneConfig` 定义：

```typescript
interface SceneConfig {
    id: string;                    // 唯一标识 (如 'projectile')
    name: string;                  // 显示名 (如 "抛体运动")
    model: ModelType;              // physics-core 模型类型
    parameters: SceneParameter[];  // 参数定义 (range/default/unit)
    buildProblem: (params) => PhysicsProblem;  // 参数 → 物理问题
}
```

### 渲染路径分支

[`SimulationCanvas.tsx`](visualization/src/components/simulation/SimulationCanvas.tsx) 中通过 Set 集合判断渲染路径：

```typescript
SCENES_3D = new Set(['projectile', 'uniform-accelerated', 'free-fall', 'circular-motion']);
SCENES_CHAPTER3 = new Set(['hooke-law', 'sliding-friction', ...]);  // 力
SCENES_MECHANICS = new Set(['free-fall', 'galileo-incline', ...]);  // 基础力学
// ... 更多分类
```

渲染优先级：
1. **3D 场景** → `EquipmentStage` (Three.js lazy chunk)
2. **自定义场景** (`isCustomScene`) → switch-case 调用 `drawXxxScene()`
3. **气垫导轨** → `drawAirTrackScene()`
4. **标准轨迹** → 通用轨迹渲染管线 (网格+坐标轴+轨迹点+物体)

> **3D 器材 rig 覆盖状态（2026-07-13 更新）**：`SCENE_TO_MODULE` 已收录全部 123 个场景，注册表层 100% 覆盖，且**每个场景均已映射到实验专属/领域匹配的 3D rig，无任何通用占位 rig 残留**。现代物理 8 个、热学 16 个场景的专属 rig 已补齐；感应模块 4 个传感器场景（thermistor / photoresistor / reed-switch / strain-gauge）也补齐专属 rig。原占位 `modernPhysicsRig`、`thermalRig` 均已删除。参数交互方面：已分两批补全共 **16 个** rig 的 `updateEquipment`（首批 8 个核心：单摆/弹簧/碰撞/波/圆周/轨道/电容/受迫振动；第二批 8 个：验电器/力的合成/超重失重/传动带/光杠杆/电场/电路/安培力），器材随仿真参数实时变化。剩余约 12 个 rig 的 `updateEquipment` 仍为空实现——经逐个体评估均为**静态器材或异构示意类**（牛顿定律演示、反应时间/打点计时器尺、曲线轨道、电磁波/波动光学/核物理/光电/几何光学示意等），器材几何不随参数变化、运动由轨迹系统驱动，维持空实现为合理状态。

---

## 🛠️ 新增自定义场景的完整流程

### Task: 为一个新场景添加实验装置 + 物体摆放的可视化

假设新场景 ID 为 `my-new-scene`。

#### Step 1: 定义 SceneConfig

在对应模块文件中创建场景配置（例如 `mechanics.ts`）：

```typescript
{
    id: 'my-new-scene',
    name: '我的新场景',
    model: 'my-model-type',
    parameters: [
        {
            name: 'paramA',
            label: '参数 A',
            unit: 'm',
            value: 1.0,
            min: 0.1,
            max: 10,
            step: 0.1,
            default: 1.0,
            description: '参数说明'
        },
        // 更多参数...
    ],
    buildProblem: params => {
        const a = params['paramA'] ?? 1.0;
        return {
            id: `myscene-${Date.now()}`,
            title: '我的新场景',
            model: 'my-model-type',
            bodies: [...],
            constraints: { myConstraint: { paramA: a } },
            environment: { gravity: { enabled: true, value: 9.8 } },
            timeConfig: makeTimeSeries(3, 100)
        };
    }
}
```

#### Step 2: 创建渲染函数

在对应的 rendering 文件中添加 `draw<SceneName>Scene()` 函数：

**文件位置**: [`visualization/src/rendering/mechanicsScenes.ts`](visualization/src/rendering/mechanicsScenes.ts)

**函数签名**:

```typescript
export function drawMyNewSceneScene(opts: MechanicsSceneOptions): void {
    const { ctx, width, height, isDark, params, simulationResult, currentTime } = opts;
    
    // 提取参数
    const a = params['paramA'] ?? 1.0;
    
    // 获取当前帧（从 simulationResult 或解析计算）
    const frame = getFrame(simulationResult, currentTime);
    
    // 布局计算
    const originX = width * 0.2;
    const originY = height * 0.65;
    
    // 绘制标题
    drawTitle(ctx, width, '场景名称: 核心公式', isDark);
    
    // 绘制实验装置（背景、支架、轨道等）
    
    // 绘制物体（使用 drawBlock/drawArrow/渐变球体等工具）
    
    // 绘制物理量箭头（速度/加速度/力）
    drawArrow(ctx, x1, y1, x2, y2, '#3b82f6', 'v');
    
    // 绘制 HUD（实时物理量面板）
    drawHud(ctx, isDark, [
        { label: 't', value: `${currentTime.toFixed(3)} s` },
        // 更多数据...
    ]);
    
    // 绘制信息栏
    drawInfoBar(ctx, width, height, '参数说明文字', isDark);
    
    // 空状态提示
    if (!simulationResult) drawEmptyState(ctx, width, height, isDark);
}
```

**可用辅助函数**:

| 函数 | 用途 |
|------|------|
| `drawTitle()` | 标题 + 核心公式 |
| `drawGround()` | 地面纹理 + 斜线填充 |
| `drawArrow()` | 带箭头的物理量矢量 |
| `drawBlock()` | 3D 方块（渐变 + 阴影 + 高光） |
| `drawHud()` | 左上角物理量面板 |
| `drawInfoBar()` | 底部参数信息栏 |
| `drawEmptyState()` | "点击运行仿真" 占位符 |
| `getFrame()` | 从 simulationResult 取当前帧并插值 |

#### Step 3: 注册场景

**文件位置**: [`visualization/src/components/simulation/SimulationCanvas.tsx`](visualization/src/components/simulation/SimulationCanvas.tsx)

**3a. 添加 import**:

```typescript
import {
    // ... existing imports ...
    drawMyNewSceneScene  // 新增
} from '../../rendering/mechanicsScenes';
```

**3b. 添加到 SCENES_MECHANICS 集合**:

```typescript
const SCENES_MECHANICS = new Set([
    // ... existing scenes ...
    'my-new-scene',  // 新增
]);
```

**3c. 在 switch 分支中添加 case**:

```typescript
case 'my-new-scene':
    drawMyNewSceneScene(sceneOpts);
    break;
```

#### Step 4: 编译验证

```bash
cd visualization
npx tsc --noEmit
npm test
```

确保：
- TypeScript 编译 0 错误
- 全部测试通过（目前 255 个）

#### Step 5: 启动开发服务器查看效果

```bash
npm run dev
```

访问 http://localhost:3000，选择你的场景，点击「运行仿真」查看渲染效果。

---

## 📊 已完成场景清单

### ✅ 力学场景（共 23 个自定义渲染器）

| 序号 | 场景 ID | 渲染器名称 | 功能描述 | 实现日期 |
|------|---------|-----------|----------|----------|
| 1 | `free-fall` | `drawFreeFallScene` | 自由落体实验（高度标尺 + 下落小球 + g 箭头） | 已有 |
| 2 | `galileo-incline` | `drawGalileoInclineScene` | 伽利略斜面实验（斜面块 + 小车 + 加速度箭头） | 已有 |
| 3 | `reaction-time` | `drawReactionTimeScene` | 反应时间测量（夹尺实验） | 已有 |
| 4 | `ticker-timer` | `drawTickerTimerScene` | 打点计时器（纸带 + 打点标记） | 已有 |
| 5 | `transmission-belt` | `drawTransmissionBeltScene` | 传动装置（皮带/齿轮/摩擦轮/同轴） | 已有 |
| 6 | `vertical-circle` | `drawVerticalCircleScene` | 竖直圆周运动（最高点临界条件） | 已有 |
| 7 | `center-of-gravity` | `drawCenterOfGravityScene` | 悬挂法确定重心 | 已有 |
| 8 | `inertia` | `drawInertiaScene` | 惯性实验（棋子/鸡蛋/小车模式） | 已有 |
| 9 | `newton-first-law` | `drawNewtonFirstLawScene` | 牛顿第一定律（匀速运动） | 已有 |
| 10 | `newton-second-law` | `drawNewtonSecondLawScene` | 牛顿第二定律 F=ma | 已有 |
| **11** | **`curve-condition`** | **`drawCurveConditionScene`** | **曲线运动条件（F 与 v₀ 不共线）** | **本次新增** |
| **12** | **`motion-composition`** | **`drawMotionCompositionScene`** | **运动合成与分解（分运动虚线 + 合运动抛物线）** | **本次新增** |
| **13** | **`curve-velocity-direction`** | **`drawCurveVelocityDirectionScene`** | **曲线速度方向（脱离点切线）** | **本次新增** |
| **14** | **`simple-pendulum`** | **`drawSimplePendulumScene`** | **单摆（悬点 + 摆线 + 能量条）** | **本次新增** |
| **15** | **`energy-conservation`** | **`drawEnergyConservationScene`** | **机械能守恒（动能/势能柱状图）** | **本次新增** |
| **16** | **`overweight`** | **`drawOverweightScene`** | **超重与失重（电梯剖面图 + 台秤）** | **本次新增** |
| **17** | **`centrifugal`** | **`drawCentrifugalScene`** | **离心现象（转盘 + 临界条件）** | **本次新增** |
| **18** | **`orbital`** | **`drawOrbitalScene`** | **卫星轨道（地球 + 轨道 + 宇宙速度参考）** | **本次新增** |
| **19** | **`momentum`** | **`drawMomentumScene`** | **动量定理与反冲（双模式）** | **本次新增** |
| **20** | **`projectile-collision`** | **`drawProjectileCollisionScene`** | **平抛碰撞（实验台 + OP/OM/ON 射程标注）** | **本次新增** |
| **21** | **`mechanical-wave`** | **`drawMechanicalWaveScene`** | **机械波（横波/纵波/驻波，60 质点阵列）** | **本次新增** |
| **22** | **`cavendish`** | **`drawCavendishScene`** | **卡文迪什扭秤（三次放大原理）** | **本次新增** |
| **23** | **`moon-earth-test`** | **`drawMoonEarthTestScene`** | **月地检验（对比柱状图 + 误差验证）** | **本次新增** |

### ✅ 其他已实现的场景分类

| 分类 | 场景数 | 场景列表 |
|------|--------|----------|
| **第三章「相互作用——力」** | 4 | hooke-law, sliding-friction, force-composition, newton-third-law |
| **选必一 第二章「机械振动」** | 3 | double-pendulum-sync, forced-vibration-freq, resonance-curve |
| **选必一 第四章「波动/光学」** | 6 | sound-waveform, water-diffraction, doppler-effect, sound-interference, single-slit, thin-film |
| **选必二「电磁装备」** | 5 | current-balance, em-damping, mutual-inductance, self-inductance, lc-oscillator |
| **选必三「量子/原子核」** | 3 | alpha-scattering, decay-statistics, fission-chain |
| **选必三「传感器」** | 7 | hall-effect, photoresistor, thermistor, reed-switch, strain-gauge, security-alarm, light-control-switch |
| **选必三「热学/分子/热力学」** | 18 | diffusion, brownian-motion, oil-film, liquid-mixing, molecular-force, melting-curve, heat-transfer, surface-tension, capillary, wetting, liquid-crystal, joule-mechanical, joule-electrical, adiabatic-compression, energy-transformation, perpetuum-mobile, heat-direction, gas-law |
| **电学/电磁基础与仪器读数** | 12 | circuit, ac-current, em-induction, magnetic-force, ampere-force, capacitor-charge, parallel-plate-capacitor, load-voltage, resistance-law, multimeter-tool, vernier-caliper-tool, micrometer-tool |
| **可视化缺口补建** | 8 | total-internal-reflection, current-magnetic, efield-lines, newton-tube, bulb-vi, work-energy, ball-xt, geiger-counter |

---

## 🔲 尚未实现自定义渲染器的场景（0 个——已全部完成！🎉）

所有学科场景均已补齐自定义渲染器（标准轨迹渲染 + 实验装置背景）。

### 力学（剩余 0 个——已全部完成！🎉）

### 电磁学（剩余 0 个——已全部完成！🎉，2026-07-13 新增 9 个）
- `coulomb-force-explore`、`electroscope`、`electrostatic-induction`、`electrostatic-shielding`
- `faraday-cup`、`em-wave-hertz`、`eddy-current`、`em-wave-communication`、`em-spectrum`

### 光学（剩余 0 个——已全部完成！🎉，2026-07-13 新增 5 个）
- `refraction`、`interference`、`diffraction-grating`、`polarization-malus`、`hologram`

### 近代物理（剩余 0 个——已全部完成！🎉，2026-07-13 新增 10 个）
- `photoelectric` — 光电效应（爱因斯坦方程 K_max=hν−W₀ + 阈值 ν₀）
- `bohr` — 玻尔能级 + 发射光谱（按线系着色）
- `radioactive` — 放射性衰变（云室径迹 + 指数衰减曲线）
- `micro-deformation` — 光杠杆放大微小形变
- `black-body` — 黑体辐射（普朗克谱 + 维恩位移）
- `electron-diffraction` — 电子衍射（德布罗意波 + 晶体衍射环）
- `radiation-deflection` — 放射线磁场偏转（α/β/γ 曲率对比）
- `cosmic-ray` — 宇宙射线（大气簇射 + 屏蔽衰减）
- `neutron-discovery` — 中子发现（查德威克两级碰撞）
- `bohr-orbit` — 玻尔轨道模型（rₙ ∝ n²）

### 热学（剩余 0 个——已全部完成！🎉，2026-07-13 新增 1 个）
- `gas-law` — 理想气体状态方程（P–V 图 + 气缸活塞示意，pV=nRT）

---

## 🚀 常用开发命令

### 安装依赖

```bash
cd physics-core && npm install && npm run build && cd ..
cd visualization && npm install && cd ..
```

### 运行测试

```bash
# 所有测试
npm test

# physics-core 测试
cd physics-core && npm test

# visualization 测试
cd visualization && npm test
```

### 编译检查

```bash
# physics-core
cd physics-core && npx tsc --noEmit

# visualization
cd visualization && npx tsc --noEmit
```

### Lint & Format

```bash
npm run lint
npm run format
```

### 启动开发服务器

```bash
cd visualization && npm run dev
```

### CI/CD

- GitHub Actions 配置文件位于 `.github/workflows/`
- CI 流水线：push/PR 到 main 触发，6 道质量门禁
- 部署流水线：CI 成功后自动部署到 GitHub Pages

---

## 🧪 质量标准

### 每批次任务验收要求

1. **TypeScript 编译通过** — `npx tsc --noEmit` 0 错误
2. **全部测试通过** — 255 个测试全绿
3. **视觉自查** — 逐个场景运行查看效果
4. **代码审查** — 对照 Review Checklist

### Code Review Checklist

每次 commit 前检查：

- [ ] **Correctness** — 物理公式/数值计算/边界条件/NaN 处理
- [ ] **Type Safety** — strict TS, no `any`, no non-null assertion abuse
- [ ] **API Consistency** — extends `PhysicsModelBase`, modelType 唯一, requiredParameters 完整
- [ ] **Test Coverage** — 每个 exported 函数至少有 1 个 positive + 1 个 edge-case 测试
- [ ] **Doc & Naming** — 中文 JSDoc, 变量名自解释, 无 magic number
- [ ] **Performance** — 无 O(N²) 大循环, 无内存泄漏 (大数组)
- [ ] **Rendering Contract** — scene 的 `parameters[].name` 与 `buildProblem` 配套, unit 正确
- [ ] **Console.log** — 无调试残留
- [ ] **Unused Imports** — 无未使用的变量

---

## ⚠️ 常见问题与陷阱

### 1. PowerShell 中没有 `head` 命令

**错误**: `npx tsc --noEmit | head -20`

**正确**:
```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

### 2. SearchReplace 原文本不唯一

当出现 `"Match original_text too many times"` 错误时：
- 增加上下文使原文本唯一
- 或使用更大代码块包裹

### 3. free-fall 重复定义

`free-fall` 同时存在于 `SCENES_3D` 和 `SCENES_MECHANICS`，会被先命中 3D 路径。需调整优先级或移除重复。

### 4. 渲染函数的 coordinateTransformer 差异

- **标准轨迹场景**: 使用 `CoordinateTransformer`（物理坐标 → 屏幕坐标映射）
- **自定义场景**: 直接使用屏幕坐标（0~width, 0~height）

### 5. 离屏层缓存失效

标准轨迹场景使用静态层优化（`drawStaticLayer`），主题/视口/仿真结果变化时缓存失效重建。自定义场景不参与此机制。

---

## 📂 关键文件索引

| 文件 | 职责 |
|------|------|
| `visualization/src/components/simulation/SimulationCanvas.tsx` | 渲染主循环 + 场景路由 |
| `visualization/src/rendering/mechanicsScenes.ts` | 力学场景自定义渲染函数 |
| `visualization/src/scenes/scenes/mechanics.ts` | 力学场景配置 + buildProblem |
| `visualization/src/store/simulationStore.ts` | Zustand 全局状态管理 |
| `visualization/src/rendering/CanvasRenderer.ts` | 底层绘图类（标准轨迹管线） |
| `visualization/src/rendering/CoordinateTransformer.ts` | 物理坐标 ↔ 屏幕坐标映射 |
| `physics-core/src/models/*.ts` | 各物理模型的数学计算 |

---

## 📅 版本日志

### 2026-07-13 (2) — 光学 5 场景自定义渲染器 (Task Complete)

**新增 5 个光学场景自定义渲染器**（位于 `visualization/src/rendering/waveOptScenes.ts`，注册进 `SCENES_WAVEOPT` 与 renderer-routing switch）：

1. `refraction` — 光的折射（Snell 定律，含全反射临界角判定）
2. `interference` — 杨氏双缝干涉（条纹 + I(x) 曲线，Δy=λL/d）
3. `diffraction-grating` — 光栅衍射（光栅方程 d·sinθ=kλ，多级谱线，N 越多越锐）
4. `polarization-malus` — 偏振光（马吕斯定律，多级偏振片串联）
5. `hologram` — 全息照相（参考光+物光干涉记录，条纹间距 Λ=λ/|sinθr−sinθo|）

**修改文件**:
- `visualization/src/rendering/waveOptScenes.ts`（补充通用 helper clamp/roundRectPath/drawArrow/drawHud + 颜色常量；+5 个 draw 函数）
- `visualization/src/components/simulation/SimulationCanvas.tsx`（import + `SCENES_WAVEOPT` 集合 + switch case）

**验证结果**:
- TypeScript 编译: 0 错误
- 全部 255 个测试通过（含 `renderer-routing`、`renderers` 自检）

### 2026-07-13 (3) — 近代物理 10 场景自定义渲染器 (Task Complete)

**新增 10 个近代物理场景自定义渲染器**（位于 `visualization/src/rendering/modernScenes.ts`，新建 `SCENES_MODERN` 集合并接入 `isCustomScene` / autoFit-skip / grid-skip / 渲染 switch 三处 + 对应 case）：

1. `photoelectric` — 光电效应（爱因斯坦方程 K_max=hν−W₀，阈值 ν₀，光子/逸出电子动画）
2. `bohr` — 玻尔能级图 + 发射光谱（按线系 Lyman/Balmer/Paschen 着色，Rydberg 波长）
3. `radioactive` — 放射性衰变（云室径迹 α/β/γ 分形 + N(t)=N₀·2^(−t/T½) 衰减曲线）
4. `micro-deformation` — 光杠杆放大微小形变（杠杆几何 + 放大倍数 2D/L + 光斑位移）
5. `black-body` — 黑体辐射（普朗克谱 B_λ(T) + 维恩位移 λ_max=b/T，温度→发光色）
6. `electron-diffraction` — 电子衍射（德布罗意 λ=h/√(2meV) + 晶体衍射环，环距随 V 变化）
7. `radiation-deflection` — 放射线磁场偏转（α/β 曲率半径 r=√(2mK)/(qB)，γ 直线）
8. `cosmic-ray` — 宇宙射线（大气簇射分叉 + 屏蔽衰减 N=N₀·e^(−d/λ)）
9. `neutron-discovery` — 中子发现（查德威克 α+Be→n 与 n+靶→反冲两级碰撞）
10. `bohr-orbit` — 玻尔轨道模型（rₙ∝n² 同心圆 + 电子环游，跃迁能量标注）

**修改文件**:
- `visualization/src/rendering/modernScenes.ts`（新增文件：共享 helper clamp/clearScene/drawTitle/drawHud/roundRectPath/drawArrow/drawGlowCircle + 颜色常量 + 波长/温度取色 helper + 10 个 draw 函数；复用 `constants.ts` 的 `photoThresholdFrequencyTHz`/`wienPeakWavelength`/`stefanBoltzmannExitance`/`PLANCK_H`/`E_CHARGE`/`K_BOLTZMANN`）
- `visualization/src/components/simulation/SimulationCanvas.tsx`（import + 新建 `SCENES_MODERN` 集合 + `isModern` 标志接入 `isCustomScene`/autoFit-skip/grid-skip/自定义渲染 block + 10 个 switch case + 两处依赖数组）

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误
- 全部 255 个测试通过（含 `renderer-routing` L5 路由完整性、`renderers` L3 公式自检、L9 跨场景数值鲁棒性覆盖全部 SCENES 含本批 10 个）

**剩余待实现**: 无（全部场景自定义渲染器已实现 ✅）。

**注**: `optics.ts` 共 8 个 SceneConfig，其中 `thin-film`/`single-slit` 早已实现（`total-internal-reflection` 属 gap 场景），本次补齐其余 5 个。

### 2026-07-13 (4) — 热学 1 场景自定义渲染器 (Task Complete)

**新增 1 个热学场景自定义渲染器**（位于 `visualization/src/rendering/thermalScenes.ts`，注册进 `SCENES_THERMAL` 集合与 renderer-routing switch）：

- `gas-law` — 理想气体状态方程（P–V 图：等温双曲线/等压水平线/等容竖直线，动点沿曲线运动；右侧气缸活塞示意，气体高度 ∝ V、颜色随 T 由蓝变红、压强箭头 ∝ p；实时校验 pV=nRT）

**修改文件**:
- `visualization/src/rendering/thermalScenes.ts`（新增 `drawGasLawScene` + 复用 `clearScene`/`drawTitle`/`drawHud`/`drawInfoBar`/`roundRectPath`）
- `visualization/src/components/simulation/SimulationCanvas.tsx`（import + `SCENES_THERMAL` 集合加入 `gas-law` + 1 个 switch case）

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误
- ESLint / Prettier: 0 错误 / 通过
- 全部 255 个测试通过（含 `renderer-routing` L5 路由完整性、`renderers` L3 公式自检、L9 跨场景数值鲁棒性覆盖全部 SCENES 含本批 1 个）

**剩余待实现**: 无（全部学科场景自定义渲染器已实现 ✅）。

### 2026-07-13 (5) — 现代物理 3D 器材 rig 补全 (Task Complete)

**为 `modernPhysicsRig` 服务的 8 个现代物理场景补齐实验专属 3D rig**（位于 `visualization/src/components/simulation3d/rigs/`，注册进 `modernBundle.ts`）：

1. `black-body` — 黑体空腔（温度→发光色，维恩蓝移，右侧辐射谱柱随 T 变化）
2. `electron-diffraction` — 电子衍射（电子枪→晶体→衍射环，环距 ∝ 1/√V）
3. `radiation-deflection` — 放射线磁场偏转（α 下弯/β 上弯/γ 直线，曲率随 B、动能变化）
4. `cosmic-ray` — 宇宙射线（原初射线→大气簇射→屏蔽层→地面探测器，屏蔽材料随参数切换）
5. `neutron-discovery` — 中子发现（查德威克 α+Be→n 与 n+石蜡→反冲质子两级碰撞）
6. `faraday-cup` — 法拉第圆筒（内表面 Q=0、电荷全在外表面，辉光随总电荷）
7. `liquid-mixing` — 液体混合（水+酒精体积收缩可视化）
8. `molecular-force` — 分子力曲线（Lennard-Jones F(r)，平衡位 r₀=σ·2^(1/6)）

**修改文件**:
- 新增 8 个 rig 文件：`blackBodyRig.ts` `cosmicRayRig.ts` `electronDiffractionRig.ts` `faradayCupRig.ts` `liquidMixingRig.ts` `molecularForceRig.ts` `neutronDiscoveryRig.ts` `radiationDeflectionRig.ts`
- `visualization/src/components/simulation3d/rigs/bundles/modernBundle.ts`（8 处映射由 `modernPhysicsRig` 改为专属 rig；删除占位 `modernPhysicsRig.ts`）

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误
- ESLint / Prettier: 0 错误 / 通过
- 全部 255 个测试通过
- `npm run build`：modernBundle 懒加载 chunk 正常打包

**说明**: 注册表层 123 个场景 100% 覆盖 3D rig；本轮消除现代物理模块最大的"通用占位"缺口。

### 2026-07-13 (6) — 热学 3D 器材 rig 补全 (Task Complete)

**为共用的 `thermalRig` 服务的 16 个热学场景补齐实验专属 3D rig**（位于 `visualization/src/components/simulation3d/rigs/`，注册进 `modernBundle.ts`）：

1. `gas-law` — 气缸活塞（气体柱高度 ∝ V，颜色随 T 蓝→红，向下压强箭头 ∝ p）
2. `diffusion` — 扩散（中心源 + 随机粒子，介质 气体/液体切换容器外观）
3. `brownian-motion` — 布朗运动（显微镜圆视野 + 花粉微粒 + 周围小分子随机撞击）
4. `oil-film` — 油膜（水盘 + 表面虹彩同心环 + 滴管）
5. `melting-curve` — 熔曲线（酒精灯 + 试管固体 + 温度计）
6. `surface-tension` — 表面张力（U 形框 + 可滑动横丝 + 肥皂膜 + 向上拉力箭头）
7. `capillary` — 毛细（液体槽 + 毛细管，管内液面上升/下降由浸润决定，h∝1/r）
8. `wetting` — 润湿（固体平板 + 液滴，接触角随 medium/surface 决定铺展或成球）
9. `liquid-crystal` — 液晶（两玻璃板夹液晶 + 电极，随 T/U 变色）
10. `joule-mechanical` — 焦耳机械功（量热器 + 搅拌桨 + 重物下落）
11. `joule-electrical` — 焦耳电功（量热器 + 电阻丝发热 + 电池，Q=(U²/R)t）
12. `adiabatic-compression` — 绝热压缩（深色绝热气缸 + 活塞下压，气体升温变红）
13. `heat-transfer` — 热传递（热源/冷端 + 传导棒/对流腔/辐射线随 mode 切换）
14. `energy-transformation` — 能量转化（输入→转换箱→输出，效率 ∝ 输出尺寸）
15. `perpetuum-mobile` — 永动机（高/低温热源 + 工质循环，标注卡诺效率不可能 100%）
16. `heat-direction` — 热方向（热块/冷块接触 + 热量箭头从热到冷）

**修改文件**:
- 新增 16 个 rig 文件：`gasLawRig.ts` `diffusionRig.ts` `brownianMotionRig.ts` `oilFilmRig.ts` `meltingCurveRig.ts` `surfaceTensionRig.ts` `capillaryRig.ts` `wettingRig.ts` `liquidCrystalRig.ts` `jouleMechanicalRig.ts` `jouleElectricalRig.ts` `adiabaticCompressionRig.ts` `heatTransferRig.ts` `energyTransformationRig.ts` `perpetuumMobileRig.ts` `heatDirectionRig.ts`
- `visualization/src/components/simulation3d/rigs/bundles/modernBundle.ts`（16 处映射由 `thermalRig` 改为专属 rig）
- `visualization/src/components/simulation3d/rigs/params.ts`（新增共享 `setLabel` 文字精灵刷新工具）

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误
- ESLint / Prettier: 0 错误 / 通过
- 全部 255 个测试通过（含 L2-RIG：全部 123 场景能加载 rig）
- `npm run build`：modernBundle 懒加载 chunk 正常打包

**说明**: 现代物理 + 热学两大模块的 3D 还原度缺口已消除。当时 `thermalRig` 仍服务 induction 模块的 `thermistor`，留待后续批次——已在 (7) 中删除并补专属 rig。

### 2026-07-13 (7) — 感应模块 4 个传感器 3D rig 补全 (Task Complete)

**为感应模块（选必二）4 个"传感器"场景补齐实验专属 3D rig**（位于 `visualization/src/components/simulation3d/rigs/`，注册进 `inductionBundle.ts`），消除此前错配的通用占位映射：

1. `thermistor` — 热敏电阻（NTC 半导体瓷珠 + 加热线圈 + 温度计；响应 `temperature` 做冷蓝→热红着色与辉光）。原错配 `thermalRig`（烧杯+粒子）。
2. `photoresistor` — 光敏电阻（CdS 暗色光敏片 + 梳状电极 + 白炽灯；响应 `lightIntensity` 做光源亮度对数变化）。原错配 `electroscopeRig`（验电器）。
3. `reed-switch` — 干簧管（密封玻璃管 + 两铁簧片 + 条形磁体 + 指示灯；响应 `magnetDistance` 做磁体位移，d<25mm 吸合点亮）。原错配 `electroscopeRig`。
4. `strain-gauge` — 电阻应变片（悬臂梁 + 箔式应变片 + 自由端配重 + 电桥输出指示；以夹紧端为支点按 `strain` 弯折，LED 亮度 ∝ |U·K·ε|）。原错配 `springRig`（弹簧振子）。

**修改文件**:
- 新增 4 个 rig 文件：`thermistorRig.ts` `photoresistorRig.ts` `reedSwitchRig.ts` `strainGaugeRig.ts`
- `visualization/src/components/simulation3d/rigs/bundles/inductionBundle.ts`（4 处映射改为专属 rig；移除失效的 `electroscopeRig` / `thermalRig` / `springRig` 导入）
- 删除 `thermalRig.ts` 占位文件（已无任何场景引用，非死代码）

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误
- ESLint (`npm run lint`，仅 src+server): 0 错误
- Prettier: 通过
- 全部 255 个测试通过（含 L2-RIG：全部 123 场景能加载 rig）
- `npm run build`：inductionBundle 懒加载 chunk 正常打包（5.40 kB）

**说明**: 这是 3D 器材 rig 覆盖补全的收官批次。至此 **EquipmentStage 全部 123 个场景均已映射到实验专属/领域匹配的 3D rig，无任何通用占位 rig 残留**（`modernPhysicsRig`、`thermalRig` 均已删除）。

### 2026-07-13 (8) — 力学/波/电磁基础 8 个 rig 参数响应补全 (Task Complete)

**为 8 个此前 `updateEquipment` 为空实现的 rig 补全参数响应**，使 3D 器材随仿真参数（滑块）实时变化（EquipmentStage.tsx 已在参数变化时真实调用 `updateEquipment(handles.equipmentHandles, parameters)`，故补全后即时生效）。各 rig 在 `buildEquipment` 阶段把可响应 mesh 存入 `handles`，再于 `updateEquipment` 读参数改几何：

1. `pendulumRig` (`simple-pendulum`) — 读 `length` 摆长 → 绳长 + 摆球 Y 位置
2. `springRig` (`spring`) — 读 `m` 质量 → 振子尺寸；`A` 振幅 → 静平衡拉伸量
3. `collisionRig` (`collision`) — 读 `m1`/`m2` 质量 → 两球半径（∝ 立方根）
4. `waveRig` (`mechanical-wave`) — 读 `amplitude` 振幅、`wavelength` 波长、`waveMode` 模式 → 波面高度/半波长间距/横波纵波切换
5. `circularMotionRig` (`circular-motion`) — 读 `radius` 轨道半径、`mass` 质量、`omega` 角速度 → 轨道圈半径/小球尺寸/速度环指示
6. `orbitalRig` (`orbital`) — 读 `altitude` 轨道高度、`velocityFactor` 速度因子 → 轨道高度/绕行速度环
7. `capacitorRig` (`capacitor-charge`/`parallel-plate-capacitor`) — 读 `distance` 极板间距、`area` 极板面积、`emf` 电动势 → 极板间距/极板大小/电场线强度
8. `vibrationRig` (`forced-vibration`/`resonance`/`double-pendulum`) — 读 `length` 摆长、`drivingFreq`/`frequency` 驱动频率 → 摆长/驱动臂角度

**修改文件**: 重写上述 8 个 rig 文件（`visualization/src/components/simulation3d/rigs/` 下）。参数取值统一走 `num(v, fallback)` 两参安全接口；跨场景可选参数（如电容器 `distance`/`area`/`emf` 仅某一场景存在）用 `num(x, NaN)` + `Number.isNaN` 判断后跳过。

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误
- ESLint (`npm run lint`，仅 src+server): 0 错误
- Prettier: 通过
- 全部 255 个测试通过（含 L2-RIG：全部 123 场景能加载 rig）
- `npm run build`：成功（仅 `vendor-physics >500kB` 已知警告，非本次引入）

**说明**: 剩余约 22 个 rig 的 `updateEquipment` 仍是空实现，多为静态器材（验电器、电路、磁场等）或器材本身与参数几何无关，暂不强制补全（见低优先级第 6 项）。

### 2026-07-13 (9) — 第二批 8 个 rig 参数响应补全（静态器材评估）(Task Complete)

**继续补剩余空实现 rig**：先审计确认仍有 20 个 `updateEquipment` 单行空实现（精确 grep `updateEquipment(_handles, _params) {}`；此前审计脚本因正则要求 `{`/`}` 间有换行而漏报），另 `cavendishRig` 在 eMechBundle 已映射（审计脚本正则小瑕疵漏掉，grep 确认空实现，计入）。逐个体评估后，为 **8 个有清晰几何/可见状态耦合** 的 rig 补全参数响应；其余 12 个经判定为静态器材或异构示意类，维持空实现（合理状态）。

**已补的 8 个（build 存 handles，update 读参数改几何）**：
1. `electroscopeRig` (`electroscope`/`electrostatic-induction`/`electrostatic-shielding`/`coulomb-force-explore`) — 箔片张角 ∝ `charge`(或`chargeC`)、∝1/`foilMass`、∝1/√`foilLength`；箔几何高度随 `foilLength`
2. `forceCompositionRig` (`force-composition`) — 两个分力箭头长度 ∝ `f1`/`f2`，F₂ 方向随 `angleDeg`
3. `overweightRig` (`overweight`) — 视重 N=m(g±a)（按 `mode`/`mass`/`accMagnitude`/`gravity`）→ 状态标签"超重/失重/静止 + 示数"（`setLabel`）+ 钩码位置（弹簧拉伸）
4. `transmissionBeltRig` (`transmission-belt`) — 主动/从动轮半径 ∝ `r1`/`r2`（缩放轮几何 + 重建皮带轮廓）；`mode≠0`（齿轮/摩擦轮/同轴）隐藏皮带
5. `microDeformationRig` (`micro-deformation`) — 平面镜 M1 倾角 ∝ `pressure`、∝1/`youngModulus`；反射光斑随倾角上下偏移
6. `fieldRig` (`electric-field`/`magnetic-field`/`em-combined`/`efield-lines`/`current-magnetic`/`hall-effect`) — 场箭头长度 ∝ |Ey| 或 |Bz|（`num(x,NaN)` 区分电/磁场景，方向随正负翻转）
7. `circuitRig` (`circuit` 等 7 场景) — 灯泡 `emissiveIntensity` ∝ `emf` + 电流箭头长度 ∝ `emf`
8. `ampereForceRig` (`ampere-force` 等 8 场景) — 安培力 F=B·I·L·sinθ → 力箭头长度 ∝|F|（方向随正负翻转）+ 电流箭头长度 ∝`I`

**维持空实现的 12 个（评估理由）**：
- `curveMotionRig`/`motionCompositionRig`/`newtonFirstLawRig`/`newtonThirdLawRig` — 牛顿定律/运动合成演示，器材固定，运动由轨迹驱动
- `reactionTimeRig`/`tickerTimerRig` — 刻度尺/打点计时纸带，静态量具
- `centerOfGravityRig` — 不规则薄板+重垂线，悬挂点固定演示
- `emWaveRig` — 发射/接收天线+示意波，异构（em-wave-communication/em-wave-hertz）且波为示意
- `opticsRig`/`waveOpticsRig`/`nuclearRig`/`quantumRig` — 各服务 4/6/5/3 个异构场景，器材为通用示意，无单一几何参数可映射（`quantumRig` 的 photoelectric 仅有频率范围 `nuMin`/`nuMax` 无单值；`cavendishRig` 仅 `duration` 无几何参数）

**修改文件**: 重写上述 8 个 rig 文件（`visualization/src/components/simulation3d/rigs/` 下）。共用约定：`num(v, fallback)` 两参安全取值；跨场景参数用 `num(x, NaN)`+`Number.isNaN` 跳过；文字刷新用 `setLabel`（rigs/params.ts）；灯泡辉光用 `MeshStandardMaterial.emissiveIntensity`。

**验证结果**:
- TypeScript 编译 (`tsc --noEmit`): 0 错误（microDeformationRig 的 `geometry.attributes.position` 加 undefined 守护）
- ESLint (`npm run lint`，仅 src+server): 0 错误
- Prettier: 通过
- 全部 255 个测试通过（含 L2-RIG：全部 123 场景能加载 rig）
- `npm run build`：成功（仅 `vendor-physics >500kB` 已知警告）

**说明**: 至此 123 场景中，16 个 rig 已实现参数响应、12 个空实现 rig 经评估为合理静态状态。3D 器材交互补全工作收官。

### 2026-07-13 — 电磁学 9 场景自定义渲染器 (Task Complete)

**新增 9 个电磁学场景自定义渲染器**（位于 `visualization/src/rendering/electromagnetismScenes.ts`，统一注册进 `SCENES_ELECTROMAGNETISM` 与 renderer-routing switch）：

1. `coulomb-force-explore` — 探究库仑定律（F=kq₁q₂/r²，两种探究模式）
2. `electroscope` — 验电器箔片张角 vs 带电量
3. `electrostatic-induction` — 静电感应（近端异种/远端同种电荷）
4. `electrostatic-shielding` — 静电屏蔽（接地 vs 不接地，内部 E=0）
5. `faraday-cup` — 法拉第圆筒（电荷全部分布外表面，内表面=0）
6. `em-wave-hertz` — 赫兹电磁波实验（火花振子 → 接收环共振）
7. `eddy-current` — 涡流阻尼摆动（振幅指数衰减动画）
8. `em-wave-communication` — AM 调幅波（载波/调制信号/已调波三段图）
9. `em-spectrum` — 电磁波谱（对数频率轴七段着色，高亮可见光）

**修改文件**:
- `visualization/src/rendering/electromagnetismScenes.ts`（+9 个 draw 函数，复用 clearScene/drawTitle/drawArrow/drawHud/drawInfoBar/roundRectPath/clamp 等）
- `visualization/src/components/simulation/SimulationCanvas.tsx`（import + `SCENES_ELECTROMAGNETISM` 集合 + switch case）

**验证结果**:
- TypeScript 编译: 0 错误
- 全部 255 个测试通过（含 `renderer-routing`、`renderers` 自检，确认新场景已接入）

### 2026-07-12 — 力学场景可视化优化 (Task Complete)

**新增 13 个力学场景自定义渲染器**:

1. `curve-condition` — 曲线运动条件
2. `motion-composition` — 运动合成与分解
3. `curve-velocity-direction` — 曲线速度方向
4. `simple-pendulum` — 单摆（简谐运动）
5. `energy-conservation` — 机械能守恒
6. `overweight` — 超重与失重（电梯台秤）
7. `centrifugal` — 离心现象
8. `orbital` — 万有引力与航天（卫星轨道）
9. `momentum` — 动量定理与反冲
10. `projectile-collision` — 平抛碰撞（验证动量守恒）
11. `mechanical-wave` — 机械波（横波/纵波/干涉）
12. `cavendish` — 卡文迪什扭秤测 G
13. `moon-earth-test` — 月地检验（牛顿）

**修改文件**:
- `visualization/src/rendering/mechanicsScenes.ts` (+1190 行)
- `visualization/src/components/simulation/SimulationCanvas.tsx` (+54 行)

**验证结果**:
- TypeScript 编译: 0 错误
- 全部 255 个测试通过
- 开发服务器运行正常

---

## 🔮 后续优化建议

### 高优先级（基础教学场景）

1. **电磁学场景** — ✅ 已完成（2026-07-13 新增 9 个：coulomb-force-explore / electroscope / electrostatic-induction / electrostatic-shielding / faraday-cup / em-wave-hertz / eddy-current / em-wave-communication / em-spectrum）

2. **光学场景** — ✅ 已完成（2026-07-13 新增 5 个：refraction / interference / diffraction-grating / polarization-malus / hologram）

### 中优先级（补充完整性）

3. **近代物理场景** — ✅ 已完成（2026-07-13 新增 10 个：photoelectric / bohr / radioactive / micro-deformation / black-body / electron-diffraction / radiation-deflection / cosmic-ray / neutron-discovery / bohr-orbit）

4. **热学场景** — ✅ 已完成（2026-07-13 新增 1 个：gas-law 理想气体状态方程 P–V 图 + 气缸活塞示意）

### 低优先级（3D 实验器材还原度）

5. **3D 器材 rig 覆盖补全** — ✅ 已完成（2026-07-13 共三批：现代物理 8 个专属 rig 完成并删除 `modernPhysicsRig`；热学 16 个专属 rig 完成；感应模块 4 个传感器场景专属 rig 完成并删除 `thermalRig`。注册表层 123 场景 100% 覆盖，且每个场景均已映射实验专属/领域匹配器材 rig，无通用占位残留）。

6. **3D rig 参数交互响应** — ✅ 已完成（2026-07-13 分两批共 16 个 rig 已补 `updateEquipment`：首批 8 个核心 rig 见 (8)；第二批 8 个见 (9)：验电器/力的合成/超重失重/传动带/光杠杆/电场/电路/安培力。剩余约 12 个空实现 rig 经逐个体评估为静态器材或异构示意类，维持空实现为合理状态）。

---

## 💡 开发技巧

### 快速原型验证

新建一个场景时，可以先用简单几何图形（矩形/圆形/线条）搭骨架，确认布局和动画无误后再细化视觉效果。

### 复用辅助函数

不要重复造轮子，优先使用已有的辅助函数：
- `drawArrow()` — 矢量箭头
- `drawBlock()` — 3D 方块
- `roundRectPath()` — 圆角矩形
- `shadeColor()` / `colorToRgb()` — 颜色工具

### 参数调试

在 `params` 对象中可以通过 `??` 操作符设置默认值：
```typescript
const length = params['length'] ?? 1.0;  // 如果未传入则用 1.0
```

### 动画帧同步

使用 `getFrame(simulationResult, currentTime)` 统一从 simulationResult 中提取当前帧并进行线性插值，避免跳帧。

### 离屏层调试

如遇渲染性能问题，可在 `SimulationCanvas.tsx` 中临时注释掉 `usesStaticLayer` 相关代码禁用离屏缓存。

---

## 📞 联系方式

如有问题，请检查：
1. 本项目 [AGENTS.md](AGENTS.md) — AI Agent 行为规范
2. 本项目 [WORKFLOW.md](docs/WORKFLOW.md) — 开发工作流文档
3. 测试覆盖率报告 — `npm test -- --coverage`

---

**文档版本**: v1.9  
**最后更新**: 2026-07-13  
**维护者**: PhysVis Development Team
