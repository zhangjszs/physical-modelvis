# 渲染层结构治理调查（重复度普查 + 分批拆分路线）

> **来源**：Issue #103 调查交付 comment `6149579400`（2026-10-13，Execution Agent），经 Planner 二十八次滚动验收 CLOSED。本文件由 #121 落档入库，供未来实施单直接引用。
> **性质**：调查产出，**零源码改动**。所有计数为 grep/read 实测；标 **[推断]** 者为按样板行数外推。
> **⚠️ 红线声明（契约 1.10）**：本文件派生的任何**实施**（原语抽取 / CanvasRenderer 切分 / SimulationCanvas 场景外迁 / FormulaPanel 数据外迁 + 测试改造）均属「大规模架构重构」，**需用户放行**（见 `DECISIONS.md` D31，当前 pending，推荐/默认暂缓）。本文只出数据与路线，不构成实施授权。
> **落档核对（#121）**：§I 未核实项已复核——`drawMiniChart` 副本数 **3 份**、极板三形态命中计数 **16/7/6** 均与 #103 一致；顶层 `.ts` 文件数实测为 **32**（#103 记 33，行数 20273 一致，文件数以实测为准）。内联曲线块准确行数与 `fillText`/`roundRectPath` 收益仍为区间推断（见 §I）。

---

## 实测基线

`visualization/src/rendering/` 顶层 `.ts` **32 个 / 20273 行**（另 `props/` 子目录）+ `CanvasRenderer` 消费方 `SimulationCanvas.tsx` 2215 行 + `FormulaPanel.tsx` 2894 行。

## A · 量化基线（实测调用点）

| 模式 | 调用点 | 覆盖文件数 |
|---|---|---|
| `fillText(` | 488 | 32 |
| `lineTo(` | 568 | 33 |
| `.arc(` | 186 | 29 |
| `setLineDash` | 142 | 22 |
| `roundRectPath(` | 157 | 22 |
| `createLinearGradient\|createRadialGradient` | 106 | 25 |
| 箭头族（`drawArrow\|drawForceArrow\|drawThermalArrow\|arrowHead`） | 121 | 24 |
| `clearScene(` | 80 | 21 |
| `getFrame\|interpSeries(` | 48 | 18 |
| `drawBlock\|draw3DBlock(` | 26 | 6 |

## B · 重复绘制元素清单（含「语义不同、勿合并」判定）

| 元素 | 已知实现（文件:行） | 判定 |
|---|---|---|
| **弹簧** | `chapter2Scenes.ts:49 drawSpringCoil()`（≈40 行，水平，调用 `:534`/`:1141`）；`chapter3Scenes.ts:140–176` 内联竖直弹簧（在 `drawHookeLawScene` 内，≈36 行） | **可合并**（同「线圈锯齿 + 外发光」画法，仅方向/振幅差 → `drawSpring(ctx, x1,y1, x2,y2, opts)`）。`renderingUtils.ts:843 drawCoil` 是**通电线圈**（emWave:165/166/214），**语义不同勿合并** |
| **物块/滑块** | `renderingUtils.ts:312 drawBlock`(39) / `:351 draw3DBlock`(39)，26 调用点/6 文件；UI 滑块 ×3：`sensorElementScenes.ts:346/593/876` | block **已共享无重复**；UI 滑块与物理物块**语义不同**（仅属「可再抽的小控件」） |
| **斜面** | `chapter1Scenes.ts:107`（内联 lineTo）；`props/drawGlider.ts:37` 注释自称可复用但未实装 | **无跨文件重复**（全仓斜面/ramp 仅 2 处命中且非独立函数） |
| **角度弧** | `chapter3Scenes.ts:475/501`、`chapter2Scenes.ts:763`、`chapter7Scenes.ts:264`、`emEquipmentScenes.ts:636`、`nuclearScenes.ts:228` | **6 处 arc+label 可合并** → `drawAngleArc()`。排除：`sensorElementScenes.ts:745`（磁场扇形）、`emEquipmentScenes.ts:1636`（电流转向弧）、`chapter2Scenes.ts:763`（相位盘底座） |
| **平板/极板** | `electrostaticEnergyScenes.ts:54–67`（电容极板）、`sensorElementScenes.ts:76–101`（霍尔片等距板）、`waveOptScenes.ts:1027–1050`（全息干板） | **语义不同，勿合并**；仅 3D 等距板画法与 `draw3DBlock` 同源 → 可抽 `drawIsometricPlate` **[推断]** |
| **箭头/力向量** | `renderingUtils.ts:263 drawArrow`(49)、`:915 arrowHead`(20)、`:614 drawThermalArrow`(40)；`chapter3Scenes.ts:39 drawForceArrow`(51)；`CanvasRenderer.ts:953/1003/256/1796` | `drawArrow` + `drawForceArrow` **可合并**（力=加渐变/标签参数）；`drawThermalArrow`/`arrowHead` 样式不同保留；CanvasRenderer 的 2D/3D 双份部分可参数化 |
| **电荷圆点** | `renderingUtils.ts:865 drawChargeSymbol`(29)，≥6 调用；`sensorElementScenes.ts:38 drawBFieldDot`(14) | **已共享无重复**；`drawBFieldDot`（磁场 ⊗）**语义不同勿合并** |
| **刻度尺/刻度组** | 共享 `props/drawRuler.ts:32`（唯一消费者 `SimulationCanvas.tsx:953`）；局部重复：`chapter1Scenes.ts:54–77` / `:165–190`、`chapter3Scenes.ts:178–218`(41 行)、`:314`、`chapter7Scenes.ts:74–90`、`electricCircuitScenes.ts:296–308` | **语义相同、最值得抽象**（≈121 行局部实现）；`props` 版已是正确形状但只服务气垫导轨链路 |
| **导线** | `renderingUtils.ts:687 drawWire`(13)，调用 `electricCircuitScenes:66/180`、`electrostaticEnergyScenes:112`；局部连线 `emEquipmentScenes.ts:905/1301/1658` | **可合并**（emEquipment 3 处改走 `drawWire`） |
| **网格/坐标轴** | `CanvasRenderer.ts:357 draw2DGrid`(19)/`:376 draw3DGrid`(77)/`:462 draw2DAxes`(56)/`:518 draw3DAxes`(37)/`:555 draw3DAxisWithArrow`(54)；场景内 mini 坐标系 ≈8 处：`chapter2Scenes.ts:91–108`(自建 helper)/`:138`/`:961`、`chapter5Scenes.ts:101/215`、`waveParticleDualityScenes.ts:91/214`、`gasThermalScenes.ts:170`、`mechanicalWaveScenes.ts:253`、`electricCircuitScenes.ts:425`、`emEquipmentScenes.ts:83` | CanvasRenderer 2D/3D 成对 **可合并**；场景 mini 轴 8 处语义相同可合并；`solidLiquidScenes.ts:230` 晶格**语义不同** |
| **曲线图（mini chart）** | **三份完整实现**：`renderingUtils.ts:469 drawMiniChart`(145 行，exported)、`chapter2Scenes.ts:111 drawMiniChart`(≈100 行，私有)、`emEquipmentScenes.ts:38 drawMiniChart`(私有) — **实测纠正子代理「2 份」口径**；另有内联曲线块 ≈8 处 | **真重复，收益最高** |
| **标注文字** | `renderingUtils.ts:894 drawText`(21，使用面窄)；488 处裸 `fillText` | 语义相同但**单处成本低**（3–5 行），churn 风险高 |
| **虚线/辅助线** | 142 处 `setLineDash`/22 文件（CanvasRenderer 20、emEquipment 20、chapter2 10、chapter5 10…） | 结构同构（`setLineDash([a,b]) … setLineDash([])`）**可统一 API** |

## C · Top 10 抽象候选（可省行数估算）

| # | 候选 | 实测计数 | 单处行数 | 估计可省行数 |
|---|---|---|---|---|
| 1 | 文字标注样板（fillStyle/font/align/baseline + fillText） | 488 处 / 32 文件 | 3–5 → ~1.5 **[推断]** | **≈500–1000** |
| 2 | 圆角卡片/面板（roundRectPath + fill + stroke + 配色） | 157 处 / 22 文件 | 4–6 → ~1.5 **[推断]** | **≈400–700** |
| 3 | mini chart（3 份完整实现 + ≈8 处内联） | 3 份 / 内联 ≈8 **[核实]** | — | **≈250–350** |
| 4 | 虚线辅助线 | 142 处 / 22 文件 **[核实]** | 2 → 1 | **≈142** |
| 5 | 网格/坐标轴 | CanvasRenderer 5 函数 ≈243 行 + 场景 mini 轴 ≈8 处 | 8–15 → ~4 | **≈150** |
| 6 | 箭头/力向量 | 121 调用点；独立实现 51+40+20 行 + CanvasRenderer 3 个 | — | **≈120** |
| 7 | 刻度尺/刻度组 | 5 处局部 ≈121 行 | 13–41 → ~6 | **≈90** |
| 8 | 角度弧 | 6 处 | ~12 → ~4 | **≈50** |
| 9 | 弹簧 | 2 处 ≈76 行 | — | **≈35** |
| 10 | 导线连线 | emEquipment 3 处局部 + 共享 `drawWire` 已在 | ~10 → ~3 | **≈20** |

合计量级 **≈1800–2600 行**（占 rendering/ 20273 行的 9–13%），即「共享 primitives」路线的上限收益 **[推断]**。

**已共享、不必再抽**：`drawBlock/draw3DBlock`(26)、`drawChargeSymbol`(≥6)、`clearScene`(80)、`drawTitle/drawHud/drawInfoBar/drawEmptyState`(≥25 跨 10+ 文件)。
**语义不同、禁止合并**：`drawCoil` vs 弹簧、`drawBFieldDot` vs 电荷符号、极板三形态、晶格网格、磁场扇形弧。

## D · 已有 primitives 雏形（重申：不是从零开始）

1. **`renderingUtils.ts`（1044 行，≈40 export）已是第 1 个共享层** — 主题色（`COLORS:25`/`shadeColor:44`/`panelFill:74`/`clamp:83`）、画布容器（`roundRectPath:91`/`clearScene:114`）、标题 HUD（`drawTitle:120`…`drawEmptyState:244`）、力学图元（`drawArrow:263`/`drawBlock:312`/`drawGround:390`/`drawEnergyBar:654`）、图表（`drawMiniChart:469`/`drawSineChart:805`）、电学图元（`drawWire:687`/`drawBattery:700`/`drawResistor:720`/`drawCapacitorSymbol:745`/`drawMeter:767`/`drawCoil:843`）、场与粒子（`drawChargeSymbol:865`/`drawFieldLine:935`/`drawVectorField:974`）、数据（`getFrame:448`/`interpSeries:1005`/`seededRand:463`/`maxOf:1029`）。
2. **`rendering/props/` 是第 2 个雏形且已定契约** — `props/index.ts` barrel 导出 `drawRuler/drawAirTrack/drawGlider/drawPhotogate/drawDigitalTimer/drawCalipers/updateAirflowParticles` + `PropBase/ScreenRect/RulerMark/AirTrackLayout` 类型；`props/types.ts:1-2` 明示「纯函数 + 屏幕坐标 opts，零依赖 React/Zustand/CoordinateTransformer」。当前唯一消费者 `SimulationCanvas.tsx:20`。
3. **`rendering/constants.ts`（187 行）** = 物理常量单一真源 + 纯公式 helper（`thermistorResistance:96`/`hallVoltage:108`/`doubleSlitIntensity:135`/`blackBodySpectralRadiance:165`…），被 L3 `renderers.test.ts` 与 `surfaceTensionRig.ts:9` 消费。
4. 基础设施：`CoordinateTransformer.ts`(91) / `dpr.ts`(20) / `textureFactory.ts`(215，模块级 `cache` 单例 + `clearTextureCache()`)。

**结论**：现有 primitives 层是「一个 1044 行桶 + 一个 props 子目录 + 一个常量模块」，缺的是**按机制分文件**的组织。命名需与 3D 侧 `components/simulation3d/primitives.ts` 显式区分。

## E · 分批拆分路线（每批 ≤400 行、可独立提交、契约测试全绿）

**落点决策（先定后动）**：新共享原语放 `src/rendering/` **顶层**会被 2 个目录门禁自动纳入（#53 内联常量 / #60 单位记号，`rendering-constants-single-source.test.ts:19` 非递归 `readdirSync`），**这是好事**，建议 vanilla 原语进顶层、专用 prop 类进 `rendering/primitives/` 子目录（沿用 `props/` 先例）。**不要**把原语代码放到 `src/rendering/` 之外（会同时失去 #53/#60 与 #61 消费守卫）。

### 第 0 批（前置，0 行改动）— 门禁口径先落
本批不改产品代码，只把「源码字符串型」门禁的脆弱点一次性写清/必要时扩宽（见 §F）：
- `formula-drift.test.ts:18,37,40` 硬编码 `FormulaPanel.tsx` 路径 + `indexOf('const FORMULA_MAP')` + `indexOf('\nconst ')` 结束判定 → 数据外迁必须同批改测试（改路径或多文件扫描）。
- `single-source-coverage.test.ts:99,101` 只认 `^export function (draw\w+)` 且 `readdirSync` 非递归 → 命名/落点约束。
- `renderer-routing.test.ts:19,35` 只取**第一个** `switch(currentScene)` 且正则匹配 `new Set([...])` 字面量。
- `scene-contract.test.ts:143` 亦正则抓 switch。

### 批 1–3：共享 primitives 抽取（收益高、风险最低；放 `rendering/` 顶层或 `rendering/primitives/`）
| 批 | 内容 | 预计改动行 |
|---|---|---|
| P1 | `drawMiniChart` 三份实现收敛为一份（`renderingUtils` 版为准，删 `chapter2Scenes:111` 与 `emEquipmentScenes:38` 私有副本，改用 import） | ~150–250 |
| P2 | 刻度尺族：抽 `drawVerticalScale()`，回填 `chapter1:54–77/165–190`、`chapter3:178–218/314`、`chapter7:74–90`、`electricCircuit:296–308` | ~150–250 |
| P3 | 小原语簇：`drawAngleArc`（6 处）+ `drawSpringCoil`（2 处合并）+ emEquipment 3 处连线改走 `drawWire` + `withDash()` | ~150–250 |

### 批 4–5：CanvasRenderer.ts（1886 行）按图元切分 —— 无任何测试直接断言本文件，风险可控
唯一消费者 `SimulationCanvas.tsx:4`。切块（行号为实测）：K1 状态/生命周期 9–116、K2 静态层烘焙 117–213（**K1+K2 必须同批**，`staticLayer*` 字段跨块共享）、K3 尺度/坐标 214–332、K4 背景网格轴 333–608、K5 轨迹族 609–790、K6 物体+矢量 791–1057、K7 地面/探针/工具 1058–1276、K8 圆周运动族 1277–1657、K9 2D 力矢量+箭头 1658–1831、K10 颜色工具 1832–1886。
| 批 | 内容 | 行数 |
|---|---|---|
| C1 | K10 → `rendering/colorUtils.ts`（含模块级 `rgbCache`，整块搬迁）+ K3 | 55 + 119 |
| C2 | K4 背景/网格/轴（2D/3D 参数化合并） | 276 |
| C3 | K5 轨迹族 + K7 地面/探针 | 182 + 219 |
| C4 | K6 物体+矢量 + K9 箭头 | 267 + 174 |
| C5 | K8 圆周运动族（381 行，接近上限，建议内部再拆 2 次提交） | 381 |

**选型（须一次定死，避免返工）**：方法拆出到文件时 `this` 依赖只能二选一 —— (a) 组合子渲染器（注入 `ctx/transformer/size/isDark`）或 (b) 自由函数 + 显式 `RenderContext` 参数。**建议 (b)**：与 `props/types.ts` 现有契约同构、可单测、不引新类层次 **[推断]**。

### 批 6–7：SimulationCanvas.tsx（2215 行）—— 只搬「私有 draw*」，承重墙原地不动
| 批 | 内容 | 行数 |
|---|---|---|
| S1 | 私有 2D 场景绘制 `drawElectricField:339` / `drawMagneticField:410` / `drawCollisionScene:452` / `drawSpringScene:564` → `src/rendering/chapter1... or scenes/`（**有先例**：`nuclearScenes.ts:12` 注释即称「与 SimulationCanvas 中 drawCollisionScene/drawSpringScene 风格一致」） | 338 |
| S2 | `drawInclinedPlaneScene:677` / `drawEMCombinedField:810` / `drawAirTrackScene:921`（后者需带走 `props`/`photogate` import 与 `airflowParticlesRef` 返回值约定） | 395 |
| S3 | 工具函数 `roundRectPath:2185`/`hexToRgb:2199`/`darkenHex:2211` 收敛进 `renderingUtils`（先查重） + 指针命中 `findNearestTrajectoryPoint:2072`/`getCanvasPos:2131` 抽纯函数（最易单测） | 31 + 122 |
| S4+ | hook 化：视口 effects(1153–1246) / 动画循环+FPS(1995–2050) / refs+选择器段(1073–1152) / `render` 内标准绘制段(1688–1967) | 各 ≤300 |

### 批 8+：FormulaPanel.tsx（2894 行）—— 数据/视图分离，最大单批 <400 行
- 结构实测：`FORMULA_MAP`(9–2799，2791 行，**125 个场景键**) + `FormulaDef`(3–7) + `DEFAULT_FORMULA`(2801–2805) + `FormulaPanel()`(2807–2894，88 行，唯一 export)。**无 KaTeX/MathJax**，公式为纯文本 JSX。
- 视图批：`FormulaDef`/`DEFAULT_FORMULA` → `formulaTypes.ts`（10 行）+ 4 段 JSX 抽子组件（75 行，需显式传 `engineFormulas/engineSteps/summary/fallback/currentScene` 5 个局部量）。
- 数据批：按场景键边界切 **12 批**（每批 140–352 行，键数 6–20），例如 B6 935–1259(325)、B9 1741–2092(352)、B10 2093–2376(284)。
- **硬前置**：`formula-drift.test.ts` 必须与第一批数据外迁**同批**改造（否则 L4 门禁全红）。

### 不推荐的批（说明理由，供 Planner 判）
- 空行级 `fillText`(488)/`roundRectPath`(157) 全量替换：收益大但**触碰 32 个文件、diff 淹没审阅**，且 `props/types.ts` 已示范「只在新代码用、老代码渐进」更稳。建议**只在新批与新场景落地**，不专门开批。

## F · 承重墙（不可迁出，实测）

1. `SimulationCanvas.tsx:168–338` 的 10 个 `SCENES_* = new Set([...])` — 与 `switch(currentScene)` 被 `renderer-routing.test.ts:19/35/48–74` 做**双向存在 + 排他 + 非空**断言。
2. `SimulationCanvas.tsx:1336–1676` 的 `switch(currentScene)`（113 个 case，每 case 3 行 `case 'x': / drawXxx(sceneOpts)`）— 被 `single-source-coverage.test.ts:87/91`、`renderer-routing.test.ts:35`、`scene-contract.test.ts:143` 逐行正则解析；**只取第一个 switch**，且源码 1267–1268 注释已注明「有意用 if/else 避免被自检正则误识别」。迁 `draw*` 实现可以，**case 行与调用行的字面形状必须保留**。
3. `FormulaPanel.tsx:9` 起的 `const FORMULA_MAP` 标识与每场景 `formula:`/`tips:` 字面文本 — 被 `formula-drift.test.ts:18–74` 文本抽取。
4. （关联）`tests/accuracy/single-source-coverage.test.ts:101` 与 `rendering-constants-single-source.test.ts:19` 的 `readdirSync` **非递归**：把 `draw*` 挪进子目录会让 #61 消费守卫「找不到函数体」。

## G · 风险与顺序（每步被谁保护）

| 步骤 | 主要风险 | 安全网 | 回滚成本 |
|---|---|---|---|
| P1–P3 原语抽取 | 画面上像素级漂移 | `tests/rendering/*`（smoke + recording ctx）、L1 单源契约（不读原语）、`npm run precheck` | 低（纯函数替换，可 revert 单批） |
| C1–C5 CanvasRenderer 切分 | `staticLayer` 缓存签名语义变化 → 性能/闪烁回归 | 无直接测试 → **必须先补 `CanvasRenderer` 冒烟测试**（`tests/rendering/` 已有 recording ctx 范式），并盯 #80 性能门禁 | 中 |
| S1–S4 场景函数外迁 | L5/L11 正则断链、`render` 闭包 23 项 deps 陈旧 | `renderer-routing` + `scene-contract` + `single-source-coverage` + `gapScenes.integration` | 中 |
| F* FormulaPanel 拆分 | L4 文本门禁 | 需同批改测试（**本单未授权改测试，属派生实施**） | 高 |

**建议执行顺序**：P1 → P2 → P3 → C1 → C2 → C3 → C4 → C5 → S1 → S2 → S3 → S4 → F。
理由：先在**无契约耦合**的地方建 primitives 层（P/C 批），等原语稳定后再动承重墙旁边（S 批），最后才碰**必须同步改测试**的 F 批。

## H · 与 M3 批次的错峰结论

- **原问「与 #62–#66 错峰」已失效**：M3 五批 + 前置三件套已于 2026-10-08 **全部 CLOSED**（PLAN 二十一次滚动，M3 8/8 收官）。当前**无渲染层迁移热区**。
- **当前实际错峰对象**：
  1. **#116（截图重采，P2）**：只改 `docs/screenshots/`，与源码零冲突；若先拆渲染再重采，截图会「刚采完就过期」→ 建议 #116 先落地。
  2. **#100（M5 parked，器材旋转编辑）**：会动 `components/composition/*` + 3D rig，与 `rendering/` 2D 层零重叠。
- **结论**：渲染层结构治理可以随时开工；唯一建议是让 #116 先落地以避免截图立即过期。

## I · 抽检复核

- `FormulaPanel.tsx:9 const FORMULA_MAP` / `:2801 DEFAULT_FORMULA` / `:2807 export function FormulaPanel` — 与报告一致。
- `formula-drift.test.ts:18` 读取该路径 / `:37 indexOf('const FORMULA_MAP')` / `:40 indexOf('\nconst ')` — 一致。
- `single-source-coverage.test.ts:26,31,101` `readdirSync(RENDERING_DIR)` 非递归 + `:99 /^export function (draw\w+)/gm` — 一致。
- `rendering-constants-single-source.test.ts:19` 非递归 + 排除 `constants.ts` — 一致。
- `SimulationCanvas.tsx:168` 起 10 个 `SCENES_*`、`:339/410/452/564/677/810/921` 私有 draw、`:1336 switch (currentScene)` — 一致。
- **纠正**：`drawMiniChart` 副本数 **3 份**（`renderingUtils.ts:469` 导出 + `chapter2Scenes.ts:111` + `emEquipmentScenes.ts:38`），非 2 份；可省行数据此上调。

**#121 落档复核（2026-10-14）**：

- ✅ `drawMiniChart` 定义数 **3** 复核一致（`grep` 命中 `renderingUtils.ts:469` / `chapter2Scenes.ts:111` / `emEquipmentScenes.ts:38`）。
- ✅ 极板三形态命中计数 **16 / 7 / 6**（`emEquipmentScenes` / `electrostaticFieldScenes` / `emInductionScenes`，`grep -ciE "极板|plate"`）复核一致；**逐行语义核对留待实施前**（本文档只确认计数）。
- ⚠️ 顶层 `.ts` 文件数实测 **32**（#103 记 33）；行数 **20273** 与 #103 一致。差异 1 个文件不影响路线结论，**以实测为准**。
- ❓ **仍未核实（留待实施前）**：内联曲线块「≈8 处」的准确行数、`fillText`/`roundRectPath` 抽象收益区间——属外推估算，实施时须逐处复核后再定批。

## J · 明确不做（红线提醒）

本调查只出数据与路线：**未创建 primitives 文件、未改任何 src 文件、未改测试**。派生实施（Worker 化 / 原语抽取 / 巨型文件拆分 / FormulaPanel 数据外迁 + 测试改造）属契约 1.10「大规模架构重构」，**需据本结论另立实施单并经用户确认**（当前 D31 pending，推荐/默认暂缓）。
