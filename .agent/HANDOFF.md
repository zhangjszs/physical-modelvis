# HANDOFF

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮概要

本轮（2026-10-13 · `executor-20261013a` · 执行者）：完成 **#114**（P2，组合实验台新增「匀强磁场区」器材组件：fields3d 盒区常量场 + 硬边界语义 + composition 校验 + 半透明盒网格 + 场方向箭头 + 入流面平行种子 + 检查器场强/三轴尺寸联动）。
- 提交：`2bcbfe2`（feat）/ `8d4996b`（merge @ main，已推送；pre-push 钩子全门禁复绿）
- 结论：完成，转 `in-review` 待 Planner 验收；本地 precheck 全绿 + pre-push 全绿，代码已推送至远端。
- 边界语义决策（issue 二选一，执行棒定）：**硬边界 + 追踪越界即停**（无过渡带；理由见执行报告歧义处理）。

## 已完成

- **#114**：组合实验台新增「匀强磁场区」器材组件 · `2bcbfe2` / `8d4996b` · 本地 precheck 全绿 + pre-push 全绿 · `in-review` 待验收。
  - **物理引擎层（physics-core）**：
    - `physics-core/src/physics/fields3d.ts`：`MagneticFieldSource` 联合类型新增 `uniform-field-zone`
     （`field` 恒定矢量 + `center` + `size` 三轴全尺寸）；实现 `uniformFieldZoneMagneticField`
     （盒内恒等于 field、域外严格零场、边界上视为域内；非法尺寸/非有限输入返回零场不抛），并在
      `totalMagneticField` 接入；文件头器材枚举注释同步 6 类；
    - `physics-core/src/physics/composition.ts`：`validateComposition` 补充 `uniform-field-zone` 校验分支
     （拦截非有限 field、任一轴非正 size）；
    - `physics-core/tests/unit/fields3d.test.ts`：新增 4 例（域内恒值/域外零×6 面/边界视为域内/total 叠加双向）；
    - `physics-core/tests/unit/composition.test.ts`：新增 1 例（合法通过 + 零尺寸 + NaN 场强拦截）。
  - **可视化与器材网格（visualization）**：
    - `visualization/src/store/compositionStore.ts`：`SOURCE_DEFAULTS` 新增 `uniform-field-zone`
     （B=1mT 沿 +y，盒 0.4×0.3×0.3m，演示量级说明在注释）；`applyPosition` 接入 center；
      新增 `updateSourceVector(id, key, patch)` 动作（向量型参数合并式更新 + 重仿真）；
    - `visualization/src/components/composition/CompositionLab.tsx`：工具箱增加「▦ 匀强磁场区」；
      新增 `UniformFieldZoneEditor`（场强 mT 保方向改大小 + 三轴尺寸 m + 朝向固定说明）；
      底部器材枚举顺带补上条形磁铁（#113 遗漏）；
    - `visualization/src/components/composition/sourceMeshes.ts`：半透明区域盒（opacity 0.18，
      世界轴序 = 物理 x/z/y）+ 场方向 ArrowHelper（长度取场向盒内弦 70%）；尺寸/场强变化原位重建；
      applyTransform 只平移不旋转（轴对齐盒约定）；
    - `visualization/src/components/composition/fieldLineSeeds.ts`：`FIELD_LINE_SEED_CONFIG.uniformFieldZone`
     （divisions 3 / 半宽 0.45×最小边 / inset 0.02）+ `uniformFieldZoneSeeds`（入流面 −y 端网格、
      单向顺场追踪、弧长覆盖整盒弦长 + 出界余量；零场/退化尺寸不产种子）；
    - 单测覆盖：composition 相关 5 文件 58 passed（含新增：seeds 2 / lines 1 / meshes 1 / store 1）。
  - **文档与测试计数**：
    - README.md 组合实验台器材行同步新 kind；
    - 测试数自 2791 回写为 2801（core 1160 / viz 1641，共 +10 项测试），`count:check` 严格一致。
  - **性能复核**：dist 实测 200 条场线追踪 zone 3.8ms vs 单线圈 84.3ms（约 1/22，O(1) 盒判定 vs 96 段求和），
    不触 #93 成本约束。

## 未完成 / 进行中（下一棒最优先看这里）

- **无进行中任务**。工作树干净（main @ `8d4996b`，与 origin/main 同步），无遗留分支。
- 待 Planner 验收：
  - #113：组合实验台新增「条形磁铁」器材组件（in-review，本棒未动）
  - #114：组合实验台新增「匀强磁场区」器材组件（in-review）
- 队首下一单：**#106**（P3，冒烟脚本参数化收口）→ **#115**（P3，截图确定性收尾）。
- #100–#104 勿领（D19 parked）；#99/#105 维持 needs-info（D20/D21）。

## 验证情况

- `npm run precheck` 本地全绿 exit 0（build:core → typecheck → lint 0 错误/19 warnings 基线 →
  format:check → sweep:test → test → count:check → build:viz → check:bundle → check:publish → selfcheck 11 层全 PASS）。
- pre-push 钩子全门禁复绿后推送（`8d4996b`）。
- 引擎单测：127 文件 1160 passed；组合台相关单测：5 文件 58 passed。
- 首屏包体积 gzip 67.1 kB ≤ 70 kB（CompositionLab chunk 8.8 kB ≤ 60 kB 懒预算）。
- GitHub Actions CI 观察中（push @ `8d4996b`）。
- 中途修复 1 处测试写法：`ArrowHelper` 无 `getDirection` getter，改用四元数断言箭头方向（实现代码无问题）。

## 风险与注意事项

- 朝向固定 +y、盒区轴对齐（与 #113 相同，朝向自由旋转依赖 #100 parked，当前未启动）；
  引擎侧 field 为全向量（旋转解锁后种子/网格需重做入流面逻辑，已在注释标明）。
- B=0（mT 输入 0）时校验通过但无场线/箭头（只留空盒）；属可理解的退化显示，未做输入夹取（与其他标量参数一致，无夹取惯例）。
- 若未来涉及 Rust 模块开发，按用户指令请使用 `mise` 进行工具链安装与管理。

## 给下一棒的第一步建议

- 检查 #113/#114 是否已被 Planner 验收关闭（in-review 积压 2）。
- 按 PLAN 队列领取 **#106**（P3 冒烟脚本参数化收口）。开工前创建 `.agent/LOCK`，按契约 1.5 流转标签
  （`ready-for-agent` → `in-progress` → `in-review`，用 `gh issue edit` 换标签）。

## 给 Planner 的信号

- **in-review 2**：#113（条形磁铁器材组件，上棒）＋ #114（匀强磁场区器材组件，本棒）。
- **auto-discovered 0**：本轮未产生新 auto-discovered 单（CompositionLab 底部枚举顺带补 #113 遗漏，未达立单阈值）。
- **需要 Planner 介入**：验收 #113/#114（队列下游 #106/#115 均为 P3，可在验收前并行执行）。
