# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-22 · 四十六次滚动**，非记忆）。
> 本轮性质：**验收与排程轮**——昨天交付的 #101 与 #152 经独立取证全量满足验收标准，均已规范 **CLOSED**；**Milestone M8（组合实验台产品功能线）2/2 正式收官**。
> **治理**：#151 依赖解除，摘除 `blocked` 标签转入 `ready-for-agent`（今日队首）；新建 **#154**（P3 · type:docs · ready-for-agent，README 演示截图脚本与物料更新，今日次位）。
> open 共 **3 单** = ready 2（#151/#154）+ parked 1（#44）；Issue ↔ 本文件**零漂移**（本轮 gh 实拉核对）。

## 今日队列（2026-10-22 · 四十六次滚动 · 执行顺序，2 个 ready）

- [ ] **#151（P3 · type:chore/area:render · ready-for-agent）浏览器探针视觉断言强化：#100 交互探针补画布像素级证据（改角度/暂停/跳帧）**（今日队首）
  - **背景**：#100 已验收关闭，功能与单测通过；但 `scripts/verify-composition-interaction.mjs` 的交互断言停留在 DOM 读数/时间标签，缺少画布随动重画、暂停画面静止、拖动进度条跳转的画布像素级证据。
  - **范围**：在现有探针中增加 4 类画布像素级/推进比断言（改角度前后画布差异显著、暂停后 300ms 两次截图逐像素一致、拖动进度条后画面变化、倍速时间推进比 ≈ 4:1）；断言失败时截图写入 `.scratch/`；不改变既有 10 项断言与输出文案。
  - **明确不包含**：不修改 `CompositionStage` 功能代码；不新增 CI job；不做视觉回归基线库。
  - **依赖**：#101 已验收关闭，依赖解除，即日开工。
  - **验收标准**（摘要）：探针新增 4 类画布/倍速断言，本地生产 preview 实跑 exit 0，控制台输出差异率/推进比；红向验证（人为破坏断言报错 exit 1，验证后还原）；既有 10 项断言全过，全程零 console error；precheck exit 0；CI+Deploy 双绿 + `--no-ff` 祖先；若测试数变化回写标记。
  - **测试要求**：浏览器级像素断言实跑 + 红向反例拦截（双证据），不得只靠 DOM 文本。

- [ ] **#154（P3 · type:docs · ready-for-agent）README 演示截图脚本与物料更新：反映 M8 组合台新功能（预设模板/回放/朝向编辑）并清理陈旧 OCR 绕行**（今日次位）
  - **背景**：M8（#100 旋转/回放 + #101 模板）已收官；但 `docs/screenshots/06-composition-bench.png` 仍展示旧版空白台面，缺少模板专区、教学目标卡片与轨迹回放栏；`scripts/capture-screenshots.mjs:361-363` 仍残留针对 OCR 的临时 `addStyleTag` 规避（#112 已解决）与过时头注释描述。
  - **范围**：优化 06 截图采集配方（一键加载经典预设模板并展示 3D 舞台、双色场线、轨迹、回放栏与模板专区）；移除 04 截图针对 OCR 的临时 `addStyleTag` 规避代码；更新脚本头注释；重新生成截图并验证单张 ≤1MB、总量 ≤8MB 预算；README 对应插图说明自洽。
  - **明确不包含**：不改业务功能代码或物理引擎代码；不改既有截图视口（1440×900）；不做其他场景无关截图重置。
  - **依赖**：排在 #151 之后（同属测试/验证脚本类任务，串行执行）。
  - **验收标准**（摘要）：移除 OCR 临时样式注入且 04 截图正常在视口内；06 截图呈现 M8 预设模板与回放新界面；本地实跑 `capture-screenshots.mjs` exit 0，单张 ≤1MB、总量 ≤8MB；README 文案自洽；precheck exit 0；CI+Deploy 双绿 + `--no-ff` 祖先。
  - **测试要求**：实跑 `capture-screenshots.mjs` 验证生成产物，执行报告给出体积与视觉核对证据。

## 阻塞 / 待处理（parked）

- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：**暂不升**；解除条件三条（用户改选 A/C、React 19 出现已验证功能收益、react 18 遇安全/兼容硬约束）。**勿领**。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，继续**只上报、不代删**。
- **分支清理完成**：本地分支 `agent/issue-150-theme-tokens-slice-2` 已由执行棒于 2026-10-22 成功删除（`git branch -d` exit 0）。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/依赖阻塞）· parked（排程冻结 D44）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 = #44，P3 = #151/#154
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list` 实拉整体重写）；当前 open 共 3 单 = ready 2 + parked 1，in-review 0
- 本轮 Issue 治理：验收关闭 #101 与 #152；#151 摘除 `blocked` 添加 `ready-for-agent`；新建 #154（P3 ready，入今日队列次位）
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：清零
