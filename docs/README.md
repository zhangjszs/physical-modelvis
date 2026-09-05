# PhysVis 文档中心 (Documentation)

欢迎查阅 PhysVis（高中物理教学可视化仿真平台）的项目文档体系。

本文档作为全库文档的主索引，帮助开发者、物理教师和贡献者快速定位所需的技术与教学规范。

---

## 📑 文档分类导航

```text
docs/
├── 入门与开发 ─────── DEVELOPMENT_GUIDE.md, WORKFLOW.md
├── 物理与渲染契约 ─── rendering-physics-audit.md, experiment-design-spec.md, self-check-loop.md
├── UI 与视觉设计 ──── ui-design-system.md, design-system-preview.html
├── 规划与路线图 ───── plan.md
├── 架构决策记录 ───── adr/
├── AI / 协作指引 ──── agents/
├── 历史归档与复盘 ─── archive/
└── 专题设计 ───────── superpowers/
```

---

### 1. 入门与开发规范 (Getting Started)

| 文档 | 说明 | 适用对象 |
| :--- | :--- | :--- |
| [DEVELOPMENT_GUIDE.md](file:///home/kerwin/coding/physical_modelvis/docs/DEVELOPMENT_GUIDE.md) | **核心开发指南**：双包依赖关系、本地构建、测试执行、严格类型检查、常见陷阱与调试技巧。 | 所有开发者 (必读) |
| [WORKFLOW.md](file:///home/kerwin/coding/physical_modelvis/docs/WORKFLOW.md) | **研发工作流**：分支策略、Commit 规范、Code Review 清单与代码门禁。 | 贡献者 / PR 提交者 |
| [../CONTRIBUTING.md](file:///home/kerwin/coding/physical_modelvis/CONTRIBUTING.md) | **开源贡献指南**：环境要求、快速本地启动、PR 提交规范。 | 外部贡献者 |

---

### 2. 物理仿真与渲染契约 (Physics & Rendering Contracts)

| 文档 | 说明 | 核心内容 |
| :--- | :--- | :--- |
| [rendering-physics-audit.md](file:///home/kerwin/coding/physical_modelvis/docs/rendering-physics-audit.md) | **渲染单一真源审计表**：全库 123 个场景的渲染数据来源审计与迁移状态。改渲染前必读！ | 单一真源规范、防漂移契约 |
| [3D_CORE_STANDARDIZATION_SUMMARY.md](file:///home/kerwin/coding/physical_modelvis/docs/3D_CORE_STANDARDIZATION_SUMMARY.md) | **高中核心精讲 (24 节) 3D 实验标准化总结**：24 节核心实验 3D 物理器材建模、柔和光影与随动机制。 | 3D 真实实验器材升级 |
| [experiment-design-spec.md](file:///home/kerwin/coding/physical_modelvis/docs/experiment-design-spec.md) | **实验设计规范**：人教版 176 个实验的模型抽象、交互面板设计与图表规范。 | 物理模型开发 |
| [self-check-loop.md](file:///home/kerwin/coding/physical_modelvis/docs/self-check-loop.md) | **9 层物理自检闭环**：L0-L9 守恒律、数值鲁棒性与解析解差分验证体系详解。 | 质量工程 / 引擎维护 |

---

### 3. 视觉与 UI 设计系统 (UI & Design System)

| 文档 | 说明 | 形式 |
| :--- | :--- | :--- |
| [ui-design-system.md](file:///home/kerwin/coding/physical_modelvis/docs/ui-design-system.md) | **设计系统说明书**：深色玻璃拟态（Glassmorphism）、Token 定义、色彩阶度与布局排版。 | Markdown 规范 |
| [design-system-preview.html](file:///home/kerwin/coding/physical_modelvis/docs/design-system-preview.html) | **设计系统交互预览**：在浏览器中直接打开，体验颜色阶元、滑块、弹窗与毛玻璃质感。 | 独立交互 HTML |

---

### 4. 路线图与架构决策 (Roadmap & Architecture)

| 文档 / 目录 | 说明 |
| :--- | :--- |
| [plan.md](file:///home/kerwin/coding/physical_modelvis/docs/plan.md) | **项目进展与演进路线**：阶段 3 渲染迁移状态、近期里程碑、待办任务追踪。 |
| [adr/](file:///home/kerwin/coding/physical_modelvis/docs/adr/) | **架构决策记录 (ADR)**：记录重大技术选型、架构重构及其权衡。详见 [adr/README.md](file:///home/kerwin/coding/physical_modelvis/docs/adr/README.md)。 |
| [superpowers/](file:///home/kerwin/coding/physical_modelvis/docs/superpowers/) | **专题架构方案**：重大架构重构专题方案（如 WorkbenchScene 拆分设计）。 |

---

### 5. AI 协作与历史归档 (AI Workflows & Archives)

| 目录 | 说明 |
| :--- | :--- |
| [agents/](file:///home/kerwin/coding/physical_modelvis/docs/agents/) | **智能体协作指引**：单上下文规范、GitHub Issue 跟踪模式、分诊标签（Triage Labels）定义。 |
| [archive/](file:///home/kerwin/coding/physical_modelvis/docs/archive/) | **历史归档**：阶段性验证记录、历史交付文档、3D 引擎修复总结、历史代码质量报告等。 |
