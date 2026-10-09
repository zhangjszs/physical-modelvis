# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-09 · `executor-deepseek-20261009b` · 执行者）· #95

### 本轮一件事（已入 main 推送，报告在 issue，in-review 待验收）

**#95 3D 阴影贴图自适应分辨率**（feat `ba0bd6f` / Merge `b692154`）：

- 新增 `visualization/src/components/simulation3d/shadowQuality.ts`：档位→`{mapSize, radius}` 预设
  （低 512²/r1 · 中 1024²/r2 · 高 2048²/r4）；`detectShadowQualityTier` 按
  `navigator.hardwareConcurrency` 分档（≥8 high / 5–7 medium / ≤4 low，信号缺失→medium = M2.6 基线兜底）；
  radius 与 mapSize 等比例（three r185 PCF radius 以纹素计，世界空间模糊半径恒定）。
- `createEnvironment`（primitives.ts）与 `CompositionStage` 两处固定 1024² 硬编码收口到
  `applyShadowQuality`；shadow camera ±8 / bias / PCF 算法不动。
- dev-only：`?shadowTier=` URL 覆盖通道 + `window.__physvisShadowQuality` 探针（#81 同型模式，生产 tree-shake）。
- 新增 17 单测；测试数 2736→**2753**；precheck 全绿（本地 + pre-push 两遍）。
- 验证：3d-smoke exit 0（默认档 high）· 分档 perf 探针三档耗时/堆持平（max 766/748/682ms，堆 Δ1.81MB）·
  官方 qa-sweep 30 场景 exit 0（ERROR 0，WARN 5 均为播放计时类、与本单无关）· 档位生效探针三档报值全对 +
  像素 diff（同档噪声 1px vs 跨档 604–1314px 集中在舞台区）· 组合实验台冒烟零报错。

## 已完成

- #95：阴影 mapSize 固定 1024² 改设备能力三档驱动，M2.6 护栏不回退 · `ba0bd6f`（merge `b692154`）· 验证全绿

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中**。in-review 积压 **5**（#107 / #110 / #93 / #94 / #95）待 Planner 验收。
- 验收后队首 = **#96**（场景参数初值脱网格治理：61/571 处 default 吸附漂移 + default-on-grid 静态门禁，P3）
  → #97 → #109 → #106。若 Planner 据 #94 先立实施单，按新队列领。

## 验证情况

- #95：本地 precheck + pre-push 钩子 precheck 两遍全绿；CI @ `b692154` 本棒收尾时 in_progress，下一棒可复核。
- 分档证据工具与原始输出在 `.scratch/`（gitignore，未提交）：`shadow-perf-probe.cjs`、
  `shadow-tier-verify.cjs`、`shadow-shot-diff.cjs`、`composition-smoke.cjs` + 对应 JSON/截图；
  issue #95 评论已贴全量数据与结论。
- 未跑：QA 全量巡检（123 场景）——#95 不涉及其场景集参数/读数路径，理由已写入 issue 报告。

## 风险与注意事项

- **#95 high 档 2048²（16MB）未在低端真机验证**：本机 24 核工作站三档全绿；核数分界 4/8 为工程经验值，
  预设表集中于 `SHADOW_QUALITY_PRESETS` 可单点调整（如收到低端设备反馈）。
- **dev 探针与 URL 通道**：`window.__physvisShadowQuality` / `?shadowTier=` 仅 dev 构建存在
  （`import.meta.env.DEV` 守卫，生产 tree-shake）；QA 切档核验可复用。
- 端口 3000 本棒临时占用（已停）；冒烟脚本用 `SMOKE_BROWSER_CHANNEL=''`（本机无 msedge）。

## 给下一棒的第一步建议

- 先查 in-review 是否已被 Planner 清（5 单）；然后按 PLAN 领 **#96**。
  #96 要点：门禁**优先并入既有 `parameter-ranges.test.ts` 的 it**（免测试数漂移）；default 数值零变化、
  只动 min/step；红向还原**用反向 sed、禁用 `git checkout`**（#60 教训）；每处改动在执行报告列清单。

## 给 Planner 的信号

- **in-review 积压 5**：#107 / #110 / #93 / #94 / #95（报告均含逐条验收核对与证据链）。
- **#95 无后续 Issue 需求**；shadow camera ±8 自适应被 issue 明确排除（如需另立单）。
  探针/URL 通道是否在 AGENTS.md / docs 留痕由 Planner 定。
- 本轮 auto-discovered 立单 0/3；无新增决策事项。
