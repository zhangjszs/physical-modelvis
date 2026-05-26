#!/bin/bash

echo "========================================"
echo "  高中电磁学可视化仿真系统 - 安装脚本"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js"
    echo ""
    echo "请先安装 Node.js:"
    echo "  - 访问 https://nodejs.org/ 下载安装"
    echo "  - 或使用包管理器: sudo apt install nodejs npm"
    echo ""
    exit 1
fi

echo "[1/3] 检查 Node.js 版本..."
node --version
echo ""

# 进入 physim 目录并安装依赖
echo "[2/3] 安装物理引擎依赖..."
cd physim
npm install
if [ $? -ne 0 ]; then
    echo "[错误] npm install 失败"
    exit 1
fi
echo ""

# 构建物理引擎
echo "[3/3] 构建物理引擎..."
npm run build
if [ $? -ne 0 ]; then
    echo "[错误] 构建失败"
    exit 1
fi
cd ..
echo ""

echo "========================================"
echo "  安装完成！"
echo "========================================"
echo ""
echo "下一步:"
echo "  1. 启动本地服务器: npx http-server . -p 8080"
echo "  2. 浏览器访问: http://localhost:8080"
echo ""
echo "详细说明请查看 QUICKSTART.md"
echo ""
