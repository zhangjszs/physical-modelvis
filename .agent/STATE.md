# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261007`（**执行者·第十棒**）· 本轮 #77 完工转 in-review，待规划者验收
- 会话: 2026-10-07T07:24 本地开始
- 本轮代码 commit: `70405f0`（#77 粘贴题干自动建模，merge 后 main `deb8f91`）—— 分支 `agent/issue-77-analyzer-wiring` 已合回 main 推送并删除
- 脉络：#76 in-review 待验收 → 本棒接管过期锁恢复 #77 半成品并完工转 in-review，**待规划者验收关闭**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
运行中（issue 77 心跳已更新；#98 作业期间继续持有）。

## 当前活跃
- **#77 in-review**（problemAnalyzer 接线「粘贴题干」自动建模，`70405f0`/main `deb8f91`）。验收要点见
  issue 执行报告 comment（6027417763）：组件 14/14 + OCR 101/101 + precheck exit 0 + CI/Deploy success。
- 下一棒第一优先 = **#98**（msedge 通道参数化，方案 A，剩余 4 脚本）
  → M3 线 **#61 → #92 → #82 → #62–#66** → M4 #93–#97。

## 已完成（本棒全程，≤10 条）
- **#77** problemAnalyzer 孤儿模块接线（方案一）— OCRPanel 双入口 tab（📷 拍照识别 / 📝 粘贴题干）+
  analyzePhysicsProblem 纯前端建模 + 结果卡（场景/置信度/提取量/假设/警告）+ 低置信度 <0.5 可见提示 +
  「加载仿真」落库关面板；图片路径零行为变化。测试 +3（组件 14/14）；
  测试数 core 1119 / viz 1525 / total **2644**（count:sync 回写）。
  - 现场恢复：接管过期锁（原 owner 2026-10-06T17:00 后中断），工作树遗留方案一半成品 ~374 行，
    核对 API/store 依赖吻合后续做，修复 1 处 waitFor 冷加载超时缺陷（~1.1s > 默认 1s）。
- precheck exit 0；CI run 37547032363 @ `deb8f91` success；Deploy run 37547258590 success。

## 阻塞项 / 风险
- 无外部阻塞。#44 人类持有勿动；#76/#77 双双 in-review 待验收（in-review 积压 2）。
- **msedge 冒烟缺口**（#98）：verify-ocr-mount.cjs 等 4 个脚本硬编码 msedge 本环境仍跑不了；
  verify-qa-sweep.cjs 不受影响（QA_CHANNEL，默认 chromium）。
- **端口 3000 被本机其他项目占用**（weibo-sentiment-analysis，勿杀他人进程）；dev server 用
  `npx vite --port 5199 --strictPort`。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道（勿量到 grep）。
- **pkill 自杀陷阱**：模式用 `[x]` 转义；e2e 进程泄漏先查 3001/5199/9201/3021/3022。
- **代理限流是 app 实例级内存计数（10 req/min/IP）**：e2e 探活用 TCP connect 而非 HTTP 轮询
  （/health 也计入限流），多段验收各起独立代理实例（如 3021/3022）避免互挤配额——#76 轮踩过：
  `/health` 轮询 + 6 连发把单实例配额吃光，A3-A6 撞 429。
- **vite dev 端口（5199 等）不在代理 CORS 默认白名单**（3000/5173）：联调须给代理加
  `OCR_PROXY_CORS_ORIGINS=http://localhost:5199`，否则浏览器请求被 CORS 拦（面板显示不出错误原因）。
- **Anthropic 协议 system 是顶层字段**（OpenAI 兼容才是 messages[0].role=system）：断言上游请求时勿混。
- **analyzePhysicsProblem 首次调用要动态加载场景领域 chunk（实测 ~1.1s）**：组件测试 waitFor 需放宽
  超时（#77 已放宽至 5s），勿用默认 1000ms。
- 测试数真值 **core 1119 / viz 1525 / total 2644**（#77 后，count:sync 已回写）。
