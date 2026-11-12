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
import { verticalMotionRig } from '../../src/components/simulation3d/rigs/verticalMotionRig';
import { uniform_acceleratedScene } from '../../src/scenes/scenes/mechanics/uniform-accelerated';
import { runSceneSimulation } from '../../src/adapters/physicsCoreAdapter';
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
    /** 记录场景实例，供背景/雾效令牌断言 */
    class SceneMock extends actual.Scene {
        static readonly instances: InstanceType<typeof actual.Scene>[] = [];
        constructor() {
            super();
            SceneMock.instances.push(this);
        }
    }
    return {
        ...actual,
        Scene: SceneMock,
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
    (THREE.Scene as unknown as { instances: THREE.Scene[] }).instances.length = 0;
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

    it('3D 场景背景与雾效由主题令牌派生（暗/亮切换不重建 Scene）', () => {
        useSimulationStore.setState({ theme: 'dark' });
        render(<EquipmentStage rig={makeMockRig('theme')} renderer={makeFakeRenderer()} />);

        const scenes = (THREE.Scene as unknown as { instances: THREE.Scene[] }).instances;
        const scene = scenes[scenes.length - 1]!;
        expect(scene.background).toBeInstanceOf(THREE.Color);
        expect((scene.background as THREE.Color).getHex()).toBe(0x0b1020);
        expect(scene.fog).toBeInstanceOf(THREE.Fog);
        expect((scene.fog as THREE.Fog).color.getHex()).toBe(0x0b1020);

        act(() => {
            useSimulationStore.setState({ theme: 'light' });
        });
        // 主题切换只改既有 Scene，不重建
        expect(scenes[scenes.length - 1]).toBe(scene);
        expect((scene.background as THREE.Color).getHex()).toBe(0xf8fafc);
        expect((scene.fog as THREE.Fog).color.getHex()).toBe(0xf8fafc);
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

function flushFrames(count: number, stepMs = 16) {
    for (let i = 0; i < count; i++) {
        const callbacks = rafQueue;
        rafQueue = [];
        frameTime += stepMs;
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

    it('autoAnimate rig: 暂停时仍逐帧渲染并推进演示时钟 (光电效应类讲解装置)', () => {
        const rig = makeMockRig('auto-animate') as SceneRig & { autoAnimate?: boolean; onAnimate?: unknown };
        rig.autoAnimate = true;
        const onAnimate = vi.fn();
        rig.onAnimate = onAnimate;
        const fakeRenderer = makeFakeRenderer();
        const renderSpy = vi.spyOn(fakeRenderer, 'render');
        render(<EquipmentStage rig={rig} renderer={fakeRenderer} />);
        act(() => {
            useSimulationStore.getState().setSimulationResult(minimalResult());
        });
        flushFrames(1);
        renderSpy.mockClear();
        onAnimate.mockClear();
        flushFrames(5);
        expect(renderSpy).toHaveBeenCalledTimes(5);
        expect(onAnimate).toHaveBeenCalledTimes(5);
        const firstTime = (onAnimate.mock.calls[0]![1] as { time: number }).time;
        const lastTime = (onAnimate.mock.calls[4]![1] as { time: number }).time;
        expect(lastTime).toBeGreaterThan(firstTime);
    });
});

// ---------------------------------------------------------------------------
// 布局尺寸变化补帧 (#111 症状 B) — renderer.setSize 无条件重置 canvas bitmap;
// 暂停态开数据抽屉挤压舞台时不清脏会永久空白。本回调模拟 StageRenderer.setSize
// 之后同帧到达的 EquipmentStage 自身 RO 通知（canvas 样式 100% 跟随舞台）。
// ---------------------------------------------------------------------------

describe('布局尺寸变化补帧 (#111)', () => {
    let roCallback: ResizeObserverCallback | null = null;

    class ROControllable {
        constructor(cb: ResizeObserverCallback) {
            roCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    function fireResize() {
        act(() => {
            roCallback!([], ROControllable as unknown as ResizeObserver);
        });
    }

    beforeEach(() => {
        roCallback = null;
        globalThis.ResizeObserver = ROControllable as unknown as typeof ResizeObserver;
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
        const rig = makeMockRig('resize-test');
        const fakeRenderer = makeFakeRenderer();
        const renderSpy = vi.spyOn(fakeRenderer, 'render');
        render(<EquipmentStage rig={rig} renderer={fakeRenderer} />);
        act(() => {
            useSimulationStore.getState().setSimulationResult(minimalResult());
        });
        return renderSpy;
    }

    it('暂停时布局尺寸变化: 恰好补一帧, 之后不再持续渲染 (#79 语义保持)', () => {
        const renderSpy = mountPausedStage();
        flushFrames(1);
        expect(renderSpy).toHaveBeenCalledTimes(1);
        renderSpy.mockClear();
        // 60 帧静默：无变化无渲染（#79 回归锚点）
        flushFrames(60);
        expect(renderSpy).not.toHaveBeenCalled();
        // 抽屉开合式布局变化 → 补一帧
        fireResize();
        flushFrames(1);
        expect(renderSpy).toHaveBeenCalledTimes(1);
        // 之后恢复静默，不持续渲染
        flushFrames(60);
        expect(renderSpy).toHaveBeenCalledTimes(1);
    });
});

describe('#157 EquipmentStage + verticalMotionRig 播放/暂停/拖时间条/重置与落地停靠回归', () => {
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

    it('默认参数 (height=20, v0y=0, g=9.8): 播放推进、暂停拖动时间条、落地截断与重置回 0s 球心位置均与引擎一致', () => {
        const params = { height: 20, v0y: 0, g: 9.8, duration: 3 };
        const { result, error } = runSceneSimulation(uniform_acceleratedScene, params);
        expect(error).toBeNull();
        expect(result).not.toBeNull();

        useSimulationStore.setState({
            parameters: params,
            simulationResult: result,
            currentTime: 0,
            isPlaying: false,
            playbackSpeed: 1
        });

        const fakeRenderer = makeFakeRenderer();
        render(<EquipmentStage rig={verticalMotionRig} renderer={fakeRenderer} />);
        flushFrames(1);

        const sceneInstances = (THREE.Scene as unknown as { instances: THREE.Scene[] }).instances;
        const stageScene = sceneInstances[sceneInstances.length - 1]!;
        // 主球是半径 0.22 的 SphereGeometry Mesh
        const mainBall = stageScene.children.find((obj): obj is THREE.Mesh => {
            if (!(obj instanceof THREE.Mesh) || !(obj.geometry instanceof THREE.SphereGeometry)) return false;
            return Math.abs(obj.geometry.parameters.radius - 0.22) < 1e-4;
        });
        expect(mainBall).toBeDefined();

        // t = 0: 释放点 y = 0.22 + 20 * 0.16 = 3.42
        expect(mainBall!.position.y).toBeCloseTo(3.42, 5);

        // 开始播放并推进 0.5s (10 帧 × 50ms)，随后暂停补一帧同步
        act(() => {
            useSimulationStore.getState().play();
        });
        flushFrames(10, 50);
        expect(useSimulationStore.getState().currentTime).toBeCloseTo(0.5, 5);
        act(() => {
            useSimulationStore.getState().pause();
        });
        flushFrames(1);
        // t = 0.5s: y = 20 - 0.5 * 9.8 * 0.25 = 18.775m -> visualY = 0.22 + 18.775 * 0.16 = 3.224
        expect(mainBall!.position.y).toBeCloseTo(0.22 + 18.775 * 0.16, 4);

        // 暂停态拖动时间条到 t = 1.0s
        act(() => {
            useSimulationStore.getState().pause();
            useSimulationStore.getState().setCurrentTime(1.0);
        });
        flushFrames(1);
        // t = 1.0s: y = 20 - 4.9 = 15.1m -> visualY = 0.22 + 15.1 * 0.16 = 2.636
        expect(mainBall!.position.y).toBeCloseTo(0.22 + 15.1 * 0.16, 4);

        // 拖动时间条到落地后 t = 2.5s (> 2.0203s): 停靠在地面接触面 0.22
        act(() => {
            useSimulationStore.getState().setCurrentTime(2.5);
        });
        flushFrames(1);
        expect(mainBall!.position.y).toBeCloseTo(0.22, 6);

        // 重置回 t = 0s: 球心回到初始高度 3.42
        act(() => {
            useSimulationStore.getState().setCurrentTime(0);
        });
        flushFrames(1);
        expect(mainBall!.position.y).toBeCloseTo(3.42, 5);
    });
});
