import { useSimulationStore } from '../../store/simulationStore';
import { SCENE_CATEGORIES } from '../layout/SceneSelector';

/** 教材实验目录侧栏 */
export function TextbookDirectory() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const setScene = useSimulationStore(s => s.setScene);
    const scenes = useSimulationStore(s => s.scenes);
    const sceneMap = new Map(scenes.map(s => [s.id, s.name]));

    return (
        <nav className="textbook-directory" aria-label="教材实验目录">
            <div className="directory-eyebrow">教材目录</div>
            <h2>选择实验</h2>
            <div className="directory-list">
                {SCENE_CATEGORIES.map(category => (
                    <details key={category.label} open={category.ids.includes(currentScene)}>
                        <summary>{category.label}</summary>
                        <div className="directory-scenes">
                            {category.ids.map(id => {
                                const isActive = id === currentScene;
                                return (
                                    <button
                                        key={id}
                                        className={`directory-scene ${isActive ? 'active' : ''}`}
                                        onClick={() => setScene(id)}
                                    >
                                        <span>{sceneMap.get(id) ?? id}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </details>
                ))}
            </div>
        </nav>
    );
}
