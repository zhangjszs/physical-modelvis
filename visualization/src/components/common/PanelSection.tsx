import { useState, type ReactNode } from 'react';

interface PanelSectionProps {
    /** 面板标题（渲染为 .panel-title），省略则无标题行 */
    title?: string;
    /** 是否可折叠（标题行带展开/收起按钮） */
    collapsible?: boolean;
    /** 初始是否展开，默认 true（仅 collapsible 时生效） */
    defaultOpen?: boolean;
    /** 附加 className（合并到外层 div） */
    className?: string;
    children: ReactNode;
}

/**
 * 通用面板段壳组件（#132 实施单 α）。
 *
 * 渲染一个带可选标题与折叠能力的 `panel-section` 容器，
 * 统一现有散落在 DataDrawer / CompositionLab / InspectorPanel 等处的重复外壳结构。
 */
export function PanelSection({
    title,
    collapsible = false,
    defaultOpen = true,
    className,
    children
}: PanelSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    const mergedClass = className ? `panel-section ${className}` : 'panel-section';

    if (!collapsible) {
        return (
            <div className={mergedClass}>
                {title && <div className="panel-title">{title}</div>}
                {children}
            </div>
        );
    }

    return (
        <div className={mergedClass}>
            {title && (
                <div
                    className="panel-title"
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpen(v => !v)}
                    onKeyDown={e => e.key === 'Enter' && setOpen(v => !v)}
                >
                    <span>{open ? '▾' : '▸'}</span> {title}
                </div>
            )}
            {open && children}
        </div>
    );
}
