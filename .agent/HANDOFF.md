# 交接日志（HANDOFF）

给下一个 Agent（或未来会话）看：做了什么、留了什么、下一步做什么。

## 2026-09-30 会话（longcat-20260930T200000Z）

### 接手状态
- 继承 main @ 66c02ad，工作树干净；`npm run precheck` 全绿（首屏 62.3kB/70kB，自检 10 层 10 PASS）。

### 本会话已做
- **环境探测**：创建 `.agent/ENV.md`（主分支 main、构建/测试/lint 命令、gh 可用）。
- **主动发现扫描**（空轮）：
  - TODO/FIXME：仅 AGENTS.md 检查清单项，非实际代码问题。
  - console.log：ocr-proxy.ts 服务器启动日志，合理。
  - any/eslint-disable/ts-ignore：无。
  - 硬编码密钥：无（.env.example 是模板）。
  - 大文件：都在 node_modules 中。
  - 未处理 Promise：正常 async 函数定义。
  - 内存泄漏：ParameterPanel setTimeout 有正确清理。
  - 事件监听器：都有对应 removeEventListener。
  - 测试数：core 1043 / viz 1241 / total 2284，与 README 一致。
  - 依赖：都在使用。
  - 文档数字：113 模型 / 123 场景 / 24 精讲 / 176 实验，都有对应。
  - 代码重复：无重复函数名。
  - 边界条件：`trajectory[trajectory.length - 1]` 访问安全（构造函数保证 ≥1 点）。

### 仍未解决（下一棒注意）
- **#44 保持 open**：React 19 因上游 react-dom 体积（+23kB）触发 70kB 首屏门禁而阻塞，**不要盲目重试**，
  也**不要为落地 React 19 上调 bundle 预算**（会掏空 #42 门禁意义）。详见 #44 评论。
- **#45 保持 open**：断链已修（c04218a），issue 已 assign owner，等 owner 复核关闭。

### 他人工作（勿碰）
- PR #23（YuuGR1337，README，9-27 起无更新）、PR #25（thadidaniel-ctrl，lint/format，9-28 起无更新）。

### 给下一步的建议
- 若无可处理 issue，继续保守发现（每轮最多 1 个新 issue，用已存在的 `type:*`/`area:*` 标签并注明发现者；
  本仓无 `auto-discovered` 标签）。

---

## 2026-09-30 会话（kerwin-20260930-1144Z）

### 接手状态
- 继承 main @ 5ff1b31，工作树干净；`npm run precheck` 全绿（首屏 62.3kB/70kB，自检 10 层 10 PASS）。

### 本会话已做
- **#46（新 issue，主动发现）**：`scripts/self-check.mjs` 单一真源 `LAYERS` = **10 层**（L0-L6 + L8-L10；无 L7），
  但活文档与 CI 步骤名仍写 **9 层**（#28 加 L10 后未同步）。已修复 11 处：
  `AGENTS.md`×2、`README.md`×3、`CONTRIBUTING.md`、`scripts/README.md`×2、`docs/README.md`、
  `.github/workflows/ci.yml` 步骤名、`.github/PULL_REQUEST_TEMPLATE.md`。commit 见本会话推送记录。
  - **历史文档有意不碰**：`CHANGELOG.md`（1.0.0 发布 2026-09-05 早于 L10 的 2026-09-28，其「9 层」对当时版本准确）、
    `docs/plan.md` 与 `docs/3D_CORE_STANDARDIZATION_SUMMARY.md` 的日期快照段、`docs/archive/*`（冻结）。
  - 复核：`git grep "9 层\|L0-L9"`（排除上述历史文档）零残留。

- **#47（新 issue，主动发现）**：`docs/DEVELOPMENT_GUIDE.md`「新增自定义场景的完整流程」教程仍用旧架构——
  Step 1 引用不存在的单文件 `mechanics.ts`、Step 3a import 自**已删除的 `mechanicsScenes.ts`**（照做直接编译失败）、
  Step 4 硬编码过时测试数（255）。已修正这 3 处具体引用（配置落位 `scenes/scenes/<领域>/`+领域 `index.ts` 注册；
  渲染函数指向领域渲染文件；测试数改随 README test-count 行）。本轮推送，issue 待复核。

- **#48（新 issue，主动发现）**：`sceneRegistry.ts:6` 与 `scenes/scenes/index.ts:5` 注释写「118 个场景定义」，
  实况 123（44+39+8+18+14，契约测试 rig-contract 亦断言 123）。已改为 123。本轮推送，issue 待复核。

- **#49（新 issue，主动发现）**：`docs/DEVELOPMENT_GUIDE.md`「质量标准 / CI-CD」段过时数字——
  「6 道质量门禁」（实为 7，与 AGENTS.md 一致）、验收清单「255 个测试全绿」（现 total 2284）。
  已改为 7 道 + 测试数随 README test-count 行。本轮推送，issue 待复核。
  （同文件历史批次日志段「全部 255 个测试通过」为历史快照，有意保留。）

- **#50（新 issue，主动发现）**：`README.md:214`「顺序执行 6 道质量门禁」与紧随其后的 7 条清单
  及 AGENTS.md「7 道」矛盾。已改 6 → 7。本轮推送，issue 待复核。

### 本会话收尾（kerwin-20260930-1144Z，6 轮）
- 产出并关闭 5 个 issue：#46（自检层数 10）、#47（新增场景教程旧引用）、#48（注释场景数 118→123）、
  #49（DEVELOPMENT_GUIDE 门禁道数/测试数）、#50（README 门禁道数）。均为 P3 doc/comment 漂移，各自小改+验证。
- 每轮推送 pre-push 全绿；main 与 origin/main 同步，工作树干净。
- 停止原因：doc/注释计数漂移这一类已基本扫尽（113 模型 / 123 场景 / 24 精讲 / 176 实验 / 10 层 / 7 道门禁
  均已核实或修正）；无其它可安全推进的低风险项。
- 下一棒可关注：`docs/3D_CORE_STANDARDIZATION_SUMMARY.md:62`（33 套件/1187 用例，点历史快照，未动）、
  DEVELOPMENT_GUIDE 历史批次日志段（有意保留）；#44 React 19 仍是唯一 P2 阻塞项。

### 仍未解决（下一棒注意）
- **#44 保持 open**：React 19 因上游 react-dom 体积（+23kB）触发 70kB 首屏门禁而阻塞，**不要盲目重试**，
  也**不要为落地 React 19 上调 bundle 预算**（会掏空 #42 门禁意义）。详见 #44 评论与下方上一会话记录。
- **#45 保持 open**：断链已修（c04218a），issue 已 assign owner，等 owner 复核关闭。
  （本 Agent 未越权关闭 assign 给 owner 的 issue。）

### 他人工作（勿碰）
- PR #23（YuuGR1337，README，9-27 起无更新）、PR #25（thadidaniel-ctrl，lint/format，9-28 起无更新）。

### 给下一步的建议
- 若无可处理 issue，继续保守发现（每轮最多 1 个新 issue，用已存在的 `type:*`/`area:*` 标签并注明发现者；
  本仓无 `auto-discovered` 标签）。

---

## 2026-09-30 会话（kerwin-20260930-multiagent）

### 已知状态（继承自 2026-09-29 会话）
- main 已推至 8a3b689（TS 7 落地），工作树干净，CI 全绿。
- 落地：vitest 5（#43）、vite 8（#44 部分）、express 5（#44 部分）、TS 7（#44 部分）、
  bundle 体积门禁 70kB（#42）、pre-push mise 兜底（#39）。
- 测试数：core 1043 / viz 1241 / total 2284。

### #44 剩余：React 19（阻塞，有数据，不要盲目重试）
- 证据：隔离试验安装零冲突、tsc 干净、viz 1241 全绿，但首屏 vendor-react
  44.8kB → 67.7kB gzip（+23kB，+51%），首屏合计 86.2kB，触发 70kB 门禁。
  根因是上游 react-dom 19 体积（client production 约 625kB vs 18 约 400kB），
  非本仓可优化。试验细节见 #44 评论。
- 决策：保持 React 18；React 19 待"首屏预算重议（≥90kB）或懒拆方案"后另立项。
- 注意：不要为落地 React 19 而上调 bundle 预算——那会掏空 #42 门禁的意义。

### 他人工作（勿碰）
- PR #23（YuuGR1337，改 README.md，9-27 起无更新）。
- PR #25（thadidaniel-ctrl，改 eslint.config.mjs/package.json/大量测试文件，9-28 起无更新；
  可能与本地 vitest5/TS7 升级冲突，合并是 owner 的事）。

### 本会话已做（Round 4）
- #45（DEVELOPMENT_GUIDE 5 处断链 + mechanicsScenes 已删）：已修复（c04218a），
  issue 保持 open 等复核。注意 commit 用 `docs:` 前缀以避免 GitHub 自动关闭 issue。
- 空轮：Round 2（TODO/ absoluto 链接/Math.random 都干净）、Round 3（console/包体积门禁复查通过）。
  连续空轮计数：0（#45 已产出）。

### 给下一步的建议
- #44 保持 open（React 19 阻塞项）；若上游 react-dom 体积显著下降再重估。
- 主动发现请走保守原则，每轮最多 1 个新 issue（注：本仓无 `auto-discovered` 标签，用现有 `type:*` 标签即可）。

### 本会话收尾（Round 5–9，连续空轮 ×5 后停止）
- Round 5：大文件/包体积扫描干净。Round 6：脚本引用全有主。
  Round 7：tsconfig 无 baseUrl 残留。Round 8：仅剩大版本落差（#44 已跟踪）。
  Round 9：CI 与 precheck 门禁一致（含新增的 bundle 检查）。
- 推送：7f4ff29（.agent 初始化）/ c04218a（#45）/ 5ff1b31（HANDOFF 中期更新）。
- 停止时状态：main 与 origin/main 同步，工作树干净；
  open issue 只剩 #44（React 19 阻塞）与 #45（待 owner 复核关闭）。
