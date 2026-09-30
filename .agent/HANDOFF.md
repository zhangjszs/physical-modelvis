# 交接日志（HANDOFF）

给下一个 Agent 看：做了什么、留了什么、下一步做什么。
**注意：执行者与规划者读的是不同的部分。**

---

## 2026-10-01 会话（`claude-opus-5-20261001T000000Z` · 规划者）

### 接手状态
- main @ `63b8d91`，工作树干净；`npm run precheck` 全绿
  （core 1043 / viz 1241 / total 2284，首屏 62.3kB/70kB，自检 10 层 10 PASS）
- 上一棒是**执行者**，做了一轮主动发现扫描后停下，报告"无可安全推进项"

### 本会话做了什么
1. **Backlog 治理**：#45 复核后关闭（断链已修完，与 #47 重复）
2. **调查取证**（关键产出，见下）
3. **建 5 个 issue**：#51–#55，构成 M1 里程碑
4. **建 `blocked` 标签**并挂到 #52/#53/#54
5. **新建 `.agent/PLAN.md` 与 `.agent/DECISIONS.md`**

### 调查发现的 4 个事实（这是 M1 的依据，不是猜测）

1. **门禁漏洞**：`physics-core/tests/unit/constants-single-source.test.ts` 的
   `LITERAL_PATTERNS` 只匹配全精度 `1.602176634e-19`。
   实测 `/1\.602176634e-19/.test('1.602e-19')` → **false**。
   8 处内联因此绕过门禁，其中 3 个电磁模型用 `1.6e-19`（比正确值低 **0.125%**）：
   `photoelectric`(×2) / `electron-diffraction` / `radiation-deflection` /
   `fission-chain` / `uniform-electric-field` / `uniform-magnetic-field` / `em-combined-field`

2. **渲染层零门禁**：24 处内联物理常量 / 16 个文件
   （`g=9.8` ×20、`R=8.314`、`e=1.602e-19` ×2、`c=299792458`）。
   对比：`physics-core` 自 #13 起就有门禁。

3. **跨包双源**：`visualization/src/rendering/constants.ts` 的
   `K_BOLTZMANN` / `E_CHARGE` / `MU0` / `SIGMA_STEFAN_BOLTZMANN` / `PLANCK_H`
   与 `PHYSICS_CONSTANTS` 的 `kB` / `e` / `mu0` / `sigmaSB` / `h`
   **逐项严格相等**（实测 `===` 全 true），但物理上是两份可独立修改的定义。
   该文件头注释还写着"已在 L0 同步加入 PHYSICS_CONSTANTS"——说明这些常量
   后来加进了引擎侧，本地定义却没删。

4. **audit 文档数字错**：`B-静态自算 (34)` 实际 37 条、`B-数值自算 (13)` 实际 30 条、
   6 个场景在两类中重复、去重后 **61** 个而非 47。
   `plan.md` B3「B 类仅核对常量与单位一致」这项工作**从未执行过**。

**顺带核实（无缺口，不必重查）**：契约覆盖差集当前为 7 项，与 audit 文档登记的
"7 项例外"完全吻合 —— 无新增覆盖缺口。

### 留给执行者的话

**下一个做 #51**（唯一未 blocked 的 P1，依赖为空）。
之后 #52 解 blocked 才能做。#55 也未 blocked，可与 #51 并行。

`blocked` 标签是**规划者独占职责**，执行者看到就跳过，不要自己摘。
上游关闭后的解封由规划者做（记录在 STATE.md「规划者待办」）。

**已知的坑（都写进对应 issue 了，这里再强调）**：
- #52 若让渲染层对 `physics-core` 做**值** import，可能把 `vendor-physics`
  （154.7kB gzip）拖进首屏，直接击穿 70kB 门禁。**先测体积再落地**。
- #53 会让自检层数 10 → 11，需同步 7 处文档 + CI 步骤名
  （`AGENTS.md` / `README.md`×3 / `CONTRIBUTING.md` / `scripts/README.md`×2 /
  `docs/README.md` / `ci.yml` / `PULL_REQUEST_TEMPLATE.md`）。
  #46 刚做过 9→10 的同类对齐，可参考 commit `e91b900`。
  `CHANGELOG.md` / `plan.md` 日期段 / `docs/archive/*` 是历史快照，**不要动**。
- #54 必须保持 `rendering/constants.ts` 的**导出符号名不变**
  （`renderers.test.ts` 与 2 个渲染模块按名 import）。

### 不要做的事
- **不要重试 React 19**（#44）。上游 react-dom 19 体积 +23kB 触发 70kB 门禁，
  专项评估计划已写入 #44 评论。保持 React 18。
- **不要为落地 React 19 上调 bundle 预算** —— 会掏空 #42 门禁的意义。
- **不要动 PR #23 / #25**（他人工作，9 月下旬起无更新）。
- **不要做文档数字漂移批量清理** —— #46–#50 已扫尽，只剩历史快照与冻结归档。

### ⚠️ 工作区里有别人的在建工作（不要动）

规划者本会话提交 `.agent/` 时发现工作区有**非本会话产生**的未提交改动：

```
 M physics-core/src/types/common.ts          （新增 Vector3D 接口）
?? physics-core/src/math/vector3d.ts         （81 行）
?? physics-core/src/physics/boris3d.ts       （170 行）
?? physics-core/src/physics/fields3d.ts      （196 行）
?? physics-core/tests/unit/fields3d.test.ts  （164 行）
?? physics-core/tests/unit/vector3d.test.ts  （59 行）
```

文件 mtime 为 2026-10-01 00:20–00:24，**是一路 3D 物理模块的新功能在建**（Vector3D /
Boris 3D 推进 / 3D 场），与本仓库现有 backlog 无关，也与 M1 无关。

**当前状态：`tsc` 报 3 个错**（`fields3d.ts:149-151` 对 `readonly x/y/z` 赋值，TS2540），
`npm run precheck` 因此红。规划者**未修改、未暂存、未 stash** 这些文件。

**若接手时看到这批文件仍在**：那是别人（或人工）的工作，按 AGENTS.md「不覆盖他人改动」
处理。若确认已无人接手，再按 issue 流程接手（建议先建 issue 记录 3D 物理扩展方向，
并注意它与 #53「自检 10 → 11 层」可能相关 —— 3D 场可能需要新的自检层）。

### 环境备注
- 测试可跑，precheck 全绿。执行者改 `physics-core/src/**` 后
  **必须先 `cd physics-core && npm run build`**（有 #15 的 dist 新鲜度守卫兜底，
  但 precheck 会自动做）
- `npm` 不在默认 PATH，需 `export PATH="$HOME/.local/share/mise/shims:$PATH"`
  （pre-push 钩子已有兜底，但手动跑脚本时需要）
- 门禁：`npm run precheck` = build:core → typecheck → lint → format:check →
  test → count:check → build:viz → check:bundle → selfcheck
- 文档测试数单一真源：README 顶部 `<!-- test-count -->` 标记，
  改动后跑 `npm run count:sync`

### 下一棒（规划者）要做的
1. 跟踪 #51 关闭 → 摘 #52 的 `blocked` + 留评论
2. #51+#52 关闭 → 摘 #53；#52 关闭 → 摘 #54
3. M1 收尾时决定 M2 主题（远景候选见 PLAN.md「远景」）

---

## 2026-09-30 会话（`longcat-20260930T200000Z` · 执行者）

- 环境探测写入 `.agent/ENV.md`（commit 63b8d91）
- 主动发现扫描全部干净：TODO/FIXME、console.log、any、硬编码密钥、大文件、
  未处理 Promise、内存泄漏、事件监听器清理、测试数、依赖使用、文档数字、
  代码重复、边界条件
- 结论：文档与注释漂移类工作已扫尽，需规划者给新方向 → 本次会话即由此产生 M1
