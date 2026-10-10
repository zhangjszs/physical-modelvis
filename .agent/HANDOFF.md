# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-10 · `executor-deepseek-20261010a` · 执行者）· #97 恢复现场完工

### 本轮一件事（已合回 main 并随本提交推送，报告在 issue，转 in-review 待验收）

1. **#97 README 开源演示物料**（feat `47903fe`）：从上一棒执行现场（未提交脚本 + 6 张中文豆腐块截图）恢复，交付 **6 张中文正常的关键界面截图 + 一键复采脚本**。要点：
   - **全部重采**：上一棒现场的图在无中文字体环境采集（中文全为方块），且 02/06 构图不合格（画布空白 / 空场地）——已逐个重新设计配方并复采。
   - **脚本**：`scripts/capture-screenshots.mjs`——自构建（vite build）→ 自起停 vite preview → 6 画面落盘 `docs/screenshots/`；支持 `CAPTURE_PORT / CAPTURE_OUT / CAPTURE_CHANNEL`；单张 >1MB 自动降级 JPEG、总量 >8MB 报错；启动检测系统中文字体缺失并警告。
   - **确定性方案（本单最大技术点）**：3D 主球按真实帧间隔自转（`EquipmentStage.tsx:474` `ball.rotation.y += delta * 2.4`），真实时钟下两次复采光照差若干像素（实测 23~94px、峰值 89 级差异）；改用 **Playwright 虚拟时钟**（每图独立页面 + `runFor` 固定动画时间线），且**截图前不得触发任何额外渲染**（点击右侧面板页签会重新挂载面板并改写累积帧序列——01 曾因此两遍不一致；改为「先切自由落体再切回抛体」后稳定）。**6 张连跑三遍逐字节一致**。
   - **三个堵点及绕行**（详见脚本头注释 + #97 执行报告）：
     a) **生产构建首屏默认场景 3D 舞台空白**（dev 正常）→ 所有 3D 图走「点击目录场景」路径；已立 **#111**（auto-discovered）。
     b) **OCR 弹窗被 `.top-bar` 的 backdrop-filter 裁切**（backdrop-filter 使其成为 fixed 后代 containing block，弹窗上半溢出视口顶部）→ 截图时 `addStyleTag` 临时取消该属性；问题记录在 #97 报告「给 Planner 的建议」。
     c) **无中文字体** → 本机安装用户级 Noto Sans CJK（见 ENV），脚本启动检测并警告。

## 已完成

- #97：README 界面演示物料（截图脚本 + 6 图 + README「界面演示」区 + eslint 浏览器全局声明）· `47903fe` · 6 张三连逐字节一致 · precheck 全绿

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中**。in-review 1（#97）待 Planner 验收；**auto-discovered 1（#111）**待 Planner 定级。
- 验收后队首 = **#109**（m_e/G/kB 常量门禁打包扩面，P2）→ #106。

## 验证情况

- `npm run precheck` 全绿（build:core → typecheck → lint → format:check → sweep:test → test → count:check → build:viz → check:bundle → check:publish → selfcheck 11 层全 PASS；exit 0）。
- 截图确定性：完整脚本**连跑三遍**，6 张 PNG 逐字节一致（md5 清单：`.scratch/hash-A4.txt` / `hash-C4.txt`）。
- 图片预算：6 张合计 1.50MB（上限 8MB），单张最大 305KB（上限 1MB）。
- 无残留进程：脚本每轮自起停 preview（进程组 SIGTERM → 5s 兜底 SIGKILL），多轮运行后无 vite/npm 残留。
- 未跑：QA 全量巡检（123 场景）——本单只新增脚本 / 文档 / 图片资产，不改应用源码；3D 舞台空白问题已在 #111 单独立案、证据链闭合。

## 风险与注意事项

- **#97 的确定性依赖「截图前无额外渲染」**：脚本已固化（3D 图统一 clockShot 路径；02 等足 recharts 动画 2.2s）；后续若有人改动截图步骤（如加点击、调等待），须重跑两遍比对 md5（`.scratch/hash-*.txt` 有基线）。
- **环境变更**：本机装了用户级中文字体（见 ENV.md 新增条目）——headless 截图中文正常的前提；换机复采若无字体，脚本会警告且图为方块。
- **#111（生产构建 3D 空白）未修复**：截图脚本的绕行（点击场景路径）在修复后仍然可用，无需回改。
- 端口：截图脚本用 4317（自起停），与 3000 / 4318 等既有脚本端口错开；冒烟脚本若本机无 msedge 用 `SMOKE_BROWSER_CHANNEL=''`。

## 给下一棒的第一步建议

- 先查 #97 是否被 Planner 验收；然后按 PLAN 领 **#109**（m_e/G/kB 常量门禁打包扩面：常量名单扩面 + bWien 真源条目 + 普查补漏 blackBodyRig；注意与 L11 自检的耦合）。
- 若 Planner 已把 #111 或 OCR 弹窗问题定级入队，按 PLAN 优先级插入。

## 给 Planner 的信号

- **in-review 1**：#97（报告含逐条验收核对与证据链；截图可在 README 直接查看）。
- **auto-discovered 1**：**#111**（生产构建 3D 舞台空白两条复现路径 + 线上站 / headed / headless / dev 对照证据链）——待定级。
- **另一发现（未立单，详见 #97 执行报告「给 Planner 的建议」）**：OCR 弹窗定位 bug（用户打开「拍照解题」时弹窗上半溢出视口顶部）——影响所有用户，建议评估立单。
- 本轮 auto-discovered 立单 1/3；无新增决策事项。
