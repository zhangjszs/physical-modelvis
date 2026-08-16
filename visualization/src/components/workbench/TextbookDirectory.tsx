import { useSimulationStore } from '../../store/simulationStore';
import { SCENE_CATEGORIES } from '../layout/SceneSelector';
import { CLASSROOM_SCRIPTS } from '../../scenes/classroomScripts';

const FEATURED_SCRIPT_IDS = Object.keys(CLASSROOM_SCRIPTS);

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
                {/* 🌟 核心精讲课置顶推荐 */}
                <details className="featured-details" open={FEATURED_SCRIPT_IDS.includes(currentScene)}>
                    <summary className="featured-summary">🌟 高中核心精讲 ({FEATURED_SCRIPT_IDS.length} 节)</summary>
                    <div className="directory-scenes">
                        {FEATURED_SCRIPT_IDS.map(id => {
                            const isActive = id === currentScene;
                            return (
                                <button
                                    key={id}
                                    className={`directory-scene ${isActive ? 'active' : ''}`}
                                    onClick={() => setScene(id)}
                                >
                                    <span>{sceneMap.get(id) ?? id}</span>
                                    <span className="badge-script">精讲</span>
                                </button>
                            );
                        })}
                    </div>
                </details>

                {/* 教材全册分类目录 */}
                {SCENE_CATEGORIES.map(category => (
                    <details key={category.label} open={category.ids.includes(currentScene)}>
                        <summary>{category.label}</summary>
                        <div className="directory-scenes">
                            {category.ids.map(id => {
                                const isActive = id === currentScene;
                                const hasScript = Boolean(CLASSROOM_SCRIPTS[id]);
                                return (
                                    <button
                                        key={id}
                                        className={`directory-scene ${isActive ? 'active' : ''}`}
                                        onClick={() => setScene(id)}
                                    >
                                        <span>{sceneMap.get(id) ?? id}</span>
                                        {hasScript && <span className="badge-script">精讲</span>}
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
