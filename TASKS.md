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

- [~] 扩展抛体运动场景（平抛 + 斜抛）
  - 描述：增强 projectile 场景，支持斜抛运动，展示轨迹分解
  - 涉及文件：visualization/src/rendering/, physics-core/src/models/
  - 参考：experiments/必修二_第1章_抛体运动.md

- [ ] 扩展圆周运动场景（向心力、向心加速度）
  - 描述：增强 circular-motion 场景，展示向心力矢量、向心加速度
  - 涉及文件：visualization/src/rendering/, physics-core/src/models/
  - 参考：experiments/必修二_第2章_圆周运动.md

- [ ] 实现万有引力与航天场景
  - 描述：卫星轨道运动、宇宙速度可视化
  - 涉及文件：physics-core/src/models/, visualization/src/rendering/
  - 参考：experiments/必修二_第3章_万有引力与航天.md

- [ ] 实现机械能守恒场景
  - 描述：动能、势能转换，机械能守恒定律演示
  - 涉及文件：physics-core/src/models/, visualization/src/rendering/
  - 参考：experiments/必修二_第4章_机械能及其守恒定律.md

## 阶段五：选择性必修

- [ ] 实现动量守恒场景
  - 描述：碰撞中的动量守恒，弹性/非弹性碰撞对比
  - 参考：experiments/选必一_第1章_动量守恒定律.md

- [ ] 实现简谐运动场景
  - 描述：弹簧振子、单摆的简谐运动
  - 参考：experiments/选必一_第2章_机械振动.md

- [ ] 实现机械波场景
  - 描述：横波、纵波传播，波的干涉/衍射
  - 参考：experiments/选必一_第3章_机械波.md
