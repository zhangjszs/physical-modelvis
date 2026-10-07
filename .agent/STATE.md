# Agent 协作状态（STATE · 事实账本）

> 可机器解析的事实账本：活跃任务 / 已完成 / 阻塞。接力通过 git 历史 + GitHub issue + 本目录（ENV/STATE/HANDOFF）三重载体。

- 当前 agent-id: `executor-kerwin-20261007c`（**执行者·第十二棒**，规划会话连任）· 本轮 #62 批次 1 完工转 in-review，待规划者验收
- 会话: 2026-10-07T15:55 本地开始 → 19:4x 收尾
- 本轮代码 commit: `f486421`（分支）→ main **`ac4ffb1`**（pull --rebase 将合并扁平化为线性，内容完整）；分支已删
- 脉络：M3 队首 #62 五场景迁移落地（4×B 局部 + 1×A+B，豁免表 22→17）——**in-review 积压 1（#62）待验收**

## 接力载体
- `.agent/` 随仓库提交（`.agent/.gitignore` 仅排 `LOCK`）。PLAN.md / DECISIONS.md 归规划者；
  STATE.md / HANDOFF.md 归执行者。

## 文件锁
已释放（本轮收尾，无运行中实例）。

## 当前活跃
- **#62 in-review**（M3 批次 1 光学波动+波粒二象 5 场景迁移，main `ac4ffb1`，报告 comment 在 issue，CI/Deploy success）
- 下一棒第一优先 = 等 Planner 验收 #62 → 队首 **#63**（批次 2 传感器元件 4 场景，thermistor 引擎 x_t/y_t 已在登记表）→ #64 → #65 → #66 → #107 → M4。

## 已完成（本棒全程，≤10 条）
- **#62** 批次 1 光学波动+波粒二象 5 场景迁移：
  - diffraction-grating（B）：k_max 读 `maxValues.orderMax`，射线同式示意保留；
  - polarization-malus（B）：出射光强 I 读 `maxValues.Ifinal`，逐片级联同式回退；
  - interference（B）：Δy 读 `maxValues.deltaYmm`，像素空间条纹带示意保留（注释在案）；
  - doppler-effect（B）：前/后观察者 f′ 由 `charts.fprime_vs_theta` 在 0°/180° 插值（与 dirAngle 无关），NaN 防护后回退同式；
  - photoelectric（A+B）：Ek-ν 直线整条读 `charts.y_t`，ν₀ 读 maxValues，HUD/动画 y_t 插值。
  - 全部经 #82 `chartsOf` 类型化层；豁免表 22→17；契约用例 +10；audit「M3 批次 1」节落盘。
- 测试数 core 1125 / viz 1544 / total **2669**（count:sync 回写）。
- CI/Deploy：`ac4ffb1` 双 success（CI run + Deploy）。

## 阻塞项 / 风险
- 无外部阻塞。**in-review 积压 1（#62）**待规划者验收。
- 并发会话提示：本棒作业期间 origin/main 出现 `06fb2b1`（十六次滚动：D19 用户定夺补落盘，M5 不立项维持 parked）——
  本棒 pull --rebase 已吸收，合并扁平化线性入 main；规划侧注意十六次滚动编号已被占用，下轮用**十七次**。
- 工作树干净（分支合回删除后）。
- **端口 3000 被本机其他项目占用**（勿杀他人进程）；dev server 用 `npx vite --port 5199 --strictPort`。

## 环境备注（继承 + 新增）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；改 `physics-core/src` 后跑可视化前必须 `npm run build:core`（本棒未改引擎，无需）。
- **管道退出码陷阱**：验证命令取真实退出码用 `${PIPESTATUS[0]}` 或去管道。
- **代理限流是 app 实例级内存计数（10 req/min/IP）**：e2e 探活用 TCP connect；多段验收各起独立代理实例。
- **vite dev 端口不在代理 CORS 默认白名单**：联调须 `OCR_PROXY_CORS_ORIGINS=http://localhost:5199`。
- **analyzePhysicsProblem 首次调用动态加载场景 chunk ~1.1s**：组件测试 waitFor 勿用默认 1000ms。
- **冒烟脚本通道已参数化（#98）**：本机跑 verify-*.cjs 用 `SMOKE_BROWSER_CHANNEL=''`；BASE_URL 参数化是 #106。
- **viz tsconfig 开 noUncheckedIndexedAccess**：测试中 `mv.xxx` 做算术需 `?? 0` 守卫（本棒踩过一次 TS18048）。
- **prettier 对改动的 .ts 全量生效**：新写代码若格式不合（如长行）会被 format:check 拦，先 `npx prettier --write` 再 precheck。
- **interpSeries 的 NaN 断点会污染相邻插值**：消费含 NaN 断点的扫描曲线（如 doppler 超声速区）务必 `Number.isFinite` 守卫后回退。
- 测试数真值 **core 1125 / viz 1544 / total 2669**（#62 后，count:sync 已回写）。
