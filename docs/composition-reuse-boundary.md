# 组件复用边界调查 — 为物理世界盒子划定可复用 UI/器材接口

> 调查单 #131 产出文档（2026-10-16）。只划定边界与接口草案，不迁移生产组件。

## 1. 现状概览

| 组件 | 行数 | 职责 | 数据源 |
|---|---|---|---|
| `FormulaPanel` | 2894 | 公式展示（引擎 explanation + 内置 FORMULA_MAP） | `useSimulationStore` |
| `ParameterPanel` | 120 | 场景参数滑块 + 数值输入 + 预设 | `SceneConfig.parameters` |
| `InspectorPanel` | 58 | Tab 壳：教案 / 参数+对比+图层 | 子组件组合 |
| `DataDrawer` | 99 | 图表/光电门/状态/诊断四面板 + lazy + ErrorBoundary | 子组件组合 |
| `GuidancePanel` | 103 | Modal 步进导学（操作/观察/参数） | `getSceneGuidance` |
| `ClassroomScriptPanel` | 230 | 五阶段教学脚本（目标/演示/对比/提问/结论） | `getClassroomScript` |
| `CompositionLab` | 287 | 自由组合实验台侧栏（器材面板/粒子/场线/检查器/状态） | `useCompositionStore` |
| `StateInspector` | 67 | 实时状态网格（t/x/y/vx/vy/|v|/|a|/Ek/Ep/E） | `SimulationResult` |
| `ComparePanel` | 183 | 参数对比配置与图例 | `useSimulationStore` |
| `LayerToggle` | 32 | 图层复选框组 | `useSimulationStore` |
| `GraphPanel` | 321 | 图表 Tab + Recharts 渲染 + 对比模式 | `SimulationResult.charts` |
| `DiagnosticsPanel` | 117 | 求解诊断 + 守恒量 + warnings | `SimulationResult` |

## 2. 重复结构盘点（≥ 5 组候选）

### 候选 A：Lazy + ErrorBoundary + Suspense 三明治

**重复证据**（20 处 ErrorBoundary、4 处 DataDrawer 独立重复、1 处 WorkbenchScene、2 处 SceneStage）：

```tsx
// DataDrawer.tsx:32-50 (及同文件 52-72, 75-94 共 4 处几乎相同)
<ErrorBoundary label="数据图表" fallback={
  <div className="panel-section"><div className="panel-title">数据图表</div>
    <div style={{...}}>图表加载失败</div></div>
}>
  <Suspense fallback={
    <div className="panel-section" style={{...}}>加载中...</div>
  }>
    <GraphPanel />
  </Suspense>
</ErrorBoundary>
```

WorkbenchScene 97-116 和 SceneStage 36-88 同样模式。

**差异点**：label 文案不同；fallback 内容是否需要 panel-title 壳；部分 fallback 有 `className="panel-title"`、部分没有。

---

### 候选 B：数值编辑控件（NumberField / ParamSlider）

**重复证据**：

1. `CompositionLab.tsx:57-72` — `NumberField({ label, value, step, onChange })`：纯 number input
2. `ParameterPanel.tsx:77-106` — slider + number 双控件对：带 min/max/step/clamp
3. `ComparePanel.tsx:110-128` — min/max 两个独立 number input：同 DOM 结构
4. `CompositionLab.tsx:180-192` — 复用 NumberField 编辑粒子参数（q/m/duration）
5. `UniformFieldZoneEditor:85-107` — 复用 NumberField 编辑向量分量

**差异点**：ParameterPanel 多了 slider 联动、debounce 回调和 description 行；其余均为纯 number。

---

### 候选 C：PanelSection 壳容器

**重复证据**（23 处 `className="panel-section"`）：

所有面板组件都使用同一容器模式：
```tsx
<div className="panel-section">
  <div className="panel-title">{title}</div>
  {children}
</div>
```

出现于 FormulaPanel(2820)、ParameterPanel(58)、StateInspector(11/39)、DiagnosticsPanel(9/19)、LayerToggle(18 外层 `layer-toggle` 含 `panel-title`)、DataDrawer fallback(36/57/78/86)、CompositionLab(159/178/198/226/260) 等。

---

### 候选 D：空态 / 等待占位

**重复证据**：

- `StateInspector.tsx:12-15`：`等待仿真运行...`
- `DiagnosticsPanel.tsx:10-13`：`等待仿真运行...`
- `GraphPanel.tsx:169-173`：`等待仿真运行...`
- `CompositionLab.tsx:228`：`点击场景中的器材进行编辑`
- `DataDrawer.tsx:37/58/80/88`：`图表加载失败` / `加载中...`

**模式**：`<div className="panel-section"><div className="panel-title">X</div><div className="empty-state">msg</div></div>`

---

### 候选 E：步进导航 / Wizard

**重复证据**：

1. **GuidancePanel** (lines 20-21, 44-51, 78-95)：step progress bar + 上一步/下一步/重新开始
2. **ClassroomScriptPanel** (lines 5-11, 69-78)：5-step stepper 按钮组 + `currentStep` state

两者共享：多步内容切换、进度指示、前/后导航。差异：GuidancePanel 用 progress bar、script 用 button stepper；步骤元信息不同（title+action+observe vs 自由内容）。

---

### 候选 F：Overlay / Drawer 弹窗

**重复证据**：

1. **GuidancePanel** (line 35)：`createPortal` + `guidance-overlay` + 点击遮罩关闭
2. **WorkbenchScene** (lines 86-118)：`formula-drawer-overlay` + `onClick` 关闭 + `aside.formula-drawer`
3. **OCRPanel** (line 319)：`ocr-overlay` + `onClick` 关闭 + `ocr-dialog` 面板

模式：透明遮罩 + 居中/侧滑面板 + 关闭按钮 + aria-modal + 外部点击关闭。

---

### 候选 G：状态行网格（Label–Value Grid）

**重复证据**：

1. **StateInspector.tsx:59-65** — `StateRow({label, value})`：固定 CSS class `state-row`
2. **DiagnosticsPanel.tsx:23-35** — `diag-item` > `diag-label` + `diag-value`：同构
3. **CompositionLab.tsx:262-275** — 用内联 style 的 `<p>` + 颜色做状态提示

---

## 3. 接口草案（≥ 3 候选）

### 3.1 `<LazyPanel>` — 候选 A 收口

```tsx
interface LazyPanelProps {
  /** ErrorBoundary label */
  label: string;
  /** 被懒加载的组件 */
  children: React.LazyExoticComponent<React.ComponentType> | React.ReactNode;
  /** 面板标题（用于 fallback 壳），省略则无标题 */
  title?: string;
  /** 加载中文案，默认"加载中..." */
  loadingText?: string;
  /** 加载失败文案，默认"加载失败" */
  errorText?: string;
}

function LazyPanel(props: LazyPanelProps): JSX.Element;
```

**场景专属部分**：各面板仍自行渲染业务内容；LazyPanel 只负责 wrapper + fallback。

---

### 3.2 `<NumberField>` — 候选 B 统一

```tsx
interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** 若提供则渲染 slider+input 对 */
  min?: number;
  max?: number;
  step?: number;
  /** 描述文案（ParameterPanel 用） */
  description?: string;
  /** 单位后缀（显示在 label 旁） */
  unit?: string;
  /** 是否实时（slider 模式下 debounce） */
  liveUpdate?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

function NumberField(props: NumberFieldProps): JSX.Element;
```

**场景专属部分**：debounce 回调策略由父组件决定（传入已绑定的 `onChange`）；store 读写不进 NumberField。

---

### 3.3 `<PanelSection>` — 候选 C 统一壳

```tsx
interface PanelSectionProps {
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

function PanelSection(props: PanelSectionProps): JSX.Element;
```

---

### 3.4 `<StepWizard>` — 候选 E 抽象

```tsx
interface StepMeta {
  id: string;
  label: string;
  /** 步骤内容通过 slot/render prop 提供 */
}

interface StepWizardProps {
  steps: StepMeta[];
  activeIndex: number;
  onStepChange: (index: number) => void;
  /** 渲染当前步内容 */
  renderStep: (step: StepMeta, index: number) => React.ReactNode;
  /** 是否显示进度条（默认 true） */
  showProgress?: boolean;
  /** 前/后/重置按钮文案可覆盖 */
  prevLabel?: string;
  nextLabel?: string;
  resetLabel?: string;
}

function StepWizard(props: StepWizardProps): JSX.Element;
```

**场景专属部分**：`renderStep` 回调让调用方自由渲染每步内容；GuidancePanel 的"操作/观察/参数"行与 ClassroomScriptPanel 的 quiz 组件各自提供。

---

### 3.5 `<OverlayDrawer>` — 候选 F 统一

```tsx
interface OverlayDrawerProps {
  open: boolean;
  onClose: () => void;
  /** 面板标题（header 区） */
  title: string;
  /** 自定义 header 左侧区域（如"按需讲解"标签） */
  headerBadge?: React.ReactNode;
  /** 面板内容 */
  children: React.ReactNode;
  /** 动画方向，默认 'right' */
  side?: 'right' | 'center';
}

function OverlayDrawer(props: OverlayDrawerProps): JSX.Element;
```

内部使用 `createPortal(document.body)` + backdrop-filter 安全（对齐 #112 修复经验）。

---

### 3.6 `<StatusGrid>` — 候选 G 收口

```tsx
interface StatusRow {
  label: string;
  value: string;
  /** 语义色调：ok/warning/error/muted/默认 */
  tone?: 'ok' | 'warning' | 'error' | 'muted';
}

interface StatusGridProps {
  title?: string;
  rows: StatusRow[];
}

function StatusGrid(props: StatusGridProps): JSX.Element;
```

---

## 4. 与 #130 视觉 token 规范的接口

上述组件的视觉表现（颜色/间距/圆角/阴影）应引用 #130 产出的 token 变量：

| 组件 | 消费 token |
|---|---|
| PanelSection | `--panel-bg`, `--panel-border-radius`, `--panel-padding`, `--panel-shadow` |
| NumberField | `--input-border`, `--input-focus-ring`, `--slider-track-color`, `--slider-thumb-color` |
| StepWizard | `--progress-bar-color`, `--stepper-active-bg`, `--step-gap` |
| OverlayDrawer | `--overlay-backdrop`, `--drawer-width`, `--drawer-shadow` |
| StatusGrid | `--tone-ok`, `--tone-warning`, `--tone-error`, `--row-spacing` |

**边界约定**：组件接收 token 通过 CSS class 或 `style` 传入；不硬编码颜色值。#130 确定 token 后再实施组件样式迁移。

---

## 5. 首批实施单建议（≤ 3 个）

### 实施单 α：`<LazyPanel>` + `<PanelSection>` 基础壳抽取

| 项 | 内容 |
|---|---|
| 范围 | 新建 `visualization/src/components/common/` 下 `LazyPanel.tsx`(≤80行) + `PanelSection.tsx`(≤60行) |
| 依赖 | 无前置（不依赖 token，保留现有 class 名即可） |
| 迁移 | DataDrawer 4 处 + WorkbenchScene 1 处改调 LazyPanel；全部 panel-section 壳暂不强制迁（按模块逐步改） |
| 验收 | 现有测试全绿（2828 例）；新组件各自 ≥2 例单测；lint/typecheck/precheck 通过 |
| 风险 | 极低——纯结构重组不改行为 |
| 回滚 | 删两新文件、DataDrawer/WorkbenchScene revert 1 commit |

### 实施单 β：`<NumberField>` 统一 + CompositionLab/ParameterPanel 迁移

| 项 | 内容 |
|---|---|
| 范围 | 新建 `common/NumberField.tsx`(≤100行)，合并 CompositionLab 本地 NumberField 与 ParameterPanel 的 slider+input 双控件逻辑 |
| 依赖 | 实施单 α（PanelSection 作容器） |
| 迁移 | CompositionLab.tsx 删除本地 NumberField 改 import；ParameterPanel 内部重构为调用 NumberField（不改变 store 逻辑） |
| 验收 | 现有 CompositionLab 50 例 + ParameterPanel 相关测试全绿；新组件单测覆盖 slider/input/空态/disabled ≥4 例 |
| 风险 | 低——控件抽出不影响数据流 |
| 回滚 | 恢复 NumberField 本地定义 + ParameterPanel 内联 |

### 实施单 γ：`<StepWizard>` + `<OverlayDrawer>` 组合导航抽离

| 项 | 内容 |
|---|---|
| 范围 | 新建 `common/StepWizard.tsx`(≤120行) + `common/OverlayDrawer.tsx`(≤80行) |
| 依赖 | 实施单 α（PanelSection）；与 #130 token 对接但**不阻塞**（先用 inline style 过渡） |
| 迁移 | GuidancePanel 重构为调用 StepWizard + OverlayDrawer；ClassroomScriptPanel  stepper 段改用 StepWizard；WorkbenchScene formula drawer 改 OverlayDrawer |
| 验收 | 现有 guidance/OCR/WorkbenchScene 相关测试全绿；新组件单测 ≥6 例 |
| 风险 | 中——涉及 modal 交互 & portal，需回归 Playwright 冒烟 |
| 回滚 | 逐组件 revert import |

## 6. 不做的边界（明确排除）

- **不拆分 FormulaPanel 2894 行**——属 #103 大规模重构范畴，触 1.10 红线，需用户决策 D31。
- **不改 PhysicsModelBase / SimulationResult 接口**——引擎公共 API 不变。
- **不动 3D EquipmentStage / rig 生命周期**——与 UI 复用正交。
- **不在调查单内迁移生产组件**——实施单单独验收。

## 7. 总结

- **7 组重复候选**已盘点（A/B/C/D/E/F/G），每组附文件行号证据。
- **6 个接口草案**覆盖至少 3 个核心组件。
- **3 个实施单**按依赖关系串行：α → β → γ，每个范围可独立执行验收回滚。
- 与 #130 token 规范形成"接口先行、token 后补"模式，不互相阻塞。
