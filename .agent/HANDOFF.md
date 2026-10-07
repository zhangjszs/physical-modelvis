# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-07 · `executor-kerwin-20261007` · 执行者·第十棒）· #77/#98/#61 三单连做 · 全部完工转 in-review

### 本轮三件事（均已合回 main 推送，分支已删，执行报告在各自 issue comment）

1. **#77 problemAnalyzer 接线**（方案一，`70405f0` → main `deb8f91`，报告 comment 6027417763）
   - **现场恢复开局**：接管过期锁（原 owner `executor-kerwin-20261006`，2026-10-06T17:00 心跳后中断）；
     分支 `agent/issue-77-analyzer-wiring` 无 commit 但工作树遗留 ~374 行方案一半成品。核对半成品与
     problemAnalyzer API / store 依赖吻合后续做，非重写；修复 1 处测试时序缺陷（详见下）。
   - OCRPanel 双入口 tab（📷 拍照识别 / 📝 粘贴题干）→ 文本路径 `analyzePhysicsProblem` 纯前端建模
     → 结果卡（场景/置信度/提取量/假设/警告）→ 低置信度 <0.5 可见提示 →「加载仿真」落库关面板。
     图片路径零行为变化；两套场景映射（analyzer vs ocrUtils）**不合并**（避免触碰 #74/#75 已验收行为）。
   - 测试 +3（组件 14/14）；测试数 2641→**2644**。
2. **#98 冒烟脚本通道参数化**（方案 A，`5a01f2b` → main `8622dd8`，报告 comment 6027619208）
   - 4 个 verify-*.cjs 的 `channel: 'msedge'` 硬编码改 `SMOKE_BROWSER_CHANNEL` env：**用 `??` 而非
     issue 草图的 `||`**——显式置空 = Playwright 自带 chromium（否则本 Issue 目标环境永远跑不了），
     未设置 = msedge 兼容现状；sweep 的 QA_CHANNEL 文档注释同步。
   - 红向：缺省实跑仍 `msedge not found`（现状不变）；绿向：`SMOKE_BROWSER_CHANNEL='' ` +
     guidance-smoke @ 5199 端到端 exit 0（本机无 Edge Linux 首次原样跑通 verify-*.cjs）。
3. **#61 单一真源覆盖登记守卫**（M3 前置，`1bf9ff6` → main `ae15536`，报告 comment 6027836226）
   - 新增 `visualization/tests/accuracy/single-source-coverage.test.ts`：①消费守卫（B-数值未消费
     集合 == 豁免表 22 项，#62–#66 迁移销名用）；②差集守卫（迁移表 Δ 契约表 == 7 项例外）。
     self-check L11 数组化并入（层名/层数不变，25→32 cases）；audit 文档补指引。
   - **关键口径发现**：issue 背景节的朴素正则口径实跑只得 12 项（解构行/判空行字面引用导致漏报）；
     按 issue 证据语义取**归一化口径**（剥离解构行+判空行后匹配），探针精确复现 22 项。
     红→绿反向验证在案（删 thermistor → exit 1 打印 sceneId → 恢复 → 绿）。
   - 测试 +7；测试数 2644→**2651**。

### 验证（全部真实命令，退出码在案）

- 三单各跑 `npm run precheck` → **exit 0**（typecheck / lint 0 错 19 既有 warn / format /
  测试 2651 / count:check / build:viz / bundle / 自检 11 层 11 PASS）
- CI+Deploy：`deb8f91` / `8622dd8` / `ae15536` 三轮全部 **success**
- 测试数真值 core 1119 / viz 1532 / total **2651**（count:sync 已回写 README + docs/plan.md）

### 给下一棒

**第一优先 = #92**（M3 参数域边界静态门禁，ready）：#61 守卫已就位，#92 做完 #82 即可开工。
其后 **#82**（B1 charts 类型化，其差集守卫口径以 #61 产出为准）→ **#62–#66** 五批迁移
（每迁一景：改渲染消费引擎 → 从 `EXEMPTION_TABLE` 销名 → 补契约用例，两道断言自动把关）→ M4 #93–#97。
接棒时先查 #76（上棒遗留 in-review）是否已被规划者验收。

### 风险与注意事项

- **in-review 积压 4（#76/#77/#98/#61）**：#61 是 #62–#66 开工前提，建议 Planner 优先验收。
- **代理限流是 app 实例级内存计数（10 req/min/IP），/health 也计入**：e2e 探活用 TCP connect；
  多段验收各起独立代理实例（3021/3022）——#76 轮踩过 429。
- **vite dev 端口不在代理 CORS 默认白名单**：联调须 `OCR_PROXY_CORS_ORIGINS` 追加。
- **Anthropic 协议 system 是顶层字段**，OpenAI 兼容才是 messages[0].role=system。
- **analyzePhysicsProblem 首次调用动态加载场景 chunk ~1.1s**：组件测试 waitFor 勿用默认 1000ms
  （#77 已放宽 5s）。
- **#98 后冒烟脚本通道**：本机跑 `SMOKE_BROWSER_CHANNEL=''`；但 ocr-mount/3d-smoke/e1-render 的
  BASE_URL 仍硬编码 3000（本机被 weibo 项目占用勿杀），仅 guidance-smoke 支持 BASE_URL env。
  未来若挂 CI（Linux runner）记得显式置空通道。
- **#61 守卫已知局限**（测试文件头有注）：同文件 helper 间接消费会误登记「未消费」；函数体切片以
  下一个 export function 为界，draw 函数间插入读 charts 的非 export helper 会造成漏报——迁移批次时留意。
- 端口 3000 被占（勿杀）；dev server 用 5199 strictPort；e2e 泄漏进程查 5199/9201/3021/3022；
  pkill 模式 `[x]` 转义；管道退出码用 `${PIPESTATUS[0]}`。
- 测试数真值 core 1119 / viz 1532 / total 2651（#61 后）。

### 给 Planner 的信号

- **in-review 积压 4 待验收**：#76（上棒）+ 本棒 #77/#98/#61。各有完整验收标准核对清单与
  CI/Deploy 证据，#61 建议优先（M3 后续单的口径基础）。
- ready 队列：#92 → #82 → #62–#66 → M4 #93–#97，继续执行即可。
- 无新增决策事项。#98 报告里留了一个可选小单建议（3 个冒烟脚本 BASE_URL 参数化，~4 行），
  是否立单由 Planner 定。
