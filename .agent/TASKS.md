# TASKS（Issue 本地镜像 · 规划者每轮整体重写）

> 权威来源 = GitHub Issues（gh 可用，本轮已同步 2026-10-13）。标签映射：`ready-for-agent` ≡ ready；
> `closed` ≡ done。本文件只读镜像，执行者改状态时先改 Issue 再同步本行（冲突以 Issue 为准）。
> `.agent/DIARY/` 缺失（执行者沿用旧体系 HANDOFF，未写日报）；昨日工作已用 git log + Issue comment + STATE 反推。

## 今日队列（执行顺序，2 个，全部过 ready 门禁）

- [ ] #116（P2 · type:docs · ready-for-agent）README 演示截图重采：同步 #111/#112/器材增多后的 03/04/06 画面
  —— 验收要点：01/02 md5 与旧版一致；04 弹窗归位、06 含 6 器材；precheck 绿；仅 docs/screenshots 变化
- [ ] #117（P3 · type:chore/area:ci · ready-for-agent）依赖安全审计 triage（只报告不升级）
  —— 验收要点：prod audit 原文摘录；high+ 逐条去向；lockfile 零改动

## 本轮关闭（done，本轮规划者验收通过）

- [x] #113（P2）条形磁铁器材 —— 独立重跑 33+58 全绿；偶极值独立复算 1.25e-4T 一致；CI 后继全绿
- [x] #114（P2）匀强磁场区器材 —— 独立重跑 33+58 全绿；硬边界注释在案；B=0 空盒为范围外已知行为，接受
- [x] #106（P3）冒烟脚本参数化 —— 独立端到端 :3220 + 自带 chromium exit 0；三脚本 node --check 过
- [x] #115（P3）截图确定性收尾 —— (b) 属授权二选一；措辞/代码行/时间线逐项复核；证据文件在案

## 候选 / parked（不执行）

- #100（P2）/#101（P3）/#102（P3）/#103（P2）/#104（P3）—— ready-for-agent 但 D19 用户已定 parked，不进队列
- #99（P2）/ #105（P3）—— needs-info（D20/D21：真实发布暂缓、英文随发布走），待方向决策 D29
- #44（P2）—— 人类持有，无状态标签，勿动

## 标签说明

- 状态：ready-for-agent（可执行）· in-progress（执行中）· in-review（待验收）· needs-info（需决策）；closed = done
- 本仓库沿用 `ready-for-agent`（历史约定），不引入新 `ready` 标签，避免执行侧识别断裂
