# 高中电磁学可视化仿真系统

> 基于 TypeScript 物理引擎和 Three.js 的交互式教学平台

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.128.0-green)](https://threejs.org/)

## 📖 简介

这是一个面向高中物理电磁学教学的交互式可视化仿真系统，能够准确模拟带电粒子在匀强电场、匀强磁场及复合场中的运动轨迹。系统支持多种经典场景（平行板电容器、速度选择器、质谱仪等），并提供实时数据测量和分步推导过程。

### 核心特性

- ✅ **物理精确**: Boris 积分器能量守恒误差 < 0.1%
- ✅ **多场景支持**: 6 种预定义模板（平行板、速度选择器、质谱仪等）
- ✅ **3D 可视化**: Three.js 渲染，支持视角旋转/平移/缩放
- ✅ **交互友好**: 实时参数调节、轨迹追踪、碰撞检测
- ✅ **教学辅助**: 分步公式推导、选项验证、答案展示

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0
- 现代浏览器（Chrome/Edge/Firefox，支持 WebGL）

### 安装与运行

```bash
# 1. 克隆或下载本项目

# 2. 构建物理引擎
cd physim
npm install
npm run build

# 3. 启动本地服务器
cd ..
npx http-server . -p 8080

# 4. 浏览器访问 http://localhost:8080
```

详细步骤请查看 [QUICKSTART.md](QUICKSTART.md)

## 📚 文档

| 文档 | 说明 |
|------|------|
| [QUICKSTART.md](QUICKSTART.md) | 快速启动指南和使用教程 |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | 系统架构详细说明 |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | 项目总结和技术亮点 |

## 🎮 使用示例

### 基本操作

1. **加载题目**: 点击顶部标签切换不同题目
2. **播放仿真**: 点击"播放"按钮或选择发射模式
3. **调节参数**: 拖动速度滑块、切换显示选项
4. **查看推导**: 点击左侧选项查看计算过程

### 发射模式

| 模式 | 说明 |
|------|------|
| 单粒子 | 发射单个粒子，观察轨迹 |
| 多角度 | 同时发射 36 个粒子，验证击中率 |
| 连续 | 持续发射粒子束 |
| 验证选项 | 根据选项自动演示 |

### 示例：验证白银三模题目

```
题目：平行板间存在匀强磁场，板间距 4d，B = mv₀/(2ed)
求证：A. R = 2d  C. 击中区域长度 L = 4(√3+1)d

操作：
1. 点击"带电粒子在磁场中的运动"标签
2. 选择"多角度"发射模式
3. 观察所有粒子都打到极板上（100%击中率）
4. 点击选项 A/C 查看推导过程和场景标注
```

## 🏗️ 技术架构

```
┌─────────────────────────┐
│   渲染层 (Three.js)      │ ← index.html
├─────────────────────────┤
│   桥接层 (Framework)     │ ← js/framework.js
├─────────────────────────┤
│   物理层 (PhysSim)       │ ← physim/src/*.ts
└─────────────────────────┘
```

### 核心模块

- **physim/**: TypeScript 物理引擎
  - `Vec3`: 三维向量运算
  - `FieldSource`: 电场/磁场源（匀强场、点电荷、偶极子）
  - `Integrator`: 数值积分器（Boris、Verlet、RK4）
  - `Simulation`: 仿真核心类

- **js/framework.js**: 桥接层
  - `SceneSpec`: 场景中间表示
  - `SimulationManager`: 仿真管理器
  - `SceneBuilder`: 场景构建引擎

- **templates/**: 场景模板库
  - 6 种预定义场景配置

## 🧪 物理验证

运行测试套件：

```bash
cd physim
npm test
```

测试结果（6/6 通过）：

```
✅ 回旋半径 R = mv/(eB)
✅ 回旋周期 T = 2πm/(eB)
✅ 白银三模 R=2d 验证
✅ 速度选择器 v=E/B
✅ RK4 能量守恒
✅ 100% 击中率验证
```

## 📂 项目结构

```
physical_modelvis/
├── physim/                 # 物理引擎
│   ├── src/               # TypeScript 源码
│   ├── test/              # 物理验证测试
│   └── dist/              # 构建输出
├── js/
│   └── framework.js       # 桥接层
├── templates/             # 场景模板
├── problems/              # 问题配置
├── index.html             # 主页面
├── QUICKSTART.md          # 快速启动指南
├── SYSTEM_ARCHITECTURE.md # 系统架构
└── PROJECT_SUMMARY.md     # 项目总结
```

## 🛠️ 扩展开发

### 添加新场景模板

在 `templates/scene-templates.js` 中：

```javascript
const myScenario = function(config) {
    return PhysVis.SceneSpec.create({
        id: config.id,
        viewport: { xRange: [-5, 5], yRange: [-5, 5] },
        objects: [...],
        fields: [...],
        particles: [...]
    });
};

// 注册模板
PhysVis.SceneBuilder.registerTemplate('my_scenario', myScenario);
```

### 添加新问题

在 `problems/` 目录下创建新文件：

```javascript
const MyProblem = {
    id: 'my-problem',
    title: '我的题目',
    description: '...',
    given: { B: 0.5, v0: 1e6 },
    sceneTemplate: 'parallel_plates_magnetic'
};

// 在 index.html 中注册
PhysVis.ProblemRegistry.register(MyProblem);
```

详见 [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md#扩展指南)

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 初始加载时间 | ~400ms |
| 帧率（单粒子） | 55-60 FPS |
| 帧率（36 粒子） | 40-50 FPS |
| 内存占用 | ~50 MB |
| 物理步进精度 | dt=1e-12 s |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

本项目基于以下开源技术：

- [Three.js](https://threejs.org/) - 3D 渲染框架
- [esbuild](https://esbuild.github.io/) - 快速打包工具
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

---

**Made with ❤️ for Physics Education**
