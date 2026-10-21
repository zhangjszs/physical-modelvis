import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type * as ThreeModule from 'three';
import { CompositionStage } from '../../src/components/composition/CompositionStage';
import { useCompositionStore } from '../../src/store/compositionStore';

function delay(ms: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// 记录 render 调用次数，用于验证 #79/#100 按需渲染契约
let renderCount = 0;

vi.mock('three', async importOriginal => {
    const actual = await importOriginal<typeof ThreeModule>();
    class MockRenderer {
        domElement = document.createElement('canvas');
        shadowMap = { enabled: false, type: 0 };
        setPixelRatio() {}
        setSize() {}
        render() {
            renderCount++;
        }
        dispose() {}
    }
    return {
        ...actual,
        WebGLRenderer: MockRenderer
    };
});

class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

describe('CompositionStage 轨迹回放控制与交互', () => {
    beforeEach(() => {
        globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
        renderCount = 0;
        useCompositionStore.getState().resetLab();
    });

    afterEach(() => {
        cleanup();
    });

    it('渲染回放控制条组件：播放/暂停、重置、进度条与 5 档倍速按钮', () => {
        const { container } = render(<CompositionStage />);

        expect(screen.getByTitle('重置到起点')).toBeDefined();
        expect(screen.getByTitle('暂停 (空格)')).toBeDefined();

        const slider = container.querySelector('.timeline-slider') as HTMLInputElement;
        expect(slider).not.toBeNull();

        // 5 个倍速按钮：0.25x, 0.5x, 1x, 1.5x, 2x
        const speedButtons = container.querySelectorAll('.playback-speed button');
        expect(speedButtons).toHaveLength(5);
        expect(screen.getByText('1x').className).toContain('active');
    });

    it('点击播放/暂停按钮切换播放状态', () => {
        useCompositionStore.getState().addSource('point-charge');
        render(<CompositionStage />);
        const playBtn = screen.getByTitle('暂停 (空格)');
        expect(playBtn.className).toContain('active');

        // 点击暂停
        fireEvent.click(playBtn);
        expect(screen.getByTitle('播放 (空格)')).toBeDefined();
        expect(playBtn.className).not.toContain('active');

        // 点击播放
        fireEvent.click(playBtn);
        expect(screen.getByTitle('暂停 (空格)')).toBeDefined();
        expect(playBtn.className).toContain('active');
    });

    it('切换倍速按钮激活对应倍速', () => {
        render(<CompositionStage />);
        const btn2x = screen.getByText('2x');
        fireEvent.click(btn2x);
        expect(btn2x.className).toContain('active');
        expect(screen.getByText('1x').className).not.toContain('active');

        const btn025 = screen.getByText('0.25x');
        fireEvent.click(btn025);
        expect(btn025.className).toContain('active');
        expect(btn2x.className).not.toContain('active');
    });

    it('拖动进度滑块跳帧', () => {
        // 先添加器材产出轨迹
        useCompositionStore.getState().addSource('point-charge');
        const { container } = render(<CompositionStage />);

        const slider = container.querySelector('.timeline-slider') as HTMLInputElement;
        expect(slider).not.toBeNull();

        fireEvent.change(slider, { target: { value: '1.25' } });
        expect(slider.value).toBe('1.25');
        expect(screen.getByText('1.25s')).toBeDefined();
    });

    it('键盘快捷键：空格切换播放/暂停，Delete 删除选中器材', () => {
        useCompositionStore.getState().addSource('straight-wire');
        const wireId = useCompositionStore.getState().sources[0]!.id;
        useCompositionStore.getState().select(wireId);

        render(<CompositionStage />);

        // 空格暂停
        fireEvent.keyDown(window, { code: 'Space', key: ' ' });
        expect(screen.getByTitle('播放 (空格)')).toBeDefined();

        // 空格恢复播放
        fireEvent.keyDown(window, { code: 'Space', key: ' ' });
        expect(screen.getByTitle('暂停 (空格)')).toBeDefined();

        // Delete 删除选中器材
        expect(useCompositionStore.getState().sources).toHaveLength(1);
        fireEvent.keyDown(window, { code: 'Delete', key: 'Delete' });
        expect(useCompositionStore.getState().sources).toHaveLength(0);
        expect(useCompositionStore.getState().selectedId).toBeNull();
    });

    it('输入框焦点保护：在 input / textarea / select 中按空格与 Delete 不被吞', () => {
        useCompositionStore.getState().addSource('circular-coil');
        const coilId = useCompositionStore.getState().sources[0]!.id;
        useCompositionStore.getState().select(coilId);

        render(<CompositionStage />);

        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        // 在 input 中按空格
        const spaceEvent = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true });
        input.dispatchEvent(spaceEvent);
        // 播放状态不受影响（依然是暂停按钮，即处于播放态）
        expect(screen.getByTitle('暂停 (空格)')).toBeDefined();

        // 在 input 中按 Delete
        const delEvent = new KeyboardEvent('keydown', { code: 'Delete', key: 'Delete', bubbles: true });
        input.dispatchEvent(delEvent);
        // 器材未被误删
        expect(useCompositionStore.getState().sources).toHaveLength(1);

        document.body.removeChild(input);
    });

    it('按需渲染契约 (#79/#100)：暂停且无交互时 rAF 不空转调用 renderer.render', async () => {
        useCompositionStore.getState().addSource('point-charge');
        const { container } = render(<CompositionStage />);

        // 点击暂停
        const playBtn = screen.getByTitle('暂停 (空格)');
        fireEvent.click(playBtn);
        expect(screen.getByTitle('播放 (空格)')).toBeDefined();

        // 记下当前渲染次数
        const countBefore = renderCount;

        // 模拟几个 rAF 周期
        await act(async () => {
            await delay(80);
        });

        // 暂停且无交互时，render 不会无故累加
        const countAfter = renderCount;
        expect(countAfter - countBefore).toBeLessThanOrEqual(1);

        // 拖动滑块跳帧时，按需触发单次补帧
        const slider = container.querySelector('.timeline-slider') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '0.8' } });

        await act(async () => {
            await delay(30);
        });
        expect(renderCount).toBeGreaterThan(countAfter);
    });
});
