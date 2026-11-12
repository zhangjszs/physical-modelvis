import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { TrajectoryPoint3D } from 'physics-core';
import { useCompositionStore } from '../../store/compositionStore';
import { makeSourceMesh, updateSourceMesh } from './sourceMeshes';
import { buildFieldLines, fieldArrowPlacements, effectiveFieldLineDensity } from './fieldLines';
import type { FieldKind } from './fieldLineSeeds';
import {
    buildPickStack,
    resolvePick,
    movedPastThreshold,
    sourceDisplayName,
    type PickCandidate,
    type PickHitInput,
    type PickCycleState
} from './picking';
import { makeArrow, makeLine, disposeObject } from '../simulation3d/primitives';
import { applyShadowQuality } from '../simulation3d/shadowQuality';
import { physicsToWorld, worldToPhysics, snapVector } from '../../utils/compositionCoords';

/**
 * CompositionStage — 组合实验台的 3D 交互舞台 (L4) + 场线渲染 (L5)。
 *
 * 沿用 3D 引擎的 build-once / mutate-via-refs / render-in-rAF 模式:
 * - 器材网格随 store 的 sources/selectedId/hoverId 对账 (增/删/原位更新)
 * - 轨迹线随 result 重建, 粒子小球在 rAF 里沿引擎轨迹循环播放
 * - 场线只依赖 sources, 订阅 fieldLineRevision 后按 100ms 节流重建,
 *   拖拽中实时跟手 (E/B 色系区分; 闭环 3 枚 / 开放线 1 枚方向箭头);
 *   密度档位 #93: 拖拽中封顶 1× 保跟手, 松手恢复配置档 (2× 全量重追踪较贵)
 * - 指针交互 (#166 P0): 点击选中 (候选栈 + 同点循环 + 容器穿透), 按住拖动
 *   (4 px 阈值区分点击/拖拽 — 纯点击不移动不重仿真; 水平面投影 + 0.05m 网格吸附,
 *   拖拽平面高度取器材组原点, 不取命中子网格), 悬停 grab 光标 + 轻量高亮,
 *   选中态 = 自发光 + BoxHelper 包围盒 + DOM 名称徽标 (与器材列表行同步)。
 *   拖拽期间关闭 OrbitControls, 松手 commit 重仿真。
 */

/** 电场线 / 磁场线色系 (与轨迹蓝、器材色区分) */
const FIELD_LINE_COLORS: Record<FieldKind, number> = {
    electric: 0xf97316,
    magnetic: 0x7c3aed
};

/** 场线重建节流间隔 — 拖拽中约 10Hz 刷新, 兼顾跟手与算力 */
const FIELD_LINE_THROTTLE_MS = 100;
/** 方向箭头长度与箭头头部尺寸 (世界坐标) */
const FIELD_ARROW_LENGTH = 0.12;
const FIELD_ARROW_HEAD_LENGTH = 0.07;
const FIELD_ARROW_HEAD_WIDTH = 0.045;

/** 选中包围盒颜色 (高对比琥珀, 与场线/器材色区分) */
const SELECTION_BOX_COLOR = 0xf59e0b;

/** 按住的候选拖拽 — 4 px 阈值内视为纯点击 (S-5), 跨过后才真正拖动 */
interface PendingDrag {
    readonly id: string;
    readonly startX: number;
    readonly startY: number;
    /** 拖拽平面的世界高度 = 器材组原点 y (A-5: 不取命中子网格的世界坐标) */
    readonly planeY: number;
    /** 是否已跨过阈值进入真实拖拽 (只有真实拖拽松手才 commit) */
    started: boolean;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2] as const;

export function CompositionStage() {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [trajectoryDuration, setTrajectoryDuration] = useState(1);
    const [hasTrajectory, setHasTrajectory] = useState(false);

    const isPlayingRef = useRef(true);
    const playbackSpeedRef = useRef(1);
    const playheadRef = useRef(0);
    const dirtyRef = useRef(true);
    const jumpToTimeRef = useRef<(t: number) => void>(() => {});
    const onTimeUpdateRef = useRef<(t: number) => void>(setCurrentTime);
    onTimeUpdateRef.current = setCurrentTime;
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // --- 场景基座 ---
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        container.appendChild(renderer.domElement);
        renderer.domElement.style.touchAction = 'none';

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf1f5f9);

        const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
        camera.position.set(2.4, 1.7, 2.6);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0.3, 0);
        controls.enableDamping = true;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.addEventListener('change', () => {
            dirtyRef.current = true;
        });

        // 桌面环境: 8m×8m 台面 + 0.25m 网格 + 双灯
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9, metalness: 0 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        const grid = new THREE.GridHelper(8, 32, 0x94a3b8, 0xcbd5e1);
        grid.position.y = 0.002;
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.35;
        scene.add(grid);
        scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.9));
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(-3, 6, 4);
        key.castShadow = true;
        // 阴影贴图自适应 (#95): 与 3D 舞台 (createEnvironment) 同策略 —— 设备能力分档,
        // 缺省 medium = M2.6 基线 1024² + radius=2
        applyShadowQuality(key);
        key.shadow.bias = -0.0005;
        scene.add(key);

        const sourcesGroup = new THREE.Group();
        scene.add(sourcesGroup);

        // 场线组 (L5): 全量重建, sources 变化时清空后按当前开关重画
        const fieldLinesGroup = new THREE.Group();
        scene.add(fieldLinesGroup);

        // 拖拽状态提前声明 — rebuildFieldLines 需要它判断拖拽期密度封顶 (#93),
        // 初始重建发生在下方赋值之前, 不可放到拖拽段再声明 (TDZ)
        let pendingDrag: PendingDrag | null = null;

        const rebuildFieldLines = () => {
            for (const child of [...fieldLinesGroup.children]) {
                fieldLinesGroup.remove(child);
                disposeObject(child);
            }
            const { sources, showElectricFieldLines, showMagneticFieldLines, fieldLineDensity } =
                useCompositionStore.getState();
            // 拖拽中封顶 1× (#93 性能护栏): 2× 重场景全量重追踪约 260ms (Node 实测),
            // 连续指针事件会持续过载; 松手后 onPointerUp 恢复配置档位。
            const density = effectiveFieldLineDensity(fieldLineDensity, pendingDrag !== null);
            const sourceList = sources.map(p => p.source);
            const kinds: FieldKind[] = [];
            if (showElectricFieldLines) kinds.push('electric');
            if (showMagneticFieldLines) kinds.push('magnetic');
            for (const kind of kinds) {
                const color = FIELD_LINE_COLORS[kind];
                for (const points of buildFieldLines(sourceList, kind, density)) {
                    fieldLinesGroup.add(
                        makeLine(
                            points.map(p => new THREE.Vector3(p.x, p.y, p.z)),
                            color,
                            0.8
                        )
                    );
                    // 箭头 (切向 = 场方向): 闭环 3 枚保持环绕方向一致, 开放线 1 枚 (#93)
                    for (const placement of fieldArrowPlacements(points)) {
                        fieldLinesGroup.add(
                            makeArrow(
                                new THREE.Vector3(placement.direction.x, placement.direction.y, placement.direction.z),
                                new THREE.Vector3(placement.position.x, placement.position.y, placement.position.z),
                                FIELD_ARROW_LENGTH,
                                color,
                                FIELD_ARROW_HEAD_LENGTH,
                                FIELD_ARROW_HEAD_WIDTH
                            )
                        );
                    }
                }
            }
            dirtyRef.current = true;
        };

        // 轨迹线 + 粒子小球 (有引擎结果时可见)
        const trajectoryLine = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.85 })
        );
        trajectoryLine.visible = false;
        scene.add(trajectoryLine);
        const particleBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.032, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0ea5e9, emissiveIntensity: 0.55 })
        );
        particleBall.visible = false;
        scene.add(particleBall);

        // --- 对账: store sources/selectedId/hoverId → 网格增删改 + 选中包围盒 ---
        const meshes = new Map<string, THREE.Group>();

        // 选中包围盒 (S-7): BoxHelper 跟随器材, 深度测试关闭 → 被遮挡器材选中时轮廓仍可见 (A-3)
        let selectionBox: THREE.BoxHelper | null = null;
        let selectionBoxTarget: THREE.Object3D | null = null;
        const updateSelectionBox = () => {
            const { selectedId } = useCompositionStore.getState();
            const target = selectedId !== null ? (meshes.get(selectedId) ?? null) : null;
            if (target !== selectionBoxTarget) {
                if (selectionBox !== null) {
                    scene.remove(selectionBox);
                    selectionBox.geometry.dispose();
                    (selectionBox.material as THREE.Material).dispose();
                    selectionBox = null;
                }
                selectionBoxTarget = target;
                if (target !== null) {
                    selectionBox = new THREE.BoxHelper(target, SELECTION_BOX_COLOR);
                    const lineMat = selectionBox.material as THREE.LineBasicMaterial;
                    lineMat.depthTest = false;
                    selectionBox.renderOrder = 999;
                    scene.add(selectionBox);
                }
            }
            if (selectionBox !== null) selectionBox.update();
        };

        // 名称徽标 (S-7/S-8): DOM overlay, 每帧把选中器材原点投影到屏幕坐标 (build-once)
        const badge = document.createElement('div');
        badge.className = 'composition-selection-badge';
        badge.style.display = 'none';
        container.appendChild(badge);
        /** 最近一次点击循环的候选计数 (n/m), 供徽标显示「点电荷 #3 · 2/3」 */
        let lastPickCount: { index: number; total: number } | null = null;
        const badgeWorld = new THREE.Vector3();
        const updateSelectionBadge = () => {
            const { selectedId, sources } = useCompositionStore.getState();
            const mesh = selectedId !== null ? meshes.get(selectedId) : undefined;
            const placed = selectedId !== null ? (sources.find(p => p.id === selectedId) ?? null) : null;
            if (!mesh || !placed) {
                if (badge.style.display !== 'none') {
                    badge.style.display = 'none';
                    badge.textContent = '';
                }
                return;
            }
            mesh.getWorldPosition(badgeWorld);
            const projected = badgeWorld.clone().project(camera);
            if (projected.z < -1 || projected.z > 1) {
                badge.style.display = 'none';
                return;
            }
            const rect = renderer.domElement.getBoundingClientRect();
            const x = (projected.x * 0.5 + 0.5) * rect.width;
            const y = (-projected.y * 0.5 + 0.5) * rect.height;
            const cycleTag =
                lastPickCount !== null && lastPickCount.total > 1
                    ? ` · ${lastPickCount.index + 1}/${lastPickCount.total}`
                    : '';
            const text = `${sourceDisplayName(placed)}${cycleTag}`;
            if (badge.textContent !== text) badge.textContent = text;
            badge.style.display = 'block';
            badge.style.left = `${x}px`;
            badge.style.top = `${y}px`;
        };

        const reconcile = () => {
            const { sources, selectedId, hoverId } = useCompositionStore.getState();
            const alive = new Set<string>();
            for (const placed of sources) {
                alive.add(placed.id);
                const existing = meshes.get(placed.id);
                if (existing) {
                    updateSourceMesh(existing, placed, placed.id === selectedId, placed.id === hoverId);
                } else {
                    const mesh = makeSourceMesh(placed);
                    meshes.set(placed.id, mesh);
                    sourcesGroup.add(mesh);
                }
            }
            for (const [id, mesh] of meshes) {
                if (!alive.has(id)) {
                    sourcesGroup.remove(mesh);
                    mesh.traverse(child => {
                        const m = child as THREE.Mesh;
                        if ('geometry' in m && m.geometry) m.geometry.dispose();
                    });
                    meshes.delete(id);
                }
            }
            updateSelectionBox();
            dirtyRef.current = true;
        };
        reconcile();
        const unsubscribeStore = useCompositionStore.subscribe(reconcile);

        // --- 轨迹重建 ---
        let trajectory: TrajectoryPoint3D[] = [];
        let trajectoryDurationLocal = 1;

        const updateParticleBall = (t: number) => {
            if (trajectory.length <= 1) return;
            const step = trajectoryDurationLocal / (trajectory.length - 1);
            const idx = Math.min(Math.floor(t / step), trajectory.length - 2);
            const frac = t / step - idx;
            const p0 = trajectory[idx]!;
            const p1 = trajectory[idx + 1]!;
            const w = physicsToWorld({
                x: p0.position.x + (p1.position.x - p0.position.x) * frac,
                y: p0.position.y + (p1.position.y - p0.position.y) * frac,
                z: p0.position.z + (p1.position.z - p0.position.z) * frac
            });
            particleBall.position.set(w.x, w.y, w.z);
        };

        jumpToTimeRef.current = (t: number) => {
            playheadRef.current = t;
            updateParticleBall(t);
            dirtyRef.current = true;
        };

        const rebuildTrajectory = () => {
            const { result } = useCompositionStore.getState();
            trajectory = result?.trajectory ?? [];
            const dur = trajectory.length > 1 ? trajectory[trajectory.length - 1]!.t : 1;
            trajectoryDurationLocal = dur;
            setTrajectoryDuration(dur);
            setHasTrajectory(trajectory.length > 1);
            if (trajectory.length > 1) {
                const positions = new Float32Array(trajectory.length * 3);
                trajectory.forEach((p, i) => {
                    const w = physicsToWorld(p.position);
                    positions[i * 3] = w.x;
                    positions[i * 3 + 1] = w.y;
                    positions[i * 3 + 2] = w.z;
                });
                trajectoryLine.geometry.dispose();
                trajectoryLine.geometry = new THREE.BufferGeometry();
                trajectoryLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                trajectoryLine.visible = true;
                particleBall.visible = true;
                playheadRef.current = 0;
                setCurrentTime(0);
                updateParticleBall(0);
                dirtyRef.current = true;
            } else {
                trajectoryLine.visible = false;
                particleBall.visible = false;
                dirtyRef.current = true;
            }
        };
        rebuildTrajectory();
        const unsubscribeResult = useCompositionStore.subscribe((state, prev) => {
            if (state.result !== prev.result) rebuildTrajectory();
        });

        // --- 场线重建 (订阅 fieldLineRevision + E/B 开关, 100ms 节流) ---
        let fieldLineTimer: number | null = null;
        let lastFieldLineBuild = 0;
        const scheduleFieldLines = () => {
            if (fieldLineTimer !== null) return; // 已有待执行, 不重复排
            const elapsed = performance.now() - lastFieldLineBuild;
            if (elapsed >= FIELD_LINE_THROTTLE_MS) {
                rebuildFieldLines();
                lastFieldLineBuild = performance.now();
            } else {
                fieldLineTimer = window.setTimeout(() => {
                    fieldLineTimer = null;
                    rebuildFieldLines();
                    lastFieldLineBuild = performance.now();
                }, FIELD_LINE_THROTTLE_MS - elapsed);
            }
        };
        rebuildFieldLines();
        const unsubscribeFieldLines = useCompositionStore.subscribe((state, prev) => {
            const toggled =
                state.showElectricFieldLines !== prev.showElectricFieldLines ||
                state.showMagneticFieldLines !== prev.showMagneticFieldLines ||
                state.fieldLineDensity !== prev.fieldLineDensity;
            const sourcesChanged = state.fieldLineRevision !== prev.fieldLineRevision;
            if (toggled) {
                // 开关是用户显式操作 — 立即重画 (取消在途节流)
                if (fieldLineTimer !== null) {
                    window.clearTimeout(fieldLineTimer);
                    fieldLineTimer = null;
                }
                rebuildFieldLines();
                lastFieldLineBuild = performance.now();
            } else if (sourcesChanged) {
                scheduleFieldLines();
            }
        });

        // --- 指针交互 (#166 P0): 点击选中(候选栈/同点循环/容器穿透) + 4 px 阈值拖拽 + hover ---
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        // (pendingDrag 声明提前到 rebuildFieldLines 之前 — #93 拖拽期密度封顶需要)
        let pickCycle: PickCycleState | null = null;

        const setPointerNdc = (event: PointerEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        };

        const findSourceId = (hit: THREE.Object3D): string | null => {
            let node: THREE.Object3D | null = hit;
            while (node) {
                if (typeof node.userData.sourceId === 'string') return node.userData.sourceId;
                node = node.parent;
            }
            return null;
        };

        /** 命中对象沿父链解析拾取角色: zone-volume = 匀强磁场区盒面 (容器, 候选栈降权) */
        const findPickRole = (hit: THREE.Object3D): 'source' | 'zone-volume' => {
            let node: THREE.Object3D | null = hit;
            while (node) {
                if (node.userData.pickRole === 'zone-volume') return 'zone-volume';
                node = node.parent;
            }
            return 'source';
        };

        const toPickHits = (hits: THREE.Intersection[]): PickHitInput[] =>
            hits.map(h => ({
                sourceId: findSourceId(h.object),
                pickRole: findPickRole(h.object),
                distance: h.distance
            }));

        const raycastPickStack = (): PickCandidate[] => {
            const hits = raycaster.intersectObjects(sourcesGroup.children, true);
            return buildPickStack(toPickHits(hits), useCompositionStore.getState().sources);
        };

        const onPointerDown = (event: PointerEvent) => {
            // 只响应主键/触摸: 右键平移、滚轮缩放留给 OrbitControls (提示文案 §4.3.6)
            if (event.button !== 0) return;
            setPointerNdc(event);
            raycaster.setFromCamera(pointer, camera);
            const stack = raycastPickStack();
            const resolution = resolvePick(
                stack,
                { x: event.clientX, y: event.clientY },
                pickCycle,
                useCompositionStore.getState().selectedId
            );
            const picked = resolution.picked;
            if (picked !== null) {
                useCompositionStore.getState().select(picked.id);
                pickCycle = resolution.cycle;
                lastPickCount = { index: resolution.cycle!.index, total: stack.length };
                // 拖拽平面高度取器材组原点 (A-5): 命中子网格 (磁铁半段/盒箭头) 带局部偏移, 会造成首帧高度跳变
                const mesh = meshes.get(picked.id);
                const planeY = mesh !== undefined ? mesh.position.y : 0;
                pendingDrag = { id: picked.id, startX: event.clientX, startY: event.clientY, planeY, started: false };
                dragPlane.constant = -planeY;
                // 命中器材即抢占本轮指针 (纯点击也短暂禁 OrbitControls, 松手恢复);
                // 空白处不抢占 → 左键旋转视角
                controls.enabled = false;
                renderer.domElement.setPointerCapture(event.pointerId);
            } else {
                useCompositionStore.getState().select(null);
                pickCycle = null;
                lastPickCount = null;
            }
        };

        // hover 反馈 (S-6): rAF 合并每帧最多一次射线检测; 不与拖拽同时跑 (§6.3)
        let hoverRaf = 0;
        let hoverPointerEvent: PointerEvent | null = null;
        const scheduleHover = (event: PointerEvent) => {
            hoverPointerEvent = event;
            if (hoverRaf !== 0) return;
            hoverRaf = requestAnimationFrame(() => {
                hoverRaf = 0;
                const ev = hoverPointerEvent;
                if (ev === null || pendingDrag !== null) return;
                setPointerNdc(ev);
                raycaster.setFromCamera(pointer, camera);
                const stack = raycastPickStack();
                const topId = stack.length > 0 ? stack[0]!.id : null;
                if (topId !== useCompositionStore.getState().hoverId) {
                    useCompositionStore.getState().setHover(topId);
                    renderer.domElement.style.cursor = topId !== null ? 'grab' : '';
                }
            });
        };

        const onPointerLeave = () => {
            hoverPointerEvent = null;
            if (useCompositionStore.getState().hoverId !== null) {
                useCompositionStore.getState().setHover(null);
                renderer.domElement.style.cursor = '';
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            if (pendingDrag !== null) {
                if (!pendingDrag.started) {
                    // 4 px 阈值内视为纯点击: 不移动、不重仿真 (S-5 / A-4)
                    if (
                        !movedPastThreshold(
                            { x: pendingDrag.startX, y: pendingDrag.startY },
                            { x: event.clientX, y: event.clientY }
                        )
                    ) {
                        return;
                    }
                    pendingDrag.started = true;
                }
                setPointerNdc(event);
                raycaster.setFromCamera(pointer, camera);
                const hitPoint = new THREE.Vector3();
                if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;
                const physics = worldToPhysics({ x: hitPoint.x, y: pendingDrag.planeY, z: hitPoint.z });
                useCompositionStore.getState().moveSource(pendingDrag.id, snapVector(physics));
                dirtyRef.current = true;
            } else {
                scheduleHover(event);
            }
        };

        const onPointerUp = (event: PointerEvent) => {
            const wasDrag = pendingDrag?.started ?? false;
            pendingDrag = null;
            controls.enabled = true;
            // 只有跨过阈值的真实拖拽才 commit 重仿真; 纯点击不触发 (A-4)
            if (wasDrag) {
                useCompositionStore.getState().commit();
                // 拖拽期间密度封顶 1× 时, 松手立即全量重建恢复配置档位 (#93)
                if (useCompositionStore.getState().fieldLineDensity > 1) {
                    if (fieldLineTimer !== null) {
                        window.clearTimeout(fieldLineTimer);
                        fieldLineTimer = null;
                    }
                    rebuildFieldLines();
                    lastFieldLineBuild = performance.now();
                }
            }
            if (renderer.domElement.hasPointerCapture(event.pointerId)) {
                renderer.domElement.releasePointerCapture(event.pointerId);
            }
            dirtyRef.current = true;
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);
        renderer.domElement.addEventListener('pointerleave', onPointerLeave);

        // --- 尺寸自适应 ---
        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            dirtyRef.current = true;
        };
        resize();
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        if (observer) observer.observe(container);

        // --- 渲染循环: 轨迹回放 (支持暂停/倍速/跳帧 + 按需渲染 #79/#100) ---
        let lastTs = performance.now();
        let lastUiUpdateTs = 0;
        let raf = 0;
        const tick = (ts: number) => {
            const dt = Math.min((ts - lastTs) / 1000, 0.05);
            lastTs = ts;
            controls.update();

            // 选中反馈跟随 (相机转动/拖拽移动时): 包围盒 + 名称徽标 (成本一次 AABB + 一次投影)
            updateSelectionBox();
            updateSelectionBadge();

            const playing = isPlayingRef.current;
            const hasTraj = trajectory.length > 1;

            if (playing && hasTraj) {
                playheadRef.current = (playheadRef.current + dt * playbackSpeedRef.current) % trajectoryDurationLocal;
                updateParticleBall(playheadRef.current);
                renderer.render(scene, camera);

                // 节流更新 UI 滑块与时间（~16Hz），避免 60fps 频繁触发 React 重渲染
                if (ts - lastUiUpdateTs > 60) {
                    lastUiUpdateTs = ts;
                    onTimeUpdateRef.current(playheadRef.current);
                }
            } else if (dirtyRef.current) {
                dirtyRef.current = false;
                if (hasTraj) {
                    updateParticleBall(playheadRef.current);
                }
                renderer.render(scene, camera);
            }

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        // --- 清理 ---
        return () => {
            cancelAnimationFrame(raf);
            if (hoverRaf !== 0) cancelAnimationFrame(hoverRaf);
            if (fieldLineTimer !== null) window.clearTimeout(fieldLineTimer);
            if (observer) observer.disconnect();
            unsubscribeStore();
            unsubscribeResult();
            unsubscribeFieldLines();
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointermove', onPointerMove);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
            badge.remove();
            if (selectionBox !== null) {
                scene.remove(selectionBox);
                selectionBox.geometry.dispose();
                (selectionBox.material as THREE.Material).dispose();
            }
            controls.dispose();
            scene.traverse(child => {
                const m = child as THREE.Mesh;
                if ('geometry' in m && m.geometry) m.geometry.dispose();
            });
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    const togglePlay = () => {
        setIsPlaying(prev => {
            const next = !prev;
            isPlayingRef.current = next;
            dirtyRef.current = true;
            return next;
        });
    };

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed);
        playbackSpeedRef.current = speed;
    };

    const handleScrub = (t: number) => {
        playheadRef.current = t;
        setCurrentTime(t);
        jumpToTimeRef.current(t);
    };

    const handleRewind = () => {
        playheadRef.current = 0;
        setCurrentTime(0);
        jumpToTimeRef.current(0);
    };

    // 键盘快捷键（空格 = 播放/暂停，Delete = 删除选中；不吞输入框焦点）
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && typeof target.tagName === 'string') {
                const tag = target.tagName.toLowerCase();
                if (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') {
                    return;
                }
            }

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'Delete' || e.key === 'Delete') {
                const { selectedId, removeSource } = useCompositionStore.getState();
                if (selectedId) {
                    e.preventDefault();
                    removeSource(selectedId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="composition-stage" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <div className="composition-playback-overlay" onPointerDown={e => e.stopPropagation()}>
                <div className="playback-controls">
                    <div className="playback-buttons">
                        <button
                            type="button"
                            onClick={handleRewind}
                            className="btn btn-icon"
                            title="重置到起点"
                            disabled={!hasTrajectory}
                            aria-label="重置到起点"
                        >
                            ⏮
                        </button>
                        <button
                            type="button"
                            onClick={togglePlay}
                            className={`btn btn-icon btn-primary${isPlaying ? ' active' : ''}`}
                            title={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
                            disabled={!hasTrajectory}
                            aria-label={isPlaying ? '暂停 (空格)' : '播放 (空格)'}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                    </div>

                    <div className="playback-timeline">
                        <span className="time-label">{currentTime.toFixed(2)}s</span>
                        <input
                            type="range"
                            min={0}
                            max={trajectoryDuration || 1}
                            step={0.001}
                            value={currentTime}
                            onChange={e => handleScrub(parseFloat(e.target.value))}
                            className="timeline-slider"
                            disabled={!hasTrajectory}
                            aria-label="轨迹回放进度"
                        />
                        <span className="time-label">{trajectoryDuration.toFixed(2)}s</span>
                    </div>

                    <div className="playback-speed">
                        <span className="speed-label">速度</span>
                        {SPEED_OPTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                className={`btn btn-sm${playbackSpeed === s ? ' active' : ''}`}
                                onClick={() => handleSpeedChange(s)}
                                title={`${s}倍速`}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
