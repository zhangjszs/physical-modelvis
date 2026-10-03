/**
 * StageRenderer 契约测试 (#81) — WebGL 上下文拥有者的生命周期
 *
 * StageRenderer 把 renderer/canvas 从按场景 remount 的 EquipmentStage 提升为常驻拥有者:
 *   1. 挂载即创建 renderer 并把 canvas 放进 .stage-canvas-host, children 收到该实例;
 *   2. 卸载时 dispose + forceContextLoss (全应用唯一做上下文销毁的地方);
 *   3. children 重渲染 (等价场景切换) 不重建 renderer/canvas —— 上下文跨场景常驻的直接证据。
 * three 的 WebGLRenderer 在本文件 mock (jsdom 无 WebGL)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as THREE from 'three';
import { StageRenderer } from '../../src/components/simulation3d/StageRenderer';

class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

beforeEach(() => {
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

vi.mock('three', async importOriginal => {
    const actual = await importOriginal<typeof import('three')>();
    return {
        ...actual,
        WebGLRenderer: class {
            domElement = document.createElement('canvas');
            shadowMap = { enabled: false, type: 0 };
            setPixelRatio() {}
            setSize() {}
            dispose() {}
            forceContextLoss() {}
        }
    };
});

describe('StageRenderer 契约 (#81)', () => {
    afterEach(() => {
        cleanup();
    });

    it('挂载创建 renderer, canvas 放入 .stage-canvas-host, children 收到实例', () => {
        const seen: THREE.WebGLRenderer[] = [];
        const { container } = render(
            <StageRenderer>
                {r => {
                    seen.push(r);
                    return <div data-testid="stage-child" />;
                }}
            </StageRenderer>
        );
        expect(seen.length).toBeGreaterThan(0);
        const host = container.querySelector('.stage-canvas-host');
        expect(host).not.toBeNull();
        expect(host!.contains(seen[0]!.domElement)).toBe(true);
        expect(container.querySelector('[data-testid="stage-child"]')).not.toBeNull();
    });

    it('卸载时 dispose + forceContextLoss (renderer 归 StageRenderer 所有)', () => {
        const disposeSpy = vi.spyOn(
            (THREE.WebGLRenderer as unknown as { prototype: { dispose: () => void } }).prototype,
            'dispose'
        );
        const lossSpy = vi.spyOn(
            (THREE.WebGLRenderer as unknown as { prototype: { forceContextLoss: () => void } }).prototype,
            'forceContextLoss'
        );
        const { unmount } = render(<StageRenderer>{() => <div />}</StageRenderer>);
        unmount();
        expect(disposeSpy).toHaveBeenCalledTimes(1);
        expect(lossSpy).toHaveBeenCalledTimes(1);
    });

    it('children 重渲染 (等价场景切换) 不重建 renderer/canvas', () => {
        const seen: THREE.WebGLRenderer[] = [];
        const { rerender, container } = render(
            <StageRenderer>
                {r => {
                    seen.push(r);
                    return <div data-scene="a" />;
                }}
            </StageRenderer>
        );
        rerender(
            <StageRenderer>
                {r => {
                    seen.push(r);
                    return <div data-scene="b" />;
                }}
            </StageRenderer>
        );
        // 两次 children 渲染拿到同一 renderer 实例, canvas 未被替换
        expect(seen.length).toBe(2);
        expect(seen[1]).toBe(seen[0]);
        const canvases = container.querySelectorAll('.stage-canvas-host canvas');
        expect(canvases.length).toBe(1);
    });
});
