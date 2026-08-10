# 🧭 后续开发提示（NEXT STEPS）

> 本文件是给下一位开发者 / AI Agent 的**接力提示**，说明当前进度、可选方向与动手切入点。
> 项目全景请配合根目录 [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md)（当前 v1.9）阅读。

---

## ✅ 已完成（截至 2026-07-13）

| 模块 | 状态 | 说明 |
|---|---|---|
| 2D 自定义渲染器 | ✅ 100% | 电磁 9 / 光学 5 / 近代 10 / 热学 1，共 25 个新场景，均已接入 `renderer-routing` |
| 3D 器材 rig 覆盖 | ✅ 100% | EquipmentStage 全部 **123 场景**均映射到实验专属/领域匹配 rig，无通用占位（`modernPhysicsRig`、`thermalRig` 已删除） |
| 3D rig 参数响应 | ✅ 16 个 | 器材随滑块实时变化；剩余约 12 个空实现经评估为合理静态 |
| CI 门禁 | ✅ 全绿 | tsc / eslint / prettier / vitest 255 / self-check / build 六门禁通过 |

---

## 🔮 可选后续方向（按推荐度排序）

### 1. 视觉真实感精修（美观向，无逻辑风险）
- 为关键 3D rig 增加 PBR 材质、环境光/方向光、阴影与背景板。
- 切入点：`visualization/src/components/simulation3d/` 下的灯光与场景初始化；`primitives.ts` 的材质工厂（当前用 `MeshStandardMaterial`，已支持 `emissive`）。
- 注意：只改观感、不动参数逻辑，改完跑一次 `npm run build` 确认。

### 2. 构建体积优化（工程向）
- 现存唯一构建警告：`vendor-physics > 500kB`。
- 切入点：`visualization/vite.config.ts` 的 `manualChunks`，进一步拆分 physics-core 或按模块懒加载。
- 目标：消除警告、加快首屏。

### 3. 剩余 12 个空实现 rig 复核（低性价比）
- 已评估为静态器材/异构示意（牛顿定律演示、静态量具、几何/波动/核物理/光电通用示意、`cavendishRig` 仅 `duration`）。
- 仅当产品需要"教具动起来"时再逐个评估，不建议无差别补全。

### 4. 2D 渲染器巡检（质量向）
- 复核已写的 25 个 2D 渲染器，排查视觉对齐/插值/交互细节 bug，统一样式。
- 切入点：`visualization/src/rendering/*Scenes.ts` + `SimulationCanvas.tsx`。

---

## 🛠️ 动手前必读约定

1. **技术栈**：physics-core（零依赖 TS 引擎）→ visualization（React18 + TS + Vite6 + Zustand + Recharts + Three.js）。
2. **两套 3D 系统**：`SCENES_3D` 伪 3D Canvas（仅 4 个力学场景）；EquipmentStage 真实 Three.js 器材系统（`hasSceneRig`，123 场景）。
3. **新增 3D 场景**：按 `SceneRig` 接口（`buildEquipment` / `getVisualPosition` / `updateEquipment`）实现 rig，在对应 `rigs/bundles/*Bundle.ts` 注册即可，不留占位。
4. **参数响应**：`updateEquipment` 里用 `num(v, fallback)`（**双参必填**）取值；跨场景可选参数用 `num(x, NaN)` + `Number.isNaN` 跳过，避免误改器材。
5. **CSS**：`visualization/src/styles.css` 不受 prettier/eslint 检查，改后必须 `npm run build` 确认语法。
6. **品牌色**：统一用 token `--brand` / `--brand-2` / `--brand-gradient`，禁止硬编码 `#a855f7`。

---

## 🚦 提交前门禁（必须全绿）

```bash
cd visualization
npx tsc --noEmit          # G1 类型检查
npm run lint              # G2 eslint（仅 src/ 与 server/）
npx prettier --check src  # G3 格式（改动文件先 --write）
npx vitest run            # G4 单测 255（含 L2-RIG 123 场景加载）
npm run build             # G6 生产构建
```
> `self-check`（G5）为 physics-core 9 层物理自检，改引擎时另跑。

---

**维护者**: PhysVis Development Team ·
**创建**: 2026-07-13 · 配合 `DEVELOPMENT_GUIDE.md` v1.9 使用
