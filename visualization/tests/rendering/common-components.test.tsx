/**
 * #132 实施单 α — PanelSection / LazyPanel 组件测试
 *
 * 每个组件 ≥2 例：正常渲染 + 状态变化/错误边界。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { lazy } from 'react';
import { PanelSection } from '../../src/components/common/PanelSection';
import { LazyPanel } from '../../src/components/common/LazyPanel';

// ─────────────── PanelSection ───────────────

describe('PanelSection', () => {
    it('渲染 title 和 children', () => {
        render(
            <PanelSection title="测试标题">
                <p>内容</p>
            </PanelSection>
        );
        expect(screen.getByText('测试标题')).toBeDefined();
        expect(screen.getByText('内容')).toBeDefined();
    });

    it('无 title 时不渲染 panel-title div', () => {
        const { container } = render(
            <PanelSection>
                <span>裸内容</span>
            </PanelSection>
        );
        expect(container.querySelector('.panel-title')).toBeNull();
        expect(screen.getByText('裸内容')).toBeDefined();
    });

    it('collapsible 模式下点击标题可切换内容可见性', () => {
        render(
            <PanelSection title="折叠面板" collapsible defaultOpen={true}>
                <p>可折叠内容</p>
            </PanelSection>
        );
        expect(screen.getByText('可折叠内容')).toBeDefined();
        fireEvent.click(screen.getByText('折叠面板'));
        expect(screen.queryByText('可折叠内容')).toBeNull();
    });

    it('className 合并到外层 div', () => {
        const { container } = render(
            <PanelSection className="custom">
                <span>x</span>
            </PanelSection>
        );
        const div = container.firstChild as HTMLElement;
        expect(div.className).toBe('panel-section custom');
    });
});

// ─────────────── LazyPanel ───────────────

/** 辅助：创建一个立刻成功的同步组件 */
function SyncChild() {
    return <div>子组件已加载</div>;
}

describe('LazyPanel', () => {
    it('正常渲染 children', () => {
        render(
            <LazyPanel label="测试面板">
                <SyncChild />
            </LazyPanel>
        );
        expect(screen.getByText('子组件已加载')).toBeDefined();
    });

    it('children 抛错时显示 errorText fallback', () => {
        // 创建一个抛错的组件（显式返回 ReactNode 以满足 JSX 类型）
        const Broken = (): React.ReactNode => {
            throw new Error('boom');
        };
        // 抑制 React 的错误边界 console.error 噪音
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <LazyPanel label="崩溃面板" errorText="自定义错误文案">
                <Broken />
            </LazyPanel>
        );
        expect(screen.getByText('自定义错误文案')).toBeDefined();
        vi.restoreAllMocks();
    });

    it('title 省略时使用 label 作为面板标题', () => {
        // 用 lazy 组件制造 Suspense 状态来验证 fallback 里的 title
        const SlowComponent = lazy(() => new Promise<{ default: () => JSX.Element }>(() => {}));

        render(
            <LazyPanel label="慢面板">
                <SlowComponent />
            </LazyPanel>
        );
        // Suspense fallback 应包含 label 作为 title
        expect(screen.getByText('慢面板')).toBeDefined();
        expect(screen.getByText('加载中...')).toBeDefined();
    });

    it('loadingText 自定义生效', () => {
        const NeverResolve = lazy(() => new Promise<{ default: () => JSX.Element }>(() => {}));

        render(
            <LazyPanel label="数据" loadingText="请稍候...">
                <NeverResolve />
            </LazyPanel>
        );
        expect(screen.getByText('请稍候...')).toBeDefined();
    });
});
