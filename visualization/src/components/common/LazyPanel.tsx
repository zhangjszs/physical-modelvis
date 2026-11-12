import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { PanelSection } from './PanelSection';

interface LazyPanelProps {
    /** ErrorBoundary 定位标签 */
    label: string;
    /** 被包裹的懒加载组件（已渲染的 JSX 元素） */
    children: ReactNode;
    /** 面板标题（用于 fallback 壳），省略则用 label */
    title?: string;
    /** 加载中文案，默认 "加载中..." */
    loadingText?: string;
    /** 加载失败文案，默认 "加载失败" */
    errorText?: string;
}

const FALLBACK_STYLE: React.CSSProperties = { padding: 12, color: '#94a3b8', fontSize: 12 };

/**
 * 懒加载面板统一壳（#132 实施单 α）。
 *
 * 封装 ErrorBoundary + Suspense 三明治模式，
 * 将 fallback 渲染委托给 PanelSection 壳。
 */
export function LazyPanel({
    label,
    children,
    title,
    loadingText = '加载中...',
    errorText = '加载失败'
}: LazyPanelProps) {
    const displayTitle = title ?? label;

    return (
        <ErrorBoundary
            label={label}
            fallback={
                <PanelSection title={displayTitle}>
                    <div style={FALLBACK_STYLE}>{errorText}</div>
                </PanelSection>
            }
        >
            <Suspense
                fallback={
                    <PanelSection title={displayTitle}>
                        <div style={FALLBACK_STYLE}>{loadingText}</div>
                    </PanelSection>
                }
            >
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
