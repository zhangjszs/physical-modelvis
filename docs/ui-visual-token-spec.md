# 统一外部界面风格规范 — Design Token 与控件状态表

> 调查单 #130 产出文档（2026-10-16）。为"物理世界盒子"提供视觉基线，不触全站重构。

## 1. 现有分歧盘点（≥ 6 类）

### 分歧 ① 颜色硬编码 vs Token 引用

| 文件 | 硬编码示例 | 对应已有 token |
|---|---|---|
| CompositionLab.tsx:108/221/228/278 | `color: '#94a3b8'` | `--text3` |
| CompositionLab.tsx:231 | `color: '#475569'` | `--text2`（亮色） / 暗色无对应 |
| CompositionLab.tsx:235/262 | `color: '#dc2626'` | `--err` 是 `#ef4444`，偏差 |
| CompositionLab.tsx:264 | `color: '#16a34a'` | `--ok` 是 `#22c55e`，偏差 |
| CompositionLab.tsx:271 | `color: '#b45309'` | `--warn` 是 `#f59e0b`，偏差 |
| WorkbenchScene.tsx:102/110 | `color: '#94a3b8'` | `--text3` |
| DataDrawer.tsx:37/58/80/88 | `color: '#94a3b8'` | `--text3` |
| OCRPanel.tsx:385 | `color: '#ef4444'` | `--err`（此处恰好一致） |
| GuidancePanel 浮层 CSS:954 | `var(--surface, #1e293b)` | 未定义 `--surface`，回退硬编码 |

**影响**：亮/暗主题切换时 inline hex 不跟随；语义色 `--ok`/`--err`/`--warn` 在组件侧有 3 套不同的"红/绿/橙"值。

---

### 分歧 ② 字号层级不统一

| 用途 | CSS class | inline style | 实际值 |
|---|---|---|---|
| 面板标题 | `.panel-title` | — | 12px / bold / uppercase |
| 参数标签 | `.param-label` | CompositionLab:200/204 | 13px / 600 |
| 描述/辅助文字 | `.param-desc` (11px) | CompositionLab:108/221 (11px) | 11px 但两套定义 |
| 状态文字 | — | `fontSize: 12` (DataDrawer/StateInspector fallback) | 12px |
| 按钮文字 | `.btn` (12px) / `.btn-sm` (11px) | `.compare-select` (12px) | 11/12px 混用 |

**影响**：同类语义的文字在不同面板呈现不同大小，视觉不统一。

---

### 分歧 ③ 间距 / gap 体系缺失

| 场景 | 使用的 gap | 文件 |
|---|---|---|
| InspectorPanel tab buttons | 8px | CSS:185 |
| Playback controls | 12px / 5px (内部按钮) | CSS:458/470 |
| CompositionLab 器材面板 | 6px | inline:164 |
| Guidance nav buttons | 8px | CSS:1071 |
| DataDrawer flex columns | 未定义（靠子 margin） | — |
| Param actions 按钮组 | 8px | CSS:351 |

**无 `--space-xs/sm/md/lg` 层级**，间距值散落在 4/6/8/10/12/14/16/20/24 之间。

---

### 分歧 ④ 圆角不一致

| 组件 | 值 | 来源 |
|---|---|---|
| `.btn` | `var(--radius-md)` = 12px | CSS token ✓ |
| `.param-input` | `var(--radius-sm)` = 8px | CSS token ✓ |
| `.guidance-panel` | `12px` | CSS 硬编码（未引用 token） |
| `.guidance-step` | `8px` | CSS 硬编码 |
| `.guidance-goal` | `4px` | CSS 硬编码 |
| `.guidance-step-tag` | `10px` | CSS 硬编码 |
| `.ocr-modal` | `var(--radius-lg)` = 18px | CSS token ✓ |
| `.formula-drawer` | 无（全高侧栏） | — |
| CompositionStage info badge | `8px` | inline style:150 |

**token 已定义** `--radius-sm/md/lg/pill` 但 CSS 内部仍有 6 处硬编码未引用。

---

### 分歧 ⑤ 阴影/辉光复用不一致

| 组件 | 阴影值 | 是否引用 token |
|---|---|---|
| `.guidance-panel` | `0 12px 40px rgba(0,0,0,0.5)` | ❌ 硬编码 |
| `.ocr-modal` | 无 box-shadow（靠 glass 效果） | — |
| `.formula-drawer` | `-20px 0 60px rgba(15,23,42,0.2)` | ❌ 硬编码 |
| `.btn-primary` | `var(--glow-brand)` | ✅ |
| `.glass` | `var(--shadow-md)` | ✅ |

两个浮层各自定义了独立阴影而非复用 `--shadow-lg`。

---

### 分歧 ⑥ 控件状态反馈模式不统一

| 控件 | hover 态 | focus 态 | active/selected 态 | disabled 态 |
|---|---|---|---|---|
| `.btn` | bg lighten + translateY(-1) + shadow | outline ring | `.active` → brand-gradient | opacity 0.4 |
| `.param-input` | 无 | border-color → accent + ring shadow | — | — |
| `.compare-select` | — | — | — | — |
| CompositionLab `NumberField` | 浏览器默认 | 浏览器默认 | — | — |
| LayerToggle checkbox | 浏览器默认 | :focus-visible outline | — | — |
| 密度档位按钮 | `.btn-sm.active` → brand-gradient | — | 手动 `.active` | — |

`NumberField` (CompositionLab) 和 `ComparePanel` 的 number/select 控件完全没有自定义态样式；`param-input` 有 focus 态但无 hover 态。

---

### 分歧 ⑦ 浮层 / Modal 遮罩参数不统一

| 浮层 | 遮罩背景 | blur | z-index |
|---|---|---|---|
| `.guidance-overlay` | `rgba(0,0,0,0.45)` | 无 | 200 |
| `.formula-drawer-overlay` | `rgba(15,23,42,0.18)` + `blur(4px)` | 4px | 900 |
| `.ocr-overlay` | `rgba(0,0,0,0.6)` | 无 | 1000 |

三处遮罩的透明度、backdrop-blur、z-index 各不相同。

## 2. Design Token 规范表

以下 token 为**目标统一值**，基于已有 `:root` 变量体系扩展补全。

### 2.1 颜色 Token（已定义，补漏项）

| Token | 暗色值 | 亮色值 | 语义 | 备注 |
|---|---|---|---|---|
| `--text` | `#f1f5f9` | `#0f172a` | 主文字 | 已有 ✓ |
| `--text2` | `#cbd5e1` | `#334155` | 次文字 | 已有 ✓ |
| `--text3` | `#94a3b8` | `#64748b` | 辅助/placeholder | 已有 ✓ |
| `--ok` | `#22c55e` | `#16a34a` | 成功态 | 已有，亮色补充 |
| `--warn` | `#f59e0b` | `#b45309` | 警告态 | 已有，亮色补充 |
| `--err` | `#ef4444` | `#dc2626` | 错误态 | 已有，亮色补充 |
| **`--surface`** | `#1e293b` | `#ffffff` | **浮层/面板底色** | **新增**（guidance-panel 已在回退用此值） |
| **`--overlay-bg`** | `rgba(0,0,0,0.5)` | `rgba(15,23,42,0.3)` | **遮罩统一** | **新增** |

### 2.2 间距 Token（新增）

| Token | 值 | 用途 |
|---|---|---|
| `--space-xs` | 4px | 紧凑行内间隔（label ↔ unit） |
| `--space-sm` | 8px | 按钮组 gap、参数项底部 |
| `--space-md` | 12px | 面板内模块间隔 |
| `--space-lg` | 16px | 面板间 margin |
| `--space-xl` | 24px | 浮层内 padding |

### 2.3 圆角 Token（已定义，规范化使用）

| Token | 值 | 适用组件 |
|---|---|---|
| `--radius-xs` | 4px | tag / chip / 小元素 |
| `--radius-sm` | 8px | input / step card |
| `--radius-md` | 12px | button / panel / overlay panel |
| `--radius-lg` | 18px | 大弹窗 (ocr-modal) |
| `--radius-pill` | 999px | badge / pill |

### 2.4 阴影 Token（已定义，补浮层用）

| Token | 暗色值 | 适用 |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.2)` | 卡片微影 |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.28)` | 按钮 hover / glass |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.38)` | 浮层（guidance-panel / formula-drawer） |
| `--shadow-drawer` | `-20px 0 60px rgba(0,0,0,0.3)` | **新增**：侧栏抽屉专用 |

### 2.5 文字层级 Token（新增）

| Token | size / weight / 用途 |
|---|---|
| `--text-h1` | 18px / 700 / 页面标题 |
| `--text-h2` | 15px / 600 / 面板内章节标题 |
| `--text-h3` | 12px / 600 / panel-title (uppercase) |
| `--text-body` | 13px / 400 / 正文 |
| `--text-small` | 11px / 400 / 辅助说明 / desc |
| `--text-mono` | 12px / monospace / 数值输入 / 公式 |

### 2.6 控件状态规范

| 控件类型 | 默认态 | hover | focus-visible | active/selected | disabled |
|---|---|---|---|---|---|
| **Button** (primary) | brand-gradient + glow-brand | brightness(1.08) + glow-brand-strong | ring | brightness(1.12) | opacity 0.4 |
| **Button** (secondary) | transparent + glass-border | bg rgba(148,163,184,0.12) | ring | brand-gradient + #fff | opacity 0.4 |
| **Input/Select** | input-bg + glass-border + radius-sm | border-color glass-border-hover | accent-border + ring shadow | — | opacity 0.5 + not-allowed |
| **Slider** | accent-color + 4px track | — | ring on thumb | — | opacity 0.4 |
| **Checkbox** | accent-color | — | outline ring | checked→accent | opacity 0.4 |
| **NumberField** (CompositionLab) | 对齐 Input 规范 | 同 | 同 | — | 同 |

## 3. 与 #131 组件复用接口的对接

| 组件 (#131 草案) | 消费的 Token |
|---|---|
| `<PanelSection>` | `--space-md`, `--text-h3`, `--surface`, `--radius-md` |
| `<NumberField>` | `--text-body` (label), `--text-small` (desc), Input 状态规范 |
| `<LazyPanel>` fallback 壳 | `--text3`, `--space-xl` (padding) |
| `<StepWizard>` | `--accent` (progress), `--radius-sm` (step card), `--shadow-md` |
| `<OverlayDrawer>` | `--overlay-bg`, `--surface`, `--shadow-drawer` |
| `<StatusGrid>` | `--ok`/`--warn`/`--err`, `--text-body` |

## 4. 首批验证组件（2–3 个）

### 验证组件 1：ParameterPanel → NumberField 统一

**改动范围**：
- `.param-input` 加 hover 态
- CompositionLab `NumberField` 的 label 从 13px → `--text-body`(13px) 改引用 token 变量
- 统一 spacing：`margin-bottom: 12px` → `var(--space-md)`

**不改动**：debounce 逻辑、store 交互、slider 行为。

**验证方法**：亮/暗主题切换截图对比 + `getComputedStyle` 探针确认颜色跟随 token。

---

### 验证组件 2：GuidancePanel overlay → OverlayDrawer 对齐

**改动范围**：
- `.guidance-panel` 背景从 `var(--surface, #1e293b)` → `var(--surface)`（新 token）
- `.guidance-panel` 阴影从硬编码 → `var(--shadow-lg)`
- `.guidance-overlay` 背景从 `rgba(0,0,0,0.45)` → `var(--overlay-bg)`
- `.guidance-goal` 圆角从 4px → `var(--radius-xs)`
- `.guidance-step-tag` 圆角从 10px → `var(--radius-pill)`

**不改动**：导航逻辑、步进内容渲染、paramFocus chip。

---

### 验证组件 3：DataDrawer 内联 fallback → token 引用

**改动范围**：
- DataDrawer.tsx 中 4 处 `style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}` → 引用 CSS class `.panel-fallback`（新增，用 `--text3` + `--space-md` + `--text-body`）
- WorkbenchScene.tsx 102/110 同样改法

**不改动**：组件功能、lazy 加载、ErrorBoundary。

## 5. 后续实施拆分建议

本文档产出后可拆为以下独立小单：

1. **补全 `:root` token**：新增 `--surface` / `--overlay-bg` / `--shadow-drawer` / `--space-*` / `--text-*` 变量（纯 CSS，~30 行）
2. **消除 inline style 硬编码色**：CompositionLab / DataDrawer / WorkbenchScene 共 ~30 处改 token 引用
3. **控件状态规范落地**：补全 NumberField / ComparePanel select 的 hover/focus/disabled 态
4. **浮层遮罩统一**：三处 overlay 改用 `--overlay-bg` + `--surface` + 统一 z-index 层级

## 6. 明确排除（不触红线）

- 不引入 Tailwind / Radix / 新 UI 框架
- 不更换 React/Vite/Canvas 等核心框架
- 不做全站 CSS 重写——按组件增量改，旧 class 名保留
- 不改 `:root.light` 主题切换机制本身
- 不动物理模型层或 SimulationResult API

## 7. 总结

- **7 类现有 UI 分歧**已盘点并附文件/行号证据
- **Token 规范表**覆盖颜色(9)、间距(5)、圆角(5)、阴影(4)、文字层级(6)、控件状态(5 类)
- **3 个验证组件**给出精确改动范围与不改动边界
- **4 个后续实施单**按独立可执行拆分
- 与 #131 组件接口草案的 §4 表格对齐，可同步推进
