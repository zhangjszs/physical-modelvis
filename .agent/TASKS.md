# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-22 · 四十五次滚动**，非记忆）。
> 本轮性质：**复核轮**——自上轮规划（2026-10-21 22:31 CST）至本轮 **Executor 未运行**（无新提交 / 无 in-progress / 无新 Issue 评论），**无验收对象**（#100 已于四十四次滚动验收关闭）。
> **治理**：新建 **#152**（P3 · area:ci · QA 巡检 `upload-artifact` v4→v7，收尾 `b67c439` 漏项，消除 Node.js 20 弃用告警）；今日队列 = **#101 → #152**（2 单）。
> open 共 **4 单** = ready 2（#101/#152）+ blocked 1（#151）+ parked 1（#44）；Issue ↔ 本文件**零漂移**（本轮 gh 实拉核对）。

## 今日队列（2026-10-22 · 四十五次滚动 · 执行顺序，2 个 ready）

- [ ] **#101（P2 · type:feature/area:render · in-review）组合实验台预设实验模板：高频电磁场景一键布置**（M8 第二单 · 队首）
  - **背景**：课堂主路径「打开 → 30 秒进入标准实验」缺席，空白台 + 手动凑参数备课成本高。
  - **范围**：≥3 个模板（速度选择器 / 质谱仪 / 平行板偏转，磁聚焦可选）+ `loadTemplate(id)` 单次 commit + 「📋 模板」面板区 + 每模板一句教学目标。
  - **开工口径（Planner comment issuecomment-6318541200）**：模板位置/尺寸按 0.25m 网格（对齐台面可视网格；`snapVector` 默认步长 0.05，请显式传 `snapVector(v, 0.25)`）；参数全过 `validateComposition`；加载仅触发一次重仿真；浏览器探针输出真实截图 + 模板加载前后画布像素变化断言。
  - **明确不包含**：螺线管等新器材；模板导入导出/分享；README 截图联动（可选）。
  - **依赖**：#100 已验收关闭（D51 顺序解除）。
  - **验收标准**（摘要）：≥3 模板一键出正确物理图像（直线/圆弧/抛物线）；产品交互验收（Playwright 实跑 + 真实截图 + 像素变化，零 console error）；参数过 `validateComposition` + `parameter-ranges` 门禁绿；加载单次 commit；每模板 ≥1 store 层测试；precheck exit 0；CI+Deploy 双绿 + `--no-ff` 祖先；count:sync 回写。
  - **测试要求**：store 层单测 + 浏览器级产品交互验收实跑（双证据）。
  - **本轮前提复核（Planner 实测）**：`snapVector`（`compositionCoords.ts:39`，默认步长 0.05，接受自定义 step）/ `validateComposition`（`compositionStore.ts:133` 消费）在位；`loadTemplate` 全仓 0 命中（确未开工）；台面可视网格 0.25m（`CompositionStage.tsx:90` GridHelper 8m/32 分格）。

- [ ] **#152（P3 · type:chore/area:ci · in-review）QA 巡检 upload-artifact v4 → v7（收尾 b67c439，消除 Node 20 弃用告警）**
  - **背景**：QA 巡检 run `39682553419` annotations 现「Node.js 20 is deprecated … upload-artifact@v4」；`qa-sweep.yml:82` 仍 `@v4`，而 ci.yml 已是 `@v7`——`b67c439` 升级时遗漏 `qa-sweep.yml`。
  - **范围**：仅 qa-sweep.yml 一行版本号对齐（步骤参数逐项不变）+ 实跑取证（dispatch 或 PR smoke：run success、artifact 正常、annotation 消失）。
  - **明确不包含**：不改触发条件/job 结构/门禁语义；不升级其他 action；不触依赖与 Node 版本。
  - **红线判定（Planner）**：非 1.10「主要 CI/CD 流程变化」——不改变流程语义，延续 `b67c439` 已建立的同类维护动作；qa-sweep 不阻断 Deploy 链。
  - **依赖**：无（与 #101/#151 无文件交集）。
  - **验收标准**（摘要）：grep 全仓 `upload-artifact@` 无 `@v4` 残留；实跑 run success + annotations 无 Node 20 弃用 + artifact `qa-sweep-report-<n>` 存在；precheck exit 0；`--no-ff` 祖先 + CI/Deploy 双绿。
  - **测试要求**：workflow 变更以「实跑 run + artifact + annotation」为证据（不得只给 YAML diff）。

## 阻塞 / 待处理（parked / blocked）

- **#151（P3 · type:chore/area:render · blocked）浏览器探针视觉断言强化：#100 交互探针补画布像素级证据**
  - **背景**：#100 探针只断言 DOM 读数/时间标签，缺画布像素级证据（改角度重画 / 暂停静止 / 跳帧 / 倍速实际推进比）。
  - **范围**：在 `verify-composition-interaction.mjs` 增加画布截图差异率与倍速推进比断言；失败截图写 `.scratch/`；不改变既有 10 项断言。
  - **依赖**：**#101 验收关闭**（两者都可能修改同一探针脚本）；关闭后由 Planner 摘 `blocked` 转 ready。**勿领**。
- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：**暂不升**；解除条件三条（用户改选 A/C、React 19 出现已验证功能收益、react 18 遇安全/兼容硬约束）。**勿领**。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，继续**只上报、不代删**。
- **观察（建议执行棒顺手清理，Planner 不代动）**：本地分支 `agent/issue-150-theme-tokens-slice-2` 已并入 main（ancestor 校验 exit 0）但未删除，与 §1.9「合并后删除临时分支」不符；属执行棒自己的分支，建议下轮 `git branch -d`。
- **遗留观察（不建单）**：#100 将 `updateSourceParams` 参数类型放宽为 `Record<string, unknown>`；当前全部调用点类型安全、有测试覆盖，属可接受的内部 API 放宽。后续若新增消费方，优先改为按 source kind 的类型化 patch。
- **交接快照提示**：`STATE.md` / `HANDOFF.md` 仍为 `executor-20261021b` 快照，其中「#100 待验收」口径已过期（#100 已于四十四次滚动验收关闭、#101 已解锁）。执行棒下轮开工前先 `git pull`，收尾时如实刷新两者。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/依赖阻塞）· parked（排程冻结 D44）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 = #101/#44，P3 = #151/#152
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list` 实拉整体重写）；当前 open 共 4 单 = ready 2 + blocked 1 + parked 1，in-review 0
- 本轮 Issue 治理：新建 #152（P3 ready，入今日队列次位）；#101/#151/#44 维持原状态零变更
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：清零
