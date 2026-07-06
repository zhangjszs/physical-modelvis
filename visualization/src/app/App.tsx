import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { SceneSelector } from '../components/layout/SceneSelector';
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
    const { currentScene, errorMessage, setErrorMessage, theme, toggleTheme } = useSimulationStore();
    const SceneComponent = SCENE_MAP[currentScene] ?? ProjectileScene;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className={`app ${theme} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            {/* 顶部导航 */}
            <header className="top-bar">
                <div className="top-bar-left">
                    <h1 className="app-title">物理教学可视化平台</h1>
                    <SceneSelector />
                </div>
                <div className="top-bar-right">
                    <button className="btn btn-sm" onClick={toggleTheme}>
                        {theme === 'dark' ? '☀ 浅色' : '🌙 深色'}
                    </button>
                </div>
            </header>

            {/* 错误提示 */}
            {errorMessage && (
                <div className="error-banner">
                    <span>{errorMessage}</span>
                    <button className="error-close" onClick={() => setErrorMessage(null)}>
                        ✕
                    </button>
                </div>
            )}

            {/* 场景内容 */}
            <main className="main-content">
                <SceneComponent />
            </main>

            {/* 移动端侧边栏切换按钮 */}
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label={sidebarOpen ? '收起面板' : '展开面板'}
            >
                {sidebarOpen ? '✕' : '☰'}
            </button>
        </div>
    );
}
