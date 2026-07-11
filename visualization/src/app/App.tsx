import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { ProjectileScene } from '../scenes/ProjectileScene';

const SCENE_MAP: Record<string, () => JSX.Element> = {
    projectile: ProjectileScene,
    'uniform-accelerated': ProjectileScene,
    'free-fall': ProjectileScene,
    'electric-field': ProjectileScene,
    'magnetic-field': ProjectileScene,
    collision: ProjectileScene,
    spring: ProjectileScene,
    'inclined-plane': ProjectileScene,
    'em-combined': ProjectileScene
};

export function App() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const errorMessage = useSimulationStore(s => s.errorMessage);
    const theme = useSimulationStore(s => s.theme);
    // action selectors 返回稳定引用, 不会触发重渲染
    const setErrorMessage = useSimulationStore(s => s.setErrorMessage);
    const toggleTheme = useSimulationStore(s => s.toggleTheme);
    const SceneComponent = SCENE_MAP[currentScene] ?? ProjectileScene;
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                <SceneComponent />
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
