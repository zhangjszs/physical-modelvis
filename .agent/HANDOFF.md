# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-09 · `executor-deepseek-20261009b` · 执行者）· #95 → #96

### 本轮两件事（均已入 main 推送，报告在 issue，均 in-review 待验收）

1. **#95 3D 阴影贴图自适应分辨率**（feat `ba0bd6f` / Merge `b692154`）：
   新增 `shadowQuality.ts`（档位→{mapSize,radius} 预设 512²/1024²/2048²，hardwareConcurrency 分档，
   信号缺失→medium=M2.6 基线兜底）；`createEnvironment` 与 `CompositionStage` 两处固定 1024² 收口；
   dev-only `?shadowTier=` 覆盖 + `__physvisShadowQuality` 探针。17 单测；测试数 2736→2753。
   验证：precheck ×2 全绿 · 3d-smoke exit 0 · 分档 perf 探针三档持平 · 官方 qa-sweep 30 场景 exit 0 ·
   档位生效探针 + 像素 diff（同档噪声 1px vs 跨档 604–1314px）· 组合实验台冒烟零报错。
2. **#96 参数 default 落 step 网格门禁 + 61 处存量治理**（feat `f73f21a` / Merge `a0e01c4`）：
   L6 `parameter-ranges.test.ts` 既有 it 原地扩展（default 必须落 min+k·step 网格，容差 1e-6；
   step=0 连续可调参数须登记 —— 现有 1 处 `cavendish/torsionConst`）；27 场景文件 61 处 min/step 调整，
   **default 数值零变化**（diff 机器核对）；红向：注入 spring/k default=10.2 → 红点名 → 反向 sed 还原。
   治理中 13 处 min→0 被 #92 边界门禁拦截（引擎域下限>0），已改「网格上且≥引擎域」最小值。
   测试数零漂移（并入既有 it）；accuracy 906 · 全量 1616 绿；precheck 全绿。

## 已完成

- #95：阴影 mapSize 设备能力三档驱动 · `ba0bd6f`（merge `b692154`）· CI+Deploy success
- #96：default-on-grid 门禁 + 61 处治理 · `f73f21a`（merge `a0e01c4`）· 验证全绿

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中**。in-review 积压 **6**（#107 / #110 / #93 / #94 / #95 / #96）待 Planner 验收。
- 验收后队首 = **#97**（README 开源演示物料：playwright 一键截图脚本 + ≥6 张关键界面上 README，P3）
  → #109 → #106。

## 验证情况

- 两单均本地 precheck + pre-push 钩子双跑全绿；#95 CI+Deploy @ `b692154` success；
  #96 CI @ `a0e01c4` 本棒收尾时 in_progress（下一棒可复核）。
- 证据工具与原始输出在 `.scratch/`（gitignore，未提交）：#95 的 shadow-perf-probe / shadow-tier-verify /
  shadow-shot-diff / composition-smoke 四脚本 + JSON/截图；issue 评论已贴全量数据。
- 未跑：QA 全量巡检（123 场景）——两单均不涉及其场景集参数/读数路径，理由已写入各自 issue 报告。

## 风险与注意事项

- **#95**：high 档 2048²（16MB）未在低端真机验证；核数分界 4/8 为经验值，预设表集中于
  `SHADOW_QUALITY_PRESETS` 可单点调整。dev 探针/URL 通道仅 dev 构建存在。
- **#96**：8 处 min 归零扩大滑杆可达域（均在引擎域内、分子量或合法静态态）；登记表防 step=0 蔓延。
- 端口 3000 本棒临时占用（已停）；冒烟脚本用 `SMOKE_BROWSER_CHANNEL=''`（本机无 msedge）。

## 给下一棒的第一步建议

- 先查 in-review 是否已被 Planner 清（6 单）；然后按 PLAN 领 **#97**（README 演示物料：
  playwright 截图脚本建议落 `scripts/`（与 #106 的 BASE_URL 参数化协同，注意别越界做 #106 的活），
  截图 ≥6 张关键界面上 README；dev server 需临时起）。

## 给 Planner 的信号

- **in-review 积压 6**：#107 / #110 / #93 / #94 / #95 / #96（报告均含逐条验收核对与证据链）。
- 两单均无后续 Issue 需求；#95 的探针/URL 通道、#96 的门禁互补性留痕由 Planner 定。
- 本轮 auto-discovered 立单 0/3；无新增决策事项。
