/**
 * EquipmentStage 行为测试 — 3D 舞台挂载/参数/场景切换回归保护
 *
 * 背景: 场景切换实测曾发现大量 "updateEquipment failed: Cannot read properties of
 * undefined" — 旧场景 rig 的 handles 被新场景 rig 的 updateEquipment 消费。
 * 根因修复在 ProjectileScene (rig 按场景缓存 + rigReady 渲染条件),
 * 本测试从组件层固化两条防线:
 *   1. key 变化的 remount 后, updateEquipment 必须消费本 rig 自己的 handles
 *   2. 即使 props.rig 变化但组件未 remount (错配发生), EquipmentStage 不白屏
 *
 * 策略: 保留真实 three.js 几何类 (纯 JS, Node 可用), 仅 stub WebGLRenderer
 * (jsdom 无 WebGL context) 与 OrbitControls。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EquipmentStage, type SceneRig } from '../../src/components/simulation3d/EquipmentStage';
import { useSimulationStore } from '../../src/store/simulationStore';
import type { SimulationResult } from 'physics-core';

/** 最小可用的 SimulationResult (仅含轨迹, 用于触发 getVisualPosition 路径) */
function minimalResult(): SimulationResult {
    return {
        trajectories: [
            [
                { position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 }, t: 0 },
                { position: { x: 1, y: 1 }, velocity: { x: 1, y: 1 }, t: 1 }
            ]
        ]
    } as unknown as SimulationResult;
}

vi.mock('three', async importOriginal => {
    const actual = await importOriginal<typeof import('three')>();
    return {
        ...actual,
        WebGLRenderer: class {
            domElement = document.createElement('canvas');
            shadowMap = { enabled: false, type: 0 };
            setPixelRatio() {}
            setSize() {}
            render() {}
            dispose() {}
        }
    };
});

vi.mock('three/addons/controls/OrbitControls.js', () => {
    const instances: OrbitControlsMock[] = [];
    class OrbitControlsMock {
        static readonly instances = instances;
        target = { set() {} };
        enableDamping = false;
        dampingFactor = 0;
        minDistance = 0;
        maxDistance = 0;
        maxPolarAngle = 0;
        private listeners = new Map<string, Set<() => void>>();
        constructor() {
            instances.push(this);
        }
        addEventListener(type: string, cb: () => void) {
            if (!this.listeners.has(type)) this.listeners.set(type, new Set());
            this.listeners.get(type)!.add(cb);
        }
        removeEventListener(type: string, cb: () => void) {
            this.listeners.get(type)?.delete(cb);
        }
        /** 测试辅助: 手动派发事件 (如相机移动触发的 'change') */
        emit(type: string) {
            this.listeners.get(type)?.forEach(cb => cb());
        }
        update() {}
        dispose() {}
    }
    return { OrbitControls: OrbitControlsMock };
});

/** 可记录的 mock rig: 每个方法记录调用, buildEquipment 返回独立可追踪的 handles */
function makeMockRig(name: string) {
    const builtHandles: Record<string, unknown>[] = [];
    const buildEquipment = vi.fn((_scene: THREE.Scene) => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
        const handles = { box: group.children[0], tag: `handles-${name}` };
        builtHandles.push(handles);
        return { group, handles };
    });
    const updateEquipment = vi.fn();
    const getVisualPosition = vi.fn((pos: { x: number; y: number }) => new THREE.Vector3(pos.x, pos.y, 0));
    const getOrigin = vi.fn(() => new THREE.Vector3(0, 0, 0));
    return {
        name,
        buildEquipment,
        updateEquipment,
        getVisualPosition,
        getOrigin,
        builtHandles
    } as unknown as SceneRig & {
        buildEquipment: ReturnType<typeof vi.fn>;
        updateEquipment: ReturnType<typeof vi.fn>;
        getVisualPosition: ReturnType<typeof vi.fn>;
        getOrigin: ReturnType<typeof vi.fn>;
        builtHandles: Record<string, unknown>[];
    };
}

function makeMockRig2(name: string) {
    return makeMockRig(name);
}

/** 注入式 renderer (#81) 的测试替身: EquipmentStage 只消费 domElement 与 render */
function makeFakeRenderer(): THREE.WebGLRenderer {
    return {
        domElement: document.createElement('canvas'),
        render: () => {},
        setSize: () => {},
        setPixelRatio: () => {},
        dispose: () => {},
        shadowMap: { enabled: false, type: 0 }
    } as unknown as THREE.WebGLRenderer;
}

class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}

beforeEach(() => {
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useSimulationStore.setState({
        parameters: {},
        parametersSceneId: null,
        simulationResult: null,
        currentTime: 0,
        isPlaying: false
    });
});

describe('EquipmentStage 行为', () => {
    it('挂载时调用 buildEquipment, 并用其返回的 handles 调用 updateEquipment', () => {
        const rig = makeMockRig('pendulum');
        render(<EquipmentStage rig={rig} renderer={makeFakeRenderer()} />);
        expect(rig.buildEquipment).toHaveBeenCalledTimes(1);
        expect(rig.updateEquipment).toHaveBeenCalledTimes(1);
        const received = rig.updateEquipment.mock.calls[0]![0] as Record<string, unknown>;
        expect(received).toBe(rig.builtHandles[0]);
    });

    it('参数变化时 updateEquipment 收到最新参数', () => {
        const rig = makeMockRig('pendulum');
        render(<EquipmentStage rig={rig} renderer={makeFakeRenderer()} />);
        act(() => {
            useSimulationStore.getState().setParameter('angle', 45);
        });
        expect(rig.updateEquipment).toHaveBeenCalledTimes(2);
        const params = rig.updateEquipment.mock.calls[1]![1] as Record<string, number>;
        expect(params.angle).toBe(45);
    });

    it('场景切换 (key 变化 remount): 新 rig 的 updateEquipment 必须消费新 rig 自己的 handles', () => {
        // 回归保护: 竞态 bug 中, 旧 rig handles + 新 rig updateEquipment 错配导致崩溃
        const rigA = makeMockRig2('projectile');
        const first = render(<EquipmentStage key="projectile" rig={rigA} renderer={makeFakeRenderer()} />);
        first.unmount();

        const rigB = makeMockRig2('inertia');
        render(<EquipmentStage key="inertia" rig={rigB} renderer={makeFakeRenderer()} />);
        expect(rigB.buildEquipment).toHaveBeenCalledTimes(1);
        expect(rigB.updateEquipment).toHaveBeenCalledTimes(1);
        const received = rigB.updateEquipment.mock.calls[0]![0] as Record<string, unknown>;
        // 引用相等: 必须是 rigB.buildEquipment 返回的 handles, 而不是 rigA 的
        expect(received).toBe(rigB.builtHandles[0]);
        expect((received as { tag: string }).tag).toBe('handles-inertia');
    });

    it('props.rig 变化但组件未 remount (错配发生): 不抛错, 由 try-catch 兜底', () => {
        // 模拟极端时序: 组件实例复用时 rig 从 A 换成 B (key 未变)
        // EquipmentStage 自身必须保持防御性 — 不白屏
        const rigA = makeMockRig2('projectile');
        const { rerender } = render(<EquipmentStage rig={rigA} renderer={makeFakeRenderer()} />);
        const rigB = makeMockRig2('inertia');
        expect(() => rerender(<EquipmentStage rig={rigB} renderer={makeFakeRenderer()} />)).not.toThrow();
        // 新 rig 的 updateEquipment 被调用 (旧 handles 是 A 的), 防御层应吞掉异常
        expect(rigB.updateEquipment).toHaveBeenCalled();
    });

    it('getVisualPosition 异常被防御层拦截, 不冒泡到 React', async () => {
        const rig = makeMockRig('pendulum');
        rig.getVisualPosition.mockImplementation(() => {
            throw new Error('bad visual position');
        });
        render(<EquipmentStage rig={rig} renderer={makeFakeRenderer()} />);
        act(() => {
            useSimulationStore.getState().setSimulationResult(minimalResult());
        });
        // 动画循环在 rAF 中调用 getVisualPosition, 等待一帧让其执行
        await act(async () => {
            await new Promise(r => setTimeout(r, 50));
        });
        expect(rig.getVisualPosition).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// 暂停时按需渲染 (#79) — 手动 rAF 队列 + renderer.render 计数
// 旧实现 isPlaying 只门控时间推进, renderer.render 每帧照跑 (GPU 常驻负载)；
// 新实现暂停时仅交互/状态变化补帧。
// ---------------------------------------------------------------------------

/** 组件循环排入的 requestAnimationFrame 回调, 由 flushFrames 手动逐帧推进 */
let rafQueue: FrameRequestCallback[] = [];
let frameTime = 0;

function flushFrames(count: number) {
    for (let i = 0; i < count; i++) {
        const callbacks = rafQueue;
        rafQueue = [];
        frameTime += 16;
        callbacks.forEach(cb => cb(frameTime));
    }
}

describe('暂停时按需渲染 (#79)', () => {
    beforeEach(() => {
        rafQueue = [];
        frameTime = 0;
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });
        vi.stubGlobal('cancelAnimationFrame', () => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function mountPausedStage() {
        const rig = makeMockRig('paused-test');
        const fakeRenderer = makeFakeRenderer();
        const renderSpy = vi.spyOn(fakeRenderer, 'render');
        render(<EquipmentStage rig={rig} renderer={fakeRenderer} />);
        act(() => {
            useSimulationStore.getState().setSimulationResult(minimalResult());
        });
        return renderSpy;
    }

    it('挂载后首帧渲染一次; 暂停且无交互时连续 60 帧 0 次 render', () => {
        const renderSpy = mountPausedStage();
        flushFrames(1);
        expect(renderSpy).toHaveBeenCalledTimes(1);
        renderSpy.mockClear();
        flushFrames(60);
        expect(renderSpy).not.toHaveBeenCalled();
    });

    it('暂停时外部改写 currentTime (拖进度条): 恰好补一帧, 不持续渲染', () => {
        const renderSpy = mountPausedStage();
        flushFrames(1);
        renderSpy.mockClear();
        act(() => {
            useSimulationStore.getState().setCurrentTime(0.5);
        });
        flushFrames(1);
        expect(renderSpy).toHaveBeenCalledTimes(1);
        flushFrames(60);
        expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('暂停时改参数: 补一帧', () => {
        const renderSpy = mountPausedStage();
        flushFrames(1);
        renderSpy.mockClear();
        act(() => {
            useSimulationStore.getState().setParameter('angle', 30);
        });
        flushFrames(1);
        expect(renderSpy).toHaveBeenCalledTimes(1);
        flushFrames(60);
        expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('暂停时旋转视角 (controls change): 补一帧, 相机停止后不再渲染', () => {
        const renderSpy = mountPausedStage();
        flushFrames(1);
        renderSpy.mockClear();
        const instances = (OrbitControls as unknown as { instances: { emit(type: string): void }[] }).instances;
        instances[instances.length - 1]!.emit('change');
        flushFrames(1);
        expect(renderSpy).toHaveBeenCalledTimes(1);
        flushFrames(60);
        expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('恢复播放: 回到每帧渲染', () => {
        const renderSpy = mountPausedStage();
        flushFrames(1);
        renderSpy.mockClear();
        act(() => {
            useSimulationStore.getState().play();
        });
        flushFrames(5);
        expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
});
