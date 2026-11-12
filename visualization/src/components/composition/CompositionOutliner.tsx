import { useEffect, useState } from 'react';
import { useCompositionStore } from '../../store/compositionStore';
import { sourceDisplayName } from './picking';
import { PanelSection } from '../common/PanelSection';

/**
 * CompositionOutliner — 器材列表 (#166 P0 S-4)。
 *
 * 选中/放置的第二入口 (密集堆叠、被遮挡、触屏、键盘场景的兜底):
 * - 点击行即选中 (直接读写 selectedId — 与 3D 选中双向同步, 不引入第三份状态)
 * - 行 hover 与 3D 悬停高亮联动 (hoverId 双向)
 * - 键盘: Tab 聚焦列表容器, ↑/↓ 移动焦点行, Enter 选中, Delete 删除 (A-7)
 * - 可读命名 (S-8): 「点电荷 #3」, 不展示内部完整 id
 */
export function CompositionOutliner() {
    const sources = useCompositionStore(s => s.sources);
    const selectedId = useCompositionStore(s => s.selectedId);
    const hoverId = useCompositionStore(s => s.hoverId);
    const select = useCompositionStore(s => s.select);
    const setHover = useCompositionStore(s => s.setHover);
    const removeSource = useCompositionStore(s => s.removeSource);

    const [focusIndex, setFocusIndex] = useState(0);

    // 器材增删后把键盘焦点行夹回有效范围
    useEffect(() => {
        setFocusIndex(prev => Math.min(prev, Math.max(sources.length - 1, 0)));
    }, [sources.length]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (sources.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusIndex(i => (i + 1) % sources.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusIndex(i => (i - 1 + sources.length) % sources.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const placed = sources[focusIndex];
            if (placed) select(placed.id);
        } else if (e.key === 'Delete') {
            e.preventDefault();
            const placed = sources[focusIndex];
            // 先选中再删除: 全局 Delete 快捷键 (CompositionStage 挂 window) 同帧也会删
            // selectedId — 先把焦点行置为 selectedId, 两处删除同一器材, 第二次为 no-op
            if (placed) {
                select(placed.id);
                removeSource(placed.id);
            }
        }
    };

    return (
        <PanelSection title="🧰 器材列表">
            <div
                className="composition-outliner"
                tabIndex={0}
                role="listbox"
                aria-label="器材列表"
                onKeyDown={handleKeyDown}
            >
                {sources.length === 0 && (
                    <p className="composition-empty-hint">
                        从上方器材面板添加场源后, 此处列出全部器材 (键盘 ↑↓ 选择, Enter 选中)。
                    </p>
                )}
                {sources.map((placed, i) => {
                    const cls =
                        'composition-outliner-row' +
                        (placed.id === selectedId ? ' selected' : '') +
                        (i === focusIndex ? ' focus' : '') +
                        (placed.id === hoverId ? ' hover' : '');
                    return (
                        <div
                            key={placed.id}
                            role="option"
                            aria-selected={placed.id === selectedId}
                            className={cls}
                            onClick={() => {
                                setFocusIndex(i);
                                select(placed.id);
                            }}
                            onMouseEnter={() => setHover(placed.id)}
                            onMouseLeave={() => setHover(null)}
                        >
                            <span className="composition-outliner-name">{sourceDisplayName(placed)}</span>
                        </div>
                    );
                })}
            </div>
        </PanelSection>
    );
}
