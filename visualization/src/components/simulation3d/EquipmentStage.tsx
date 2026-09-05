/**
 * EquipmentStage — 通用 3D 实验舞台
 *
 * 复用抛体模板的 build-once / mutate-via-refs / render-in-rAF 模式，
 * 把"环境 + 运动证据 + 动画循环"抽象成通用层，
 * 把"器材 + 坐标映射"下放给各场景的 rig 配置。
 *
 * 每个实验只需定义一个 rig：
 *   - buildEquipment(scene, params)  → 返回 { group, handles }
 *   - updateEquipment(handles, params) → 参数变化时更新器材
 *   - getVisualPosition(pos, params) → 物理坐标 → 3D 坐标
 *   - getOrigin(params)             → 轨迹起点（发射口 / 释放点）
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useSimulationStore } from '../../store/simulationStore';
import { findFrameIndex, getTotalDuration, interpolateFrame } from '../../utils/frameUtils';
import {
    createEnvironment,
    makeTrajectoryLine,
    makeGhostBalls,
    makeShadowPlate,
    makeProjectionLine,
    disposeObject,
    makeSphere
} from './primitives';

// ---------------------------------------------------------------------------
// rig 接口 — 每个实验场景实现此接口即可接入 3D 舞台
// ---------------------------------------------------------------------------

export interface SceneRig {
    /** 世界尺度（米 → Three.js 单位），默认 0.16 */
    worldScale?: number;
    /** 球的半径，默认 0.22 */
    ballRadius?: number;
    /** 是否把球体夹高到地面以上（仅抛体/落体/斜面等有地面实验开启，默认 false） */
    clampToGround?: boolean;
    /**
     * 构建器材，返回挂载到场景的 group 和内部句柄。
     *
     * 约定（推荐）：器材全部 add 到 group 内部，Stage 负责 scene.add(group) 和统一 dispose。
     * 兼容（现状）：也可直接 scene.add(...)，返回空 group — 场景切换时靠 key 整组件 remount +
     * disposeObject(scene) 清理。新 rig 请遵循推荐写法，避免未来"同 Stage 内重建 rig"时泄漏。
     */
    buildEquipment(
        scene: THREE.Scene,
        params: Record<string, number>
    ): {
        group: THREE.Group;
        handles: Record<string, unknown>;
    };
    /** 参数变化时更新器材状态 */
    updateEquipment(handles: Record<string, unknown>, params: Record<string, number>): void;
    /** 物理坐标 (米) → 3D 世界坐标 */
    getVisualPosition(pos: { x: number; y: number }, params: Record<string, number>): THREE.Vector3;
    /** 轨迹起点在 3D 空间的位置（发射口 / 释放点） */
    getOrigin(params: Record<string, number>): THREE.Vector3;
    /** 动画每帧回调 (用于悬绳、弹簧等器材部件实时连接到小球当前位置) */
    onAnimate?(
        handles: Record<string, unknown>,
        ctx: { time: number; ballPos: THREE.Vector3; params: Record<string, number> }
    ): void;
}

interface EquipmentStageProps {
    rig: SceneRig;
    /** 相机初始位置 */
    cameraPosition?: [number, number, number];
    /** 相机注视目标 */
    cameraTarget?: [number, number, number];
    /** 舞台说明文字 */
    caption?: (params: Record<string, number>) => string;
}

// ---------------------------------------------------------------------------
// 内部句柄
// ---------------------------------------------------------------------------

/** 视角预设: 3D透视 / 立面正视(X-Y) / 垂直俯视 / 纵深视角 */
export type ViewPreset = 'default' | 'side' | 'top' | 'front';

const VIEW_PRESET_LABEL: Record<ViewPreset, string> = {
    default: '3D透视',
    side: '立面(X-Y)',
    top: '俯视',
    front: '纵深'
};

interface StageHandles {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    ball: THREE.Mesh;
    /** 多体运动球 (balls[0] === ball), 数量随引擎轨迹数同步 */
    balls: THREE.Mesh[];
    trajectory: THREE.Line;
    /** 多体轨迹线 (trajectories[0] === trajectory), 数量随引擎轨迹数同步 */
    trajectories: THREE.Line[];
    ghostBalls: THREE.Mesh[];
    shadowPlate: THREE.Mesh;
    projectionLine: THREE.Line;
    equipmentGroup: THREE.Group;
    equipmentHandles: Record<string, unknown>;
}

/** 多体球/轨迹线配色 (引擎 trajectories[0] 主球保持原蓝色) */
const BALL_COLORS = [0x2563eb, 0xdc2626, 0x16a34a] as const;

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export function EquipmentStage({ rig, cameraPosition, cameraTarget, caption }: EquipmentStageProps) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const handlesRef = useRef<StageHandles | null>(null);
    const lastTimeRef = useRef(0);

    // 用 ref 保存 rAF 循环需要读取的最新值，避免 effect 依赖 currentTime 导致每帧重建循环
    const currentTimeRef = useRef(0);
    const parametersRef = useRef<Record<string, number>>({});
    const visibleLayersRef = useRef<{ trajectory: boolean; axes: boolean }>({ trajectory: true, axes: true });
    const initialViewRef = useRef<{
        pos: [number, number, number];
        target: [number, number, number];
        dist: number;
    } | null>(null);

    const [viewPreset, setViewPreset] = useState<ViewPreset>('default');

    const playbackSpeed = useSimulationStore(s => s.playbackSpeed);
    const parameters = useSimulationStore(s => s.parameters);
    const visibleLayers = useSimulationStore(s => s.visibleLayers);
    const simulationResult = useSimulationStore(s => s.simulationResult);
    const isPlaying = useSimulationStore(s => s.isPlaying);
    const theme = useSimulationStore(s => s.theme);
    // action / stable selectors 返回稳定引用, 不会触发重渲染
    const setCurrentTime = useSimulationStore(s => s.setCurrentTime);
    const pause = useSimulationStore(s => s.pause);

    // 监听 currentTime 变动，仅写入 ref，不触发 React 重渲染，彻底解耦 60fps 动画与 React 调度
    useEffect(() => {
        currentTimeRef.current = useSimulationStore.getState().currentTime;
        return useSimulationStore.subscribe(state => {
            currentTimeRef.current = state.currentTime;
        });
    }, []);

    // 动态主题联动：背景色与雾效跟随深/浅色切换
    useEffect(() => {
        const handles = handlesRef.current;
        if (!handles) return;
        const isDark = theme === 'dark';
        const bgColor = isDark ? 0x0b1020 : 0xf8fafc;
        handles.scene.background = new THREE.Color(bgColor);
        handles.scene.fog = new THREE.Fog(bgColor, 24, 72);
    }, [theme]);

    // 每次 render 把最新值写进 ref，rAF 循环只读 ref
    parametersRef.current = parameters;
    visibleLayersRef.current = visibleLayers;

    const ballRadius = rig.ballRadius ?? 0.22;

    // —— 1. 初始化：构建环境 + 器材 + 运动证据 ——
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const isDark = theme === 'dark';
        const bgColor = isDark ? 0x0b1020 : 0xf8fafc;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(bgColor);
        scene.fog = new THREE.Fog(bgColor, 24, 72);

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
        const defaultCamPos = cameraPosition ?? [6.5, 4.5, 8.0];
        camera.position.set(...defaultCamPos);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        host.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        const defaultTarget = cameraTarget ?? [3.2, 0.8, 0];
        controls.target.set(...defaultTarget);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 0.5;
        controls.maxDistance = 80;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 1.0;
        controls.maxPolarAngle = Math.PI * 0.49;
        controls.update();
        initialViewRef.current = { pos: defaultCamPos, target: defaultTarget, dist: 9.0 };

        createEnvironment(scene);

        // 器材 — try-catch 防御：rig.buildEquipment 抛错时用空 group 兜底，避免白屏
        let equipmentGroup: THREE.Group;
        let equipmentHandles: Record<string, unknown>;
        try {
            const built = rig.buildEquipment(scene, parameters);
            equipmentGroup = built.group;
            equipmentHandles = built.handles;
        } catch (err) {
            console.error('[EquipmentStage] buildEquipment failed:', err);
            equipmentGroup = new THREE.Group();
            equipmentHandles = {};
        }
        scene.add(equipmentGroup);

        // 运动证据
        const ball = makeSphere(ballRadius, 0x2563eb, {
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.1
        });
        ball.castShadow = true;
        scene.add(ball);

        const ghostBalls = makeGhostBalls(9, ballRadius);
        ghostBalls.forEach(g => scene.add(g));

        const trajectory = makeTrajectoryLine();
        scene.add(trajectory);

        const projectionLine = makeProjectionLine();
        scene.add(projectionLine);

        const shadowPlate = makeShadowPlate(ballRadius);
        scene.add(shadowPlate);

        handlesRef.current = {
            scene,
            camera,
            renderer,
            controls,
            ball,
            balls: [ball],
            trajectory,
            trajectories: [trajectory],
            ghostBalls,
            shadowPlate,
            projectionLine,
            equipmentGroup,
            equipmentHandles
        };

        const resize = () => {
            const rect = host.getBoundingClientRect();
            const w = Math.max(1, Math.floor(rect.width));
            const h = Math.max(1, Math.floor(rect.height));
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(host);

        return () => {
            ro.disconnect();
            controls.dispose();
            disposeObject(scene);
            try {
                renderer.dispose();
                renderer.forceContextLoss();
            } catch {
                // 防御异常
            }
            if (renderer.domElement.parentElement === host) {
                host.removeChild(renderer.domElement);
            }
            handlesRef.current = null;
        };
    }, []);

    // —— 2. 参数变化：更新器材 ——
    useEffect(() => {
        const handles = handlesRef.current;
        if (!handles) return;
        try {
            rig.updateEquipment(handles.equipmentHandles, parameters);
        } catch (err) {
            console.error('[EquipmentStage] updateEquipment failed:', err);
        }
    }, [parameters, rig]);

    // —— 2.5 视角预设：切换相机位置 ——
    useEffect(() => {
        const handles = handlesRef.current;
        const init = initialViewRef.current;
        if (!handles || !init) return;
        const { camera, controls } = handles;
        const target = init.target;
        const dist = init.dist;

        if (viewPreset === 'default') {
            camera.position.set(...init.pos);
            controls.target.set(...init.target);
        } else if (viewPreset === 'side') {
            // 立面正视 (X-Y 平面): 从 +Z 看向 -Z，左为发射点，右为落地垫
            camera.position.set(target[0], target[1], dist * 1.15);
            controls.target.set(...target);
        } else if (viewPreset === 'top') {
            // 垂直俯视: 从上方直视跑道
            camera.position.set(target[0], target[1] + dist * 1.25, 0.001);
            controls.target.set(...target);
        } else if (viewPreset === 'front') {
            // 纵深视角: 沿 +X 轴看向发射口
            camera.position.set(target[0] + dist * 1.1, target[1] + 0.4, 0);
            controls.target.set(...target);
        }
        controls.update();
    }, [viewPreset]);

    // —— 3. 仿真结果变化：同步多体球/轨迹线数量 + 重建轨迹线 + 残影 ——
    useEffect(() => {
        const handles = handlesRef.current;
        if (!handles || !simulationResult) return;
        const trajCount = simulationResult.trajectories.length;

        // 运动球数量与引擎轨迹数同步 (collision/inertia/newton-third-law 等双体场景)
        while (handles.balls.length < trajCount) {
            const i = handles.balls.length;
            const color = BALL_COLORS[i % BALL_COLORS.length]!;
            const ball = makeSphere(ballRadius, color, { emissive: color, emissiveIntensity: 0.1 });
            ball.castShadow = true;
            handles.scene.add(ball);
            handles.balls.push(ball);
        }
        while (handles.balls.length > trajCount) {
            const extra = handles.balls.pop()!;
            handles.scene.remove(extra);
            disposeObject(extra);
        }

        // 轨迹线数量同步
        while (handles.trajectories.length < trajCount) {
            const i = handles.trajectories.length;
            const line = makeTrajectoryLine(BALL_COLORS[i % BALL_COLORS.length]!, 0.82);
            handles.scene.add(line);
            handles.trajectories.push(line);
        }
        while (handles.trajectories.length > trajCount) {
            const extra = handles.trajectories.pop()!;
            handles.scene.remove(extra);
            disposeObject(extra);
        }

        // 逐轨迹重建线段
        const visualPointsList: THREE.Vector3[][] = [];
        for (let i = 0; i < trajCount; i++) {
            const points = simulationResult.trajectories[i] ?? [];
            let visualPoints: THREE.Vector3[];
            try {
                visualPoints = points.map(p => rig.getVisualPosition(p.position, parameters));
            } catch (err) {
                console.error('[EquipmentStage] getVisualPosition failed:', err);
                return;
            }
            const line = handles.trajectories[i];
            if (line) {
                line.geometry.dispose();
                line.geometry = new THREE.BufferGeometry().setFromPoints(visualPoints);
                line.visible = visibleLayers.trajectory;
            }
            visualPointsList.push(visualPoints);
        }

        // 残影覆盖主轨迹 & 动态全景居中
        const mainVisual = visualPointsList[0] ?? [];
        if (mainVisual.length > 0) {
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            for (const pt of mainVisual) {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            }
            const xMid = (minX + maxX) / 2;
            const yMid = Math.max(0.6, (minY + maxY) / 2);
            const spanX = Math.max(4, maxX - minX);
            const spanY = Math.max(2, maxY - minY);
            const dist = Math.max(5.5, spanX * 0.9, spanY * 1.8);
            const newTarget: [number, number, number] = [xMid, yMid, 0];
            const newCamPos: [number, number, number] = [xMid + dist * 0.45, yMid + dist * 0.35, dist * 0.85];
            initialViewRef.current = { pos: newCamPos, target: newTarget, dist };
        }

        handles.ghostBalls.forEach((ghost, i) => {
            if (mainVisual.length === 0) {
                ghost.visible = false;
                return;
            }
            const idx = Math.min(
                mainVisual.length - 1,
                Math.round((i / Math.max(1, handles.ghostBalls.length - 1)) * (mainVisual.length - 1))
            );
            ghost.position.copy(mainVisual[idx]!);
            ghost.visible = visibleLayers.trajectory;
        });
    }, [simulationResult, parameters, visibleLayers.trajectory, rig, ballRadius]);

    // —— 4. 动画循环：时间推进 + 球体位置 + 渲染 ——
    // 依赖保持稳定：只在这几个真正会“换场景/换仿真”时重建循环；
    // 播放过程中 currentTime 每帧变化，通过 ref 读取，不触发 effect 重建。
    useEffect(() => {
        let running = true;
        const tick = (timestamp: number) => {
            if (!running) return;
            const handles = handlesRef.current;
            if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
            const delta = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            // 从 ref 读取最新值（避免 effect 依赖 currentTime）
            const now = currentTimeRef.current;
            const params = parametersRef.current;
            const layers = visibleLayersRef.current;

            if (simulationResult && isPlaying) {
                const total = getTotalDuration(simulationResult.trajectories);
                const next = now + delta * playbackSpeed;
                if (next >= total) {
                    setCurrentTime(total);
                    pause();
                } else {
                    setCurrentTime(next);
                }
            }

            if (handles && simulationResult) {
                const idx = findFrameIndex(simulationResult.trajectories, now);
                // 逐物体更新球位置 (多体场景: 每轨迹一个球)
                for (let i = 0; i < handles.balls.length; i++) {
                    const points = simulationResult.trajectories[i] ?? [];
                    if (points.length === 0) continue;
                    const p0 = points[idx];
                    const p1 = points[Math.min(idx + 1, points.length - 1)];
                    if (!p0 || !p1) continue;
                    const frame = interpolateFrame(p0, p1, now);
                    let ballPos: THREE.Vector3;
                    try {
                        ballPos = rig.getVisualPosition(frame.position, params);
                    } catch (err) {
                        console.error('[EquipmentStage] getVisualPosition in tick failed:', err);
                        ballPos = new THREE.Vector3(0, 1, 0);
                    }
                    if (rig.clampToGround) {
                        ballPos.y = Math.max(ballRadius, ballPos.y);
                    }
                    const ball = handles.balls[i];
                    if (!ball) continue;
                    ball.position.copy(ballPos);
                    ball.rotation.y += delta * 2.4;
                    if (i === 0) {
                        // 投影线/阴影跟随主球
                        handles.shadowPlate.position.set(ballPos.x, 0.028, ballPos.z);
                        const projPos = handles.projectionLine.geometry.attributes['position'] as
                            THREE.BufferAttribute | undefined;
                        if (projPos && projPos.array) {
                            const arr = projPos.array as Float32Array;
                            arr[0] = ballPos.x;
                            arr[1] = 0.035;
                            arr[2] = ballPos.z;
                            arr[3] = ballPos.x;
                            arr[4] = ballPos.y;
                            arr[5] = ballPos.z;
                            projPos.needsUpdate = true;
                        }
                        if (rig.onAnimate) {
                            try {
                                rig.onAnimate(handles.equipmentHandles, { time: now, ballPos, params });
                            } catch {
                                // 防御异常不中断循环
                            }
                        }
                    }
                }
                // 图层可见性
                handles.trajectory.visible = layers.trajectory;
                handles.trajectories.forEach((t, i) => {
                    t.visible = layers.trajectory && i < simulationResult.trajectories.length;
                });
                handles.ghostBalls.forEach(g => {
                    g.visible = layers.trajectory;
                });
                handles.projectionLine.visible = layers.axes;
                handles.shadowPlate.visible = layers.trajectory;
                handles.controls.update();
                handles.renderer.render(handles.scene, handles.camera);
            }
            if (running) {
                animId = requestAnimationFrame(tick);
            }
        };
        let animId = requestAnimationFrame(tick);
        return () => {
            running = false;
            cancelAnimationFrame(animId);
        };
    }, [simulationResult, isPlaying, playbackSpeed, setCurrentTime, pause, rig, ballRadius]);

    const captionText = caption?.(parameters) ?? '';

    const handleZoomIn = () => {
        const handles = handlesRef.current;
        if (!handles) return;
        handles.controls.dollyIn(1.25);
        handles.controls.update();
    };

    const handleZoomOut = () => {
        const handles = handlesRef.current;
        if (!handles) return;
        handles.controls.dollyOut(1.25);
        handles.controls.update();
    };

    const handleFitAll = () => {
        const handles = handlesRef.current;
        const init = initialViewRef.current;
        if (!handles || !init) return;
        handles.controls.target.set(...init.target);
        handles.camera.position.set(...init.pos);
        handles.controls.update();
        setViewPreset('default');
    };

    return (
        <div className="projectile-3d-stage" ref={hostRef}>
            {captionText && (
                <div className="stage-caption">
                    <span>{captionText}</span>
                    <em>拖动旋转视角，滚轮缩放，右键平移</em>
                </div>
            )}
            <div className="view-preset-bar" aria-label="视角预设与缩放控制">
                {(Object.keys(VIEW_PRESET_LABEL) as ViewPreset[]).map(p => (
                    <button
                        key={p}
                        type="button"
                        className={`view-preset-btn${p === viewPreset ? ' active' : ''}`}
                        onClick={() => setViewPreset(p)}
                    >
                        {VIEW_PRESET_LABEL[p]}
                    </button>
                ))}
                <div className="view-preset-divider" />
                <button
                    type="button"
                    className="view-hud-btn"
                    title="放大视角"
                    onClick={handleZoomIn}
                    aria-label="放大"
                >
                    ➕
                </button>
                <button
                    type="button"
                    className="view-hud-btn"
                    title="缩小视角"
                    onClick={handleZoomOut}
                    aria-label="缩小"
                >
                    ➖
                </button>
                <button
                    type="button"
                    className="view-hud-btn"
                    title="全景自适应居中"
                    onClick={handleFitAll}
                    aria-label="全景居中"
                >
                    🎯
                </button>
            </div>
        </div>
    );
}
