# PhysVis 开发任务清单

> 自主工作循环 (`/loop`) 按顺序执行以下任务。
> 修改本文件可调整任务优先级和内容。

## 阶段二：验证第三章场景

- [x] 验证第三章 4 个新场景的可视化效果 ✅ 2026-07-05
  - 验证结果：123/123 单元测试通过 │ tsc --noEmit 通过 │ vite build 通过 (2.29s) │ 4 个模型端到端求解成功
  - hooke-law → spring-oscillator → 轨迹 201 点 ✓
  - sliding-friction → sliding-friction → 轨迹 401 点 ✓
  - force-composition → force-composition → 静态公式渲染 ✓
  - newton-third-law → newton-third-law → 双体轨迹 300 点 ✓

## 阶段三：必修一第四章「运动和力的关系」

- [x] 实现 NewtonSecondLaw 模型 (physics-core) ✅ 2026-07-05
  - 提交：dd797ab feat: 牛顿第二定律 F=ma 分析解模型 (必修一第四章)
  - 13 个单元测试通过；0 类型错误；vite build 通过

- [x] 实现牛顿第二定律可视化场景 ✅ 2026-07-05
  - 提交：c5d7064 feat: 牛顿第二定律可视化场景 (必修一第四章)
  - sceneRegistry 6 参数；标准渲染流程；端到端验证 F=10N m=2kg t=3s → v=15m/s x=22.5m

- [x] 实现牛顿第一定律（惯性）可视化场景 ✅ 2026-07-05
  - 提交：1bd45a6 feat: 牛顿第一定律 (惯性) 可视化场景
  - 复用 uniform-linear 模型 (零外力 → 匀速直线运动)
  - 验证：v=2m/s 持续 5s 匀速，Δx=10m

## 阶段四：必修二

- [x] 扩展抛体运动场景（平抛 + 斜抛） ✅ 2026-07-05
  - 提交：dc28b30 feat: 抛体运动模型 (平抛+斜抛) — 必修二第一章
  - 新建 ProjectileModel：vx/vy 分运动分解，恒定水平速度
  - 特征量：射程/最高点/飞行时间；图表：vx-t, vy-t, 能量-t
  - 11 个测试通过；sceneRegistry 升级到 projectile 模型 + 发射高度参数

- [x] 扩展圆周运动场景（向心力、向心加速度） ✅ 2026-07-05
  - 提交：25f951a feat: 圆周运动场景扩展 (圆锥摆 + 受力分析图)
  - 圆锥摆：ω 自动由 g/(L·cosθ)；有效半径 r=L·sinθ
  - 受力分析图 + F-t 图表；summary 显示 F_c, v, a_c, T

- [x] 实现万有引力与航天场景 ✅ 2026-07-05
  - 提交：d370409 feat: 万有引力与航天模型 (必修二第三章)
  - Velocity Verlet 轨道积分；第一/第二宇宙速度
  - 关键点检测近/远地点 (开普勒第二定律)
  - ISS 实测: v=7.67km/s T=92.4min; 10 个单元测试通过

- [x] 实现机械能守恒场景 ✅ 2026-07-05
  - 提交：faa4f0b feat: 机械能守恒定律场景 + 修复重力势能计算
  - 新增 energy-conservation 场景 (可控摩擦力 → 守恒/损耗对比)
  - 修复 uniform-accelerated 势能 (原硬编码为 0)
  - 新增 ke-t, pe-t, energy-t 图表 (验证 E 恒定 98J)

## 阶段五：选择性必修 (待实现)

- [x] 实现动量守恒场景 ✅ 2026-07-05
  - 提交：785cde6 feat: 动量定理与反冲模型 (选必一第一章)
  - 新建 MomentumModel：恒力冲量 + 反冲两模式
  - 冲量 J=F·Δt=Δp 验证；反冲总动量守恒恒为 0
  - 9 个单元测试通过

- [~] 实现简谐运动场景
  - 描述：弹簧振子、单摆的简谐运动
  - 参考：experiments/选必一_第2章_机械振动.md

- [ ] 实现机械波场景
  - 描述：横波、纵波传播，波的干涉/衍射
  - 参考：experiments/选必一_第3章_机械波.md
