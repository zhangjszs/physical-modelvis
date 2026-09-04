# 🌸 屎山代码分析报告 🌸

## 📑 目录

- [糟糕指数](#overall-score)
- [评分指标详情](#metrics-details)
- [最屎代码排行榜](#problem-files)
- [诊断结论](#conclusion)

![Score](https://img.shields.io/badge/Score-88%25-brightgreen)

## 糟糕指数 {#overall-score}

| 指标摘要 | 评分 |
|------|-------|
| **糟糕指数** | **88.06/100** |
| 屎山等级 | 🌸 偶有异味 |

> 清新宜人，初闻像早晨的露珠

### 📊 统计信息

| 指标 | 数值 |
|--------|-------|
| 总文件数 | 532 |
| 已跳过 | 12557 |
| 耗时 | 3156ms |

### 📋 项目概览

| 指标 | 数值 |
|--------|-------|
| 总代码行数 | 79347 |
| 总注释行数 | 8935 |
| 整体注释比例 | 11.3% |
| 平均文件大小 | 180 行 |
| 最大文件 | `visualization\src\components\formula\FormulaPanel.tsx` (2895) |

#### 语言分布

| 语言 | 文件数 |
|:-----|------:|
| TypeScript | 524 |
| JavaScript | 7 |
| Shell | 1 |

## 评分指标详情 {#metrics-details}

| 指标摘要 | 评分 | Min | Max | Median | 状态 |
|:-----|------:|------:|------:|------:|:------:|
| 循环复杂度 | 7.55% | 0.0% | 100.0% | 0.0% | ✓✓ |
| 认知复杂度 | 6.72% | 0.0% | 96.0% | 0.0% | ✓✓ |
| 嵌套深度 | 1.33% | 0.0% | 89.3% | 0.0% | ✓✓ |
| 函数长度 | 9.66% | 0.0% | 99.0% | 0.0% | ✓✓ |
| 文件长度 | 2.51% | 0.0% | 99.4% | 0.0% | ✓✓ |
| 参数数量 | 4.54% | 0.0% | 98.5% | 0.0% | ✓✓ |
| 代码重复 | 0.53% | 0.0% | 81.7% | 0.0% | ✓✓ |
| 结构分析 | 0.81% | 0.0% | 26.5% | 0.0% | ✓✓ |
| 错误处理 | 3.79% | 0.0% | 98.8% | 0.0% | ✓✓ |
| 注释比例 | 38.86% | 0.0% | 100.0% | 13.1% | ○ |
| 命名规范 | 0.09% | 0.0% | 50.0% | 0.0% | ✓✓ |

## 最屎代码排行榜 {#problem-files}

### 1. visualization\src\rendering\chapter2Scenes.ts

**糟糕指数: 44.27**

> 行数: 1331 总计, 1021 代码, 181 注释 | 函数: 10 | 类: 2

**问题**: 🔄 复杂度问题: 11, ⚠️ 其他问题: 5, 🏗️ 结构问题: 5

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `drawResonanceCurveScene` | L830-1230 | 361 | 45 | 4 | 1 | ✗ |
| `drawForcedVibrationScene` | L435-813 | 376 | 34 | 2 | 1 | ✗ |
| `drawDoublePendulumSyncScene` | L211-414 | 204 | 24 | 3 | 1 | ✗ |
| `drawMiniChart` | L110-196 | 85 | 17 | 3 | 1 | ✓ |
| `drawNewtonTubeScene` | L1232-1330 | 98 | 12 | 3 | 1 | ✗ |
| `drawSpringCoil` | L48-87 | 40 | 10 | 1 | 8 | ✓ |
| `sx` | L134-134 | 1 | 1 | 0 | 1 | ✗ |
| `sy` | L135-135 | 1 | 1 | 0 | 1 | ✗ |
| `sx` | L948-948 | 1 | 1 | 0 | 1 | ✗ |
| `sy` | L949-949 | 1 | 1 | 0 | 1 | ✗ |

**全部问题 (20)**

- 🔄 `drawMiniChart()` L110: 复杂度: 17
- 🔄 `drawDoublePendulumSyncScene()` L211: 复杂度: 24
- 🔄 `drawForcedVibrationScene()` L435: 复杂度: 34
- 🔄 `drawResonanceCurveScene()` L830: 复杂度: 45
- 🔄 `drawNewtonTubeScene()` L1232: 复杂度: 12
- 🔄 `drawMiniChart()` L110: 认知复杂度: 23
- 🔄 `drawDoublePendulumSyncScene()` L211: 认知复杂度: 30
- 🔄 `drawForcedVibrationScene()` L435: 认知复杂度: 38
- 🔄 `drawResonanceCurveScene()` L830: 认知复杂度: 53
- 🔄 `drawNewtonTubeScene()` L1232: 认知复杂度: 18
- 🔄 `drawResonanceCurveScene()` L830: 嵌套深度: 4
- 📏 `drawDoublePendulumSyncScene()` L211: 204 代码量
- 📏 `drawForcedVibrationScene()` L435: 376 代码量
- 📏 `drawResonanceCurveScene()` L830: 361 代码量
- 📏 `drawSpringCoil()` L48: 8 参数数量
- 🏗️ `drawMiniChart()` L110: 中等嵌套: 3
- 🏗️ `drawDoublePendulumSyncScene()` L211: 中等嵌套: 3
- 🏗️ `drawResonanceCurveScene()` L830: 中等嵌套: 4
- 🏗️ `drawNewtonTubeScene()` L1232: 中等嵌套: 3
- 🏗️ L1: 文件过大: 1331 行

**详情**:
- 循环复杂度: 平均: 14.6, 最大: 45
- 认知复杂度: 平均: 17.8, 最大: 53
- 嵌套深度: 平均: 1.6, 最大: 4
- 函数长度: 平均: 116.8 行, 最大: 376 行
- 文件长度: 1021 代码量 (1331 总计)
- 参数数量: 平均: 1.7, 最大: 8
- 代码重复: 0.0% 重复 (0/10)
- 结构分析: 5 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 17.7% (181/1021)
- 命名规范: 无命名违规

### 2. visualization\src\rendering\sensorApplicationScenes.ts

**糟糕指数: 42.82**

> 行数: 756 总计, 623 代码, 77 注释 | 函数: 2 | 类: 1

**问题**: 🔄 复杂度问题: 4, ⚠️ 其他问题: 3, 🏗️ 结构问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `drawSecurityAlarmScene` | L33-343 | 311 | 46 | 2 | 1 | ✗ |
| `drawLightControlSwitchScene` | L345-755 | 407 | 43 | 2 | 1 | ✗ |

**全部问题 (6)**

- 🔄 `drawSecurityAlarmScene()` L33: 复杂度: 46
- 🔄 `drawLightControlSwitchScene()` L345: 复杂度: 43
- 🔄 `drawSecurityAlarmScene()` L33: 认知复杂度: 50
- 🔄 `drawLightControlSwitchScene()` L345: 认知复杂度: 47
- 📏 `drawSecurityAlarmScene()` L33: 311 代码量
- 📏 `drawLightControlSwitchScene()` L345: 407 代码量

**详情**:
- 循环复杂度: 平均: 44.5, 最大: 46
- 认知复杂度: 平均: 48.5, 最大: 50
- 嵌套深度: 平均: 2.0, 最大: 2
- 函数长度: 平均: 359.0 行, 最大: 407 行
- 文件长度: 623 代码量 (756 总计)
- 参数数量: 平均: 1.0, 最大: 1
- 代码重复: 未发现函数
- 结构分析: 0 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 12.4% (77/623)
- 命名规范: 无命名违规

### 3. physics-core\src\models\reed-switch.ts

**糟糕指数: 42.55**

> 行数: 358 总计, 275 代码, 64 注释 | 函数: 1 | 类: 1

**问题**: 🔄 复杂度问题: 3, ⚠️ 其他问题: 2, 🏗️ 结构问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `solve` | L59-356 | 298 | 52 | 4 | 1 | ✗ |

**全部问题 (5)**

- 🔄 `solve()` L59: 复杂度: 52
- 🔄 `solve()` L59: 认知复杂度: 60
- 🔄 `solve()` L59: 嵌套深度: 4
- 📏 `solve()` L59: 298 代码量
- 🏗️ `solve()` L59: 中等嵌套: 4

**详情**:
- 循环复杂度: 平均: 52.0, 最大: 52
- 认知复杂度: 平均: 60.0, 最大: 60
- 嵌套深度: 平均: 4.0, 最大: 4
- 函数长度: 平均: 298.0 行, 最大: 298 行
- 文件长度: 275 代码量 (358 总计)
- 参数数量: 平均: 1.0, 最大: 1
- 代码重复: 未发现函数
- 结构分析: 1 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 23.3% (64/275)
- 命名规范: 无命名违规

### 4. visualization\src\rendering\solidLiquidScenes.ts

**糟糕指数: 42.21**

> 行数: 990 总计, 829 代码, 85 注释 | 函数: 7 | 类: 1

**问题**: 🔄 复杂度问题: 10, ⚠️ 其他问题: 5, 🏗️ 结构问题: 2

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `drawMeltingCurveScene` | L36-310 | 270 | 39 | 5 | 1 | ✗ |
| `drawLiquidCrystalScene` | L766-989 | 208 | 32 | 5 | 1 | ✗ |
| `drawCapillaryScene` | L510-724 | 206 | 28 | 2 | 1 | ✗ |
| `drawSurfaceTensionScene` | L312-508 | 186 | 19 | 2 | 1 | ✗ |
| `drawWettingScene` | L726-764 | 39 | 10 | 1 | 1 | ✗ |
| `sx` | L100-100 | 1 | 1 | 0 | 1 | ✗ |
| `sy` | L101-101 | 1 | 1 | 0 | 1 | ✗ |

**全部问题 (16)**

- 🔄 `drawMeltingCurveScene()` L36: 复杂度: 39
- 🔄 `drawSurfaceTensionScene()` L312: 复杂度: 19
- 🔄 `drawCapillaryScene()` L510: 复杂度: 28
- 🔄 `drawLiquidCrystalScene()` L766: 复杂度: 32
- 🔄 `drawMeltingCurveScene()` L36: 认知复杂度: 49
- 🔄 `drawSurfaceTensionScene()` L312: 认知复杂度: 23
- 🔄 `drawCapillaryScene()` L510: 认知复杂度: 32
- 🔄 `drawLiquidCrystalScene()` L766: 认知复杂度: 42
- 🔄 `drawMeltingCurveScene()` L36: 嵌套深度: 5
- 🔄 `drawLiquidCrystalScene()` L766: 嵌套深度: 5
- 📏 `drawMeltingCurveScene()` L36: 270 代码量
- 📏 `drawSurfaceTensionScene()` L312: 186 代码量
- 📏 `drawCapillaryScene()` L510: 206 代码量
- 📏 `drawLiquidCrystalScene()` L766: 208 代码量
- 🏗️ `drawMeltingCurveScene()` L36: 嵌套过深: 5
- 🏗️ `drawLiquidCrystalScene()` L766: 嵌套过深: 5

**详情**:
- 循环复杂度: 平均: 18.6, 最大: 39
- 认知复杂度: 平均: 22.9, 最大: 49
- 嵌套深度: 平均: 2.1, 最大: 5
- 函数长度: 平均: 130.1 行, 最大: 270 行
- 文件长度: 829 代码量 (990 总计)
- 参数数量: 平均: 1.0, 最大: 1
- 代码重复: 0.0% 重复 (0/7)
- 结构分析: 2 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 10.3% (85/829)
- 命名规范: 无命名违规

### 5. visualization\src\rendering\emEquipmentScenes.ts

**糟糕指数: 41.55**

> 行数: 1886 总计, 1457 代码, 266 注释 | 函数: 16 | 类: 1

**问题**: 🔄 复杂度问题: 12, ⚠️ 其他问题: 7, 🏗️ 结构问题: 6

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `drawMutualInductanceScene` | L792-1149 | 356 | 44 | 3 | 1 | ✗ |
| `drawSelfInductanceScene` | L1166-1493 | 326 | 34 | 3 | 1 | ✗ |
| `drawLCOscillatorScene` | L1509-1885 | 360 | 34 | 3 | 1 | ✗ |
| `drawCurrentBalanceScene` | L199-487 | 289 | 27 | 3 | 1 | ✗ |
| `drawEmDampingScene` | L503-775 | 273 | 27 | 3 | 1 | ✗ |
| `drawMiniChart` | L36-137 | 100 | 15 | 2 | 1 | ✓ |
| `interp` | L1535-1549 | 15 | 5 | 2 | 2 | ✗ |
| `drawCoilHorizontal` | L140-182 | 43 | 2 | 1 | 8 | ✓ |
| `sx` | L78-78 | 1 | 1 | 0 | 1 | ✗ |
| `sy` | L79-79 | 1 | 1 | 0 | 1 | ✗ |
| `sxv` | L1043-1043 | 1 | 1 | 0 | 1 | ✗ |
| `syv` | L1044-1044 | 1 | 1 | 0 | 1 | ✗ |
| `sxv` | L1364-1364 | 1 | 1 | 0 | 1 | ✗ |
| `syv` | L1365-1365 | 1 | 1 | 0 | 1 | ✗ |
| `sxv` | L1770-1770 | 1 | 1 | 0 | 1 | ✗ |
| `syv` | L1771-1771 | 1 | 1 | 0 | 1 | ✗ |

**全部问题 (24)**

- 🔄 `drawMiniChart()` L36: 复杂度: 15
- 🔄 `drawCurrentBalanceScene()` L199: 复杂度: 27
- 🔄 `drawEmDampingScene()` L503: 复杂度: 27
- 🔄 `drawMutualInductanceScene()` L792: 复杂度: 44
- 🔄 `drawSelfInductanceScene()` L1166: 复杂度: 34
- 🔄 `drawLCOscillatorScene()` L1509: 复杂度: 34
- 🔄 `drawMiniChart()` L36: 认知复杂度: 19
- 🔄 `drawCurrentBalanceScene()` L199: 认知复杂度: 33
- 🔄 `drawEmDampingScene()` L503: 认知复杂度: 33
- 🔄 `drawMutualInductanceScene()` L792: 认知复杂度: 50
- 🔄 `drawSelfInductanceScene()` L1166: 认知复杂度: 40
- 🔄 `drawLCOscillatorScene()` L1509: 认知复杂度: 40
- 📏 `drawCurrentBalanceScene()` L199: 289 代码量
- 📏 `drawEmDampingScene()` L503: 273 代码量
- 📏 `drawMutualInductanceScene()` L792: 356 代码量
- 📏 `drawSelfInductanceScene()` L1166: 326 代码量
- 📏 `drawLCOscillatorScene()` L1509: 360 代码量
- 📏 `drawCoilHorizontal()` L140: 8 参数数量
- 🏗️ `drawCurrentBalanceScene()` L199: 中等嵌套: 3
- 🏗️ `drawEmDampingScene()` L503: 中等嵌套: 3
- 🏗️ `drawMutualInductanceScene()` L792: 中等嵌套: 3
- 🏗️ `drawSelfInductanceScene()` L1166: 中等嵌套: 3
- 🏗️ `drawLCOscillatorScene()` L1509: 中等嵌套: 3
- 🏗️ L1: 文件过大: 1886 行

**详情**:
- 循环复杂度: 平均: 12.3, 最大: 44
- 认知复杂度: 平均: 14.8, 最大: 50
- 嵌套深度: 平均: 1.3, 最大: 3
- 函数长度: 平均: 110.6 行, 最大: 360 行
- 文件长度: 1457 代码量 (1886 总计)
- 参数数量: 平均: 1.5, 最大: 8
- 代码重复: 0.0% 重复 (0/16)
- 结构分析: 6 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 18.3% (266/1457)
- 命名规范: 无命名违规

### 6. visualization\src\components\simulation\SimulationCanvas.tsx

**糟糕指数: 40.58**

> 行数: 2208 总计, 2011 代码, 73 注释 | 函数: 25 | 类: 0

**问题**: 🔄 复杂度问题: 5, ⚠️ 其他问题: 15, 🏗️ 结构问题: 3, 📝 注释问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `drawSpringScene` | L564-672 | 109 | 21 | 1 | 6 | ✓ |
| `drawInclinedPlaneScene` | L677-807 | 131 | 13 | 1 | 6 | ✓ |
| `drawEMCombinedField` | L810-916 | 107 | 10 | 2 | 5 | ✓ |
| `loop` | L1992-2033 | 42 | 10 | 2 | 1 | ✗ |
| `findNearestTrajectoryPoint` | L2064-2121 | 58 | 10 | 2 | 2 | ✗ |
| `drawElectricField` | L339-407 | 69 | 8 | 1 | 5 | ✓ |
| `drawCollisionScene` | L452-561 | 63 | 8 | 1 | 6 | ✓ |
| `drawBg` | L1266-1280 | 15 | 7 | 6 | 1 | ✗ |
| `drawAirTrackScene` | L921-1070 | 139 | 6 | 1 | 10 | ✓ |
| `drawMagneticField` | L410-449 | 40 | 5 | 2 | 5 | ✓ |
| `countPastPoints` | L174-183 | 10 | 3 | 2 | 2 | ✓ |
| `physToScreen` | L2055-2062 | 8 | 3 | 1 | 1 | ✗ |
| `draw3DBox` | L472-492 | 21 | 2 | 0 | 4 | ✗ |
| `drawArrow2` | L494-519 | 26 | 2 | 1 | 5 | ✗ |
| `resize` | L1159-1172 | 14 | 2 | 1 | 0 | ✗ |
| `onMouseMove` | L2135-2140 | 6 | 2 | 0 | 1 | ✗ |
| `onClick` | L2147-2154 | 8 | 2 | 1 | 1 | ✗ |
| `hexToRgb` | L2191-2201 | 10 | 2 | 0 | 1 | ✗ |
| `SimulationCanvas` | L1072-2171 | 121 | 1 | 0 | 0 | ✗ |
| `getRenderer` | L2048-2050 | 3 | 1 | 0 | 0 | ✗ |
| `getCanvasPos` | L2123-2133 | 11 | 1 | 0 | 1 | ✗ |
| `onMouseLeave` | L2142-2145 | 4 | 1 | 0 | 0 | ✗ |
| `roundRectPath` | L2177-2189 | 13 | 1 | 0 | 6 | ✗ |
| `darkenHex` | L2203-2207 | 3 | 1 | 0 | 2 | ✗ |
| `clamp` | L2205-2205 | 1 | 1 | 0 | 1 | ✗ |

**全部问题 (22)**

- 🔄 `drawSpringScene()` L564: 复杂度: 21
- 🔄 `drawInclinedPlaneScene()` L677: 复杂度: 13
- 🔄 `drawSpringScene()` L564: 认知复杂度: 23
- 🔄 `drawBg()` L1266: 认知复杂度: 19
- 🔄 `drawBg()` L1266: 嵌套深度: 6
- 📏 `drawSpringScene()` L564: 109 代码量
- 📏 `drawInclinedPlaneScene()` L677: 131 代码量
- 📏 `drawEMCombinedField()` L810: 107 代码量
- 📏 `drawAirTrackScene()` L921: 139 代码量
- 📏 `SimulationCanvas()` L1072: 121 代码量
- 📏 `drawElectricField()` L339: 5 参数数量
- 📏 `drawMagneticField()` L410: 5 参数数量
- 📏 `drawCollisionScene()` L452: 6 参数数量
- 📏 `drawArrow2()` L494: 5 参数数量
- 📏 `drawSpringScene()` L564: 6 参数数量
- 📏 `drawInclinedPlaneScene()` L677: 6 参数数量
- 📏 `drawEMCombinedField()` L810: 5 参数数量
- 📏 `drawAirTrackScene()` L921: 10 参数数量
- 📏 `roundRectPath()` L2177: 6 参数数量
- 🏗️ `drawBg()` L1266: 嵌套过深: 6
- 🏗️ L1: 文件过大: 2208 行
- 🏗️ L1: 导入过多: 38

**详情**:
- 循环复杂度: 平均: 4.9, 最大: 21
- 认知复杂度: 平均: 6.9, 最大: 23
- 嵌套深度: 平均: 1.0, 最大: 6
- 函数长度: 平均: 41.3 行, 最大: 139 行
- 文件长度: 2011 代码量 (2208 总计)
- 参数数量: 平均: 2.9, 最大: 10
- 代码重复: 4.0% 重复 (1/25)
- 结构分析: 3 个结构问题
- 错误处理: 0/1 个错误被忽略 (0.0%)
- 注释比例: 3.6% (73/2011)
- 命名规范: 无命名违规

### 7. physics-core\src\models\centrifugal.ts

**糟糕指数: 37.94**

> 行数: 424 总计, 344 代码, 56 注释 | 函数: 1 | 类: 1

**问题**: 🔄 复杂度问题: 2, ⚠️ 其他问题: 2, 🏗️ 结构问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `solve` | L45-422 | 360 | 30 | 3 | 1 | ✗ |

**全部问题 (4)**

- 🔄 `solve()` L45: 复杂度: 30
- 🔄 `solve()` L45: 认知复杂度: 36
- 📏 `solve()` L45: 360 代码量
- 🏗️ `solve()` L45: 中等嵌套: 3

**详情**:
- 循环复杂度: 平均: 30.0, 最大: 30
- 认知复杂度: 平均: 36.0, 最大: 36
- 嵌套深度: 平均: 3.0, 最大: 3
- 函数长度: 平均: 360.0 行, 最大: 360 行
- 文件长度: 344 代码量 (424 总计)
- 参数数量: 平均: 1.0, 最大: 1
- 代码重复: 未发现函数
- 结构分析: 1 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 16.3% (56/344)
- 命名规范: 无命名违规

### 8. visualization\src\rendering\sensorElementScenes.ts

**糟糕指数: 35.26**

> 行数: 1225 总计, 970 代码, 138 注释 | 函数: 6 | 类: 1

**问题**: 🔄 复杂度问题: 10, ⚠️ 其他问题: 7, 🏗️ 结构问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `drawReedSwitchScene` | L645-941 | 297 | 31 | 1 | 1 | ✗ |
| `drawPhotoresistorScene` | L218-452 | 235 | 24 | 1 | 1 | ✗ |
| `drawHallEffectScene` | L51-216 | 166 | 19 | 1 | 1 | ✗ |
| `drawThermistorScene` | L454-643 | 190 | 17 | 1 | 1 | ✗ |
| `drawStrainGaugeScene` | L943-1224 | 272 | 14 | 1 | 1 | ✗ |
| `drawBFieldDot` | L36-49 | 14 | 1 | 0 | 5 | ✗ |

**全部问题 (17)**

- 🔄 `drawHallEffectScene()` L51: 复杂度: 19
- 🔄 `drawPhotoresistorScene()` L218: 复杂度: 24
- 🔄 `drawThermistorScene()` L454: 复杂度: 17
- 🔄 `drawReedSwitchScene()` L645: 复杂度: 31
- 🔄 `drawStrainGaugeScene()` L943: 复杂度: 14
- 🔄 `drawHallEffectScene()` L51: 认知复杂度: 21
- 🔄 `drawPhotoresistorScene()` L218: 认知复杂度: 26
- 🔄 `drawThermistorScene()` L454: 认知复杂度: 19
- 🔄 `drawReedSwitchScene()` L645: 认知复杂度: 33
- 🔄 `drawStrainGaugeScene()` L943: 认知复杂度: 16
- 📏 `drawHallEffectScene()` L51: 166 代码量
- 📏 `drawPhotoresistorScene()` L218: 235 代码量
- 📏 `drawThermistorScene()` L454: 190 代码量
- 📏 `drawReedSwitchScene()` L645: 297 代码量
- 📏 `drawStrainGaugeScene()` L943: 272 代码量
- 📏 `drawBFieldDot()` L36: 5 参数数量
- 🏗️ L1: 文件过大: 1225 行

**详情**:
- 循环复杂度: 平均: 17.7, 最大: 31
- 认知复杂度: 平均: 19.3, 最大: 33
- 嵌套深度: 平均: 0.8, 最大: 1
- 函数长度: 平均: 195.7 行, 最大: 297 行
- 文件长度: 970 代码量 (1225 总计)
- 参数数量: 平均: 1.7, 最大: 5
- 代码重复: 0.0% 重复 (0/6)
- 结构分析: 1 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 14.2% (138/970)
- 命名规范: 无命名违规

### 9. visualization\src\analysis\problemAnalyzer.ts

**糟糕指数: 34.00**

> 行数: 426 总计, 390 代码, 1 注释 | 函数: 17 | 类: 3

**问题**: 🔄 复杂度问题: 6, ⚠️ 其他问题: 2, 📋 重复问题: 1, 🏗️ 结构问题: 4, ❌ 错误处理问题: 3, 📝 注释问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `sceneChecks` | L293-331 | 39 | 11 | 8 | 2 | ✗ |
| `classifyScene` | L196-233 | 37 | 10 | 3 | 1 | ✗ |
| `sceneFormulas` | L268-291 | 24 | 10 | 1 | 1 | ✗ |
| `inferParameters` | L333-391 | 59 | 10 | 8 | 4 | ✗ |
| `clampToScene` | L251-266 | 16 | 5 | 2 | 3 | ✗ |
| `firstMatch` | L77-92 | 15 | 4 | 2 | 4 | ✗ |
| `analyzePhysicsProblem` | L393-425 | 33 | 4 | 3 | 1 | ✗ |
| `chargeValue` | L176-194 | 18 | 2 | 1 | 1 | ✗ |
| `addParam` | L235-249 | 15 | 2 | 1 | 4 | ✗ |
| `normalizeText` | L66-75 | 10 | 1 | 0 | 1 | ✗ |
| `lengthValue` | L94-107 | 13 | 1 | 0 | 2 | ✗ |
| `velocityValue` | L109-122 | 13 | 1 | 0 | 2 | ✗ |
| `massValue` | L124-137 | 13 | 1 | 0 | 2 | ✗ |
| `unitlessValue` | L139-142 | 4 | 1 | 0 | 3 | ✗ |
| `angleValue` | L144-154 | 11 | 1 | 0 | 2 | ✗ |
| `accelerationValue` | L156-162 | 7 | 1 | 0 | 1 | ✗ |
| `fieldValue` | L164-174 | 11 | 1 | 0 | 4 | ✗ |

**全部问题 (14)**

- 🔄 `sceneChecks()` L293: 复杂度: 11
- 🔄 `classifyScene()` L196: 认知复杂度: 16
- 🔄 `sceneChecks()` L293: 认知复杂度: 27
- 🔄 `inferParameters()` L333: 认知复杂度: 26
- 🔄 `sceneChecks()` L293: 嵌套深度: 8
- 🔄 `inferParameters()` L333: 嵌套深度: 8
- 📋 `lengthValue()` L94: 重复模式: lengthValue, velocityValue, massValue
- 🏗️ `classifyScene()` L196: 中等嵌套: 3
- 🏗️ `sceneChecks()` L293: 嵌套过深: 8
- 🏗️ `inferParameters()` L333: 嵌套过深: 8
- 🏗️ `analyzePhysicsProblem()` L393: 中等嵌套: 3
- ❌ L207: 未处理的易出错调用
- ❌ L210: 未处理的易出错调用
- ❌ L213: 未处理的易出错调用

**详情**:
- 循环复杂度: 平均: 3.9, 最大: 11
- 认知复杂度: 平均: 7.3, 最大: 27
- 嵌套深度: 平均: 1.7, 最大: 8
- 函数长度: 平均: 19.9 行, 最大: 59 行
- 文件长度: 390 代码量 (426 总计)
- 参数数量: 平均: 2.2, 最大: 4
- 代码重复: 11.8% 重复 (2/17)
- 结构分析: 4 个结构问题
- 错误处理: 3/3 个错误被忽略 (100.0%)
- 注释比例: 0.3% (1/390)
- 命名规范: 无命名违规

### 10. physics-core\src\models\melting-curve.ts

**糟糕指数: 33.30**

> 行数: 238 总计, 193 代码, 28 注释 | 函数: 1 | 类: 1

**问题**: 🔄 复杂度问题: 3, ⚠️ 其他问题: 1, 🏗️ 结构问题: 1

#### 函数详情

| 函数 | 行范围 | 行数 | 复杂度 | 嵌套 | 参数 | 注释 |
|:-----|------:|------:|------:|------:|------:|:------:|
| `solve` | L39-236 | 198 | 21 | 5 | 1 | ✗ |

**全部问题 (5)**

- 🔄 `solve()` L39: 复杂度: 21
- 🔄 `solve()` L39: 认知复杂度: 31
- 🔄 `solve()` L39: 嵌套深度: 5
- 📏 `solve()` L39: 198 代码量
- 🏗️ `solve()` L39: 嵌套过深: 5

**详情**:
- 循环复杂度: 平均: 21.0, 最大: 21
- 认知复杂度: 平均: 31.0, 最大: 31
- 嵌套深度: 平均: 5.0, 最大: 5
- 函数长度: 平均: 198.0 行, 最大: 198 行
- 文件长度: 193 代码量 (238 总计)
- 参数数量: 平均: 1.0, 最大: 1
- 代码重复: 未发现函数
- 结构分析: 1 个结构问题
- 错误处理: 未检测到易出错调用
- 注释比例: 14.5% (28/193)
- 命名规范: 无命名违规

## 最差函数 Top 10

| 函数 | 文件 | 复杂度 | 嵌套 | 行数 |
|:-----|:-----|------:|------:|------:|
| `solve` | physics-core\src\models\reed-switch.ts | 52 | 4 | 298 |
| `drawSecurityAlarmScene` | visualization\src\rendering\sensorApplicationScenes.ts | 46 | 2 | 311 |
| `drawResonanceCurveScene` | visualization\src\rendering\chapter2Scenes.ts | 45 | 4 | 361 |
| `drawMutualInductanceScene` | visualization\src\rendering\emEquipmentScenes.ts | 44 | 3 | 356 |
| `drawLightControlSwitchScene` | visualization\src\rendering\sensorApplicationScenes.ts | 43 | 2 | 407 |
| `drawMeltingCurveScene` | visualization\src\rendering\solidLiquidScenes.ts | 39 | 5 | 270 |
| `solve` | physics-core\src\models\security-alarm.ts | 37 | 1 | 179 |
| `drawSelfInductanceScene` | visualization\src\rendering\emEquipmentScenes.ts | 34 | 3 | 326 |
| `drawLCOscillatorScene` | visualization\src\rendering\emEquipmentScenes.ts | 34 | 3 | 360 |
| `drawForcedVibrationScene` | visualization\src\rendering\chapter2Scenes.ts | 34 | 2 | 376 |

## 诊断结论 {#conclusion}

🌸 **偶有异味** - 基本没事，但是有伤风化

👍 继续保持，你是编码界的一股清流，代码洁癖者的骄傲

---

*由 [fuck-u-code](https://github.com/Done-0/fuck-u-code) 生成*