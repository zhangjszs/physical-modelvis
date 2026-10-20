import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * 获取容器内所有当前可交互聚焦的元素（排除隐藏、disabled 或 tabindex=-1 元素）
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    return elements.filter(el => {
        if (el.getAttribute('tabindex') === '-1') return false;
        if ((el as HTMLButtonElement).disabled) return false;
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if (el.style.display === 'none' || el.style.visibility === 'hidden') return false;
        return true;
    });
}

/**
 * 优先寻找面板内的关闭按钮，以便初始焦点定位
 */
export function findCloseButton(container: HTMLElement): HTMLElement | null {
    const bySelector = container.querySelector<HTMLElement>(
        'button[aria-label*="关闭"], button[aria-label*="close" i], button.ocr-close, button.guidance-close, button[class*="close"]'
    );
    if (
        bySelector &&
        !(bySelector as HTMLButtonElement).disabled &&
        bySelector.getAttribute('aria-hidden') !== 'true'
    ) {
        return bySelector;
    }

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    const byText = buttons.find(btn => {
        if (btn.getAttribute('aria-hidden') === 'true') return false;
        const text = btn.textContent?.trim().toLowerCase();
        return text === '关闭' || text === '×' || text === '✕' || text === 'x' || text === 'close';
    });
    return byText ?? null;
}

export interface UseDialogAccessibilityOptions {
    /** 浮层是否打开 */
    open: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 面板 DOM 节点引用（聚焦与 Tab 循环约束在此节点内） */
    panelRef: RefObject<HTMLElement | null>;
    /** 初始焦点指定选择器（可选；若未指定则优先寻找关闭按钮，次选首个可聚焦元素） */
    initialFocusSelector?: string;
    /** 打开前触发元素的 ref（用于关闭后可靠归还焦点，可选） */
    triggerRef?: RefObject<HTMLElement | null>;
}

/**
 * 浮层对话框通用可访问性 Hook（#148）。
 * 集中管理：
 * 1. Escape 键关闭；
 * 2. 打开时捕获先前焦点，并将初始焦点置入面板内（优先关闭按钮）；
 * 3. 关闭/卸载时将焦点归还先前元素；
 * 4. Tab / Shift+Tab 焦点约束在面板内首尾回绕；
 * 5. 监听器与副作用严格在关闭/卸载时清理。
 */
export function useDialogAccessibility(options: UseDialogAccessibilityOptions): void {
    const { open, onClose, panelRef, initialFocusSelector, triggerRef } = options;

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const previousActiveElementRef = useRef<HTMLElement | null>(null);
    const prevOpenRef = useRef(false);

    useEffect(() => {
        if (!open) {
            if (prevOpenRef.current) {
                const target =
                    previousActiveElementRef.current && document.body.contains(previousActiveElementRef.current)
                        ? previousActiveElementRef.current
                        : triggerRef?.current && document.body.contains(triggerRef.current)
                          ? triggerRef.current
                          : null;
                if (target && typeof target.focus === 'function') {
                    target.focus();
                }
                previousActiveElementRef.current = null;
                prevOpenRef.current = false;
            }
            return;
        }

        // open === true
        if (!prevOpenRef.current) {
            const activeBefore = document.activeElement;
            const candidate =
                activeBefore instanceof HTMLElement &&
                activeBefore !== document.body &&
                !panelRef.current?.contains(activeBefore)
                    ? activeBefore
                    : triggerRef?.current && document.body.contains(triggerRef.current)
                      ? triggerRef.current
                      : activeBefore instanceof HTMLElement
                        ? activeBefore
                        : null;
            previousActiveElementRef.current = candidate;
            prevOpenRef.current = true;

            const panel = panelRef.current;
            if (panel) {
                let initialElement: HTMLElement | null = null;
                if (initialFocusSelector) {
                    initialElement = panel.querySelector<HTMLElement>(initialFocusSelector);
                }
                if (!initialElement) {
                    initialElement = findCloseButton(panel);
                }
                if (!initialElement) {
                    const focusables = getFocusableElements(panel);
                    initialElement = focusables[0] ?? null;
                }
                if (initialElement) {
                    initialElement.focus();
                } else {
                    if (!panel.hasAttribute('tabindex')) {
                        panel.setAttribute('tabindex', '-1');
                    }
                    panel.focus();
                }
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                e.stopPropagation();
                onCloseRef.current();
                return;
            }

            if (e.key === 'Tab') {
                const panel = panelRef.current;
                if (!panel) return;
                const focusables = getFocusableElements(panel);
                if (focusables.length === 0) {
                    e.preventDefault();
                    panel.focus();
                    return;
                }

                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (!first || !last) {
                    e.preventDefault();
                    panel.focus();
                    return;
                }
                if (e.shiftKey) {
                    if (document.activeElement === first || !panel.contains(document.activeElement)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last || !panel.contains(document.activeElement)) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (prevOpenRef.current) {
                const target =
                    previousActiveElementRef.current && document.body.contains(previousActiveElementRef.current)
                        ? previousActiveElementRef.current
                        : triggerRef?.current && document.body.contains(triggerRef.current)
                          ? triggerRef.current
                          : null;
                if (target && typeof target.focus === 'function') {
                    target.focus();
                }
                previousActiveElementRef.current = null;
                prevOpenRef.current = false;
            }
        };
    }, [open, initialFocusSelector, panelRef, triggerRef]);
}
