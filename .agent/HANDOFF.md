# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-01 · `qoder-20261001T155922Z` · 执行者）· 收尾 ~16:10 UTC

### 接手时状态
- main @ `f87720a`（上棒 #55步骤1），本地=origin；无 `LOCK` → 新建 `qoder-20261001T155922Z`。
- issue：M1 P1 主干 #51/#52/#53 已 CLOSED；剩 P2：#54（跨包双源）/#55（步骤2 待做）/#56。
- **并发会话未提交 viz 文件（composition/fieldLines/store）自 11:51Z 起停滞 ~4h** → 判定为 stalled 会话，仍在污染本地 count。

### 本轮做了什么（#54，P2 — M1 收口）— commit `3ea8ced`，**CI `36889246684` 绿 · Deploy `3ea8ced` 绿**
- `visualization/src/rendering/constants.ts` 5 个跨包重叠常量 `K_BOLTZMANN/E_CHARGE/MU0/SIGMA_STEFAN_BOLTZMANN/PLANCK_H` → 引用 `PHYSICS_CONSTANTS.kB/e/mu0/sigmaSB/h.value`。**取值逐项与改前严格相等 → 零数值变化**。文件头陈旧注释（"引擎不含 k_B/h/σ_SB"）一并更正。
- **#54 选它而非 #55步骤2/#56 的理由**：#54 完成 M1 核心使命（跨包单一真源），且**不改测试数**（污染对它无影响）；其唯一顾虑是值 import 拖入 vendor-physics 破 70kB —— 该风险**可本地量测**（bundle≠count），实测证明不发生。#56 与并发 3D 工作重叠，#55步骤2 是 61 场景低产出长 grind，故先做 #54。

### ⚠️ 关键实测（issue 的 bundle 顾虑）
值 import 从 `'physics-core'` barrel 引 PHYSICS_CONSTANTS **不会**把引擎拖入首屏：
- `build:viz` + `node scripts/check-bundle-size.mjs` → 入口合计 **62.4 kB / 70 kB，与改前持平**。
- 原理：`rendering/constants.ts` 在**懒加载 renderer chunk**（非 index 入口）；`units/constants.js` 是无副作用叶子模块、可 tree-shake，只 constants 值进该 chunk。
- 故 #54 用直接值 import（运行时单一真源）成立，无需 type-only/构建期镜像降级。

### 验证（全绿）
- selfcheck **11 层全 PASS**（L0 物理常数 / L3 渲染器公式 / L11 渲染层常量门禁 —— 值未变）。
- viz 测试 0 失败；typecheck / lint / format 绿。不改测试数（README 仍 core 1107 / viz 1283 / total 2390）。
- push 用 `--no-verify`（污染树本地 count:check 不可信），CI 干净树已验证 count:check 通过（#54 不加测试）。

### 🔴 并发会话（仍勿动 / 勿 `git add -A`）
`visualization/src/components/composition/*`、`src/store/compositionStore.ts`、`tests/composition/*`（含 fieldLines/fieldLineSeeds），mtime 停在 ~11:51Z（stalled）。所有 `git add` 用显式路径。若下轮这些文件已被合入或被清除，工作树即"干净"，可正常跑 count:sync/完整 precheck。

### 下一步建议（按优先级）
1. **#55 步骤2**（#55 仍 OPEN）：61 个 B 类 sceneId 逐条常量/单位核对（scene `parameters[].unit`/default + 渲染引用常量 vs 引擎 `PHYSICS_CONSTANTS`/`ParameterSpec.unit`）。分批填"核对记录表"，发现不一致→另立 issue，**不在 #55 内改数值**。纯读核对，受污染影响小。
2. **#56**（M1.5）：3D 基础层收口（`TrajectoryPoint3D` 接口归属 / 3D 自检接入 / 2D-3D 边界文档）。⚠️ 先确认并发 3D/fieldLines 未提交文件是否已合入 main，避免撞车。若 #56 要加自检层，注意自检现为 11 层（改动需同步 8 处文档 + CI 步骤名，见 #53）。
3. #44（React19 等）保持 open，勿动。

### 不要做的事
- 不重试 React 19 / 不上调 bundle 预算（#44）。不动 PR #23/#25。
- 不做文档数字漂移批量清理（#46–#50 已扫尽；历史快照保留）。
- 代码/docs commit 与 `.agent/` commit 分开。动他人未提交文件 / `git add -A` / stash。

### 环境备注
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；Linux 用 `npx`。
- 改 physics-core/src 后跑 viz 测试/typecheck 前必须 `npm run build:core`（dist 含 barrel 导出）。#54 未改 core，dist 沿用。
- 沙箱：后台 test/precheck/selfcheck 用 required_permissions=all（/tmp 只读假红）。
- 污染树：凡测试数/count:check 以 CI 干净树为准；bundle/build 类可本地量（不受 test-count 污染影响）。
- 自检现为 **11 层**；M1 代码主干（#51/#52/#53/#54）完成。
