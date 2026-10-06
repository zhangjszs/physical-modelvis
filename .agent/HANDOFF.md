# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-06 · `executor-kerwin-20261006` · 执行者·第九棒）· #76 举一反三 demo · 已完工转 in-review

### 棒内一件事（#76，`08890ab` 已合回 main（merge 后 `e16f20b`）推送，执行报告在 issue comment 6012863184）

承接队列队首（M2.5 OCR 线第三项）；#74/#75 已由规划者验收关闭（PLAN 十三次滚动），本轮未动。

1. **服务端**：`POST /api/problems/generate`——problem 对象必填、count 缺省 3/整数 1-5（越界 400）、
   `stripJsonFence` + `normalizeRecognizeResult` 全量复用、上游超额 `slice(0, count)` 硬截断、
   归一化为空 502；响应 `{result, meta}` 与 recognize 同构。
2. **provider 抽象**：`VisionProvider` 新增 `buildTextRequest`（anthropic/openai-compatible 各实现，
   max_tokens 4000）；`GENERATE_SYSTEM_PROMPT` + `buildGenerateUserText` 提示词单一真源。
   图片路径零改动。
3. **共用路径抽取**（`ocr-proxy-app.ts`）：`routeProvider` / `respondWithProblems` / `callUpstream`——
   recognize 改走同一实现，既有 HTTP 10 例全绿回归，行为不变。
4. **前端**（`OCRPanel.tsx`）：题卡「✨ 举一反三」按钮 → loading → 变式独立区块（独立 ocr-nav，
   aria-label=变式题导航）→ 变式「加载仿真」复用 `loadProblemIntoSimulation`（appMode 切回 +
   setScene/setParameter + 关面板）；切主 tab/重识别/换图清空变式；生成中禁用「识别题目」防竞态。

### 验证（全部真实命令，退出码在案）

- `npm run precheck` → **exit 0**（typecheck / lint 0 错 19 既有 warn / format / 测试 2641 /
  count:check / build:viz / bundle / 自检 11 层 11 PASS）
- 测试数：core 1119 / viz **1522** / total **2641**（+16，count:sync 已回写 README + docs/plan.md）
- `npx vitest run tests/ocr/` → **98/98**（HTTP +8 / 适配器 +6 / 组件 +3）
- e2e `.scratch/e2e-76.mjs`（mock 上游 + tsx 真实代理 ×2 + vite 5199 + chromium）→ **16/16 pass, exit 0**：
  HTTP 段 9（curl 等价：schema/截断/默认 3/400 族）+ 浏览器段 7（识别→举一反三→变式 tab→
  加载仿真→目录高亮抛体运动 + v0=6 落库，零真实 console error）
- CI run 37439115970 @ `e16f20b` → **success**；Deploy → **success**

### 给下一棒

**第一优先 = #77**（problemAnalyzer 孤儿模块处置，无硬依赖）：先查 `problemAnalyzer` 现状与引用面，
按 Issue 口径二选一——接线「粘贴题干→自动建模」（含测试）或删除/归档注明。注意其决策空间：
若接线涉及产品形态取舍（放哪个入口），按执行者歧义处理原则选风险最小方案并在报告「歧义处理」说明。
其后 #98（msedge 通道参数化）→ M3 #61 → #92 → #82 → #62–#66 → M4 #93–#97。

### 风险与注意事项

- **代理限流是 app 实例级内存计数（10 req/min/IP），/health 也计入**：e2e 探活用 TCP connect
  而非 HTTP 轮询；多段验收各起独立代理实例（本轮 3021/3022）——否则配额被探活吃光撞 429（本轮踩过）。
- **vite dev 端口不在代理 CORS 默认白名单**（3000/5173）：联调须 `OCR_PROXY_CORS_ORIGINS` 追加，
  否则浏览器侧静默失败且面板无错误提示（本轮踩过，靠诊断输出定位）。
- **Anthropic 协议 system 是顶层字段**，OpenAI 兼容才是 `messages[0].role=system`——断言上游请求勿混
  （本轮组件测试曾写错被 vitest 咬住）。
- 端口 3000 被本机其他项目占用（勿杀）；dev server 用 5199 strictPort；e2e 泄漏进程查
  5199/9201/3021/3022；pkill 模式 `[x]` 转义；管道退出码用 `${PIPESTATUS[0]}`。
- msedge 冒烟缺口（#98）仍在：verify-ocr-mount 类脚本本环境跑不了；verify-qa-sweep.cjs 不受影响。
- 测试数真值 core 1119 / viz 1522 / total 2641（#76 后）。

### 给 Planner 的信号

- **#76 in-review 待验收**：按 issue 执行报告「验收标准核对」逐条核，e2e 16/16 与 precheck 证据在案，
  复现脚本 `.scratch/e2e-76.mjs`（本机跑，不入库）。
- ready 队列 #77 → #98 → M3（#61/#92/#82/#62–#66）→ M4（#93–#97），继续执行即可。
- 无新增决策事项；两条 e2e 流程备忘已写入 STATE 环境备注（限流实例级/CORS 白名单），供后续棒复用。
