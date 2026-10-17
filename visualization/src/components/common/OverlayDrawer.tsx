import { createPortal } from 'react-dom';
import { type ReactNode } from 'react';

/**
 * 浮层抽屉统一容器（#136 γ · docs/composition-reuse-boundary.md §3.5）。createPortal 挂 document.body 避 #112 包含块陷阱；
 * 遮罩点击关闭 + 面板 stopPropagation + dialog/aria-modal；各调用点用 className props 复刻原 class 防视觉回归。
 */
export interface OverlayDrawerProps {
    open: boolean;
    onClose: () => void;
    /** header 标题（同时作为 dialog 可访问名） */
    title: string;
    /** header 左侧徽标区（如"按需讲解"），省略则标题不套内层 div */
    headerBadge?: ReactNode;
    children: ReactNode;
    /** 动画方向（对齐 §3.5；实际布局由 className 决定，控件不消费） */
    side?: 'right' | 'center';
    /** 遮罩容器 class（如 guidance-overlay / formula-drawer-overlay） */
    overlayClassName?: string;
    /** 面板容器 class（如 guidance-panel / formula-drawer） */
    panelClassName?: string;
    /** header 行 class（如 guidance-header / formula-drawer-head） */
    headerClassName?: string;
    /** 标题元素 class（如 guidance-title；formula 原为无 class 的 h3） */
    titleClassName?: string;
    /** 关闭按钮 class（如 guidance-close / btn btn-sm） */
    closeClassName?: string;
    /** 关闭按钮文案，默认"关闭" */
    closeText?: string;
    /** 关闭按钮可访问名（省略则取按钮文案） */
    closeAriaLabel?: string;
}

export function OverlayDrawer(props: OverlayDrawerProps) {
    const {
        open,
        onClose,
        title,
        headerBadge,
        children,
        overlayClassName,
        panelClassName,
        headerClassName,
        titleClassName,
        closeClassName,
        closeText = '关闭',
        closeAriaLabel
    } = props;

    if (!open) return null;

    return createPortal(
        <div className={overlayClassName} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
            <div className={panelClassName} onClick={e => e.stopPropagation()}>
                <div className={headerClassName}>
                    {headerBadge ? (
                        <div>
                            {headerBadge}
                            <h3 className={titleClassName}>{title}</h3>
                        </div>
                    ) : (
                        <h3 className={titleClassName}>{title}</h3>
                    )}
                    <button
                        type="button"
                        className={closeClassName}
                        onClick={onClose}
                        {...(closeAriaLabel ? { 'aria-label': closeAriaLabel } : {})}
                    >
                        {closeText}
                    </button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}
