# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261007`（**执行者·第十棒**）· 本轮 #77/#98/#61 三单连做完工转 in-review，待规划者验收
- 会话: 2026-10-07T07:24 本地开始 → 08:15 收尾
- 本轮代码 commit: `70405f0`（#77）/ `5a01f2b`（#98）/ `1bf9ff6`（#61）；merge 后 main `deb8f91` / `8622dd8` / `ae15536`，三分支均已合回推送删除
- 脉络：#76 in-review（上棒遗留）→ 本棒接管过期锁恢复 #77 半成品完工 → #98 → M3 首单 #61 守卫落地，**in-review 积压 3（#76/#77/#98）+1（#61）待验收**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
已释放（本轮收尾，无运行中实例）。

## 当前活跃
- **#76 in-review**（上棒，举一反三 demo，main `e16f20b`）· **#77 in-review**（粘贴题干自动建模，
  main `deb8f91`，报告 comment 6027417763）· **#98 in-review**（冒烟脚本通道参数化，main `8622dd8`，
  报告 comment 6027619208）· **#61 in-review**（单一真源覆盖守卫，main `ae15536`，报告 comment 6027836226）
- 下一棒第一优先 = **#92**（M3 参数域边界静态门禁，#61 守卫已就位）→ **#82**（B1 charts 类型化，
  硬依赖 #61 产出的差集口径，已解锁）→ **#62–#66** 五批迁移（每迁一景从 EXEMPTION_TABLE 销名）→ M4 #93–#97。

## 已完成（本棒全程，≤10 条）
- **#77** problemAnalyzer 接线（方案一）— OCRPanel 双入口（📷 拍照识别 / 📝 粘贴题干）+
  analyzePhysicsProblem 纯前端建模 + 结果卡 + 低置信度 <0.5 提示 + 落库关面板；图片路径零行为变化。
  现场恢复：接管过期锁（原 owner 2026-10-06T17:00 后中断），工作树遗留方案一半成品 ~374 行续做，
  修复 1 处 waitFor 冷加载超时。测试 +3；`70405f0`/`deb8f91`。
- **#98** verify-*.cjs 冒烟脚本通道参数化（方案 A）— `SMOKE_BROWSER_CHANNEL` env（`??` 缺省 msedge
  兼容现状；置空 = Playwright 自带 chromium），4 脚本 + sweep 文档注释同步。
  红向（缺省 msedge not found 不变）+ 绿向（`SMOKE_BROWSER_CHANNEL=''` guidance-smoke 本机端到端 exit 0）。
  `5a01f2b`/`8622dd8`。
- **#61** 单一真源覆盖登记守卫 — 新增 `single-source-coverage.test.ts`（消费守卫：B-数值未消费集合
  == 豁免表 22 项；差集守卫：迁移表 Δ 契约表 == 7 项例外）+ self-check L11 数组化 + audit 文档指引。
  归一化口径（剥离解构行/判空行）精确复现 issue 22 项基线；红→绿反向验证在案。
  测试 +7；`1bf9ff6`/`ae15536`。
- 测试数 core 1119 / viz 1532 / total **2651**（count:sync 回写 ×2）。
- CI/Deploy：`deb8f91`（run 37547032363/37547258590）、`8622dd8`（37548225474/37548448460）、
  `ae15536`（37549740600/37549964943）全部 success。

## 阻塞项 / 风险
- 无外部阻塞。**in-review 积压 4（#76/#77/#98/#61）**——建议规划者优先验收，尤其 #61 是 #62–#66 的开工前提。
- #44 人类持有勿动。工作树干净（三分支合回后）。
- **端口 3000 被本机其他项目占用**（weibo-sentiment-analysis，勿杀他人进程）；dev server 用
  `npx vite --port 5199 --strictPort`。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道（勿量到 grep）。
- **pkill 自杀陷阱**：模式用 `[x]` 转义；e2e 进程泄漏先查 3001/5199/9201/3021/3022。
- **代理限流是 app 实例级内存计数（10 req/min/IP）**：e2e 探活用 TCP connect 而非 HTTP 轮询
  （/health 也计入限流），多段验收各起独立代理实例（如 3021/3022）避免互挤配额——#76 轮踩过。
- **vite dev 端口（5199 等）不在代理 CORS 默认白名单**（3000/5173）：联调须给代理加
  `OCR_PROXY_CORS_ORIGINS=http://localhost:5199`，否则浏览器请求被 CORS 拦。
- **Anthropic 协议 system 是顶层字段**（OpenAI 兼容才是 messages[0].role=system）：断言上游请求时勿混。
- **analyzePhysicsProblem 首次调用要动态加载场景领域 chunk（实测 ~1.1s）**：组件测试 waitFor 需放宽
  超时（#77 已放宽至 5s），勿用默认 1000ms。
- **冒烟脚本通道已参数化（#98）**：本机跑 verify-*.cjs 用 `SMOKE_BROWSER_CHANNEL=''`（自带 chromium）；
  缺省仍 msedge。但 verify-ocr-mount/3d-smoke/e1-render 的 BASE_URL 仍硬编码 3000（本机占用），
  仅 guidance-smoke 支持 BASE_URL env。
- 测试数真值 **core 1119 / viz 1532 / total 2651**（#61 后，count:sync 已回写）。
