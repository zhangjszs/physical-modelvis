# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `zcode-exec-1003-6` · 执行者·第六棒）· #60 引擎单位记号收口 · 已正常收尾，待规划者验收

### 棒内一件事（#60，`fff307f` 已推送，CI/Deploy 绿，完工回写在 issue 评论 5968728226）

承接规划者十次滚动交接的队首单。D5/D5a 口径：统一到 Unicode + 门禁。

- **替换 29 处**（动工前 scripts 实测复核与 issue 快照一致）：'deg'→'°' 25 处（`ParameterSpec.unit` 13 + charts `xUnit`/`yUnit` 12，含 explanation 变量；10 个模型文件）、'um'→'μm' 4 处（diffraction-grating ×3 + hologram ×1）、渲染 HUD 1 处（solidLiquidScenes `` `${theta} deg` `` → `` `${theta} °` ``）。**'°C' 4 处按 D5 排除未动**；`description: '缝宽 a (um)'` 属说明文本不在四面口径，未动。
- **门禁**（各并入既有门禁文件 +1 it，count:sync 已回写 1119/1453/2572）：
  - 引擎面 `constants-single-source.test.ts`：`[Uu]nit: '(deg|um)'` 覆盖 unit/xUnit/yUnit/explanation；
  - 渲染面 `rendering-constants-single-source.test.ts`（L11 同族）：`'deg'|'um'` 整串或 `${x} deg|um` 窄模板；`const deg` 标识符不误伤（chapter7Scenes.ts:225 实测）。
- **验证**：双门禁红向（注入即红点名、还原即绿）；core 1119 / viz 1453 全绿；precheck 全链 + 自检 11/11；CI + Deploy 绿；全仓零残留。

### 给下一棒

**先等规划者验收 #60**（本轮规划者为用户会话；执行者按边界不自行关闭）。验收后下一棒第一优先 = **#68**（lint/format 门禁盲区收口：tests 与 scripts 纳入检查，PR #25 意图转内部，D8）。注意 #68 范围第 2 项「移除 eslint.config.mjs 的 scripts/** 全局 ignore、按文件类型给环境」可能踩到存量 warning（19 处 any 存量）——先摸底再动，勿把存量当新错「修」成门禁面扩大。

队列：#68 → #74 → #75 → #76 → #77 → #61 → #92 → #82 → #62–#66；#44 人类持有勿动。

## 阻塞项 / 风险

- 无外部阻塞。工作树干净；远程同步至 `fff307f`。
- **#92 执行警示**（规划者普查结论）：静态边界门禁必须用 `problem.model`（场景可能按参数动态切 model，如 collision 按 e 切 elastic/inelastic，用 `scene.model` 会假阳性）。

## 环境备注（继承 + 本轮新增）

- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server `node .scratch/kill-vite.cjs`；pkill 用 `vite.[p]review` 转义。
- Bash cwd 跨调用残留：命令一律绝对路径或开头 `cd <repo根> &&`；**node -e 内联脚本的 `$$` 会被 shell 展开**（探针落文件跑）。
- 改 `physics-core/src` 后跑可视化测试/typecheck 前必须 `npm run build:core`。
- **grep 大小写陷阱**：`xUnit`/`yUnit` 是 capital U，小写 `unit:` 模式统计会漏轴记号；全量字面量统计用精确串 `'deg'|'um'`。
- **红向验证的还原禁用 `git checkout`**：会误伤同文件既有改动（本棒 diffraction-grating 被回失一次）；用反向 sed 还原。
- 判读纪律：连续两次判读不确定 → 停止编辑交棒；优先信确定性工具（tsc/vitest/git）输出。
- 测试数真值 **core 1119 / viz 1453 / total 2572**（#60 后）；自检 11 层；巡检绿基线 `.scratch/qa-sweep-89-final.json`（ERROR 0/WARN 51/OK 72）。
