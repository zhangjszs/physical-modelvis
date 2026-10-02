import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { TrajectoryPoint3D } from 'physics-core';
import { useCompositionStore } from '../../store/compositionStore';
import { makeSourceMesh, updateSourceMesh } from './sourceMeshes';
import { buildFieldLines } from './fieldLines';
import type { FieldKind } from './fieldLineSeeds';
import { makeArrow, makeLine, disposeObject } from '../simulation3d/primitives';
import { physicsToWorld, worldToPhysics, snapVector } from '../../utils/compositionCoords';

/**
 * CompositionStage — 组合实验台的 3D 交互舞台 (L4) + 场线渲染 (L5)。
 *
 * 沿用 3D 引擎的 build-once / mutate-via-refs / render-in-rAF 模式:
 * - 器材网格随 store 的 sources/selectedId 对账 (增/删/原位更新)
 * - 轨迹线随 result 重建, 粒子小球在 rAF 里沿引擎轨迹循环播放
 * - 场线只依赖 sources, 订阅 fieldLineRevision 后按 100ms 节流重建,
 *   拖拽中实时跟手 (E/B 色系区分, 每条线带方向箭头)
 * - 指针交互: 点击选中, 按住拖拽 (水平面投影 + 0.05m 网格吸附),
 *   拖拽期间关闭 OrbitControls, 松手 commit 重仿真
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

interface DragState {
    readonly id: string;
    /** 拖拽平面的世界高度 (保持器材原物理 z) */
    readonly planeY: number;
    moved: boolean;
}

export function CompositionStage() {
    const containerRef = useRef<HTMLDivElement | null>(null);

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
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0005;
        scene.add(key);

        const sourcesGroup = new THREE.Group();
        scene.add(sourcesGroup);

        // 场线组 (L5): 全量重建, sources 变化时清空后按当前开关重画
        const fieldLinesGroup = new THREE.Group();
        scene.add(fieldLinesGroup);

        const rebuildFieldLines = () => {
            for (const child of [...fieldLinesGroup.children]) {
                fieldLinesGroup.remove(child);
                disposeObject(child);
            }
            const { sources, showElectricFieldLines, showMagneticFieldLines } = useCompositionStore.getState();
            const sourceList = sources.map(p => p.source);
            const kinds: FieldKind[] = [];
            if (showElectricFieldLines) kinds.push('electric');
            if (showMagneticFieldLines) kinds.push('magnetic');
            for (const kind of kinds) {
                const color = FIELD_LINE_COLORS[kind];
                for (const points of buildFieldLines(sourceList, kind)) {
                    fieldLinesGroup.add(
                        makeLine(
                            points.map(p => new THREE.Vector3(p.x, p.y, p.z)),
                            color,
                            0.8
                        )
                    );
                    // 中线处一枚方向箭头 (沿折线前进方向 = 场方向)
                    const at = Math.floor(points.length * 0.35);
                    const from = points[at];
                    const to = points[at + 1];
                    if (from && to) {
                        const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
                        if (dir.lengthSq() > 0) {
                            fieldLinesGroup.add(
                                makeArrow(
                                    dir,
                                    new THREE.Vector3(from.x, from.y, from.z),
                                    FIELD_ARROW_LENGTH,
                                    color,
                                    FIELD_ARROW_HEAD_LENGTH,
                                    FIELD_ARROW_HEAD_WIDTH
                                )
                            );
                        }
                    }
                }
            }
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

        // --- 对账: store sources/selectedId → 网格增删改 ---
        const meshes = new Map<string, THREE.Group>();
        const reconcile = () => {
            const { sources, selectedId } = useCompositionStore.getState();
            const alive = new Set<string>();
            for (const placed of sources) {
                alive.add(placed.id);
                const existing = meshes.get(placed.id);
                if (existing) {
                    updateSourceMesh(existing, placed, placed.id === selectedId);
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
        };
        reconcile();
        const unsubscribeStore = useCompositionStore.subscribe(reconcile);

        // --- 轨迹重建 ---
        let trajectory: TrajectoryPoint3D[] = [];
        let trajectoryDuration = 1;
        let playhead = 0;
        const rebuildTrajectory = () => {
            const { result } = useCompositionStore.getState();
            trajectory = result?.trajectory ?? [];
            trajectoryDuration = trajectory.length > 1 ? trajectory[trajectory.length - 1]!.t : 1;
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
                playhead = 0;
            } else {
                trajectoryLine.visible = false;
                particleBall.visible = false;
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
                state.showMagneticFieldLines !== prev.showMagneticFieldLines;
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

        // --- 拖拽交互 ---
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        let drag: DragState | null = null;

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

        const onPointerDown = (event: PointerEvent) => {
            setPointerNdc(event);
            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects(sourcesGroup.children, true);
            const hit = hits[0];
            const id = hit ? findSourceId(hit.object) : null;
            if (id && hit) {
                useCompositionStore.getState().select(id);
                const worldY = hit.object.getWorldPosition(new THREE.Vector3()).y;
                drag = { id, planeY: worldY, moved: false };
                dragPlane.constant = -worldY;
                controls.enabled = false;
                renderer.domElement.setPointerCapture(event.pointerId);
            } else {
                useCompositionStore.getState().select(null);
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            if (!drag) return;
            setPointerNdc(event);
            raycaster.setFromCamera(pointer, camera);
            const hitPoint = new THREE.Vector3();
            if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;
            const physics = worldToPhysics({ x: hitPoint.x, y: drag.planeY, z: hitPoint.z });
            useCompositionStore.getState().moveSource(drag.id, snapVector(physics));
            drag.moved = true;
        };

        const onPointerUp = (event: PointerEvent) => {
            if (drag?.moved) useCompositionStore.getState().commit();
            drag = null;
            controls.enabled = true;
            if (renderer.domElement.hasPointerCapture(event.pointerId)) {
                renderer.domElement.releasePointerCapture(event.pointerId);
            }
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);

        // --- 尺寸自适应 ---
        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(container);

        // --- 渲染循环: 轨迹回放 ---
        let lastTs = performance.now();
        let raf = 0;
        const tick = (ts: number) => {
            const dt = Math.min((ts - lastTs) / 1000, 0.05);
            lastTs = ts;
            controls.update();
            if (trajectory.length > 1) {
                playhead = (playhead + dt) % trajectoryDuration;
                const step = trajectoryDuration / (trajectory.length - 1);
                const idx = Math.min(Math.floor(playhead / step), trajectory.length - 2);
                const frac = playhead / step - idx;
                const p0 = trajectory[idx]!;
                const p1 = trajectory[idx + 1]!;
                const w = physicsToWorld({
                    x: p0.position.x + (p1.position.x - p0.position.x) * frac,
                    y: p0.position.y + (p1.position.y - p0.position.y) * frac,
                    z: p0.position.z + (p1.position.z - p0.position.z) * frac
                });
                particleBall.position.set(w.x, w.y, w.z);
            }
            renderer.render(scene, camera);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        // --- 清理 ---
        return () => {
            cancelAnimationFrame(raf);
            if (fieldLineTimer !== null) window.clearTimeout(fieldLineTimer);
            observer.disconnect();
            unsubscribeStore();
            unsubscribeResult();
            unsubscribeFieldLines();
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointermove', onPointerMove);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            controls.dispose();
            scene.traverse(child => {
                const m = child as THREE.Mesh;
                if ('geometry' in m && m.geometry) m.geometry.dispose();
            });
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return <div ref={containerRef} className="composition-stage" style={{ width: '100%', height: '100%' }} />;
}
