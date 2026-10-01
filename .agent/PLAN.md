# 开发路线图（PLAN）

> 规划者维护。每次会话滚动更新。决策依据见 `DECISIONS.md`。
> 执行 Agent 每轮只取一个 issue；**创建顺序即执行顺序**（同级按创建时间从早到晚）。
> 本文件曾随 `6214cbd` 开源化清理被误删，2026-10-02 规划者从 `d0d9e37` 恢复并滚动更新。

## 当前方向

**M2 · L5 组合实验台场线渲染收尾**（用户 2026-10-02 定夺，见 D6/D7）——
直通终极愿景（3D 引擎 + 拖拽组合实验台；基础层 L0-L2 `d387f21` / 组合层 L3 `f56b0f2` /
交互层 L4 `0c38f43` 已提交）。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#67](https://github.com/zhangjszs/physical-modelvis/issues/67) | L5 场线渲染收尾：收编并发遗留 WIP（fieldLines/fieldLineSeeds + Stage 集成） | 已建 | P1 | 通读原设计不推翻语义；单测全绿；UI 场线可见且松手随动；单一真源不破坏；门禁全绿；显式 8 路径提交 | — |
| [#60](https://github.com/zhangjszs/physical-modelvis/issues/60) | 引擎单位记号统一（'deg'→'°'/'um'→'μm'）+ 门禁（D5 定夺） | 已建 | P3 | 三语义面（unit/xUnit/yUnit）统一归零 + 门禁扫描 + '°C' 排除 | — |
| [#68](https://github.com/zhangjszs/physical-modelvis/issues/68) | lint/format 门禁盲区收口（tests/scripts 纳入；PR #25 意图转内部，D8） | 已建 | P2 | lint/format 覆盖三目录全绿；scripts 按类型环境无假红；测试语义零改动 | 排 #67/#60 之后 |

**执行顺序**：#67（M2 主线）→ #60（P3 小项）→ #68（机械改动面大，避免与功能改动叠加）。

**进度**：0/3

### #67 背景备忘（原「候选 A 详细」收编记录）

被收编的并发 WIP（stalled ~12h，用户 D7 确认收编、解除「勿动」，**仅限 8 个路径**）：
新文件 `fieldLines.ts`（`buildFieldLines`：traceFieldLine 物理坐标追踪 →
physicsToWorld 世界坐标折线，纯函数可单测）、`fieldLineSeeds.ts`（四类器材种子：
点电荷球面 12 / 极板网格双侧偏移 / 导线多半径圆周 / 线圈环向，避开源奇点）
+ 2 个测试文件；修改 CompositionLab(+19) / CompositionStage(+106) /
compositionStore(+39) / compositionStore.test(+40)。风险低：基于 L4 之后
的 main，冲突面小。

## 已完成里程碑（存档）

### M1 · 常量单一真源全链路收口 ✅（2026-10-01 收口）
#51 门禁堵漏 / #52 渲染层 24 处收敛 / #53 渲染门禁（自检 10→11 层）/ #54 跨包双源消除 /
#55 B3 清单核对，全部 CLOSED；后续 #57 Deploy 修复、#58 σ_水 三方取值统一亦收口。

### M1.5 · 3D 物理基础层收口 ✅（#56，`2e9ccf1`）
TrajectoryPoint3D 方案 A（独立通道，不并入 SimulationResult）+ L1/L8 接入 3D 自检 +
2D 解析解 vs 3D Boris 边界文档。

### B3 · B 类清单与计数收口 ✅（#55 + #59）
B-静态 36 / B-数值 30 / 去重 60（#59 移除幻影 double-slit 后口径）。

## M2 · 后续展开（#67 收编完成后定）

M2 主线为 L5 场线渲染（#67）。收编落地后，M2 是否继续包含以下子项由届时 backlog 决定：
- 场线交互深化（按需：场线显隐开关 / 密度调节 / 磁感线闭合环样式）
- L6 候选：更多器材类型接入组合实验台（引擎 fields3d 已支持点电荷/极板/导线/线圈）

## 远景（粗粒度）

- **开源化技术债三候选**（架构评审口径，用户 2026-10-02 未选、未放弃，D6）：
  - **B. P1 引擎契约类型化**：charts schema 化（types/result.ts ~100 optional 键 +
    渲染层 `as unknown as` 强转）、约束接口下沉（problem.ts 1883 行上帝对象）、units 层去留。
  - **C. P2 渲染 primitives 重组**：27 个按章节巨型文件（CanvasRenderer 1886 行等）
    重组为按绘制机制共享的 primitives 层。
  - **D. P3 开源发布面**：physics-core 是否实际 npm publish、visualization `private:true`
    去留、README 英文化/截图/GIF 等发布物料。
- **#44 React 19 专项**（人类持有，勿动）：首屏 +23kB（react-dom 19）破 70kB 门禁，
  需先定预算策略（重议 ≥90kB 或 vendor-react 懒拆）。无论 M2 选哪个方向都不并行做它。
- **B3 深化**：B 类 60 场景的「渲染公式与引擎 charts 数值一致性抽检」（当前仅 A 类有契约测试）。
- **契约差集守卫自动化**：audit 文档末尾手工 `grep | comm` 复核方法固化为测试。
- **测试数门禁盲区**：`npm run count:check` 在脏树（存在未跟踪测试文件）下不可信；
  #67 收编提交后树转干净，届时评估是否给 count:check 加「树必须干净」前置断言。

## 已放弃的方向及原因

- **文档数字漂移批量清理**（D2 隐含）：#46–#50 五轮已把可发现的漂移扫尽，
  剩余属历史快照与冻结归档，无收益。转向有物理正确性影响的工作。
- **σ 单独加 LITERAL_PATTERNS 门禁**（#58 两根执行棒一致结论）：用「既有 it 内加断言」
  锁定，避免门禁面扩大 + 需补 PATTERN_SAMPLES。
