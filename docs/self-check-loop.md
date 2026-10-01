# PhysVis 物理自检循环 (Self-Check Loop)

> 确保 physics-core 引擎的 ~100 个物理模型 + visualization 的 92+ SceneConfig 定制正确。

## 架构

自检循环分 11 层 (L0-L6 + L8-L11; 无 L7), 顺序执行, 每层依赖前一层通过:

```
L0 物理常数 → L1 模型验证 → L2 SceneConfig 契约 → L3 渲染器公式 → L4 FormulaPanel 漂移 → L5 路由完整性 → L6 参数范围 → L8 Boris 数值积分 → L9 跨场景数值鲁棒性 → L10 人类可读输出 NaN 扫描 → L11 渲染层常量单一真源
```

每层一个独立 commit, 独立运行, 独立门禁。

> 层数以 `scripts/self-check.mjs` 的 `LAYERS` 数组为单一真源(当前 11 层)。
> L7 编号为 CLI 自身的历史遗留, 已跳过。

## 运行

```bash
# 顺序运行全部 11 层
npm run self-check

# 可视化输出 (默认表格)
npm run self-check -- --verbose

# JSON 输出
npm run self-check -- --json

# 自定义 run (单层)
cd physics-core && npm test -- tests/accuracy/fixtures.test.ts
cd visualization && npm test -- tests/accuracy/renderers.test.ts
```

## 各层详解

### L0 物理常数 — `physics-core/tests/unit/constants.test.ts`

- 定义 CODATA 2018 基本常数清单 (`g, e, k, epsilon0, mu0, c, electronMass, protonMass, G, h, kB, sigmaSB, Na, neutronMass, ...`)
- `toBeCloseTo(CODATA, 15)` 比对每个常量的符号与数值

**新增常数时**需同步更新 `constants.ts` 和 `constants.test.ts`。

### L1 模型守恒律 — `physics-core/tests/accuracy/fixtures.test.ts`

每个 fixture 定义:
- 一个典型物理场景 (`buildProblem()`)
- 期望解析解 (`closedForm(t) → {x, y, vx, vy}`)
- 必须守恒的量 (`conservedQuantities`)

测试断言:
1. 能量/动量守恒 (`maxDeviation ≤ tolerance`)
2. 轨迹采样点 vs 解析解 ≤1e-9
3. `validate()` 正确拒绝 0 质量 / 负时长 / 缺 body

**新增模型时**应在 `fixtures.test.ts` 追加对应 fixture。

### L2 SceneConfig 契约 — `visualization/tests/accuracy/scene-contract.test.ts`

遍历全部 92+ scene 条目:
- `scene.model` 经 `getModel()` 查询是合法 ModelType
- `buildProblem(defaultParams)` 不抛错
- `getModel(model).validate(problem)` 不报错
- `timeConfig.dt > 0` 且 `sampleCount ≥ 50`

### L3 渲染器公式 — `visualization/tests/accuracy/renderers.test.ts`

针对每个渲染器模块的数值计算:
- 热敏电阻 R-T (NTC)
- 霍尔电压 (V_H = IB/nqt)
- 表面张力温度修正 (σ(T) = σ₂₀·(1 + α·ΔT))
- 单缝/双缝干涉光强 (I = (sinβ/β)², I = cos²(πd·sinθ/λ))
- 光电效应极限频率 (ν₀ = W₀/h)
- 斯特藩-玻尔兹曼 (M = σT⁴) 与维恩位移 (λ_max·T = b)

所有常量定义在 `visualization/src/rendering/constants.ts`, 便于跨模块复用。

### L4 FormulaPanel 漂移 — `visualization/tests/accuracy/formula-drift.test.ts`

读取 `FormulaPanel.tsx` 源码, 解析 `FORMULA_MAP`:
- 每 sceneId 至少 3 条公式
- 公式名/字符串不含 `TODO/FIXME`
- 公式字符串非空

### L5 渲染器-场景路由 — `visualization/tests/accuracy/renderer-routing.test.ts`

解析 `SimulationCanvas.tsx` 的 `switch(currentScene)`:
- `SCENES_*` Set 中的每个 sceneId 有对应 case
- 每个 case 场景能归属且仅归属一个 Set

### L6 参数面板范围 — `visualization/tests/accuracy/parameter-ranges.test.ts`

遍历全部 scene 的全部 parameter:
- `min ≤ default ≤ max`
- `step ≥ 0`
- `description.length > 0`
- 物理量白名单: `g ∈ (0, 100)`, `T0/K ≥ 0`, `duration ≥ 0`

### L8 Boris 数值积分 — `physics-core/tests/accuracy/boris-correctness.test.ts`

电磁复合场 Boris 积分器正确性 + 收敛性验证。

### L9 跨场景数值鲁棒性 — `visualization/tests/accuracy/physics-correctness.<domain>.test.ts`

遍历全部场景 (默认参数 + 滑块 min/max), 断言:
- `solveProblem` 无 error (或模型拒绝极端输入)
- 轨迹每点 t/position/velocity 全部有限
- charts 每个点 x/y 有限 (折线断开标记 `{NaN, NaN}` 允许)

### L10 人类可读输出 NaN 扫描 — `visualization/tests/accuracy/physics-correctness.l10.test.ts`

遍历全部场景 (默认参数 + 滑块 min/max), 用 `findNonFinite` 递归扫描:
- number NaN/Infinity → 记录路径
- 字符串级 `NaN`/`Infinity` (被 `toFixed()`/模板字符串包成文本) → 记录路径
- charts 中的 `{NaN, NaN}` 折线断开标记 → 豁免 (doppler 超声速激波区合法产生)

### L11 渲染层常量单一真源 — `visualization/tests/accuracy/rendering-constants-single-source.test.ts`

用与引擎侧 `constants-single-source.test.ts` 同一套 `LITERAL_PATTERNS` / `stripCommentsAndStrings`
(由 `physics-core/src/units/constantPatterns.ts` 单一真源提供, 两侧共用), 扫描 `visualization/src/rendering/*.ts`
(排除常量定义处 `constants.ts`), 断言计算代码中无内联 g/k/mu0/R/e/c 字面量。依 D3 不做白名单豁免。

## 报告

```json
{
  "timestamp": "2026-07-06T15:41:02.123Z",
  "layers": [
    { "id": "L0", "status": "PASS", "passed": 7 },
    { "id": "L1", "status": "PASS", "passed": 5 },
    ...
  ],
  "failed": 0
}
```

写入 `.scratch/selfcheck-run-<ISO>.jsonl`, 每行一条。可作为 git pre-commit hook。

## 错误分类

| 分类 | 严重度 | 操作 |
|------|--------|------|
| 物理常数错误 | HIGH | 修复 `constants.ts`, 更新 CODATA 值 |
| 守恒律/解析解偏差 | HIGH | 修复模型 `solve()` 或 fixture 期望 |
| 渲染器公式与注释不一致 | HIGH | 对齐注释与实现, 提取 helper |
| 硬编码 magic number | MED | 移入 `rendering/constants.ts`, 加 source comment |
| FormulaPanel 重复/缺失 | LOW | 补齐或删除 |
| 路由缺失 | HIGH | 在 `SimulationCanvas` 加 case |
| 参数范围违规 | LOW | 调整 `sceneRegistry` 中的 min/max |
