# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-zcode-1791259346`（**执行者·第八棒**）· 本轮 #75 完工转 in-review，待规划者验收
- 会话: 2026-10-06T04:02Z ≈ 本地 12:02 → 进行中
- 本轮代码 commit: `349d21d` + `5c8b8c0` + `2d83afb`（#75 OCR 质量收口）—— 分支 `agent/issue-75-ocr-quality` 已合回 main 推送并删除
- 脉络：#74 in-review 待验收（未动）→ 本棒领取队首 #75 完工，**待规划者验收关闭**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
运行中（executor-zcode-1791259346，issue #75，收尾时释放）。

## 当前活跃
- **#75 in-review**（OCR 质量收口，`349d21d`/`5c8b8c0`/`2d83afb`）。验收要点见 issue 执行报告 comment。
- **#74 in-review**（上一棒完工，未动，继续待规划者验收）。
下一棒第一优先（两单验收后）= **#76**（举一反三 demo，blocked ← #74，验收 #74 后摘 blocked）
→ **#77**（problemAnalyzer 孤儿处置）→ M3 线 **#61**。

## 已完成（本棒全程，≤10 条）
- **#75** OCR 质量收口 — `349d21d`(fix 模式切换: appMode 提升 store) + `5c8b8c0`(组件 8 例 + HTTP 10 例 +
  ocr-proxy-app 工厂抽出) + `2d83afb`(巡检判定 13 OCR 面板) ✅ 完工待验收。
  组件测试含组合台模式切回教材模式回归（红向验证咬住 bug）；HTTP 层覆盖 400/429/502/504/成功 +
  /health + 启动期校验；巡检红绿双向实跑（红 4 ERROR exit 1 / 绿 0 问题 exit 0）；
  测试数 core 1119 / viz 1506 / total **2627→2625**（+18，count:sync 已回写；以 count:check 为准）。
- CI run 37414958345 @ `2d83afb` success；Deploy 37415110391 success。

## 阻塞项 / 风险
- 无外部阻塞。#44 人类持有勿动；工作树干净（分支合回后）。
- **msedge 冒烟缺口仍在**（#98）：verify-ocr-mount.cjs 等硬编码 msedge 的脚本本环境仍跑不了；
  但 **verify-qa-sweep.cjs 不受影响**（支持 QA_CHANNEL，默认 chromium）——本轮 OCR 判定即 chromium 实跑。
- **端口 3000 被本机其他项目占用**（weibo-sentiment-analysis，勿杀他人进程）；dev server 用
  `npx vite --port 5199 --strictPort`（QA_BASE 默认即 5199）。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`。
- **vitest jsdom 环境实测齐备**：`AbortSignal.timeout`/`fetch`/`FileReader`/`File`/`localStorage` 均可用
  （组件测试与 HTTP 测试都依赖，已实跑验证）。
- **管道退出码陷阱（本棒踩过）**：`node x.cjs | grep ...; echo $?` 量到的是 grep 的退出码——
  验证命令必须用 `${PIPESTATUS[0]}`（bash）或去掉管道取真实退出码，否则门禁红绿误判。
- **pkill 自杀陷阱**：模式用 `[x]` 转义（如 `vite --port 519[9]`）；后台残留先查 3001/5199/9201。
- **`<details>` 折叠时 innerText 不含隐藏内容**：面板探测需先 click summary 再断言文本。
- 测试数真值 **core 1119 / viz 1506 / total 2625**（#75 后，count:sync 已回写）。
