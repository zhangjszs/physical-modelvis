# TASKS（GitHub Issue 本地镜像）

> Planner 整体重写 · 2026-11-06 · D67。GitHub Issues 可读写，为唯一权威；Executor 先改 Issue，再同步本文件状态。
> 开放 2 单：needs-info 1（#166）+ blocked 1（#44）；ready / in-progress / in-review / P0 = 0，P1 = 1（#166，未过 ready 门禁）。
> ready 对应 `ready-for-agent`，done 对应 CLOSED；parked 只是冻结属性，不是第二生命周期。

## 本轮验收与来源

- **断档反推**：10-25 D66 后 `.agent/` 零更新；10-26~10-28 带外会话关闭 #159 / #164 / #165（约 20 commits，终态 `a7a32cf`），无日报；11-05 无产出。已用 Git log、Issue 评论、CI/Deploy/QA 记录反推，详见 DECISIONS.md D67。
- **#157 验收通过 → CLOSED**（评论 6662922137）：五项退回差距逐条有据；当前 main 复跑 `vertical-contact.test.ts` 2 tests 绿。
- **#158 验收通过 → CLOSED**（评论 6662928711）：贴面/切向/浏览器/红绿四条标准全过；当前 main 复跑 `incline-contact.test.ts` 5 tests 绿。
- **M9（Milestone 3）2/2 → 本轮关闭**。#159 / #164 / #165 带外关闭经证据复核认可（终态 CI/Deploy/QA 绿），流程瑕疵（#165 关闭早于最后两提交）记录于 D67，不追溯。
- 过期状态标签已清理（#157/#158/#165 的 in-review、#159 的 in-progress）。

## 今日队列（2026-11-06）

**ready=0，队列例外维持（宁缺毋滥）。** 以下唯一动作不依赖用户答复：

### 1. #166 · 第一步：规格文档入库（不领取整单）

- Issue：[#166](https://github.com/zhangjszs/physical_modelvis/issues/166)；状态：**needs-info**；优先级：P1。
- 动作：将未跟踪的 `docs/composition-selection-placement-spec.md` **原样** `docs:` 提交入库（单独 commit），保护草稿不丢失；不改内容、不加标签转移、不开始实现。
- 其余范围（P0 选中改造 → P1 可控放置，A-1~A-7 / B-1~B-10 验收）等 D68 用户确认后由 Planner 转 ready。

### 2. #166 · 主体实现（阻塞，禁止开工）

- needs-info：规格 §8 七问（高度语义 / 有意重叠 / 触屏地位 / 多选 / 撤销范围 / 命名 / 容器拾取）待用户拍板。
- 用户确认后 Planner 下一轮按 §7.3 分期拆 ready 并过 4.2 七门禁；在此之前不改 `compositionStore` / `CompositionStage` / `CompositionLab`。

## 冻结 / 不可领取

### #44 · 暂缓 React 19 迁移

- [Issue #44](https://github.com/zhangjszs/physical-modelvis/issues/44)：**P2 · blocked · parked**，无 Milestone。
- D44=B 成本/产品约束未变；仅用户明确改选 A/C、已验证功能收益或 React18 安全/兼容硬约束触发重新评估；冻结期间不做安装试验、不抬预算。

## Milestone、决策与治理

- 无活跃 Milestone：M9 2/2 CLOSED；M6 7/7、M7 3/3、M8 4/4 历史收官维持。
- 开放 2 单已过治理：#166 needs-info（D68 pending 承接，无重复/方向冲突）；#44 冻结非饥饿项。P0=0，无 auto-discovered 待定级。
- pending=D68（第 1 天询问 2026-11-06，推荐与默认：按规格 Draft v1 执行，§8 各问按其自带建议为默认）。D44=B / D61=A / D62=A / D31 及真实发布红线维持。
- 同步冲突以 Issue 为准：本轮 TASKS 整体重写自 Issue 实拉状态；无 LOCK 残留。
