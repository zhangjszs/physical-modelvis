# 架构决策记录 (Architecture Decision Records, ADR)

本项目使用 ADR 记录重大架构选型、技术方案权衡以及核心约定的演进过程。

---

## 为什么需要 ADR？

在高中物理仿真系统中，物理精度（解析解/数值解）、渲染性能（Canvas 2D/Three.js 3D）与工程架构（单源真理契约、分包模式）涉及诸多关键权衡。通过 ADR 可以：
- 保留决策当下的上下文与技术考量
- 避免后来的维护者无意中推翻经过深入论证的设计
- 为新加入协作的开发者提供清晰的架构演化线索

---

## 编写流程

1. 拷贝下方的模板，新建文件 `docs/adr/NNNN-短标题.md`（4 位数字递增编号）。
2. 状态标注：`草案 (Draft)` → `已提议 (Proposed)` → `已通过 (Accepted)` / `已废除 (Deprecated)`。
3. 提交 PR 经代码审查后合并。

---

## ADR 模板

```markdown
# ADR-NNNN: [决策标题]

- **状态**：[草案 / 已提议 / 已通过 / 已替代]
- **日期**：YYYY-MM-DD
- **决策者**：[@username]
- **关联 Issue / PR**：#

## 背景 (Context)
说明促成该决策的技术背景、业务痛点或外部约束。

## 候选方案 (Options Considered)
1. **方案 A**：...（优点 / 缺点）
2. **方案 B**：...（优点 / 缺点）

## 决策 (Decision)
我们选择方案 X，核心理由如下：
- ...

## 影响与后果 (Consequences)
### 积极影响 (Positive)
- ...

### 潜在代价 / 负面影响 (Negative / Trade-offs)
- ...
```
