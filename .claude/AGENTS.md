# PhysVis 3D 转换 Loop

> 新话题直接贴这段就能继续：我在做高中物理实验 2D→3D 转换，当前状态见本文档。请接着完成未完成的工作。

## 当前状态（截至 2026-07-08）

| 指标 | 数值 |
|------|------|
| **3D 覆盖率** | 123 / 123 场景 (100%) |
| **可复用 rig 类型** | 45 种 |
| **懒加载模块 chunk** | 6 个（按教材分组） |
| **Lint / Build / Test** | ✅ 全通过 |
| **verify:3d** | ✅ 通过 |

## 项目结构

```
physics-core/                    ← 零依赖 TypeScript 物理引擎
  src/models/                    ← 物理模型（匀速/匀变速/电场/磁场/碰撞/弹簧...）

visualization/                   ← React 前端
  src/
    scenes/
      sceneRegistry.ts           ← 123 个 SceneConfig（id, name, model, buildProblem）
      ProjectileScene.tsx        ← 场景容器：hasSceneRig → EquipmentStage / SimulationCanvas
    components/
      simulation3d/
        EquipmentStage.tsx       ← 通用 3D 舞台（rAF 循环、环境、运动证据）
        primitives.ts            ← 几何/材质/文字精灵助手
        rigs/
          index.ts               ← 懒加载注册表 SCENE_TO_MODULE + loadSceneRig()
          bundles/               ← 6 个模块 bundle（动态 import 按需加载）
            mechanicsBundle.ts   ← 必修一（27 场景）
            eMechBundle.ts       ← 必修二（12 场景）
            emBundle.ts          ← 必修三（19 场景）
            opticsBundle.ts      ← 选必一（17 场景）
            inductionBundle.ts   ← 选必二（16 场景）
            modernBundle.ts      ← 选必三（32 场景）
        equipment/               ← 14 种器材构建器（发射器/铁架台/打点计时器...）
```

## 核心接口

```ts
// SceneRig — 每个 3D 实验实现此接口
export interface SceneRig {
    worldScale?: number;        // 米 → Three.js 单位，默认 0.16
    ballRadius?: number;        // 球半径，默认 0.22
    clampToGround?: boolean;    // 是否夹高到地面（仅抛体/落体/斜面开启）
    buildEquipment(scene, params): { group: THREE.Group; handles: Record<string, unknown> };
    updateEquipment(handles, params): void;
    getVisualPosition(pos: {x, y}, params): THREE.Vector3;  // 物理坐标 → 3D
    getOrigin(params): THREE.Vector3;                        // 轨迹起点
}
```

## 转译原则（不要把公式画成 3D，把实验动作转译成器材）

1. **参数→器材状态**：θ 控制发射筒角度，h0 控制升降柱高度，v0 控制绿色箭头
2. **坐标系→测量工具**：地面卷尺测水平位移，高度尺测竖直距离
3. **轨迹→运动证据**：小球残影 + 当前球 + 投影线 + 地面阴影
4. **空间关系对齐**：发射口、小球、轨迹起点在同一坐标系
5. **公式后置**：主舞台只负责建立直觉，公式推导在抽屉里

## 如何新增一个 3D 实验（如果以后有新的 sceneRegistry 条目）

### Step 1: 在 `rigs/` 下新增或复用 rig

```ts
// rigs/myNewRig.ts
export const myNewRig: SceneRig = {
    worldScale: 0.16,
    buildEquipment(scene, params) {
        // 构建器材，添加到 group
        const group = new THREE.Group();
        // ... makeBox, makeCylinder, makeSphere, makeTextSprite 等
        return { group, handles: { /* 内部句柄 */ } };
    },
    updateEquipment(handles, params) { /* 参数变化时更新 */ },
    getVisualPosition(pos, _params) {
        return new THREE.Vector3(pos.x * 0.16, Math.max(0, pos.y * 0.16), 0);
    },
    getOrigin(_params) { return new THREE.Vector3(0, 1.5, 0); }
};
```

### Step 2: 在对应 bundle 中注册（不是 index.ts）

```ts
// bundles/mechanicsBundle.ts（或对应模块的 bundle）
import { myNewRig } from '../myNewRig';
export default {
    // ... 已有条目
    'my-new-scene-id': myNewRig,
};
```

### Step 3: 在 index.ts 的 SCENE_TO_MODULE 中添加路由

```ts
const SCENE_TO_MODULE = {
    // ... 已有条目
    'my-new-scene-id': 'mechanics',  // 指定归属模块
};
```

### Step 4: 验证

```bash
cd visualization
npm run verify:3d              ← 检查 123+1 覆盖、bundle 导出、loader 形态、OMC 污染
npm run lint
npm run build
npm test
```

## 注意事项

- **物理坐标约定**：引擎 y 轴向上，自由落体 pos.y 从 height→0（直接 `pos.y * WORLD_SCALE` 即可）
- **场景切换**：`<EquipmentStage key={currentScene} rig={rig} />` 确保 remount
- **懒加载**：bundle 用 `export default`，loader 取 `.default`
- **rAF 稳定性**：currentTime/parameters/visibleLayers 用 ref 同步，不放进 effect 依赖
- **clampToGround**：仅抛体/落体/斜面等有地面实验开启

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
