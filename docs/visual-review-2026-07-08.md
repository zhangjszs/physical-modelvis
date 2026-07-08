# PhysVis 可视化效果代码审查报告（2026-07-08）

## 方法说明
- **方式**：代码级视觉评审（沙箱无头，无法真实渲染像素；由 8 个并行审查代理逐文件读绘制代码 + 结合物理/坐标变换推演视觉效果）。
- **范围**：全部可视化场景 = `SimulationCanvas.tsx` 内 7 个交互场景 + `rendering/*.ts` 下约 83 个章节教学场景（力学/热学/电磁/波光/核/传感器/实验），共 ~90 个 `draw*Scene`。
- **审查轴**：①暗/亮模式适配 ②对比与配色 ③图层顺序 ④标注与文字 ⑤缩放与坐标映射 ⑥画布状态卫生（save/restore 泄漏）⑦物理表征正确性 ⑧跨场景一致性。
- **不含**：DPR 清晰度（已在 M7a 全局修复）、纯物理引擎数值正确性（属 physics-core，非本审查重点）。

## 严重程度统计
- **Critical（必须修，会误导教学或屏幕外不可见）**：9 处
- **Important（应修，对比/越界/物理表征问题）**：约 30 处
- **Suggestion（一致性/可读性改进）**：约 40 处

---

## 一、跨场景共性问题（最高优先级，影响全局）

1. **`drawArrow`/`drawThermalArrow` 状态泄漏（Important，复现于多文件）**
   `mechanicsScenes.ts:89`、`chapter3Scenes.ts:76`、`sensorScenes.ts:294`、`thermalScenes.ts:1800` 均在函数内 `ctx.lineCap='round'` 后**不复位**，污染同帧后续描边。
   → 统一用 `ctx.save()/restore()` 包裹每个场景体（在 `clearScene` 之后），可一次性消除整类脆弱性。

2. **红/绿配色对色盲不友好（Suggestion，复现于多文件）**
   重力 vs F_安、电表指针、uL、i(t) 等大量使用 `#ef4444`+`#22c55e`。
   → 关键"对立/相关量"编码改蓝/橙（`#3b82f6`/`#f59e0b`）配对。

3. **信息条/轴标题重叠（Important，gapScenes / waveOpt 等）**
   `drawInfoBar` 占 `height-34…height-12`，与同一区域的轴标题、光纤标注在垂直带内重叠。
   → 抽统一 `drawInfoBar` 并约定"轴标题上移到 height-40 区"或使用独立底部带。

4. **HUD/字体不一致（Suggestion）**
   字号 9–13px 跨文件不一；双缝/单缝场景**缺 HUD**；标题字号 gap/nuclear 18px vs waveOpt 20px。
   → 统一基础 UI 文字到 12–13px；补缺失 HUD；统一标题组件。

5. **场场景角标 vs 力学胶囊 vs air-track HUD 风格割裂（Suggestion）**
   场(E/M/EM)用角标，力学用底部胶囊，air-track 用顶部 HUD。
   → 抽统一 `drawLegendPill()` 组件。

---

## 二、Critical 明细（9 处，建议优先修）

| # | 位置 | 问题 | 修复方向 |
|---|------|------|----------|
| C1 | `SimulationCanvas.tsx:629,635` drawInclinedPlaneScene | 角度扇形 `arc(...,π, slopeAngleFromBR, true)` 因 `anticlockwise=true` 画出≈330° 优角而非 30° 楔体；θ 标签放到画布外/楔形外 | `arc` 改 `false`（顺时针小角）；标签角用 `π+θRad/2` 方向放在内侧 |
| C2 | `chapter3Scenes.ts:337,346,352` drawHookeLawScene | 力箭头 `forceScale=30` 后又 `/10` → 等效 3px/N，1.96N 仅 5.9px，箭头几乎不可见 | 直接 `forceScale=30` 并移除 `/10` |
| C3 | `chapter3Scenes.ts:733-736` drawNewtonThirdLawScene | 相对位移用硬编码初值 `x - (-1)`/`x - 1`，强假设 physics-core 轨迹起点恰为 ±1 | 从 `traj[0].position.x` 取初值并对坐标做钳制 |
| C4 | `emEquipmentScenes.ts:630 vs 655` drawEmDampingScene | `pivotY = topY+topH*0.55` 与摆/框实际绘制位置 `topY+16+rodLen*cos` 差 ~170px，摆动框、摆线、⊗/⊙ 符号彼此脱节 | 统一单一 pivot：`pivotY=topY+16`，`frameCY=pivotY+rodLen*cos(phi)` |
| C5 | `nuclearScenes.ts:265` drawAlphaScatteringScene | `θ=2·atan2(max(kCoeff,2), max(b,0.5))`，默认 Z=79/E=5 时 `b>kCoeff` 使所有轨迹 θ<90°，"大角度散射"核心卖点永不触发 | 减小最小 `b`（如 bFactor 起点 0.1）或增大 `kCoeff` 使部分轨迹越 90° |
| C6 | `nuclearScenes.ts:799` drawFissionChainScene | `E_MJ = E_total_MeV*1.602e-19/1e6` 多除了 1e6，能量显示偏小 6 个数量级 | `E_MJ = E_total_MeV * 1.602e-19` |
| C7 | `sensorScenes.ts:388-393` drawHallEffectScene | 极性 `+/-` 标记 `#ffffff`，亮色背景 `#f8fafc` 上**不可见**（仅暗色主题可见） | `isDark ? '#ffffff' : '#1e293b'` |
| C8 | `sensorScenes.ts:800` drawThermistorScene | `= ${Tcelsius}°C` 标签画在 `1.35h+44`（温度计已止于 0.75h），**永不显示**；`fillH`/`sliderF` 未钳制 [0,1] | 标签移到 `termY0+termH+40`；钳制 fill/slider |
| C9 | `sensorScenes.ts:1791` drawLightControlSwitchScene | 分压电路接反：LDR 在上 + Rfix 在下时，夜(大 Rldr)→低 Vcc→灯灭，与"夜→灯亮"教学目标相反；`threshold` 参数从未用于逻辑 | 交换 LDR/Rfix 位置或反转 `lampOn`；以 `threshold` 驱动比较 |

---

## 三、Important 明细（按文件，节选最影响教学者）

### SimulationCanvas.tsx（7 交互场景）
- `drawMagneticField:341` — B 标签用 0.5α 紫，浅背景对比偏弱 → 近不透明或加底色胶囊。
- `drawAirTrackScene:831,928` — `timerRect.x=width-300` 在 width<600 出画布右；左上 HUD 与右上 timer 在窄屏重叠，且 HUD 用等宽 14/12px 与全局无衬线不一致。
- `drawCollisionScene:434` — 速度箭头长度 `v*4` 固定像素，大速度时溢出画布 → 按可用宽度归一化。
- `drawSpringScene:472` — `blockX=eqX+A*200` 固定像素，A 大时滑块越界、弹簧回卷 → 按 width 归一并 clamp。

### chapter2Scenes.ts / chapter3Scenes.ts
- `drawForcedVibrationScene:664` — `lineCap='round'` 泄漏（见共性#1）；`v` 与 `F_d` 标签低速时重叠。
- `drawResonanceCurveScene:1024` — 多曲线 legend `β=…` 全用全局 beta；`perSeries=121` 硬编码，physics-core 改点数会静默错位。
- `drawDoublePendulumSyncScene:493` — `phaseDiff≈0/360` 判断，`359°` 落入 Δφ=359° 分支而非"同相"。
- `drawHookeLawScene:286,223` — 标尺 `rulerX=width*0.55-80` 窄画布越界；`pixelsPerMeter=120` 固定使弹簧塌缩、与标尺比例失调 → 自适应。
- `drawSlidingFrictionScene:450` — 物块 `blockX_m*80` 无钳制，大位移越界。
- `drawForceCompositionScene:625` — 公式框 `width*0.7`+`boxW=280` 在 width<560 右溢。
- `drawNewtonThirdLawScene` — 见 C3。

### mechanicsScenes.ts
- `drawGalileoInclineScene:305` — `inclineH=base*tan(theta)`，θ≥55° 时斜面顶出画布叠标题 → clamp θ。
- `drawReactionTimeScene:349-352` — 标尺几何自相矛盾且溢出（落点实际在标尺外）→ 标尺固定、用滑动标记表下落距离。
- `drawTransmissionBeltScene:479` — 齿轮方向错：外啮合两轮应反向（mode 1 也应取反）。
- `drawVerticalCircleScene:546` — 模型不自洽：用 `ω=v0/L` 匀速，而临界速度判定基于能量守恒自由圆周 → 改用能量守恒求瞬时速度或明标"匀速模型"。
- `drawCenterOfGravityScene:627` — 铅垂线几何错：两线皆纯竖直且不经过 G，"交点即重心"不成立 → 每线应"悬挂点经 G 延长向下"。
- `drawNewtonSecondLawScene:730` — 摩擦/力箭头大值时画出画布左右界 → clamp。

### thermalScenes.ts
- `drawMeltingCurveScene:596` — `Tm` 默认 0，平台段 `T=heatRate*t*0.5` 升过 0 后平台钉在 0，曲线向下陷入平台（物理错）→ `Tm??50` 或 clamp。
- `drawHeatTransferScene:1049` — T-t(红) 与 Q̇(橙虚) 共用同一 y 轴、Q̇ 归一进 T 像素范围却无第二轴，双编码误导 → 加右侧 Q̇ 轴或子图。
- `drawDiffusionScene:293` — `normSpread=min(4, spreadSigma/50)` 气体下几乎瞬间饱和，t≈1s 后即静止 → 缩放饱和到动画窗。
- `drawBrownianScene:446` — trail 用 `seededRand(tt*7+1)` 逐帧不相关，轨迹抖动而非平滑漂移 → 用连续 PRNG。

### electromagnetismScenes.ts
- `drawMagneticForceScene:439` / `drawAmpereForceScene:490` — **B 方向约定跨场景不统一**（一个用 ×入纸、一个用纸面箭头），学生易误解洛伦兹/安培力方向 → 统一表达。
- `drawEmInductionScene:419` — 检流计读数画 `|sin|` 未体现感应电流方向随 Φ 增减反向（与 infoBar 的 `E=-N dΦ/dt` 不符）→ 按 `d/dt(NBA cosθ)` 符号驱动指针。

### gapScenes.ts / waveOptScenes.ts / nuclearScenes.ts
- `drawGeigerCounterScene:1090` — 衰变曲线 `#a78bfa` 亮紫在亮背景对比低 → 改 `#7c3aed`。
- `drawBulbVIScene:738` / `drawTotalInternalReflectionScene:430` — 轴标题/光纤标注落入 `drawInfoBar` 带内重叠 → 上移轴标题或下移信息条。
- `drawBallXTimeScene:979` — 左侧摆示意与左上 HUD 窄屏水平重叠。
- `drawDopplerScene:215` — 波前半径 `r=vWave*tEmit*0.5` 随 t 增大几秒后全 `r>maxRadius` 被跳过，画面长时间空白 → 取模/缩放使其常驻。
- `drawDoubleSlitScene`/`drawSingleSlitScene` — 缺 HUD（与全局不一致）；标题 20px 与其他 18px 不一。

### emEquipmentScenes.ts
- `drawCurrentBalanceScene:440` — 标 `F_安` 的箭头实际画的是合力偏转方向（由 `m·g−F_ampère` 推出），误导 → 改画右手定则方向的安培力或重标"合力/偏转"。
- `drawLCOscillatorScene:1790` — Q(t)(μC) 与 I(t)(mA，幅值≈Q0·ω) 共用自动缩放 y 轴，Q(t) 压成近零平线、电荷振荡不可见 → 分轴/各自归一化。

### sensorScenes.ts
- `drawReedSwitchScene:936` — `Hrel` 默认 30 < `Hpull` 50 **反了**（释放应 < 吸合），迟滞分支死代码 → 确认语义（通常 pull-in>release）。
- `drawSecurityAlarmScene:1490` — `doorOpen` 仅用 `operateDist`，`releaseDist` 从不被使用，画了双阈值却无真正迟滞 → 实现双稳逻辑或删 `releaseDist`。
- `drawLightControlSwitchScene` — 见 C9（另：`threshold` 未用、`L` 滑块与 24h 曲线 `currentTime` 解耦、HUD 单位混用秒/时）。

---

## 四、Suggestion 摘要（一致性/可读性，不逐条展开）
- 多个场景固定像素偏移未随 transformer 缩放（碰撞/弹簧/斜面/Hooke 标尺/牛顿二律箭头），窄画布易越界 → 关键绘制加 clamp 或相对 width 定位。
- 仪器读数字号 9–11px（游标/测微器/电表刻度）在投影屏偏小 → 提到 11–12px 下限。
- `drawEmptyState` 最后绘制、覆盖已渲染图（thermal/mechanics 部分）→ 移到图前或仅当无 simulationResult 时绘制。
- emoji 用法（`⚡共振`/`🔴🟢`）跨平台渲染不一致且色盲不友好 → 改纯文字/符号。
- 磁极 N/S 配色与教材常例（N红S蓝）相反（emEquipment）→ 考虑翻转。
- `drawSelfInductanceScene:1310` 灭灯仍橙色辉光 → 灭时改灰。
- `drawMutualInductanceScene` 开关动画 `currentTime>0.01` 常真，通断演示不触发 → 修或改注释。

---

## 五、优先级建议 / 下一步
1. **先修 9 个 Critical**（C1–C9）：直接误导教学结论或屏幕外不可见，且多为单行/局部修复，风险低、收益高。
2. **再修状态卫生共性#1**：给每个场景体包 `save/restore`，消除整类 `lineCap` 泄漏（顺带修掉多个 Important 的隐患）。
3. **修 infoBar/轴标题重叠共性#3** + B 方向约定共性（emEquipment/electromagnetism）。
4. **最后做一致性打磨**（字体/HUD/图例/配色）。

---

## 六、Critical 修复状态（2026-07-08 已修复并提交）

用户确认"先修 9 个 Critical"，已全部修复并通过验证门：

| # | 修复文件 | 关键改动 | 验证 |
|---|----------|----------|------|
| C1 | `SimulationCanvas.tsx` | 斜面角扇区改为最小扫角 `minorSweep`（`arc(...,false)`），θ 标签角用 `midAngle` 落在扇区内 | tsc/eslint ✅ |
| C2 | `chapter3Scenes.ts` | 胡克定律力箭头去掉 `/10`（等效 3px/N → 30px/N） | tsc/eslint ✅ |
| C3 | `chapter3Scenes.ts` | 牛顿第三定律初值改取轨迹首帧 `traj[0].position.x` + 位移钳制到画布 | tsc/eslint ✅ |
| C4 | `emEquipmentScenes.ts` | EM 阻尼摆 `pivotY=topY+16`，与摆线/铝框绘制点一致（消除 ~170px 脱节） | tsc/eslint ✅ |
| C5 | `nuclearScenes.ts` | α 散射 `impactParams` 首项加 `0.1`（默认 Z=79/E=5 下触发大角度散射） | tsc/eslint ✅ |
| C6 | `nuclearScenes.ts` | 裂变能量 `E_MJ = E_total_MeV*1.602e-19`（去掉多余 `/1e6`） | tsc/eslint ✅ |
| C7 | `sensorScenes.ts` | 霍尔极性标记 `isDark ? '#ffffff' : '#1e293b'`（亮背景可见） | tsc/eslint ✅ |
| C8 | `sensorScenes.ts` | 热敏电阻 `fillH`/`sliderF` 钳制 [0,1]；温度标签移到 `termY0+termH+44` | tsc/eslint ✅ |
| C9 | `sensorScenes.ts` | 光控开关：`k2=7`、`currentLux=L*40000`、`lampOn=currentLux<threshold`、`transistorOn=!lampOn`（夜→灯亮，阈值生效） | tsc/eslint ✅ |

**统一验证门（提交前）**：`tsc --noEmit` ✅ / `eslint`（5 文件）✅ / `prettier --check`（5 文件）✅ / `vitest run` **249 passed / 0 failed** ✅。

> 已修复 9 个 Critical（教学误导/屏幕外不可见类）。其余 Important（约 30）/ Suggestion（约 40）按报告第五节优先级待排期；其中共性#1（`save/restore` 状态卫生）建议作为下一轮高优先级批次。

## 七、Important 修复状态（Round 1：2026-07-08）

按报告第五节优先级，先做共性#1（最高杠杆）+ 4 个清晰物理/几何错误，干簧管复核后驳回。

### 共性 #1：画布状态卫生（已修）
`drawArrow`（mechanics/electromagnetism/nuclear/emEquipment/sensor 共 5 份）、`drawThermalArrow`（thermal）、`drawWire`（electromagnetism）、`drawCoilHorizontal`（emEquipment）均在函数内 `lineCap='round'`（/lineJoin）后不复位，canvas 状态跨帧不清污染后续描边。已在**每个辅助函数突变前 `ctx.save()`、函数末 `ctx.restore()`**，一处修好整类泄漏（共 8 处/7 文件）。

### 明确修复（4 处）
| # | 位置 | 问题 | 修复 |
|---|------|------|------|
| I1 | `thermalScenes.ts:572` drawMeltingCurveScene | `Tm ?? 0` 默认熔点 0，平台钉 0°C，预热段已升过 0 → 曲线下陷进平台（物理错） | `?? 50`（非退化平台） |
| I2 | `mechanicsScenes.ts:481` drawTransmissionBeltScene | `phase2` 取反条件 `mode===2`（摩擦轮），但外啮合齿轮(mode 1)才应反向 | `mode===1`（皮带/摩擦轮/同轴同向） |
| I3 | `mechanicsScenes.ts:619-635` drawCenterOfGravityScene | 两条铅垂线纯竖直、不过 G 也不相交，"交点即重心"不成立 | 每线从悬挂点过 G 向下延长，交于 G |
| I4 | `mechanicsScenes.ts:307` drawGalileoInclineScene | `inclineH=base*tan(theta)`，θ≥55° 时斜面顶出画布叠标题 | `inclineH` clamp 到 `baseY-56` |

### 复核驳回（1 处）
- `sensorScenes.ts:926` drawReedSwitchScene：报告称 `Hrel(30)<Hpull(50)` 反了。**复核不修**——释放阈值 < 吸合阈值本就是正确的迟滞定义（吸合需更强磁场，报告括号亦承认"释放应<吸合"）；实际绘制 `H>=Hpull→close(贴合/橙)`、`H<=Hrel→open(灰)` 物理正确。报告诊断自相矛盾，按"verify don't assume"驳回。真正的"迟滞无跨帧记忆"是静态分段（非死代码），修需存状态，超出本轮范围。

**统一验证门**：`tsc --noEmit` ✅ / `eslint`（7 文件）✅ / `prettier --check`（7 文件）✅ / `vitest run` **249 passed / 0 failed** ✅。
