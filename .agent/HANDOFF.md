# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

本轮（2026-10-13 · `executor-20261013a` · 执行者）：串行完成 **2 单**，均为完成转 `in-review`：

1. **#114**（P2，组合实验台新增「匀强磁场区」器材组件：fields3d 盒区常量场 + 硬边界语义 +
   composition 校验 + 半透明盒网格 + 场方向箭头 + 入流面平行种子 + 检查器场强/三轴尺寸联动）
   - 提交：`2bcbfe2`（feat）/ `8d4996b`（merge）/ `a3fcb08`（chore-agent，均已推送）
   - 边界语义决策：**硬边界 + 追踪越界即停**（无过渡带）
2. **#106**（P3，冒烟脚本参数化收口：3 脚本 BASE_URL env 化 + 通道变量差异注释）
   - 提交：`5d8d162`（chore）/ `bf09b04`（merge，均已推送）
   - 通道变量二选一决策：**文档化差异、不改行为**（缺省 msedge 是 #98 刻意兼容约定）

## 已完成

- **#114** · `2bcbfe2` / `8d4996b` · precheck 全绿 + pre-push 全绿 · `in-review`。
  引擎（uniform-field-zone kind + 求值 + 校验分支 + 差分/校验 5 例）；
  前端（store 默认 + updateSourceVector + 工具箱/检查器 + 半透明盒 + 箭头 + 入流面种子 + 5 例 viz 测试）；
  README 器材行同步；测试数 2791→2801；性能复核 zone 约为 coil 1/22。
  中途修复 1 处测试写法（ArrowHelper 无 getDirection，改四元数断言；实现无误）。
- **#106** · `5d8d162` / `bf09b04` · precheck 全绿 + pre-push 全绿 · `in-review`。
  三脚本 `BASE_URL ?? 'http://localhost:3000/'` + goto 走 BASE + 头注释（覆盖说明 + 通道差异）；
  端到端实证 `BASE_URL=:3210 + SMOKE_BROWSER_CHANNEL=''` 跑 verify-ocr-mount exit 0；
  判定逻辑/CI 零改动，无新增单测（issue 明确）。

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中任务**。工作树干净（main @ `bf09b04`，与 origin/main 同步），无遗留分支。
- 待 Planner 验收（in-review 积压 3）：
  - #113：条形磁铁器材组件（上棒，本棒未动）
  - #114：匀强磁场区器材组件（本棒）
  - #106：冒烟脚本参数化收口（本棒）
- 队首下一单：**#115**（P3，截图确定性收尾：#97 复采脚本 04/05 跨会话漂移定位 + README 确定性声明措辞校正）。
  - #100–#104 勿领（D19 parked）；#99/#105 维持 needs-info（D20/D21）。

## 验证情况

- `npm run precheck` 本轮共跑通 4 次（含 2 次 pre-push 钩子复跑），全部 exit 0
  （typecheck / lint 0 错误 19 warnings 基线 / format:check / test 1160+1641 /
  count:check 2801 一致 / build:viz / bundle 首屏 67.1kB / check:publish / selfcheck 11 层全 PASS）。
- #114 定向：引擎 33 passed + 组合台 58 passed；#106 定向：ocr-mount @3210 exit 0。
- GitHub Actions CI 观察中（push @ `8d4996b`/`a3fcb08`/`bf09b04`）。

## 风险与注意事项

- #114：朝向固定 +y、盒区轴对齐（旋转随 #100）；B=0 时只留空盒（未夹取，与其他参数一致）。
- #106：零产品行为变更；DEVELOPMENT_GUIDE 无冒烟章节故只改脚本头（如下棒发现指南有新位置可补）。
- 本轮 pkill 停 vite dev server 时曾因命令串自匹配把自己也 SIGTERM（server 与 shell 同死，无残留；
  已验证 HTTP:000 + 无残留进程）。下棒如需停后台 server，用更窄的匹配串（如 `[v]ite --port 3210`）。
- 若未来涉及 Rust 模块开发，按用户指示请使用 `mise` 进行工具链安装与管理。

## 给下一棒的第一步建议

- 先读 #115 全文 + 其引用的 #97 验收证据（04/05 漂移的 md5/PIL 数据已在 issue 内），评估是否为“一次收尾能闭环”的量级；
  再按契约 1.5 领取（`ready-for-agent` → `in-progress`）。开工前创建 `.agent/LOCK`。
- 若 #115 需要多次复采（每次 headless 全量截图数分钟）且本轮预算紧张，宁可只做调查定位、结论写报告转 blocked/部分完成，
  不要赶工声称完成。

## 给 Planner 的信号

- **in-review 3**：#113（上棒）＋ #114（本棒）＋ #106（本棒）。
- **auto-discovered 0**：本轮未产生新 auto-discovered 单。
- **ready 剩余 1**：#115（截图确定性收尾）。#100–#104 parked、#99/#105 needs-info 均未动。
- **需要 Planner 介入**：验收 #113/#114/#106（#115 可在验收前并行执行）。
