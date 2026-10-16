# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-16）。标签映射：`ready-for-agent` ≡ ready；`closed` ≡ done。本文件只读镜像，执行者改状态时先改 Issue 再同步本行（冲突以 Issue 为准）。

## 今日队列（执行顺序，3 个）

- [ ] #127（P3 · type:chore/area:ci · **ready**）[auto-discovered] 修复 pre-push 失败归档在沙箱 `TMPDIR` 只读时静默降级
  —— 范围：归档优先写仓库内路径；保持非沙箱行为不变；不得改 `.github/workflows/`；全程不得 `--no-verify`
  —— 验收：失败时仓库内能留下可读证据；归档路径不可写时显式报告；正常 pre-push/precheck 全绿
- [ ] #128（P3 · type:chore/area:render · **ready**）FormulaPanel 光敏电阻条目对齐指数式与引擎/画布同源
  —— 范围：仅收口 `FormulaPanel.tsx` 的 photoresistor 公式、变量/提示相关口径；不扩展为架构重构
  —— 验收：幂律旧式零残留、新指数式与引擎/画布一致；红绿守卫、typecheck、precheck、count:check 全绿
- [ ] #129（P3 · type:docs · **ready**）AGENTS.md 补充 extra/meta 类型化访问守卫口径
  —— 范围：补「读取 `SimulationResult.extra` 走 `engineExtraAccess` 守卫、禁新添双重强转」并链接现有实现；纯文档
  —— 验收：关键陷阱可定位且与 #82 charts 口径并列；不改代码/测试/CI；format:check 与 count:check 全绿

## 本轮关闭（done，三十一次滚动验收通过 · 2026-10-16）

- [x] #124（P3）渲染层 extra/meta 四处 `as unknown as` 类型化收口
  —— 4 个目标站点全部消解；`visualization/src/rendering` 零命中；`typed-extra.test.ts` 14 例；CI/Deploy success；验收口径已在 Issue comment 修订，225 处 rig handles 残留转 #126
- [x] #125（P3）光敏电阻画布面板公式与计算式对齐（含引擎温度项）
  —— 选 A 补温度项；面板公式/信息条/参数回显行同步；4 例守卫、浏览器行宽探针、precheck 与 CI/Deploy success；FormulaPanel 幂律残留转 #128

## 待用户决策

- **D34（pending，第 1 天）**：#126 的 225 处 3D rig handles `as unknown as` 是否放行根治（A 泛型化一次性 / B 登记表分批 / C 维持现状）。推荐 = 默认 **C**；不进 ready。连续 3 天无答复且默认无异常时转正并关闭 #126（预计 2026-10-18）。

## 候选 / parked（不执行）

- #126（P3 · **needs-info** · auto-discovered）——225 处 rig handles 强转，触契约 1.10 大规模重构红线，按 D34 暂缓
- #100（P2）/#101（P3）——Issue 仍带 ready-for-agent，但维持 parked（D19/D29；不进今日队列）
- #99（P2）/#105（P3）——needs-info（D20/D21：真实发布暂缓、英文物料随发布走）
- #44（P2）——人类持有，勿动
- D31——#103 派生三张大规模重构实施单已按默认 C 转正为长期暂缓，不建对应 Issue、不进 ready

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`（历史约定），不引入新 `ready` 标签，避免执行侧识别断裂
- 本仓无 `priority:P4` 标签（P3 即最低）
