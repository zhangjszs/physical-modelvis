# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-16）。用户新增方向已记录 D37：优先统一外部界面风格与组件复用，为物理世界盒子铺路。标签映射：`ready-for-agent` ≡ ready；`closed` ≡ done。

## 今日队列（执行顺序，5 个）

- [ ] #131（P2 · type:chore/area:render · **ready**）组件复用边界调查：为物理世界盒子划定可复用 UI/器材接口
  —— 目标：盘点 FormulaPanel、InspectorPanel、DataDrawer、GuidancePanel、组合实验台器材/参数面板的重复结构与差异
  —— 验收：至少 5 组候选及证据；至少 3 个 props/state/slot 接口草案；拆出不超过 3 个独立实施单；不触大规模重构红线
- [ ] #130（P2 · type:chore/area:render · **ready**）统一外部界面风格：为物理世界盒子建立 UI 视觉规范
  —— 目标：盘点 Workbench、参数面板、数据抽屉、指导/OCR/组合台/错误空态的视觉分歧
  —— 验收：至少 6 类分歧有文件证据；形成颜色/间距/圆角/阴影/文字/控件状态 token 表；指定 2–3 个验证组件；不做全站重构
- [ ] #127（P3 · type:chore/area:ci · **ready**）pre-push 归档路径改良：沙箱 `/tmp` 只读时不丢证据
  —— 验收：仓库内归档、不可写时显式警告、非沙箱行为不变、precheck 全绿；不改 workflows
- [ ] #128（P3 · type:chore/area:render · **ready**）FormulaPanel 光敏电阻条目对齐指数式与引擎/画布同源
  —— 验收：幂律旧式零残留、新式在位、红绿守卫、typecheck/precheck/count:check 全绿；不做 FormulaPanel 架构外迁
- [ ] #129（P3 · type:docs · **ready**）AGENTS.md 补充 extra/meta 类型化访问守卫口径
  —— 验收：与 #82 charts 同层级，明确 `engineExtraAccess` 与 `typed-extra.test.ts`；纯文档，不改代码/CI

## 本轮关闭（done）

- [x] #124（P3）渲染层 extra/meta 四处强转收口 —— 4 个目标站点消解，`src/rendering` 零命中；CI/Deploy success
- [x] #125（P3）光敏电阻画布面板公式与计算式对齐 —— 三处展示式同步、TEMP_COEFF 同源、测试与浏览器探针通过

## 已确认决策

- **D31**：#103 派生三张大规模重构实施单暂缓，不进 ready；Executor 不得自取。
- **D36**：#126 `Rig<H>` 一次性泛型化已获用户授权。
- **D37**：优先统一外部界面风格与组件复用，为物理世界盒子铺路；先调查、后拆小实施单。

## 阻塞 / 待处理

- #126（P3 · **blocked** · area:render · auto-discovered）——D36 授权仍有效，但实施前置 #131；不得在复用边界明确前抢跑 84 文件/225 处迁移
- #100（P2）/#101（P3）——Issue 仍带 ready-for-agent，但维持 parked（D19/D29）
- #99（P2）/#105（P3）——needs-info（真实发布暂缓、英文物料随发布走）
- #44（P2）——人类持有，勿动
- 观察：引擎 `photoresistor.ts` explanation 文案温度项未立单；#122 根因单待新的归档失败证据

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· blocked（外部/前置阻塞）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`，不引入新 `ready` 标签
- 本仓无 `priority:P4` 标签（P3 即最低）
