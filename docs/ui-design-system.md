# PhysVis · 玻璃拟态 UI 设计规范（科技沉浸 · 深色优先）

> 本规范在现有 `visualization/src/styles.css` 的双主题 token 基础上，**扩展一层玻璃拟态（Glassmorphism）视觉语言**，用于统一平台所有界面。目标是：美观、沉浸、且符合高中生/教师的操作习惯；同时保持 WCAG AA 无障碍与现有三栏工作台结构不变。
>
> 设计预览：`design-system-preview.html`（根目录，浏览器直接打开）。

---

## 1. 设计原则

1. **沉浸不刺眼**：深底 + 双径向光晕 + 细网格底纹，营造"实验室仪表盘"质感；玻璃面板半透明，让背景光晕透出层次。
2. **品牌即焦点**：蓝→紫渐变（`--brand-gradient`）只用于主操作、激活态、标题，禁止再硬编码 `#a855f7` 等散色，避免蓝紫混用。
3. **玻璃即容器**：所有面板统一用 `.glass` —— 半透明 + `backdrop-filter` 模糊 + 1px 低透明描边 + 内高光。一致性优先于花哨。
4. **状态靠光，不靠色**：聚焦 / 激活用发光（glow）表达，配合语义色描边，色盲用户也能分辨。
5. **对比度底线**：正文 `--text #f1f5f9`、次级 `--text2 #cbd5e1` 在深玻璃上均 ≥ 4.5:1（WCAG AA）。浅色主题另设 token。

---

## 2. 设计 Token（对接现有 styles.css）

> 下列变量**新增/调整**部分以 ✦ 标注；未标注的沿用现有 `styles.css`。落地时直接并入 `:root` 与 `[data-theme="light"]`。

### 2.1 颜色

| Token | 深色值 | 浅色值 | 用途 |
|---|---|---|---|
| `--bg` | `#0b1020` ✦ | `#eef2fb` | 页面底（比原 `#0f172a` 更深，更沉浸） |
| `--bg2` | `#111a30` | `#ffffff` | 顶栏/卡片实底色 |
| `--bg3` | `#1b2742` | `#f1f5f9` | 三级面 |
| `--text` | `#f1f5f9` | `#0f172a` | 正文（AA 4.5:1） |
| `--text2` | `#cbd5e1` | `#334155` | 次级文本 |
| `--text3` | `#94a3b8` | `#64748b` | 辅助/占位 |
| `--border` | `#2a3a5c` | `#d8e0f0` | 实边 |
| `--brand` | `#3b82f6` | `#2563eb` | 品牌主色 |
| `--brand-2` | `#8b5cf6` | `#7c3aed` | 品牌辅色 |
| `--brand-gradient` ✦ | `linear-gradient(135deg,#3b82f6,#6366f1,#8b5cf6)` | 同左（亮色降饱和） | 标题/主操作/激活态 |
| `--ok/--warn/--err/--info` | 沿用 `22c55e / f59e0b / ef4444 / brand` | 同 | 语义色 |

### 2.2 玻璃层 ✦（新增核心）

```css
--glass-bg:        linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.42));
--glass-bg-strong: linear-gradient(180deg, rgba(30,41,59,0.78), rgba(15,23,42,0.66));
--glass-border:       rgba(148,163,184,0.16);
--glass-border-hover: rgba(148,163,184,0.32);
--glass-blur: 18px;
--glass-saturate: 140%;
```

`.glass` 工具类（全平台统一）：
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.06);
  border-radius: var(--radius-lg);
}
```

### 2.3 圆角 / 阴影 / 发光 ✦

| 类别 | Token | 值 | 说明 |
|---|---|---|---|
| 圆角 | `--radius-sm / md / lg / pill` | `8 / 12 / 18 / 999px` ✦ | 比原 `6/10/16` 略放大，更柔和 |
| 阴影 | `--shadow-sm/md/lg` | 沿用（深底友好值） | 卡片层级 |
| 发光 | `--glow-brand` ✦ | `0 8px 26px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.22)` | 主操作/激活 |
| 发光 | `--glow-brand-strong` ✦ | `0 0 28px rgba(139,92,246,0.45)` | 悬停增强 |
| 发光 | `--glow-ok / --glow-err` ✦ | 绿/红柔光 | 语义反馈 |
| 焦点 | `--ring / --ring-strong` | `rgba(59,130,246,0.40 / 0.62)` | 键盘焦点环 |

### 2.4 字体

- 主字体：`'Inter'`（优先）→ `'Segoe UI'` / `'Microsoft YaHei'` 兜底（保持中文可读）。
- 公式：`'Times New Roman', serif`（沿用，衬线区分于 UI）。
- 等宽（数值/单位）：`ui-monospace, monospace`。
- 字号阶梯：11 / 12 / 12.5 / 13 / 14 / 15 / 16 / 17 / 18 / 20px（沿用 4px 基线 rhythm）。
- 字重：400 / 600 / 700 / 800。

---

## 3. 组件库规范

每个组件给出**视觉规格 + 状态 + 无障碍要点**。React 组件位于 `visualization/src/components/*`，类名沿用现有短横线 BEM。

### 3.1 按钮 Button

| 变体 | 样式 | 用法 |
|---|---|---|
| `.btn-primary` | 渐变底 + `--glow-brand` | 主操作（新建/播放/求解） |
| `.btn-glass` | 半透明玻璃 + 描边 | 次操作（重置/全屏） |
| `.btn-ghost` | 透明 + 次级文本 | 低频（取消/同步） |
| `.btn-danger` | 红玻璃描边 | 危险（删除） |

- 尺寸：`默认 min-height 40px` / `.btn-sm` 34px / `.btn-icon` 方形 40px。
- 状态：`hover` 上浮 1px + 增强发光；`:active` 下沉 1px；`:focus-visible` 焦点环；`:disabled` 透明度 0.45 + 禁指针。
- 触控：最小 40×40px（满足 44px 建议，图标按钮加内边距达 44）。

### 3.2 表单 Form

- `.input`：玻璃底 `rgba(11,16,32,0.45)` + 描边；`focus` → `border-color:--accent` + `box-shadow:0 0 0 4px var(--ring)`。占位用 `--text3`。
- 滑块 `input[type=range]`：轨道用品牌渐变，拇指白色 + 3px 品牌边 + 柔光环；拖拽实时联动数值标签（见原型）。
- 开关 `.switch`：关态灰玻璃，开态品牌渐变 + 滑块位移 20px；`focus-visible` 焦点环。
- 复选/单选：原生 `accent-color: var(--brand)`（保持原生可达性，避免自绘失焦问题）。
- 标签规则：每个输入配套 `<label>`，单位用 `.field-unit` 等宽右对齐。

### 3.3 卡片 / 玻璃面板 Panel

- 统一 `.glass`，内边距 14–18px，圆角 `--radius-lg`。
- 区段标题 `.panel-title`：11px / 700 / 字距 1.4px / 大写 / 品牌色，底部 1px 描边。
- 悬停不做整卡位移（避免抖动），仅描边微亮。

### 3.4 导航 Navigation

- **顶栏 `.topbar`**：`sticky` 玻璃强模糊，左品牌（渐变标题 + 发光 mark），右操作区。高 56px。
- **目录侧栏**：`<details>` 分组 + `.dir-item`；激活态品牌色文字 + 左侧 3px 品牌竖条 + 浅品牌底。
- **场景选择器**：沿用现有分类下拉（`.scene-cat-btn` / `.scene-dropdown`），仅把底改为玻璃。
- 面包屑：`.field-unit` 等宽风格，次级文本。

### 3.5 反馈 Feedback

| 组件 | 规范 |
|---|---|
| 告警 `.alert` | 四语义色，左侧图标 + 玻璃底 + 同色描边；`info/ok/warn/err` |
| 弹窗 `.modal` | `.overlay` 半透 + `blur(6px)`；`.modal` 用 `.glass-strong`；`role="dialog" aria-modal`；Esc 关闭；点遮罩关闭 |
| Toast `.toast` | 右下玻璃 pill，左侧语义色条，入场动画；自动 2.6s 消失；`role="status"` |
| 骨架 `.skeleton` | 品牌微光 shimmer，占位高度匹配真实内容 |
| 加载 `.spinner` | 品牌渐变环旋转；尊重 `prefers-reduced-motion` |

### 3.6 数据展示 Data Display

- 状态行 `.state-row`：左右分布，奇行浅底；数值等宽 + 绿色（`--ok`）。
- 诊断 `.diag`：`ok/warn/err` 三态，警告/错误带浅色底。
- 徽章 `.badge` / 芯片 `.chip`：pill 形，语义色底 + 圆点。
- 公式：衬线大字号 + 品牌色，下方中文释义 `--text2`。

### 3.7 播放控制（仿真专属）

- 底部玻璃条：上一帧/播放/下一帧 + 时间轴 `range` + 倍速分段按钮。
- 播放按钮为 `.btn-primary`，激活态显示暂停图标。
- 时间轴拖动即时更新状态读数（原型已联动）。

---

## 4. 状态矩阵（全局）

| 状态 | 表达 | 实现 |
|---|---|---|
| Default | 玻璃底 + 描边 | `.glass` |
| Hover | 描边变亮 + 上浮 1px + 发光 | `border-color:--glass-border-hover` + `--glow-*` |
| Focus (键盘) | 品牌焦点环 | `:focus-visible { outline:2px solid --accent; offset:2px }` |
| Active | 下沉 1px | `transform: translateY(1px)` |
| Disabled | 透明度 0.45 + 禁指针 | `opacity:.45; pointer-events:none` |
| Loading | 骨架/Spinner/按钮内旋 | `.skeleton` / `.spinner` |
| Error | 红玻璃描边 + 红柔光 | `--glow-err` + `.alert.err` |
| Empty | 居中提示 + 图标 | `.empty-state` |

---

## 5. 响应式规范

沿用现有断点，玻璃面板自动降级为实底以保证可读性。

| 断点 | 布局 | 备注 |
|---|---|---|
| ≥1600px | 三栏 `--sidebar-w:260 / --inspector-w:320` | 大屏加宽 |
| 1280–1600 | 三栏 `248 / 300`（默认） | 基准 |
| ≤1080px | 两栏（隐藏检查器，转为抽屉/折叠） | 检查器内容并入底部或浮层 |
| ≤760px | 单栏（隐藏左目录，转底部 FAB 抽屉） | 沿用 `.sidebar-toggle` 逻辑 |

- 网格：中央舞台 `minmax(0,1fr)` 防溢出；面板 `position:sticky` 跟随滚动。
- 文本缩放：所有尺寸用 `px` 但根字号不锁死，支持浏览器 200% 缩放不破版。

---

## 6. 无障碍规范（WCAG AA）

- **对比度**：正文/次级文本在深玻璃上 ≥ 4.5:1；大文本 ≥ 3:1。浅色主题独立校验。
- **键盘**：全部交互可 Tab 到达；`Esc` 关弹窗；焦点顺序符合视觉顺序；焦点环仅键盘显示（鼠标点击不出现轮廓，沿用现有 `:focus-visible`）。
- **屏幕阅读器**：语义标签 `header/main/aside/section`；弹窗 `role="dialog" aria-modal`；Toast `role="status"`；滑块/开关配套 `<label>`。
- **动效敏感**：`@media (prefers-reduced-motion: reduce)` 关闭所有过渡/动画（含舞台 canvas 动画停在第 2s 帧，见原型）。
- **触控目标**：交互元素 ≥ 40px（图标按钮加内边距至 44px）。
- **错误预防**：输入实时联动 + 提交前校验 + 错误用 `.alert.err` 与红柔光双重提示。

---

## 7. 落地对接清单（给前端）

1. 将 §2 的 ✦ token 并入 `styles.css` 的 `:root` 与 `.app.light`（注意：本项目用 `.app.light` 而非 `[data-theme="light"]`，落地时把原型里的 `[data-theme]` 选择器改为 `.app` / `.app.light` 体系）。
2. 新增 `.glass` / `.glass-strong` 工具类，替换现有 `.sidebar` / `.card` 等实底面的 `background`。
3. 按钮：在现有 `.btn-*` 上叠加渐变与 `--glow-*`；圆角放大到新尺度。
4. 弹窗/Toast：复用现有 `.ocr-modal` / `.problem-modal` 结构，改为 `.glass-strong` + 模糊遮罩。
5. 滑块/开关：用原型里的 `input[type=range]` 与 `.switch` 样式替换原生外观。
6. 验收：跑 Lighthouse a11y ≥ 90；对比度校验；`prefers-reduced-motion` 下无动画；768/1080/1440 三档截图比对。

---

**UI Designer**：像素君（UI Designer 专家）
**日期**：2026-07-14
**状态**：设计地基已就绪，待前端按 §7 对接实现
**预览**：`design-system-preview.html`
