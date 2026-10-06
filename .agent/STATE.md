# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261006`（**执行者·第九棒**）· 本轮 #76 完工转 in-review，待规划者验收
- 会话: 2026-10-06T08:20Z ≈ 本地 16:20 → 17:00 收尾
- 本轮代码 commit: `08890ab`（#76 举一反三 demo，merge 后 main `e16f20b`）—— 分支 `agent/issue-76-variant-demo` 已合回 main 推送并删除
- 脉络：#74/#75 已由规划者验收关闭（十三次滚动）→ 本棒领取队首 #76 完工转 in-review，**待规划者验收关闭**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
已释放（本轮收尾，无运行中实例）。

## 当前活跃
- **#76 in-review**（举一反三 demo，`08890ab`/main `e16f20b`）。验收要点见 issue 执行报告 comment
  （6012863184）：e2e 16/16 + precheck exit 0 + CI/Deploy success。
- 下一棒第一优先 = **#77**（problemAnalyzer 孤儿模块处置，无硬依赖，直接可领）
  → **#98**（msedge 通道参数化）→ M3 线 **#61 → #92 → #82 → #62–#66** → M4 #93–#97。

## 已完成（本棒全程，≤10 条）
- **#76** 「举一反三」demo — `POST /api/problems/generate`（归一化/路由/限流全复用）+
  `VisionProvider.buildTextRequest` 纯文本变体 + `GENERATE_SYSTEM_PROMPT` 提示词真源 +
  OCRPanel 变式区块（tab/加载仿真/清空时机）+ 生成中禁识别按钮防竞态 ✅ 完工待验收。
  测试 +17（HTTP 8 / 适配器 6 / 组件 3）；测试数 core 1119 / viz 1522 / total **2641**（count:sync 回写）。
- e2e `.scratch/e2e-76.mjs`（mock 上游 + 真实代理 + vite + chromium）16/16 pass exit 0；
  precheck exit 0；CI run 37439115970 @ `e16f20b` success；Deploy success。

## 阻塞项 / 风险
- 无外部阻塞。#44 人类持有勿动；工作树干净（分支合回后）。
- **msedge 冒烟缺口仍在**（#98）：verify-ocr-mount.cjs 等硬编码 msedge 的脚本本环境仍跑不了；
  verify-qa-sweep.cjs 不受影响（QA_CHANNEL，默认 chromium）——本轮 e2e 即 chromium 直跑。
- **端口 3000 被本机其他项目占用**（weibo-sentiment-analysis，勿杀他人进程）；dev server 用
  `npx vite --port 5199 --strictPort`。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道（勿量到 grep）。
- **pkill 自杀陷阱**：模式用 `[x]` 转义；e2e 进程泄漏先查 3001/5199/9201/3021/3022。
- **代理限流是 app 实例级内存计数（10 req/min/IP）**：e2e 探活用 TCP connect 而非 HTTP 轮询
  （/health 也计入限流），多段验收各起独立代理实例（如 3021/3022）避免互挤配额——本轮踩过：
  `/health` 轮询 + 6 连发把单实例配额吃光，A3-A6 撞 429。
- **vite dev 端口（5199 等）不在代理 CORS 默认白名单**（3000/5173）：联调须给代理加
  `OCR_PROXY_CORS_ORIGINS=http://localhost:5199`，否则浏览器请求被 CORS 拦（面板显示不出错误原因）。
- **Anthropic 协议 system 是顶层字段**（OpenAI 兼容才是 messages[0].role=system）：断言上游请求时勿混。
- 测试数真值 **core 1119 / viz 1522 / total 2641**（#76 后，count:sync 已回写）。
