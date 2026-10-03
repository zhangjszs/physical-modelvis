# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `zcode-exec-1003-5` · 执行者·第五棒，规划会话连任执行）· #89 → #91（auto-discovered）→ #90 · 已正常收尾

### 棒内三件事（全部完成、验证、推送、回写 issue 并经规划者验收关闭）

**1. #89 巡检判据扩展**（`ecb7bb0`，scripts/verify-qa-sweep.cjs +311/-8）：
- **抽屉覆盖**：每场景打开「数据/图像」懒加载抽屉 → 0 console error + 无 ErrorBoundary 粘滞（兜底文案扫描）→ 关闭。修 #78 盲区。
- **交互后一致性**（抽样 12/123）：A·改参数→诊断读数**往返**随动（前 3 参数 × 边界/中值多候选；不响应=卡死，还原不归位=#88 滞后签名）；B·拖时间轴→时间读数随动（滑块离位 + 读数一致双校验；totalDuration=0 场景 SKIP，对齐 #86 设计文档 48 场景分层）。
- **顺带修复存量 bug**：setSlider 的 evaluate payload 键名 `index` vs 解构 `idx` 不匹配 → 恒返 false → 巡检第 7 项（参数边界）和第 8 项（时间轴拖尾）自脚本诞生起从未真正执行（历史 5 份 sweep 报告零边界类发现佐证）。修复后基线全量零新增发现。
- 验证：红（注入 #88 类滞后，模块级旧参数快照）→ exit 1 且判定点名「还原后读数未归位」；绿 → exit 0。全量：抽屉 123/123 零问题，ERROR 0/WARN 51/OK 72，时长 20m27→23m49（+16.5%<20%）。precheck + CI + Deploy 全绿。

**2. #91 赫兹场景 bug 修复**（`4d9803f`，#89 全量分诊 auto-discovered）：
- 根链：场景 frequency `value:100` 不在 step=0.5 的步进网格（0.01+0.5k）→ 浏览器吸附 100.01MHz=1.0001e8Hz > 引擎上界 1e8 → 任何交互后 `ParameterOutOfRangeError` 横幅常驻、结果永不更新；且 max 300MHz 本身超引擎域。
- 修法：`max` 300→100、`step` 0.5→0.01（网格含默认值）。修复后探针 + #89 判定 A 双验证通过。

**3. #90 收尾**（`187696a`）：
- 必修：#80 的 `heapMB` NaN 采样曾让 `heapBreach/timeBreaches` 双双 false → exit 0 静默放行。现 `heapSampleOk/timeSampleOk` 显式判定 → `perfErrors「性能采样异常…拒绝放行」` → exit 1；`getMetrics` 抛出改为返回 NaN 走统一判定（不再脚本崩溃）；自检钩子 `QA_INJECT_PERF_NAN=1`（红 exit 1/绿 exit 0）。
- 顺带：`expandDetails`/`clickScene` 共享函数消 5 处逐字复制（重构后全量与基线逐项一致）；projectile `simEnd→sampleEnd` + 防退化取舍注释固化。

### M2.7 收官

#83/#84/#85/#86/#89/#90 全部 CLOSED（连同 #91）。**可执行队列下一位 = #60**。

---

## 下一棒第一优先：**#60（引擎单位记号 split 收口 + 门禁）**

1. `gh issue view 60` 读验收标准（D5/D5a 口径：'deg'→'°' 13 处 unit + 12 处 xUnit/yUnit + explanation 若干、'um'→'μm' 4 处、渲染 1 处 + 门禁 + '°C' 4 处排除）。
2. issue 正文有 file:line 级实测口径表（2026-10-02 main@93b846f 实测，动工前建议复核计数——本棒两次遇到「规划者计数与代码现实不符」，以脚本实证为准）。
3. 完成后按队列续作：#68 → #74–#77 → #61 → #82 → #62–#66；#86 实施单（sweeps 通道）待规划者依设计文档另立。

## 队列

**#60 → #68 → #74 → #75 → #76 → #77 → #61 → #82 → #62–#66**；#44 人类持有勿动。

## 阻塞项 / 风险

- 无外部阻塞。工作树干净；远程同步至 `187696a`。
- **巡检边界段盲区（未立单）**：边界段每参数只 scanText 不 scanBanners——「边界值触发引擎错误横幅」类问题 interaction 判定撞见过、边界段看不见（#91 即此类）。是否补 scanBanners 由规划者摸底后决定。
- WSL2 vite HMR 会漏文件变更：改 visualization/src 后巡检行为不符预期时，先重启 dev server 再怀疑代码。
- range 输入的 step 吸附：写「还原参数」类断言前，先确认默认值在步进网格上（#91 教训）。

## 环境备注（继承，仍有效）

- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server `node .scratch/kill-vite.cjs`；pkill 用 `vite.[p]review` 转义。
- Bash cwd 跨调用残留：命令一律绝对路径或开头 `cd <repo根> &&`；**node -e 内联脚本的 `$$` 会被 shell 展开**（探针落文件跑）。
- 判读纪律：连续两次判读不确定 → 停止编辑交棒；优先信确定性工具（tsc/vitest/git）输出。
- headless chromium 可用；跑巡检不编辑 src；改 physics-core/src 后 prettier 需 build:core。
- 探针在 `.scratch/`：`probe-79-render.cjs`、`probe-81-context.cjs`、`probe-85-guards.cjs`（红条+参数随动通用巡检）、
  `probe-89-timeline.cjs`（setSlider 机制排查）、`probe-89-hertz3.cjs`（参数域分诊序列）。
- 自检 11 层；测试数真值 **core 1118 / viz 1452 / total 2570**；巡检绿基线 JSON：`.scratch/qa-sweep-89-final.json`（ERROR 0/WARN 51/OK 72）。
