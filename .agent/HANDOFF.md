# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-05 · `executor-1010-1` · 执行者·第七棒）· #74 OCR 多提供方扩展 · 已完工转 in-review

### 棒内一件事（#74，`ad7a1d5` 已合回 main 推送，完工回写在 issue 执行报告 comment）

承接十二次滚动交接的队首单（M2.5 OCR 功能线首项）。

- **Server 侧**：新增 `server/vision-providers.ts`（VisionProvider 接口 + 提示词单一真源 +
  `resolveProviderConfigs` env 解析纯函数）；`providers/anthropic.ts`（原逻辑迁入，行为不变）+
  `providers/openai-compatible.ts`（`{baseURL}/chat/completions` + Bearer + image_url dataURL，
  一套覆盖 DeepSeek/Qwen/GLM/Moonshot/SiliconFlow/OpenRouter/Gemini 兼容端点）。
  提供方发现：内置 anthropic/openai 槽位 + 动态 `<PREFIX>_API_KEY|_AUTH_TOKEN(+_BASE_URL)` 槽位
  （id=前缀小写）；`OCR_PROVIDER` 显式指定优先，缺省 anthropic → 首个可用回落（启动日志明示）；
  白名单按 `<PREFIX>_ALLOWED_MODELS` 各自生效（anthropic 兼容旧 `OCR_PROXY_ALLOWED_MODELS`）。
- **接口**：`/api/ocr/recognize` 接受可选 `provider`（未知 400）；响应增 `meta{provider, model,
  requestedModel, modelFallback}`；`/health` 返回 `defaultProvider + providers[]`。
- **前端**：设置区提供方下拉（/health 驱动 + localStorage 记忆 + 失效回退）；placeholder 显示所选
  提供方实际默认模型（消灭 'gpt-4o (默认)' 误导）；回落状态区可见提示；`OCR_PROXY_URL` 收口至
  `VITE_OCR_PROXY_URL`；CORS 支持 `OCR_PROXY_CORS_ORIGINS` 追加。
- **顺带修复（范围内）**：`tsx` 补进 visualization devDependencies——`server:dev` 脚本一直引用它
  但依赖从未声明（验收标准 1「启动代理」需要可复现的启动方式）。

### 验证（全部真实命令，退出码在案）

- `npm run precheck` → exit 0（typecheck/lint 0 错 19 既有 warn/format/sweep/测试/count:check/build:viz/bundle/自检 11 层全绿）
- OCR 单测 64 例全绿（新增 35，存量 29 例零回退）；测试数 count:sync 回写 core 1119 / viz 1488 / total 2607
- 真实 e2e（`.scratch/e2e-74.mjs` + mock 上游，真进程真 fetch）**30/30**：双协议路由、白名单回落 meta、
  未知 provider 400、401/429→502、慢上游→504、CORS env 追加、上游请求构造核验（Bearer/x-api-key/dataURL/base64 块/系统提示词）、
  启动期无 token 与 OCR_PROVIDER 不可用的 exit 1 行为
- UI×代理联动探针（`.scratch/ui-probe-74.cjs`）**5/5**：下拉渲染、placeholder 随提供方切换、
  真实识别走 deepseek 上游、状态区回落提示「模型 gpt-99 不在白名单，已回落默认 deepseek-chat」
- 冒烟 `verify-ocr-mount.cjs`：**原样脚本本环境未执行**（硬编码 msedge 通道，Linux 侧无 Edge——见风险）；
  同脚本 chromium 变体实跑通过（挂载/打开/关闭零 console error）

### 给下一棒

**先等规划者验收 #74**。验收后第一优先 = **#75**（OCR 质量收口：OCRPanel 组件测试 + 代理 HTTP 层测试 +
巡检覆盖 + 组合台模式切换修复）——#74 已把 provider 路由/meta 收口进 server，#75 的组件测试可直接复用
`tests/ocr/` 既有模式；注意 OCRPanel 现有 provider 下拉/placeholder/回落提示三块 UI 尚无组件测试（正是 #75 的活）。

队列：#75 → #76 → #77 → #61 → #92 → #82 → #62–#66 → #93–#97；#44 人类持有勿动。

### 风险与注意事项

- **msedge 冒烟缺口**：verify-*.cjs 全族硬编码 `channel:'msedge'`，本 WSL Linux 侧无 Edge → 全族冒烟
  都无法原样执行（不止 OCR）。需规划者决策：Linux 装 Edge / 脚本通道参数化 / 接受 chromium 变体口径。
- **端口 3000 被本机其他项目占用**（weibo-sentiment-analysis 的 dev server，用户自己的进程勿杀）；
  本仓 dev server 联调用 `npx vite --port 3200 --strictPort`。
- **后台进程残留陷阱**：本轮 e2e 脚本两次崩溃留下旧 mock 占 9201，导致后续运行诡异失败（新 mock 绑不上，
  请求打到旧代码 mock）。异常退出后先 `pgrep -fa "mock-upstream.[m]js|ocr-proxy|vite --port"` 清场。
- pkill 模式务必 `[x]` 转义（`pkill -f "mock-upstream.[m]js"`），否则匹配自身命令行杀死会话 shell。
- playwright `waitForFunction(fn, arg, options)` 签名——options 误传第二参则超时落默认 30s。
- `<details>` 折叠时 innerText 不含隐藏内容，面板文本断言先点开 summary。

### 给 Planner 的信号

- #74 完工待验收（in-review）。验收时可用 `.agent/HANDOFF` 中 e2e/UI 探针的复现命令，
  或直接按 issue 执行报告的「验收标准核对」逐条核。
- 需要决策（非阻塞）：冒烟脚本 msedge 通道在本环境的常态化方案（见上）。
- ready 队列尚余 16 单，继续执行即可。
