# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `zcode-exec-1003-6`（**执行者·第六棒**）· **本轮已正常收尾，锁已释放**
- 会话: 2026-10-03T11:1xZ ≈ 本地 19:1x → 收尾 ~19:5x（承接规划者十次滚动交接）
- 本轮代码 commit: `fff307f`（#60 引擎单位记号 Unicode 收口）—— 已推送，CI/Deploy 绿
- 脉络：规划者十次滚动（cc0eb86）交接「下一棒从 #60 开工」→ 本棒执行 #60 完工，**待规划者验收关闭**（本轮规划者为用户会话，执行者不自行关闭）。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者（用户本轮亲任，现至 D16 + 十次滚动）；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
无（本轮已释放）。

## 当前活跃
无活跃任务。**#60 已完工回写，等规划者验收**。下一棒第一优先（验收后）= **#68**（lint/format 门禁盲区收口，M2 尾巴第 2 项）。

## 已完成（本棒全程，≤10 条）
- **#60** 引擎单位记号 Unicode 收口 — `fff307f` ✅ 完工待验收：29 处替换（'deg'→'°' 25 / 'um'→'μm' 4，10 个模型文件 + 渲染 HUD 1 处）；'°C' 4 处按 D5 排除；双包防回潮门禁各 +1 it（引擎 constants-single-source / 渲染 rendering-constants-single-source，L11 同族）；双门禁红向验证（注入即红、还原即绿）；precheck 全绿；count:sync 回写（core 1119 / viz 1453 / total 2572）。

## 阻塞项 / 风险
- 无外部阻塞。#44 人类持有勿动；自检 11 层；工作树干净；远程同步至 `fff307f`。
- 规划者已立 **#92**（静态边界门禁 + 3 处 #91 同类失配修复，排 #61 后 #82 前），执行时注意 issue 内的 collision 假阳性警示（门禁须校验 `problem.model` 而非 `scene.model`）。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server 用 `node .scratch/kill-vite.cjs`。
- 改 `physics-core/src` 后：可视化测试/typecheck 前必须 `npm run build:core`（dist 新鲜度守卫会拦）。
- **grep 大小写陷阱**：`xUnit`/`yUnit` 是 capital U——统计 `unit: 'deg'` 类字样时小写模式会漏计轴记号；做全量字面量统计用 `'deg'|'um'` 精确串。
- **git checkout 还原注入验证后会误伤同文件既有改动**（本棒实测：diffraction-grating 的 #60 替换被首次注入失败的 checkout 回失，重做一遍）——红向验证的「还原」步改用反向 sed，勿用 checkout。
- 测试数真值 **core 1119 / viz 1453 / total 2572**（#60 后，count:sync 已回写）。
- 巡检绿基线 JSON：`.scratch/qa-sweep-89-final.json`（ERROR 0/WARN 51/OK 72）。
