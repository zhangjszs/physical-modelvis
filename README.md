# 高中物理教学可视化平台

> 面向高中物理教学的交互式可视化仿真系统，基于自研物理引擎 + React + Canvas 2D 渲染

## 项目简介

本项目为高中物理教学提供一个可视化仿真平台，支持：

- **9 个物理场景**：平抛运动、自由落体、匀变速直线运动、匀强电场、匀强磁场、碰撞、弹簧振子、斜面运动、电磁复合场
- **实时动画**：Canvas 2D 渲染，支持轨迹、向量、场线可视化
- **参数调节**：滑块实时调节物理参数，自动重新求解
- **曲线图**：位移-时间、速度-时间、能量-时间等 8 种图表，与动画同步
- **公式说明**：每个场景的核心公式和推导过程
- **诊断报告**：能量守恒误差、动量守恒误差等物理验证
- **OCR 拍照解题**：上传物理题目图片，AI 自动识别并加载仿真

## 项目结构

```
physical_modelvis/
├── physics-core/          # TypeScript 物理引擎（零依赖）
│   ├── src/
│   │   ├── models/        # 8 个物理模型
│   │   ├── math/          # 向量运算
│   │   ├── types/         # 类型定义
│   │   ├── units/         # 单位和常数
│   │   └── solver/        # 求解器路由
│   └── tests/             # 92 个单元测试
│
├── visualization/         # React 可视化前端
│   ├── src/
│   │   ├── components/    # UI 组件（Canvas、图表、控制面板）
│   │   ├── scenes/        # 场景配置
│   │   ├── rendering/     # Canvas 渲染器
│   │   ├── adapters/      # physics-core 适配器
│   │   ├── store/         # Zustand 状态管理
│   │   └── utils/         # 工具函数
│   ├── server/            # OCR 后端代理
│   └── tests/             # 20 个测试
│
├── physim/                # 旧版物理引擎（Boris 积分器）
├── js/                    # 旧版桥接层
├── templates/             # 旧版场景模板
├── problems/              # 旧版题目配置
└── index.html             # 旧版前端入口
```

## 快速开始

### 前置要求

- Node.js >= 18
- npm

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd physical_modelvis

# 安装 physics-core 依赖
cd physics-core
npm install
npm run build
cd ..

# 安装 visualization 依赖
cd visualization
npm install
cd ..
```

### 运行

**启动可视化前端：**

```bash
cd visualization
npm run dev
```

浏览器访问 `http://localhost:5173`

**启动 OCR 后端（可选，拍照解题需要）：**

```bash
cd visualization
ANTHROPIC_BASE_URL="your-api-url" \
ANTHROPIC_AUTH_TOKEN="your-api-key" \
ANTHROPIC_MODEL="your-model" \
npm run server:dev
```

### 运行测试

```bash
# physics-core 测试（92 个）
cd physics-core
npm test

# visualization 测试（20 个）
cd visualization
npm test
```

## 物理模型

| 模型 | 类型 | 求解方法 | 说明 |
|------|------|----------|------|
| 匀速直线运动 | uniform-linear | 解析解 | v = const |
| 匀变速直线运动 | uniform-accelerated | 解析解 | a = const |
| 匀强电场 | uniform-electric-field | 解析解 | F = qE，抛物线轨迹 |
| 匀强磁场 | uniform-magnetic-field | 解析解 | F = qv×B，圆周运动 |
| 碰撞 | collision-elastic/inelastic | 解析解 | 1D 碰撞，动量守恒 |
| 弹簧振子 | spring-oscillator | 解析解 | F = -kx，支持阻尼 |
| 斜面运动 | inclined-plane | 解析解 | 分解重力，摩擦力 |
| 电磁复合场 | em-combined-field | Boris 数值积分 | F = qE + qv×B |

## 技术栈

| 层 | 技术 |
|----|------|
| 物理引擎 | TypeScript（零依赖） |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 渲染 | Canvas 2D |
| 图表 | Recharts |
| 状态管理 | Zustand |
| 测试 | Vitest |
| OCR 后端 | Express + Anthropic API |

## 可视化功能

- **动画播放**：播放/暂停/单步/重置/变速 (0.25x-5x)
- **轨迹显示**：历史运动轨迹
- **向量显示**：速度/加速度/力向量
- **场线显示**：电场线(↑)、磁场符号(⊗)
- **曲线图**：8 种图表，与动画帧同步
- **参数面板**：滑块 + 数字输入，自动重新求解
- **图层开关**：坐标轴/网格/轨迹/向量/标签
- **深色/浅色主题**
- **移动端响应式**

## 高中物理场景

### 平抛/斜抛运动
- 水平速度和竖直速度分量
- 重力加速度向量
- 最大高度、飞行时间、水平射程

### 碰撞实验
- 弹性碰撞和非弹性碰撞
- 动量守恒验证
- 恢复系数可调

### 弹簧振子
- 简谐运动
- 动能、势能、机械能曲线
- 可选阻尼

### 斜面运动
- 重力分解
- 支持力、摩擦力
- 临界角验证

### 带电粒子在电场中
- 电场力 F = qE
- 抛物线轨迹
- 电势能

### 带电粒子在磁场中
- 洛伦兹力 F = qv×B
- 匀速圆周运动
- 回旋半径和周期

### 电磁复合场
- 速度选择器 v = E/B
- 洛伦兹力
- Boris 数值积分

## OCR 拍照解题

1. 点击右上角「📷 拍照解题」
2. 上传物理题目图片
3. AI 自动识别题目内容
4. 自动匹配物理场景
5. 点击「加载仿真」开始可视化

## 测试覆盖

```
physics-core:  92 tests passed
visualization: 20 tests passed
─────────────────────────────
Total:        112 tests passed
```

## 开发

```bash
# physics-core 开发模式
cd physics-core
npm run test:watch

# visualization 开发模式
cd visualization
npm run dev

# TypeScript 类型检查
cd visualization
npx tsc -b

# 构建生产版本
cd visualization
npm run build
```

## License

MIT
