# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `zcode-exec-1003-5`（**执行者·第五棒**，规划会话连任执行）· **本轮已正常收尾，锁已释放**
- 会话: 2026-10-03T06:0xZ ≈ 本地 14:0x → 收尾 ~18:30（跨规划/执行两阶段）
- 本轮代码 commit: `4d9803f`（#91 赫兹场景）/ `ecb7bb0`（#89 巡检判据扩展）/ `187696a`（#90 NaN 堵洞+重构）—— 均已推送
- 本轮关闭 issue: **#89 / #90 / #91**（#91 为 #89 执行中 auto-discovered：赫兹场景频率域超引擎域，真 bug，已修）
- 脉络：用户「那就开始吧」指令下从队首 #89 连续作业，#89 全量基线暴露 6 ERROR → 分诊（5 误报修判据/1 真 bug 立 #91 并修复）→ #90 收尾 M2.7。**M2.7 六单 + #91 全部 CLOSED**。

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者（现至 D15+）；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
无（本轮已释放）。

## 当前活跃
无。**下一棒第一优先：#60（引擎单位记号 split 收口 + 门禁）**——M2 尾巴第 1 项，P2 小项，
定义完备（issue 正文有实测口径表），#67 CLOSED 后无阻塞。

## 已完成（本棒全程，≤10 条）
- **#89** 巡检判据扩展（抽屉覆盖 + 交互后一致性）— `ecb7bb0` ✅。红绿闭环（注入 #88 类滞后→exit 1 点名）；
  全量 123 抽屉 0 粘滞 0 console 错误；时长 +16.5%<20%；顺带修复存量 setSlider 键名 bug（边界检查空转事故）。
- **#91**（auto-discovered，P2）赫兹场景频率域 300MHz 超引擎 100MHz + 默认值不在步进网格 — `4d9803f` ✅。
  根链：吸附 100.01MHz=1.0001e8Hz 超引擎上界 → 错误横幅常驻 → 全参数重算失败（#89 判定实测撞见）。
- **#90** #80 NaN 静默放行堵洞 + perfVisit 提取 + projectile 边界注释 — `187696a` ✅。
  自检钩子 QA_INJECT_PERF_NAN 红 exit 1/绿 exit 0；重构后全量与基线逐项一致（ERROR 0/WARN 51/OK 72）。

## 阻塞项 / 风险
- 无外部阻塞。#44 人类持有勿动；自检 11 层；工作树干净；远程同步至 `187696a` + 两次 chore。
- **后续观察（未立单，留给规划者）**：巡检边界段每参数边界只做文本扫描、不扫错误提示条——#91 这类
  「边界值触发引擎错误横幅」的问题 interaction 判定撞见过、边界段反而看不见。是否补 scanBanners 需先摸底
  存量噪声，由规划者决定立单。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server 用 `node .scratch/kill-vite.cjs`；**pkill 模式勿含本命令行子串**（用 `vite.[p]review` 转义）。
- Bash 工作目录跨调用残留——命令一律用绝对路径或开头显式 `cd <repo根> &&`；**node -e 内联脚本中 `$$` 会被 shell 展开**（`page.$$eval` 被吃掉）——多行探针一律落文件再跑。
- 长会话优先相信确定性工具的输出（tsc/vitest/git）；grep/sed 内容做修改前必须重新精读；连续两次判读不确定即止损交棒。
- 跑巡检/探针期间不要编辑 src；改完 physics-core/src 再跑 prettier 需 build:core。
- 写中文正文用 Write 工具落文件；`gh issue close` 不支持 `--comment-file`（评论用 `--body-file`）。
- 测试数真值 **core 1118 / viz 1452 / total 2570**（本棒无增删）。
- 根 typecheck 覆盖引擎测试（`-p tsconfig.typecheck.json`）；`npm run sweep:test` 空 catch 守卫在列。
- **vite HMR 在 WSL2 下会漏文件变更**（useSceneSimulation.ts 注入两次未热更新）——改 visualization/src 后
  跑巡检前若行为不符预期，先 `node .scratch/kill-vite.cjs` 重启 dev server 再测，不要先怀疑代码。
- ** playwright 探针写入 DOM 的值会被范围输入 step 吸附**：非网格值（如默认 100 配 step 0.5）交互后
  永远回不到原值——涉及「还原参数」的断言必须先确认默认值在步进网格上（#91 的教训）。
- 本棒新增探针（.scratch/，可复用）：`probe-89-timeline.cjs`（setSlider 机制排查）、`probe-89-hertz2/3.cjs`
  （赫兹分诊序列）、`probe-89-red.cjs`（注入滞后隔离验证）。巡检基线 JSON：`qa-sweep-89-final.json`/
  `qa-sweep-90-full.json`（ERROR 0/WARN 51/OK 72 为当前绿基线）。
