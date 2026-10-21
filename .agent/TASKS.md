# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-21 · 四十四次滚动**，非记忆）。
> 本轮验收：**#100 验收 CLOSED**（证据：`9b020c0`/`4d3ef08` 均 main 祖先、定向 36 例独立重跑全绿、`verify-composition-interaction.mjs` 独立重跑 10 项全过零 console error、`count:check` = 2952、CI `39596743691` + Deploy `39597035981` 双绿；验收评论 issuecomment-6318536216）。
> **治理**：#101 优先级按 4.3 由 P3 更正为 **P2**（普通功能）；新建 **#151**（P3 · 浏览器探针像素断言强化），承接 #100 证据强度缺口；#151 依赖 #101 未关闭，按 4.2 门禁挂 **blocked**，暂不入队。
> open 共 **3 单** = ready 1（#101）+ blocked 1（#151）+ parked 1（#44）；Issue ↔ 本文件**零漂移**。

## 今日队列（2026-10-21 · 四十四次滚动 · 执行顺序，1 个 ready）

- [ ] **#101（P2 · type:feature/area:render · ready-for-agent）组合实验台预设实验模板：高频电磁场景一键布置**
  - **背景**：课堂主路径「打开 → 30 秒进入标准实验」缺席，空白台 + 手动凑参数备课成本高。
  - **范围**：≥3 个模板（速度选择器 / 质谱仪 / 平行板偏转，磁聚焦可选）+ `loadTemplate(id)` 单次 commit + 「📋 模板」面板区 + 每模板一句教学目标。
  - **开工口径（Planner comment issuecomment-6318541200）**：模板位置/尺寸按 0.25m 网格（`snapVector` 口径）；参数全过 `validateComposition`；加载仅触发一次重仿真；浏览器探针输出真实截图 + 模板加载前后画布像素变化断言。
  - **明确不包含**：螺线管等新器材；模板导入导出/分享；README 截图联动（可选）。
  - **依赖**：#100 已验收关闭（D51 顺序解除）。
  - **验收标准**（摘要）：
    - [ ] ≥3 模板一键加载即出正确物理图像（直线 / 圆弧 / 抛物线）
    - [ ] 产品交互验收：Playwright 实跑「打开 → 点模板 → 出实验画面」，真实截图存证，零 console error
    - [ ] 模板参数全过 `validateComposition`，default 落 0.25m 网格（#96 约定）
    - [ ] 模板加载单次 commit 不逐器材重仿真；每模板 ≥1 个 store 层测试
    - [ ] precheck exit 0；CI+Deploy 双绿；`--no-ff` 成 main 祖先；count:sync 回写
  - **测试要求**：store 层单测 + 浏览器级产品交互验收实跑（双证据）。
## 阻塞 / 待处理（parked / blocked）

- **#151（P3 · type:chore/area:render · blocked）浏览器探针视觉断言强化：#100 交互探针补画布像素级证据**
  - **背景**：#100 探针只断言 DOM 读数/时间标签，缺画布像素级证据（改角度重画 / 暂停静止 / 跳帧 / 倍速实际推进比）。
  - **范围**：在 `verify-composition-interaction.mjs` 增加画布截图差异率与倍速推进比断言；失败截图写 `.scratch/`；不改变既有 10 项断言。
  - **明确不包含**：不改 `CompositionStage` 功能代码；不新增 CI job；不做视觉回归基线库。
  - **依赖**：**#101 验收关闭**（两者都可能修改同一探针脚本）；关闭后由 Planner 摘 `blocked` 转 ready。
  - **验收标准**（摘要）：
    - [ ] 4 类画布/倍速断言实跑 exit 0，输出差异率/推进比
    - [ ] 红向验证：人为破坏时 exit 1，验证后还原不留改动
    - [ ] 既有 10 项断言全过、零 console error；precheck / CI+Deploy / `--no-ff` 祖先 / count:sync（若测试数变化）
  - **测试要求**：浏览器级像素断言实跑 + 红向反例拦截（双证据）。
- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：**暂不升**；解除条件三条（用户改选 A/C、React 19 出现已验证功能收益、react 18 遇安全/兼容硬约束）。**勿领**。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，继续**只上报、不代删**。
- **遗留观察（不建单）**：#100 将 `updateSourceParams` 参数类型由 `Record<string, number>` 放宽为 `Record<string, unknown>`；当前全部调用点类型安全、有测试覆盖，属可接受的内部 API 放宽。后续若新增消费方，优先改为按 source kind 的类型化 patch。
- **交接快照提示**：`STATE.md` / `HANDOFF.md` 为 `executor-20261021b` 收尾快照（#100 in-review 口径）；Planner 已在本轮验收关闭 #100 并将 #101 转 P2，下一棒开工前先 `git pull`，收尾时如实刷新两者。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/依赖阻塞）· parked（排程冻结 D44）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 = #101/#44，P3 = #151
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）；当前 open 共 3 单 = ready 1 + blocked 1 + parked 1，in-review 0
- 本轮 Issue 治理：#100 验收关闭并清理 `in-review` 标签；#101 改 P2 + 开工口径 comment；新建 #151 后按 4.2 依赖门禁挂 `blocked`（comment issuecomment-6318601152）
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：清零
