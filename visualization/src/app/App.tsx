import { lazy, Suspense, useEffect, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { OCRPanel } from '../components/ocr/OCRPanel';
import { GuidancePanel } from '../components/guidance/GuidancePanel';

// WorkbenchScene 静态导入会把整条 2D 渲染链 + physics-core 求解器拖进首屏
// (SimulationCanvas / rendering / runSceneSimulation ≈ 300+ kB), 用 lazy 隔离;
// 场景打开后才下载对应 chunk。3D 器材 rig 在其内部继续按域懒加载。
const LazyWorkbenchScene = lazy(() =>
    import('../components/workbench/WorkbenchScene').then(m => ({ default: m.WorkbenchScene }))
);

export function App() {
    const errorMessage = useSimulationStore(s => s.errorMessage);
    const theme = useSimulationStore(s => s.theme);
    // action selectors 返回稳定引用, 不会触发重渲染
    const setErrorMessage = useSimulationStore(s => s.setErrorMessage);
    const toggleTheme = useSimulationStore(s => s.toggleTheme);
    const ensureScenesLoaded = useSimulationStore(s => s.ensureScenesLoaded);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // 挂载即预载全部场景配置(懒加载领域 chunk)
    useEffect(() => {
        ensureScenesLoaded();
    }, [ensureScenesLoaded]);

    return (
        <div className={`app ${theme} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <header className="top-bar classroom-top-bar">
                <div className="top-bar-left">
                    <div>
                        <h1 className="app-title">物理教学可视化平台</h1>
                        <p className="app-subtitle">课堂 3D 演示台 · 教材实验目录 · 参数检查器</p>
                    </div>
                </div>
                <div className="top-bar-right">
                    <OCRPanel />
                    <GuidancePanel />
                    <button className="btn btn-sm" onClick={toggleTheme}>
                        {theme === 'dark' ? '☀ 浅色' : '🌙 深色'}
                    </button>
                </div>
            </header>

            {errorMessage && (
                <div className="error-banner">
                    <span>{errorMessage}</span>
                    <button className="error-close" onClick={() => setErrorMessage(null)}>
                        x
                    </button>
                </div>
            )}

            <main className="main-content">
                <Suspense
                    fallback={
                        <div className="classroom-scene">
                            <div className="panel-section">
                                <div className="panel-title">加载实验场景…</div>
                                <div style={{ padding: 12, color: '#94a3b8', fontSize: 12 }}>
                                    首次打开需加载场景与渲染模块
                                </div>
                            </div>
                        </div>
                    }
                >
                    <LazyWorkbenchScene />
                </Suspense>
            </main>

            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label={sidebarOpen ? '收起面板' : '展开面板'}
            >
                {sidebarOpen ? 'x' : '☰'}
            </button>
        </div>
    );
}
