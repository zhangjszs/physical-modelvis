# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = **GitHub Issues**（gh 可用，本轮实拉 `gh issue list --state open` 于 **2026-10-21 · 四十三次滚动**，非记忆）。
> 本轮验收：**#150 验收 CLOSED —— M7 3/3 收官**（证据：4 commit 均 main 祖先、`isDark ?` = 0、3D 写死色 = 0、定向 58 例独立重跑全绿、count 2928 一致、CI/Deploy @ `72ffeb8` 双绿；验收评论 issuecomment-6306565989）。
> **D51 兑现**：#100/#101 摘 `parked` 转 `ready-for-agent`，正文已重写（补产品交互验收维度），解冻 comment 在案。
> open 共 **3 单** = ready 2（#100/#101）+ parked 1（#44）；Issue ↔ 本文件**零漂移**。

## 今日队列（2026-10-21 · 四十三次滚动 · 执行顺序，2 个 ready）

- [ ] **#100（P2 · type:feature/area:render · ready-for-agent）组合实验台交互增强：器材旋转编辑 + 轨迹回放控制**
  - **背景**：L4/L5 落地后两大交互缺口——方向字段（线圈 axis / 极板 normal / 导线 direction）引擎全支持但检查器无编辑入口；轨迹回放 rAF 自动循环无暂停/倍速/进度。
  - **范围**：检查器「预设轴 + 绕轴角度」编辑控件走既有 updateSourceParams → 重仿真/重画管线；回放控制条（播/暂停、倍速 0.25×–2×、进度滑块拖动即跳帧，状态留 CompositionStage 局部不入 store）；键盘：空格 = 播/暂停，Delete = 删除选中。
  - **明确不包含**：自由向量输入控件；fields3d 引擎接口与数值语义改动；轨迹数据导出；新第三方依赖。
  - **依赖**：无。
  - **验收标准**（正文已重写，此处摘要）：
    - [ ] 三类方向字段可编辑为任意角度，场线与粒子轨迹随动
    - [ ] 回放可暂停任意帧、倍速可调，暂停时 rAF 不空转（与 #79 按需渲染一致）
    - [ ] 键盘路径可用且不吞输入框焦点
    - [ ] 产品交互验收：Playwright 浏览器实测（改角度随动重画 / 暂停静止 / 倍速生效 / 进度跳转），零 console error
    - [ ] 新增交互状态测试；组合台测试全绿；precheck exit 0；CI+Deploy 双绿；`--no-ff` 成 main 祖先；count:sync 回写
  - **测试要求**：交互状态单测 + 浏览器级产品交互验收实跑（双证据）。
- [ ] **#101（P3 · type:feature/area:render · ready-for-agent）组合实验台预设实验模板：高频电磁场景一键布置**
  - **背景**：课堂主路径「打开 → 30 秒进入标准实验」，空白台 + 手动凑参数备课成本高。
  - **范围**：3–4 个预设模板（速度选择器 / 质谱仪 / 磁聚焦 / 平行板偏转，纯前端 JSON）+ `loadTemplate(id)` 单次 commit + 「📋 模板」面板区 + 每模板一句教学目标。
  - **明确不包含**：螺线管等新器材（#94 §5 后备另立）；模板导入导出/分享；README 截图联动（可选项）。
  - **依赖**：**#100 验收关闭后开工**（D51 顺序，避免组合台同文件并发冲突）。
  - **验收标准**（摘要）：
    - [ ] ≥3 个模板一键加载即出正确物理图像（轨迹形状核对）
    - [ ] 产品交互验收：Playwright 实跑「打开 → 点模板 → 出实验画面」全路径，截图存证，零 console error
    - [ ] 模板参数全过 `validateComposition` 且 default 落网格（#96 约定）
    - [ ] 模板加载单次 commit 不逐器材重仿真；每模板 ≥1 个 store 层测试
    - [ ] precheck exit 0；CI+Deploy 双绿；`--no-ff` 成 main 祖先；count:sync 回写
  - **测试要求**：store 层单测 + 浏览器级产品交互验收实跑（双证据）。

## 阻塞 / 待处理（parked）

- **#44（P2 · type:chore/area:ci · parked）React 19 专项迁移** —— D44 = **B**（用户 2026-10-18 拍板）：**暂不升**；解除条件三条（用户改选 A/C、React 19 出现已验证功能收益、react 18 遇安全/兼容硬约束）。**勿领**。
- **观察（不建单，需用户点头才做）**：`origin/agent/issue-95-shadow-adaptive`(`ba0bd6f`) 与 `origin/agent/issue-96-default-on-grid`(`f73f21a`) 两个远程分支已是 main 祖先且对应 Issue 已 CLOSED，属 §1.9 未执行的清理。删除远程分支影响共享状态且契约 1.9 禁止 agent 删他人分支，本轮**只上报、不代删**。
- **交接快照提示**：`STATE.md` / `HANDOFF.md` 为 `executor-20261021a` 收尾快照（#150 in-review 待验收口径），验收结论见本轮 Issue comment；下一棒开工前先 `git pull`，收尾时如实刷新两者。

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/依赖阻塞）· parked（排程冻结 D44）· needs-info（需决策）；closed = done
- 优先级：P0 最多 2 个（现 0）；P1 与今日容量匹配（现 0）；P2 = #100/#44，P3 = #101
- 契约 1.6 一致性：本轮 Issue ↔ TASKS.md 无漂移（Issue 为权威，本文件由 `gh issue list/view` 实拉整体重写）；当前 open 共 3 单 = ready 2 + parked 1，in-review 0
- 本轮 Issue 治理：#150 验收关闭并清理 `in-review` 标签；#100/#101 摘 `parked` 加 `ready-for-agent` 并重写正文（解冻 comment issuecomment-6306570859 / issuecomment-6306573262）
- 契约 1.2：本轮未发现 `.agent/LOCK` 残留
- **pending 决策**：清零
