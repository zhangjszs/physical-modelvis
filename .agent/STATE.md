# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-1010-1`（**执行者·第七棒**）· 本轮 #74 完工转 in-review，待规划者验收
- 会话: 2026-10-05T07:14Z ≈ 本地 15:14 → 进行中
- 本轮代码 commit: `ad7a1d5`（#74 OCR 代理多提供方扩展）—— 分支 `agent/issue-74-ocr-provider`，合回 main 后推送
- 脉络：十二次滚动（f5a3629）后队首 #74 → 本棒领取执行完工，**待规划者验收关闭**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
运行中（executor-1010-1，issue #74，收尾时释放）。

## 当前活跃
**#74 in-review**（OCR 多提供方扩展，`ad7a1d5`）。验收要点见 issue 执行报告 comment。
下一棒第一优先（验收后）= **#75**（OCR 质量收口：OCRPanel 组件测试 + HTTP 层测试 + 巡检覆盖 + 组合台模式切换修复）。

## 已完成（本棒全程，≤10 条）
- **#74** OCR 代理多提供方扩展 — `ad7a1d5` ✅ 完工待验收：VisionProvider 抽象（vision-providers.ts）+
  anthropic.ts 迁入（行为不变）+ openai-compatible.ts 新增；配置面 OCR_PROVIDER + 动态 `<PREFIX>_*` 槽位
  （DeepSeek 等一套适配器全覆盖）；/health 返回可用提供方；recognize 增 provider 字段 + meta 回落提示；
  前端提供方下拉 / placeholder 实际默认模型 / VITE_OCR_PROXY_URL 收口 / CORS env 追加；
  补 tsx devDependency（修复 server:dev 依赖缺失）；测试 +35（core 1119 / viz 1488 / total 2607）。
- **基础设施**：仓库缺 `in-progress`/`in-review` 生命周期标签，按契约 1.5 补建（gh label create）。

## 阻塞项 / 风险
- 无外部阻塞。#44 人类持有勿动；工作树干净（分支合回后）。
- **冒烟脚本环境限制**：`scripts/verify-ocr-mount.cjs` 及同族 verify-*.cjs 硬编码 `channel: 'msedge'`，
  本 WSL 环境 Linux 侧无 msedge → 原样脚本无法执行；已用同脚本 chromium 通道变体（.scratch）实跑通过。
  若后续需要常态化跑冒烟，需规划者决策（装 Linux Edge / 脚本通道可配置）。
- **端口 3000 被本机其他项目（weibo-sentiment-analysis）dev server 占用**——冒烟/联调时把自己的
  vite 固定 `--port 3200 --strictPort` 即可，勿杀他人进程。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`。
- **tsx 之前不在依赖里**：`server:dev` 引用 tsx 但 devDependencies 缺失（npx 临时下载才"能用"）；
  本棒已补进 visualization devDependencies。
- **playwright waitForFunction 签名**：`waitForFunction(fn, arg, options)`——options 传第二参会落空（默认 30s）。
- **`<details>` 折叠时 innerText 不含隐藏内容**：面板探测需先 click summary 再断言文本。
- **pkill 自杀陷阱**：`pkill -f "xxx.mjs"` 会匹配自身 bash 命令行杀死会话 shell，模式用 `[x]` 转义
  （如 `mock-upstream.[m]js`）；崩溃残留的后台 mock/proxy 会占端口导致下一轮诡异失败——异常退出后先查 9201/3001/3200。
- 测试数真值 **core 1119 / viz 1488 / total 2607**（#74 后，count:sync 已回写）。
