import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
    /** 子内容渲染出错时展示的兜底 UI（例如回退到 2D 画布） */
    fallback: ReactNode;
    /** 可选：出错时的回调，用于打日志 / 提示 */
    onError?: (error: Error, info: ErrorInfo) => void;
    /** 用于错误定位的标签（如 '3D 器材舞台'） */
    label?: string;
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

/**
 * 通用错误边界。
 *
 * 为什么需要它：本项目此前全仓没有 error boundary。3D 实验舞台 (EquipmentStage)
 * 在挂载时会无条件调用 rig.buildEquipment(...)，一旦某个场景的 rig 在构建阶段抛错，
 * React 会直接卸载整棵组件树 → 整页白屏。用边界包住渲染风险点后，出错只会降级到
 * fallback（2D 画布 / 错误提示），不会再白屏。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // 仅记录，便于后续定位具体是哪个场景的 rig 抛错
        console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info);
        this.props.onError?.(error, info);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}
