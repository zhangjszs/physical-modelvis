import { useState, useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { SCENE_CATEGORIES } from '../../scenes/categories';
import { CLASSROOM_SCRIPTS } from '../../scenes/classroomScripts';

const FEATURED_SCRIPT_IDS = Object.keys(CLASSROOM_SCRIPTS);

/** 教材实验目录侧栏：支持全局模糊搜索 + 章节分类树 */
export function TextbookDirectory() {
    const currentScene = useSimulationStore(s => s.currentScene);
    const setScene = useSimulationStore(s => s.setScene);
    const scenes = useSimulationStore(s => s.scenes);
    const sceneMap = useMemo(() => new Map(scenes.map(s => [s.id, s.name])), [scenes]);
    const [query, setQuery] = useState('');

    const searchResults = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return scenes.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }, [query, scenes]);

    return (
        <nav className="textbook-directory" aria-label="教材实验目录">
            <div className="directory-header">
                <div className="directory-eyebrow">教材目录</div>
                <h2>选择实验</h2>
            </div>

            {/* 快速搜索栏 */}
            <div className="directory-search-box">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="directory-search-input"
                    placeholder="搜索 123 个实验..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                {query && (
                    <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setQuery('')}
                        aria-label="清空搜索"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="directory-list">
                {query.trim() ? (
                    <div className="search-results-group">
                        <div className="search-results-meta">
                            找到 <strong>{searchResults.length}</strong> 个相关实验
                        </div>
                        {searchResults.length === 0 ? (
                            <div className="search-empty">未匹配到相关实验</div>
                        ) : (
                            <div className="directory-scenes">
                                {searchResults.map(s => {
                                    const isActive = s.id === currentScene;
                                    const hasScript = Boolean(CLASSROOM_SCRIPTS[s.id]);
                                    return (
                                        <button
                                            key={s.id}
                                            className={`directory-scene ${isActive ? 'active' : ''}`}
                                            onClick={() => setScene(s.id)}
                                        >
                                            <span>{s.name}</span>
                                            {hasScript && <span className="badge-script">精讲</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* 🌟 核心精讲课置顶推荐 */}
                        <details className="featured-details" open={FEATURED_SCRIPT_IDS.includes(currentScene)}>
                            <summary className="featured-summary">
                                🌟 高中核心精讲 ({FEATURED_SCRIPT_IDS.length} 节)
                            </summary>
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
                    </>
                )}
            </div>
        </nav>
    );
}
