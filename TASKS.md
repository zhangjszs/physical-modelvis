# PhysVis 开发任务清单

> 自主工作循环 (`/loop`) 按顺序执行以下任务。
> 修改本文件可调整任务优先级和内容。

## 流程约定 (2026-07-05 更新)

每个任务实现后、commit 前，必须执行一轮 **代码审查**（见 `AGENTS.md > 代码审查约定`）：

1. `git diff --cached` 查看已暂存改动
2. 按 AGENTS.md 中 6 个审查维度逐一审查
3. 发现问题 → 修复 → 重新 typecheck/test → 重新暂存
4. 审查通过 → commit

+ 后台加载一个 `general-purpose` agent 执行代码审查，主线程继续执行下一步。

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

- [x] 实现简谐运动场景 ✅ 2026-07-05
  - 提交：aed43b6 feat: 单摆简谐运动模型 (选必一第二章)
  - 新建 SimplePendulumModel (Velocity Verlet)
  - 任意角度精确 + 小角度 T=2π√(L/g)
  - 阻尼选项、能量守恒/振幅衰减对比
  - 12 个测试通过

- [x] 实现机械波场景 ✅ 2026-07-05
  - 提交：c874bb9 feat: 机械波模型 (选必一第三章)
  - 新建 MechanicalWaveModel: 横波/纵波/干涉三模式
  - 离散 81 质点 + 相位差；干涉形成驻波波节
  - 11 个测试通过

## 阶段六：选必一 第四章「光」

- [x] 实现折射定律模型 (physics-core) ✅ 2026-07-05
  - 提交：3dce3f8 feat: 光学模型 — 折射定律 + 双缝干涉 (选必一第四章)
  - 9 个单元测试通过；全反射临界角、sinθ₁-sinθ₂ 线性验证

- [x] 实现双缝干涉模型 (physics-core) ✅ 2026-07-05
  - 同上提交 (同一 commit)
  - 9 个单元测试通过；等间距峰值、薄膜增透/增反

- [~] 光学可视化场景 (折射 + 干涉) 📐 2026-07-05
  - 在 sceneRegistry 注册 refraction + interference 场景
  - 折射：可调入射角/两种介质，实时显示反射+折射光线，全反射警示
  - 干涉：可调 d/L/λ，显示条纹图案和光强曲线
  - 涉及文件：visualization/src/scenes/sceneRegistry.ts
  - 参考：experiments/选必一_第4章_光.md

## 阶段七：必修三 电路与电能

- [ ] 实现直流电路模型 (physics-core) 📐 2026-07-05
  - 描述：串并联电路分析；欧姆定律、电功率；U-I 图
  - 新建 CircuitModel: 电阻串并联、电源内阻、输出功率
  - 涉及文件：physics-core/src/models/circuit.ts；test: circuit.test.ts
  - 参考：experiments/必修三_第3章_电路及其应用.md

- [ ] 实现伏安特性曲线场景 📐 2026-07-05
  - 灯泡 (非线性) vs 线性电阻；测量电动势和内阻
  - 涉及文件：visualization/src/scenes/sceneRegistry.ts
  - 参考：同上

## 阶段八：选必三 分子动理论与热力学 (入门)

- [ ] 实现分子运动 / 气体定律可视化场景 📐 2026-07-05
  - 布朗运动 (随机粒子模拟)；p-V-T 状态方程；p-V 图
  - 新建 GasLawModel: pV=nRT
  - 涉及文件：physics-core/src/models/gas-law.ts；visualization scene
  - 参考：experiments/选必三_第1章_分子动理论.md
