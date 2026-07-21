# 3D 渲染模块重构与修复总结

> **日期**：2026-07-22  
> **范围**：`visualization/src/components/simulation3d/` 及相关场景  
> **Three.js 版本**：0.185.1  
> **修改文件数**：5

---

## 一、修复总览

本次修复涵盖三类问题：

| 类别 | 问题数 | 严重程度 | 说明 |
|---|---|---|---|
| Three.js 弃用 API | 2 处 | ⚠️ 中等 | 控制台警告，长期可能失效 |
| 运行时崩溃（场景切换） | 1 处 | 🔴 严重 | 切换 3D 场景时白屏回退 2D |
| 防御性编程加固 | 3 处 | 🟡 一般 | 避免 StrictMode 下偶发报错 |

---

## 二、Three.js 弃用 API 修复

### 2.1 PCFSoftShadowMap → PCFShadowMap

**文件**：`visualization/src/components/simulation3d/EquipmentStage.tsx`  
**行号**：第 135 行

**问题**：
```
THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
```
Three.js r180+ 中 `PCFSoftShadowMap` 被弃用，统一使用 `PCFShadowMap`。

**修复**：
```diff
- renderer.shadowMap.type = THREE.PCFSoftShadowMap;
+ renderer.shadowMap.type = THREE.PCFShadowMap;
```

**视觉影响**：阴影边缘会略显硬朗。如需软阴影效果，可通过提高 `shadow.mapSize` 或使用 `light.shadow.radius` 调节。

---

### 2.2 OrbitControls 导入路径迁移

**文件**：`visualization/src/components/simulation3d/EquipmentStage.tsx`  
**行号**：第 16 行

**问题**：`three/examples/jsm/` 是旧版路径，Three.js r162+ 推荐使用 `three/addons/`。当前虽无警告，但属于推荐迁移项。

**修复**：
```diff
- import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
+ import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

---

## 三、运行时崩溃修复

### 3.1 场景切换时 3D 舞台崩溃

**文件**：`visualization/src/scenes/ProjectileScene.tsx`  
**行号**：第 136 行（新增 `setRig(undefined)`）

#### 现象

从一个 3D 场景切换到另一个 3D 场景时（如"抛体运动" → "碰撞"），控制台报错：

```
TypeError: Cannot read properties of undefined (reading 'scale')
  at Object.updateEquipment (collisionRig.ts:27:8)
```

随后 ErrorBoundary 触发，回退到 2D 画面。

#### 根本原因

**rig 异步加载与组件 key 的时序不匹配**：

1. 用户点击切换场景 → `currentScene` 变化
2. `key={currentScene}` 变化 → EquipmentStage 组件卸载并重新挂载
3. **但此时 `rig` state 仍保留旧值**（因为异步加载还没完成，state 没重置）
4. 新的 EquipmentStage 用**旧 rig** 构建了场景（旧 handles 结构）
5. 新 rig 异步加载完成 → `setRig(newRig)`
6. `updateEquipment` effect 触发，用**新 rig 的逻辑**操作**旧 handles** → 属性不存在 → 崩溃

#### 修复方案

在 rig 加载 effect 的开头立即重置 `rig` 为 `undefined`：

```diff
  useEffect(() => {
      let cancelled = false;
      const sceneId = currentScene;
      const is3D = hasSceneRig(sceneId);
+     setRig(undefined);
      setRigLoading(is3D);
      setRigError(null);
      // ... 异步加载逻辑
  }, [currentScene]);
```

**效果**：场景切换时，`rig` 立即变为 `undefined`，渲染逻辑进入"加载中"状态（显示 spinner），而非用旧 rig 错误地构建新场景。等新 rig 加载完成后，才用正确的 rig 挂载 EquipmentStage。

---

## 四、防御性编程加固

### 4.1 设备更新函数空值检查

为以下三个设备更新函数增加了 `handles` 参数的空值检查，解决 React StrictMode 双挂载导致的偶发时序问题：

| 设备 | 文件 |
|---|---|
| 高度尺 | `visualization/src/components/simulation3d/equipment/heightRuler.ts` |
| 斜面 | `visualization/src/components/simulation3d/equipment/inclinedPlane.ts` |
| 发射器 | `visualization/src/components/simulation3d/equipment/launcher.ts` |

**修复模式**（以 `updateHeightRuler` 为例）：

```diff
- export function updateHeightRuler(handles: HeightRulerHandles, ...): void {
+ export function updateHeightRuler(handles: HeightRulerHandles | undefined, ...): void {
+     if (!handles || !handles.group) return;
      // ... 原有逻辑
  }
```

**说明**：这是**治标不治本**的防御手段。根本问题（场景切换崩溃）已通过 3.1 节的方案解决。空值检查作为兜底，确保即使时序出现意外也不会导致整页崩溃。

---

## 五、Three.js 弃用 API 全面扫描结果

基于 three.js 0.185.1，对 85 个 3D 相关文件做了静态扫描，以下为常见弃用项的检查结果：

| 弃用项 | 弃用版本 | 检查结果 |
|---|---|---|
| `Geometry` / `Face3` | r125 | ✅ 未使用（全用 `BufferGeometry`） |
| `PCFSoftShadowMap` | r180+ | ✅ 已修复 |
| `sRGBEncoding` / `outputEncoding` | r152 | ✅ 未使用（用 `colorSpace` + `SRGBColorSpace`） |
| `LineBasicMaterial.linewidth` | 始终不支持 | ✅ 未使用 |
| `vertexColors: THREE.VertexColors` | r128 | ✅ 未使用 |
| `three/examples/jsm/` 路径 | r162（推荐迁移） | ✅ 已修复 |
| `CanvasTexture` | — | ✅ 正常使用 |
| `MathUtils.clamp` | — | ✅ 新 API，正常 |
| `OrbitControls.enableDamping` 等 | — | ✅ 当前 API，正常 |

**结论**：当前代码库已无 Three.js 控制台警告级别的弃用 API。

---

## 六、验证结果

### 6.1 静态检查

- ✅ TypeScript typecheck （`tsc --noEmit`）通过
- ✅ 无 ESLint 错误

### 6.2 单元测试

```
Test Files  18 passed (18)
     Tests  393 passed (393)
  Duration  14.30s
```

- 包含 123 个场景的 `solveProblem` 数值鲁棒性测试
- 包含 123 个场景的 rig 异步加载 + `buildEquipment` 契约测试

### 6.3 手动验证建议

浏览器端需手动验证以下场景切换链路（覆盖不同类型 rig）：

1. 力学类：抛体运动 ↔ 自由落体 ↔ 斜面运动 ↔ 碰撞 ↔ 弹簧振子
2. 电磁类：匀强电场 ↔ 匀强磁场 ↔ 直流电路分析
3. 光学类：全反射与光导
4. 热学类：扩散现象
5. 近代物理：光电效应 ↔ α 粒子散射实验 ↔ 霍尔元件

每个场景切换后确认：
- 3D 场景正常渲染，无白屏
- 控制台无 error / warning
- 参数调节正常响应

---

## 七、后续优化建议

### 7.1 EquipmentStage 初始化 useEffect 依赖

当前初始化 useEffect 依赖为 `[]`，完全依赖上层 `key` 触发重建。可考虑将 `rig` 加入依赖，使 rig 变化时自动重建场景，进一步增强健壮性。

**风险**：如果 rig 引用频繁变化（如每次 render 都创建新对象），会导致场景反复重建。需确保 rig 引用稳定。

### 7.2 更多 rig 的 updateEquipment 防御性检查

当前仅对抛体运动相关的 3 个设备函数做了空值检查。54 个 rig 的 `updateEquipment` 都直接访问 `handles.xxx`，理论上在时序异常时都可能崩溃。建议：

- 方案 A：统一在 `EquipmentStage` 的 `updateEquipment` 调用外包 try-catch
- 方案 B：为每个 rig 的 `updateEquipment` 增加 handles 结构校验

### 7.3 阴影质量回退

`PCFShadowMap` 阴影边缘较硬，如需提升视觉效果，可考虑：
- 提高 `DirectionalLight.shadow.mapSize`（如 2048×2048）
- 调整 `shadow.bias` 减少阴影锯齿
- 使用 `light.shadow.radius` 增加模糊（r180+ 支持）

---

## 八、修改文件清单

| 文件 | 修改类型 | 行数变化 |
|---|---|---|
| `visualization/src/components/simulation3d/EquipmentStage.tsx` | 弃用 API 修复 | +2 / -2 |
| `visualization/src/components/simulation3d/equipment/heightRuler.ts` | 防御性加固 | +2 / -1 |
| `visualization/src/components/simulation3d/equipment/inclinedPlane.ts` | 防御性加固 | +2 / -1 |
| `visualization/src/components/simulation3d/equipment/launcher.ts` | 防御性加固 | +2 / -1 |
| `visualization/src/scenes/ProjectileScene.tsx` | 崩溃修复 | +1 / -0 |
| **合计** | — | **+9 / -5** |
