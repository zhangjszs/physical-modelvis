@echo off
chcp 65001 >nul
echo ========================================
echo   启动高中电磁学可视化仿真系统
echo ========================================
echo.

REM 检查 dist 目录是否存在
if not exist "physim\dist\physim.js" (
    echo [提示] 检测到物理引擎未构建，正在执行安装...
    echo.
    call setup.bat
    if %errorlevel% neq 0 exit /b 1
)

echo [启动] 正在启动本地服务器...
echo.
echo 访问地址: http://localhost:8080
echo 按 Ctrl+C 停止服务器
echo.

npx http-server . -p 8080
