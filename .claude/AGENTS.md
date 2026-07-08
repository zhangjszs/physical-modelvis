# PhysVis 3D 转换 — 完成态参考手册

> 3D 覆盖率 100% (123/123) 已于 2026-07-08 达成。本档记录既有架构与约定，
> 供未来维护 / 新增实验时快速恢复上下文。

## 状态快照

| 指标 | 数值 |
|------|------|
| **3D 覆盖率** | 123 / 123 场景 ✅ 100% (2026-07-08 达成) |
| **可复用 rig 实现** | 49 个 |
| **可复用器材构建器** | 14 种 |
| **懒加载 bundle** | 6 chunk（按教材分组） |
| **首屏 bundle** | 440 kB / gzip 118 kB（Three.js 完全隔离） |
| **Lint / Build / Test** | ✅ 全通过 (1092 tests) |
| **verify:3d** | ✅ 通过 |
| **覆盖率契约测试** | ✅ tests/accuracy/rig-contract.test.ts 全 123 场景通过 |

## 项目结构

```
physics-core/                    ← 零依赖 TypeScript 物理引擎
  src/models/                    ← 物理模型 (解析解 + Boris 数值)

visualization/                   ← React 前端
  src/
    scenes/
      sceneRegistry.ts           ← 123 个 SceneConfig
      ProjectileScene.tsx        ← 教室布局: 目录 / 3D 舞台 / 参检器
    components/
      simulation3d/
        EquipmentStage.tsx       ← 通用 3D 舞台 (React.lazy 懒加载)
        primitives.ts            ← 几何/材质/文字精灵助手 (独立模块)
        rigs/
          index.ts               ← 懒加载注册表 SCENE_TO_MODULE + loadSceneRig()
          bundles/               ← 6 模块 bundle (动态 import 按需加载)
          *.ts                   ← 49 个 SceneRig 实现
        equipment/               ← 14 种器材构建器
    utils/
      frameUtils.ts              ← findFrameIndex / interpolateFrame / getTotalDuration
    tests/accuracy/
      rig-contract.test.ts       ← 123 场景 SceneRig 接口契约自检
```

## 核心约定

```ts
export interface SceneRig {
    worldScale?: number;        // 米 → Three.js 单位，默认 0.16
    ballRadius?: number;        // 球半径，默认 0.22
    clampToGround?: boolean;    // 仅抛体/落体/斜面等有地面实验开启
    buildEquipment(scene, params): { group: THREE.Group; handles: Record<string, unknown> };
    updateEquipment(handles, params): void;
    getVisualPosition(pos: {x, y}, params): THREE.Vector3;
    getOrigin(params): THREE.Vector3;
}
```

**坐标约定**: 引擎 y 向上 → Three.js y 向上，自由落体 pos.y 从 height→0 直接 `pos.y * WORLD_SCALE`。

## 转译原则（不要把公式画成 3D，把实验动作转译成器材）

1. **参数→器材状态**：θ 控制发射筒角度，h0 控制升降柱高度，v0 控制绿色箭头
2. **坐标系→测量工具**：地面卷尺测水平位移，高度尺测竖直距离
3. **轨迹→运动证据**：小球残影 + 当前球 + 投影线 + 地面阴影
4. **空间关系对齐**：发射口、小球、轨迹起点在同一坐标系
5. **公式后置**：主舞台只负责建立直觉，公式推导在抽屉里

## 命令速查

```bash
# 安装
cd physics-core && npm install && npm run build && cd ..
cd visualization && npm install

# 开发
cd visualization && npm run dev

# 验证 3D 完整性
cd visualization && npm run verify:3d

# 完整检查
cd visualization && npm run verify:3d && npm run lint && npm run build && npm test
```

## 架构要点

- **EquipmentStage 走 React.lazy**：Three.js (≈450 kB gzip) 完全隔离出首屏，仅在进入 3D 实验时下载
- **场景切换**：`<LazyEquipmentStage key={currentScene} rig={rig} />` 确保 remount
- **懒加载双层**：bundle 模块级动态 import (6 chunk) + EquipmentStage 组件级 React.lazy
- **rAF 稳定性**：currentTime/parameters/visibleLayers 用 ref 同步，不放进 effect 依赖
- **primitives.ts 独立**：器材构建器与舞台解耦，rigs 直接从 `../primitives` 导入助手

## 关键文件清单

| 文件 | 职责 |
|------|------|
| `EquipmentStage.tsx` | 通用 3D 舞台 (rAF 循环、环境、运动证据、资源释放) |
| `primitives.ts` | makeBox/makeCylinder/makeSphere/makeTextSprite/makeLine/disposeObject 等 |
| `rigs/index.ts` | SCENE_TO_MODULE 路由 + loadSceneRig() + hasSceneRig() |
| `rigs/bundles/*.ts` | 按教材分组的 rig 注册表 (export default) |
| `ProjectileScene.tsx` | 教室布局 + 异步加载当前场景 rig + 2D/3D 切换 |
| `verify-3d-coverage.mjs` | 自动化校验脚本 |
