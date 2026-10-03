# 交接日志（HANDOFF）

> 每轮结束**整体重写**（不追加）。给下一棒看：本轮做了什么、留了什么、下一步做什么。

## 本轮（2026-10-03 · `zcode-exec-2819` · 执行者·第三棒）· M2.6 全闭环 + #83 暂停交接 · 更新于 ~11:30 本地

### 棒内三段
1. **M2.6 三单连做并全部验收关闭**（规划者 `40ab0c3` 确认）：
   #79 止血包 `01ac2a3`（纹理释放 + rig LRU 8 + 暂停按需渲染）→
   #80 门禁 `a6e1173`（内存/耗时双趟判定红绿闭环 + rig dispose 契约 124 例 + 懒 chunk 硬门禁）→
   #81 根治 `85ca829`（StageRenderer 注入式上下文复用，配对比 0.99/1.00 零累积，#70 防线零回退）。
   踩坑全记录见 git 历史两份 HANDOFF（`0358135`/`829342a`）与三个 issue 评论——仍有效，勿丢。
2. **收官状态** `eb1500a`。
3. **#83 启动后主动暂停**（下文）。

---

## #83 暂停记录（下一棒第一优先）

**状态**：调查与机制验证 100% 完成、**实现 0%**（零代码改动、零测试文件修改、树干净）。
**暂停原因**：执行者对本轮末端工具输出的判读连续不可靠——在「不改任何测试语义」硬约束下
继续编辑测试文件风险不可接受，按止损规程交棒。**以下工程事实来自 tsc 三轮稳定输出，可信。**

### 已定案的机制（直接照抄）

`build:core` = `tsc`（emit dist、rootDir=src）→ **不能**把 tests 塞进主 tsconfig（会 emit 测试 / TS6059）。
正确机制 = 专用 typecheck 配置 + typecheck 脚本指向它：

```jsonc
// physics-core/tsconfig.typecheck.json （已验证可复现 24 错）
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": true, "rootDir": "..", "types": ["node"] },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```
根 package.json `typecheck` 改：`cd physics-core && npx tsc --noEmit -p tsconfig.typecheck.json`。

**两个已踩过的坑**：
- `extends` 会继承主配置 `rootDir: "src"` → 必须显式覆盖；`rootDir: ".."`（仓库根）以容纳
  optics-waves.test.ts 对 repo 根 `scripts/lib/find-non-finite.ts` 的合法跨包导入（该文件类型干净）。
- `@types/node` 已在 physics-core/node_modules/@types —— `"types": ["node"]` 即解 TS2591 ×2。

### 24 个真实错误清单（全部「真实错误」类，无一属 #10 排除项；实测于该配置）

| 文件:行 | 码 | 修法（改写法不改语义） |
|---|---|---|
| base-validate.test.ts:133,144 | TS2540 | `problem.bodies = [...]` readonly——改为构造时注入（makeProblem 支持则传参，否则展开覆盖） |
| gas-law.test.ts:19-21 | TS2540 | `model.initialPressure/Volume/Temperature = x` readonly——改为构造参数注入 |
| center-of-gravity.test.ts:28 | TS2551 | `.solver` → `.solve`（API 改名测试未跟；该行断言 solver 不存在，改为对现 API 的等价断言） |
| geometry-units.test.ts（12 错） | TS2339/18046/7006/2345 | helper 返回无类型 `{}`/`unknown`——给 helper 标注返回类型（plates/lines 结构），连锁消除 |
| inertia.test.ts:215 | TS2578 | 删除已失效的 `@ts-expect-error` 指令 |
| integration-stability.test.ts:47 | TS2352 | `Record<string,unknown>[]` → `PhysicalBody[]` 改 `as unknown as`（刻意测试 cast，语义不变） |
| integration-stability.test.ts:199 | TS18048 | `curve.points` 可能 undefined——`?? []` 或空守卫 |
| uniform-electric-field.test.ts:3 | TS2459 | `PhysicalBody` 未从 types/problem.js 导出——查正确导出模块后改 import |
| boris-correctness.test.ts:217 | TS2339 | `ChartSeries \| ForceDiagram` 联合——`'points' in x` 窄化 |
| fixtures.test.ts:63 | TS2353 | `SimplePendulumConstraint` 无 `gravity` 键——核对类型定义：多余键删除或类型补可选字段（以类型真值为准） |

### 下一棒第一步（照单执行，预计一个短棒）

1. 重建 `tsconfig.typecheck.json`（上方内容）→ `npx tsc --noEmit -p tsconfig.typecheck.json` 应复现 **24 错**。
2. 按表逐文件修（**每处修改前重新精读该文件现场，不要凭本表记忆**）。
3. 全量引擎测试必须仍 **1114 全绿**（语义未变的证明）。
4. 根 package.json 接线 typecheck 脚本 → `precheck` 全绿 → count:sync → commit/push → issue #83 回写（附 24 错分类统计，满足验收 3）。
5. 验收对照：①tsc 覆盖测试且绿 ②2 处已知 readonly 修掉 ③>20 错已列分类统计 ④precheck 绿。

### 纪律提醒（本棒的真实教训）

- **Bash cwd 跨调用残留**：`cd physics-core` 后所有相对路径错位解析——命令一律绝对路径或开头 `cd <repo根> &&`。
- **判读纪律**：连续两次对文件内容判读不确定 → 立即停止编辑、交棒。宁慢勿错。
- 长会话优先信确定性工具（tsc/vitest/git）的输出；grep/sed 结果做修改前必须重新精读现场。

---

## 队列（规划者 `40ab0c3` 后）

**#83（暂停中，接上表）→ #84（空 catch 静态守卫）→ #85（4 大锤恢复）→ #86（K2 设计调查）→ #89（巡检判据扩展，规划者新立）→ #60 → #68 → #74–#77 → #61 → #82 → #62–#66**；#44 人类持有勿动。

## 阻塞项 / 风险
- 无外部阻塞。#44 勿动；自检 11 层；工作树干净；远程同步至 `40ab0c3`（本棒最后推送 `eb1500a` + 本次 chore）。
- 并发规划会话活跃（`40ab0c3` 刚落）：引用 issue 编号前先查列表。

## 环境备注（继承，仍有效）
- `export PATH="$HOME/.local/share/mise/shims:$PATH"`；杀 dev server `node .scratch/kill-vite.cjs`；pkill 用 `vite.[p]review` 转义。
- canvas 常驻后巡检就绪信号 = 「激活项匹配 + 2 rAF」；WebGLRenderer.render 是实例属性，计数用 getContext 包装。
- headless chromium rAF/截图可用；跑巡检不编辑 src；改 physics-core/src 后 prettier 需 build:core。
- 探针在 `.scratch/`：`probe-79-render.cjs`（draw-call/渲染计数）、`probe-81-context.cjs`（切换配对计时 + programs）。
- 自检 11 层；测试数真值 **core 1114 / viz 1452 / total 2566**。
