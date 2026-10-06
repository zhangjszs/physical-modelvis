# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-06 · `executor-zcode-1791259346` · 执行者·第八棒）· #75 OCR 质量收口 · 已完工转 in-review

### 棒内一件事（#75，`349d21d` + `5c8b8c0` + `2d83afb` 已合回 main 推送，完工回写在 issue 执行报告 comment）

承接队列队首（M2.5 OCR 线第二项）；#74 in-review 待验收，本轮未动。

1. **模式切换修复**（`349d21d`）：顶层模式原是 App.tsx 局部 useState——提升为
   `simulationStore.appMode` + `setAppMode`；`OCRPanel.loadIntoSimulation` 增加
   `setAppMode('scenes')`（幂等）。组合台 → OCR → 加载仿真 → 应用切回教材模式。
2. **组件测试 8 例**（`5c8b8c0`）：testing-library + 真实 store/FileReader，仅 mock fetch；
   覆盖打开/关闭、非图片、超 10MB、识别成功/失败、多题 tab、加载仿真落库 + appMode 切回
   （回归测试红向验证：撤修复行即 `expected 'composition-lab' to be 'scenes'`）。
3. **HTTP 层测试 10 例**（`5c8b8c0`）：**支撑重构** = `server/ocr-proxy.ts` 顶层副作用
   （listen/exit 1）抽出为 `server/ocr-proxy-app.ts` 的 `createOcrProxyApp(env)` 工厂
   （行为/日志文案不变），HTTP 层进程内隔离测试（每测试独立 app → 限流计数器隔离）；
   本地 node:http mock 上游；覆盖 400×3 / 429 / 502×2 / 504 / 成功归一化+meta 回落 /
   /health / 启动期校验×2。真进程冒烟：无凭证 exit 1、有凭证 /health+400 正常。
4. **巡检判定 13**（`2d83afb`）：`verify-qa-sweep.cjs` 新增 OCR 面板判定（入口→打开 5s 有界→
   关闭→本段零 console/pageerror，滤 3001 健康探测噪音）；`QA_SKIP_OCR` 跳过；报告 JSON 增
   `ocr` 段；ERROR 入退出码；面板崩溃转结构化 ERROR 不挂死。**红绿双向实跑**：
   探针注入 ReferenceError → 4 ERROR exit 1；还原 → 0 问题 exit 0
   （`.scratch/qa-sweep-75-ocr-{red,green}.json`）。

### 验证（全部真实命令，退出码在案）

- `npm run precheck` → exit 0（typecheck / lint 0 错 19 既有 warn / format / sweep / 测试 2625 /
  count:check / build:viz / bundle / 自检 11 层全 PASS）
- 组件测试 8/8 绿；HTTP 测试 10/10 绿；测试数 count:sync 回写 **core 1119 / viz 1506 / total 2625**
- CI run 37414958345 @ `2d83afb` → **success**；Deploy 37415110391 → **success**
- 巡检实跑注意：本环境 chromium（QA_CHANNEL 默认空）直接可跑，verify-qa-sweep.cjs **不受 #98 msedge 缺口影响**

### 给下一棒

**先等规划者验收 #74 与 #75**（双双 in-review，执行报告在各自 issue comment）。
验收后第一优先 = **#76**（举一反三 demo，`blocked ← #74`，#74 验收后摘 blocked）——
`/api/problems/generate` + 题卡按钮 → 变式题加载仿真；#75 已把 OCR 面板测出组件测试底盘，
#76 的前端链路可直接参照 `tests/ocr/ocr-panel.test.tsx` 的 store 断言模式。
其后 #77 → M3 线 #61 → #92 → #82 → #62–#66 → #93–#97。

### 风险与注意事项

- **管道退出码陷阱（本棒踩过，勿再踩）**：`node x.cjs | grep ...; echo $?` 量到的是 grep 的退出码——
  验证门禁红绿必须 `${PIPESTATUS[0]}` 或去管道取真实退出码。
- 巡检 OCR 判定两处设计约束：①判定段 console/pageerror 归集在打开成功与失败**两支**都要做
  （面板崩溃时 React 卸载整树，页面全空）；②汇总行标签按 `ocr` 状态区分「入口缺失」与「打开失败」。
- **端口 3000 被本机其他项目占用**（用户自己的进程勿杀）；dev server 用 `npx vite --port 5199 --strictPort`
  （QA_BASE 默认 5199）。后台残留先查 3001/5199/9201；pkill 模式 `[x]` 转义。
- msedge 冒烟缺口（#98）仍在：verify-ocr-mount.cjs 等硬编码 msedge 的脚本本环境跑不了；
  若要跑 verify-ocr-mount 类单脚本，用 chromium 通道变体（见 .agent/STATE 环境备注）。
- `<details>` 折叠时 innerText 不含隐藏内容；playwright `waitForFunction(fn, arg, options)` 签名。

### 给 Planner 的信号

- **#74 与 #75 双双 in-review 待验收**。#75 验收可直接按 issue 执行报告「验收标准核对」逐条核，
  红绿证据与复现命令均在案。
- ready 队列尚余 15 单（#76 摘 blocked 后、#77、#61、#92、#82、#62–#66、#93–#97），继续执行即可。
- 无新增决策事项；#98（msedge 冒烟缺口）维持既有待决策状态。
