# TASKS（GitHub Issue 本地镜像）

> Planner 整体重写 · 2026-11-17 · D73·续。GitHub Issues（26 开放单）为唯一权威；Executor 先改 Issue，再同步本文件状态。
> 基线：`main @ 460711d`（代码至 `670b1ee` PR #168），precheck 全绿（3190 tests = physics-core 1186 + visualization 2004），CI/Deploy/QA 最近全绿；未见 `.agent/LOCK` 残留。
> 标签约定：`ready-for-agent` 仅挂于今日队列可执行单；`priority:P1` 严格收敛至 5 项。

## 本轮验收与治理摘要（2026-11-17）

- **昨日日报核查**：已读 `.agent/DIARY/2026-11-17.md`、`2026-11-13.md`、`2026-11-12.md` 与 `STATE.md` / `HANDOFF.md` / `ENV.md`。昨日（11-17）Execution 为空队列守规收尾，实跑 `npm run precheck` 全绿并向 Planner 发出 `#166` / `#167` / `#169–#190` 分拣信号，本轮全部响应。
- **#166 P0 验收 → 部分通过，退回 `in-progress`（[验收 comment](https://github.com/zhangjszs/physical-modelvis/issues/166#issuecomment-6951283793)）**：
  - 认可已交付部分：`e8dacb4` 规格入库、`picking.ts` + 18 单测、`CompositionOutliner.tsx` + 5 单测、`compositionStore.ts` `hoverId` + 2 单测、`sourceMeshes.ts` `pickRole` + 2 单测、`CompositionStage.tsx` P0 改造；本轮实跑 `tests/composition/` **11 files / 120 passed**，CI `43259143205` / `43276337540` 全绿。
  - 未满足差距：① 本环境实测 Playwright Chromium 可正常启动（`LAUNCH_OK`），但实跑 `node scripts/verify-composition-interaction.mjs` 在第 13 步（line 628）失败：`期望「点电荷 #1」实际「点电荷 #17」`（`resetLab()` 未重置 `nextId = 1`），导致 A-1/A-2/A-4/A-5/A-7 端到端断言未跑通；② `CompositionLab.tsx:251` 检查器仍显示 `{selected.id}` 而非 `sourceDisplayName(selected)`。
  - **拆期**：`#166` 收口为仅 P0；P1（B-1～B-9 可控放置）拆出至新单 **#191**。
- **决策与 Milestone 治理**：D68=A、**D69=A、D70=A、D71=A（1.10 授权 `ci.yml`/`qa-sweep.yml` 安装步 3 次退避重试）、D72=A（M10→M11→#191→#171→#189）全部确认生效，pending 清零**；新建 **M10（8 单）** 与 **M11（13 单）**；依契约 4.3 将暂不入今日队列的原 P1 调为 P2。

---

## 今日队列（2026-11-17，共 5 项 · 全部属 M10 Wave 1）

### 1. #166 · 组合实验台 P0 探针闭环与检查器显示名统一（返工收口）

- Issue：[#166](https://github.com/zhangjszs/physical-modelvis/issues/166)；Milestone：M10；状态：**in-review**（2026-11-17 返工合并 `81c3064`）；优先级：**priority:P1**（`area:render`, `type:feature`）。
- 返工范围（仅剩 2 项差距）：
  1. `compositionStore.ts` `resetLab()` 重置 `nextId = 1`（补单测），并本机实跑 `node scripts/verify-composition-interaction.mjs` 验证全流程（含 A-1/A-2/A-4/A-5/A-7）绿且零 console error。
  2. `CompositionLab.tsx:251` 将 `{KIND_LABEL[selected.source.kind]} · {selected.id}` 统一为 `{sourceDisplayName(selected)}`。
- 先完成后合入 `main`，再交回 `in-review`。

### 2. #169 · 修复斜面实验上滑初速度、动摩擦方向与有限斜面边界

- Issue：[#169](https://github.com/zhangjszs/physical-modelvis/issues/169)；Milestone：M10；状态：**in-review**（2026-11-17 合并 `604fe5c`）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 Issue 最新评论）：
  - UI `v0 > 0`（沿斜面向上）时滑块起始置于斜面**底端** `s0 = inclineLength`，到顶端 `s = 0` 或返回底端 `s = inclineLength` 截断止步；`v0 <= 0` 保留顶端 `s0 = 0`。
  - 分段解析：`vAlong < 0` 用 `a_up = g(sinθ + μcosθ)`；过零时检查 `staticCanHold`（`tanθ ≤ μ` 驻留，否则切换 `a_down = g(sinθ - μcosθ)`），保持位移/速度连续。
  - `inclineRig.ts` `geometryFor` 渲染完整 `[0, L]` 斜面板；2D `drawInclinedPlaneScene` 标题消费当前时刻瞬时加速度 `a(t)`。

### 3. #172 · 修复竖直圆周运动学自洽与杆/绳/环临界及 3D 真源

- Issue：[#172](https://github.com/zhangjszs/physical_modelvis/issues/172)；Milestone：M10；状态：**in-review**（已合入 `66af132` @ `main`，提交执行报告）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 Issue 最新评论）：
  - 细步长约束积分求解 `dθ/dt = ω`、`dω/dt = -(g/r)sinθ`，使 `v = r|ω|` 自洽且机械能守恒。
  - `rod` 仅在 `v₀ ≥ √(4gr)` 时过顶（同步更正 `vertical-circle.test.ts:68-71`）；`rope` 与 `ring` 保持单侧约束 `vMin = √(gr)` / `v₀_crit = √(5gr)`（`2gr < v₀² < 5gr` 在 `cosθ_det = (2gr-v₀²)/(3gr)` 脱轨平抛，`v₀² ≤ 2gr` 摆动）。
  - 修正 `verticalCircleRig.ts`（`ring` 误判 `√(4gr)`、硬编码 `g=9.8` 与自算拉力），2D/3D 统一消费引擎帧与 `N(θ)` 符号。

### 4. #173 · 修复平抛碰撞反弹带符号位移与非弹性文案

- Issue：[#173](https://github.com/zhangjszs/physical_modelvis/issues/173)；Milestone：M10；状态：**in-review**（已合入 `d5db38e` @ `main`，提交执行报告）；优先级：**priority:P1**（`area:engine`, `area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 Issue 最新评论）：
  - 区分绝对距离与带符号水平位移 `OM_signed = v1After * tFall`；关键帧、`rangeDiagram`、动量代数和 `m₁·OP = m₁·OM_signed + m₂·ON_signed` 与 2D/3D 落点全部采用带符号结果。
  - 修正 `碰撞瞬间` 关键帧在 `e < 1` 时错标「完全弹性」的文案；补 `m₂ > m₁` 反弹与 `e=0/0.5/1` 单测。

### 5. #190 · 组合实验台参数校验/求解失败后清除旧轨迹与回放状态

- Issue：[#190](https://github.com/zhangjszs/physical_modelvis/issues/190)；Milestone：M10；状态：**in-review**（已合入 `8a09ec0` @ `main`，提交执行报告）；优先级：**priority:P1**（`area:render`, `type:bug`）。
- Planner 4.2 门禁定型（详见 Issue 最新评论）：
  - `compositionStore.ts` `recompute` 所有失败/异常分支返回 `{ result: null, validationMessage }`；无效 `setDuration` 同步清 `result` 与报错（不静默忽略）。
  - `CompositionStage.tsx` 当 `trajectory.length <= 1` 时停止播放态并复位 `currentTime = 0`。
  - 同步更新 `compositionStore.test.ts:45-55` 旧断言（`toBe(good)` → `toBeNull()`）并补非法输入与恢复回归。

---

## M10 Wave 2（待排入下一批 ready，暂保持 `open` · `priority:P2`）

| Issue | 标题 | 标签 | 关键备注 |
| --- | --- | --- | --- |
| [#174](https://github.com/zhangjszs/physical-modelvis/issues/174) | 牛顿管空气/真空与双体 2D/3D 同源 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | 新增专用模型时须登记 `chart-registry.ts` |
| [#175](https://github.com/zhangjszs/physical-modelvis/issues/175) | 卫星轨道地球半径碰撞截断 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | `centralRadius` 首次触地插值截断 + `impact` 诊断 |
| [#177](https://github.com/zhangjszs/physical-modelvis/issues/177) | 牛顿第三定律自由双体内力动量守恒 | `priority:P2`, `type:bug`, `area:engine`, `area:render` | Planner 已定型（6.1）：`allowMotion=1` 改为自由双体（`a_A=-F/m_A, a_B=F/m_B`），更正 `newton-third-law.test.ts:58-72` |

---

## M11 电磁 / 光学 / 热学 / 近代物理缺陷修复（13 单 · 0 / 13）

| Issue | 标题 | 状态 / 标签 | 备注 |
| --- | --- | --- | --- |
| [#178](https://github.com/zhangjszs/physical-modelvis/issues/178) | 摩擦轮接触传动反向旋转 | `open` · `priority:P2`, `area:engine`, `area:render` | `friction` `direction=-1` 与 2D/3D 切向速度对齐 |
| [#179](https://github.com/zhangjszs/physical-modelvis/issues/179) | 光控开关 `threshold` 失效与 `L=0` NaN | `open` · `priority:P2`, `area:engine`, `area:render` | **D69=A 已确认**：以 `V_B>=VbeOn` 为真源，移除无效阈值滑块改示 `L_crit`，校准暗阻与 `L=0` 上限 |
| [#180](https://github.com/zhangjszs/physical-modelvis/issues/180) | 静电感应近远端电荷守恒与张角量纲 | `open` · `priority:P2`, `area:engine`, `area:render` | 硬不变量 `q_near + q_far = 0`（孤立中性导体） |
| [#181](https://github.com/zhangjszs/physical-modelvis/issues/181) | 双缝干涉薄膜预设无相移效应 | `open` · `priority:P2`, `area:engine`, `area:render` | **D70=A 已确认**：改为单缝插薄片 `Δ=(n-1)t` 移条纹并改名「单缝加薄片」，更新测试 |
| [#182](https://github.com/zhangjszs/physical-modelvis/issues/182) | 薄膜干涉两界面反射相对相变（半波损失） | `open` · `priority:P2`, `area:engine`, `area:render` | Fresnel 幅反射系数符号 + 传播相位 |
| [#185](https://github.com/zhangjszs/physical-modelvis/issues/185) | β 射线负电荷半径归零修复 | `open` · `priority:P2`, `area:engine`, `area:render` | `r = p/(|q|B)` + `sign(q)` 偏转方向 + 相对论动量 |
| [#186](https://github.com/zhangjszs/physical-modelvis/issues/186) | 衰变统计试验次数 `nTrials` 生效 | `open` · `priority:P2`, `area:engine`, `area:render` | `nTrials` 控制 Poisson 抽样次数 |
| [#187](https://github.com/zhangjszs/physical-modelvis/issues/187) | AM 调制采样低于 Nyquist 导致混叠 | `open` · `priority:P2`, `area:engine`, `area:render` | 短时细节 vs 长时包络/抗混叠策略 |
| [#170](https://github.com/zhangjszs/physical-modelvis/issues/170) | 弹簧振子平衡位置关键帧速度文本误用 `v0` | `open` · `priority:P2`, `area:engine` | 消费 `cur.velocity` 模长 |
| [#176](https://github.com/zhangjszs/physical-modelvis/issues/176) | 卡文迪什/微小形变光杠杆多乘 2 | `open` · `priority:P2`, `area:engine`, `area:render` | 同根因两模型 `D·tan(2θ)` 回归 |
| [#183](https://github.com/zhangjszs/physical-modelvis/issues/183) | 液体混合双零体积收缩率 NaN 修复 | `open` · `priority:P2`, `area:engine`, `area:render` | Planner 已定型（6.1）：保留 `min=0` 空白态，`contractionPercent=0` + N/A 文案 |
| [#184](https://github.com/zhangjszs/physical-modelvis/issues/184) | 热传递终态关键帧 `t=0` 与温度误用环境值 | `open` · `priority:P2`, `area:engine`, `area:render` | 取 `t=tMax` 与 `T(tMax)` |
| [#188](https://github.com/zhangjszs/physical-modelvis/issues/188) | 光栅角色散 `rad/nm` 差 1000 倍与缺级判据 | `open` · `priority:P2`, `area:engine`, `area:render` | 乘数 `1e-9` + 真实 `missingOrders` 判定 |

---

## 后置产品线、待决与冻结项（5 单）

- **#191** · `[P2] 实现组合实验台「可控放置」交互改造（#166 P1 期：B-1~B-9）`：**blocked** · `priority:P2` · `type:feature` · `area:render`。依赖 `#166` P0 收口及 M10/M11 收口（**D72=A 已定**：#191 → #171 → #189）。
- **#171** · `[P1][Sandbox M0] 固定平抛实验作为可编辑的沙盒预设装配`：**blocked** · `priority:P2` · `type:feature` · `area:engine, area:render`。已摘 `needs-info`（**D72=A 已定**），依赖 M10/M11 及 #191 收口后由 Planner 出 Phase A RFC 设计拆解再转 ready。
- **#189** · `[P2][UI/UX Redesign] PHYSVIS // WORLD ENGINE 改版`：**blocked** · `priority:P2` · `type:feature` · `area:render`。依赖物理修复收口及 **D72=A** 顺位，合并前需 owner 人工预览认可。
- **#167** · `CI「安装 Playwright Chromium」遇 runner DNS 抖动加固`：`open` · `priority:P3` · `type:chore` · `area:ci`。已摘 `auto-discovered` 与 `needs-info`（**D71=A 已授权 1.10 局部范围**：仅给 `ci.yml`/`qa-sweep.yml` 安装步加 3 次退避重试），后置排期。
- **#44** · `[P2] 暂缓 React 19 迁移`：**blocked + parked** · `priority:P2` · `type:chore` · `area:ci`。D44=B 冻结维持，勿动。
