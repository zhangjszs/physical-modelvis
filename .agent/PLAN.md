# 开发路线图（PLAN）

> 规划者维护。每次会话滚动更新。决策依据见 `DECISIONS.md`。
> 执行 Agent 每轮只取一个 issue；**创建顺序即执行顺序**（同级按创建时间从早到晚）。

## 当前方向

**常量单一真源全链路收口** —— 把 #13 建立的"物理常量单一真源"约定从
`physics-core/src/models` 扩展到 `visualization/src/rendering`，并堵住门禁自身的匹配漏洞。
依据：决策 D1（2026-10-01）。

### 为什么是这件事（证据）

调查发现两处真实问题，非推测：

1. **门禁漏洞**：`physics-core/tests/unit/constants-single-source.test.ts` 的
   `LITERAL_PATTERNS` 只匹配全精度写法（`1.602176634e-19`），而以下 7 个模型用
   **截断值** `1.602e-19` / `1.6e-19` 绕过门禁：
   `electron-diffraction` / `em-combined-field` / `fission-chain` / `photoelectric` /
   `radiation-deflection` / `uniform-electric-field` / `uniform-magnetic-field`。
   其中 `em-combined-field` / `uniform-electric-field` / `uniform-magnetic-field`
   已 `import PHYSICS_CONSTANTS` 却仍内联 `1.6e-19`（比 `1.602e-19` 又低 0.125%）。

2. **跨包双源 + 渲染层零门禁**：`visualization/src/rendering/constants.ts` 的
   `K_BOLTZMANN` / `E_CHARGE` / `MU0` / `SIGMA_STEFAN_BOLTZMANN` / `PLANCK_H`
   与 `PHYSICS_CONSTANTS` 数值**完全相同**（实测逐项 `===` 为 true），但物理上
   是两份可独立修改的定义。渲染层另有 **24 处内联物理常量 / 16 个文件**
   （`g=9.8` ×20、`R=8.314` ×1、`e` ×2、`c=299792458` ×1）完全无门禁。

## 里程碑

### M1 · 常量单一真源全链路收口

**主题**：物理常量在「引擎 → 渲染」全链路只有一个定义来源，且有门禁防回潮。

**整体验收标准**：
- `physics-core/src/models/**` 计算路径零内联物理常量（含截断写法），由门禁强制。
- `visualization/src/rendering/**` 计算路径零内联物理常量，由门禁强制。
- 渲染层 `constants.ts` 与 `PHYSICS_CONSTANTS` 的重叠项改为**引用**而非复制。
- 现有 2284 个测试全绿，首屏 ≤70kB，10 层自检全 PASS。

| # | 主题 | 状态 | 优先级 | 验收标准（摘要） | 依赖 |
|---|---|---|---|---|---|
| [#51](https://github.com/zhangjszs/physical-modelvis/issues/51) | 门禁堵漏：8 处内联电荷常量用截断写法绕过 | 已建 | P1 | 门禁能捕获 `1.602e-19` / `1.6e-19`；8 处改为引用 | — |
| [#52](https://github.com/zhangjszs/physical-modelvis/issues/52) | 渲染层 24 处内联常量收敛 | 已建 · blocked | P1 | 24 处内联清零；数值零漂移；首屏不增 | #51 |
| [#53](https://github.com/zhangjszs/physical-modelvis/issues/53) | 渲染层常量门禁（对齐引擎侧口径） | 已建 · blocked | P1 | 新增门禁测试；自检 10 层 → 11 层，7 处文档口径同步 | #51 #52 |
| [#54](https://github.com/zhangjszs/physical-modelvis/issues/54) | 跨包双源消除：`constants.ts` 5 个重叠项改引用 | 已建 · blocked | P2 | 5 个重叠常量改引用，符号名不变，严格相等断言 | #52 |
| [#55](https://github.com/zhangjszs/physical-modelvis/issues/55) | B3：B 类清单数字修正 + 61 场景常量单位核对 | 已建 | P2 | 表头 34→37 / 13→30 / 去重 61；核对记录成表 | — |

**进度**：0/5

**执行顺序说明**：#51 必须最先（先有更严的门禁，再改代码，红→绿）。
#52 改调用点、#54 改定义点，先 #52 再 #54 冲突面更小。#53 需 #51+#52 都完成。
#55 独立，可穿插（当前唯一未 blocked 的 P2，可在 #51 完成后立即接手）。

**blocked 标签纪律**：`blocked` 是规划者独占职责 —— 上游 issue 关闭后由规划者摘除。
执行 Agent 不会摘，看到 `blocked` 应直接跳过。摘除后需在对应 issue 留一条说明评论。

### M2 · 待定

见"远景"。下一里程碑主题在 M1 收尾时依据届时 backlog 决定。

## 远景（粗粒度）

- **#44 React 19 专项**：首屏 +23kB（86.2kB）触发 70kB 门禁。需先定预算策略
  （重议至 ≥90kB 或 vendor-react 懒拆方案）。**不要在 M1 期间顺手重试。**
- **B3 深化**：B 类 61 场景的单位核对若样本量可控，可扩到"渲染公式与引擎
  `charts` 数值一致性抽检"（当前仅 A 类有契约测试）。
- **契约差集守卫自动化**：audit 文档末尾给了手工 `grep | comm` 复核方法，
  可固化为测试，防"迁移表加了场景但忘补契约用例"。

## 已放弃的方向及原因

- **文档数字漂移批量清理**（决策 D2 隐含）：#46–#50 五轮已把可发现的漂移扫尽，
  继续做只剩历史快照与冻结归档，无收益。转向有物理正确性影响的工作。
