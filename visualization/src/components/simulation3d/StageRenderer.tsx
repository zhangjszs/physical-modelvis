/**
 * StageRenderer — WebGL 上下文拥有者 (#81)
 *
 * 把 renderer/canvas 的生命周期从 EquipmentStage（按场景 key remount）提升到本组件
 * （不随场景切换重挂）：上下文与 shader 程序缓存跨场景常驻，切换场景只重建 Scene 内容。
 *
 * 所有权与生命周期：
 *   - 挂载于 SceneStage 的 show3D 分支之下 —— 切 2D 模式 / 离开工作台时随子树卸载，
 *     在卸载回调里 dispose + forceContextLoss（全应用唯一做上下文销毁的地方）；
 *   - 不按 currentScene 加 key —— 场景切换不经过本组件；
 *   - StrictMode dev 双挂载只发生在页面加载时（create→dispose→create 各一次），
 *     场景切换路径上不存在双建。
 *
 * renderer 通过 render-prop 注入 EquipmentStage；#70 的 key remount + sceneId 绑定 rig
 * 语义在 children 一侧原样保留。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';

export function StageRenderer({ children }: { children: (renderer: THREE.WebGLRenderer) => ReactNode }) {
    const stageRef = useRef<HTMLDivElement | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        const stage = stageRef.current;
        const host = hostRef.current;
        if (!stage || !host) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        host.appendChild(renderer.domElement);

        const resize = () => {
            const rect = stage.getBoundingClientRect();
            const w = Math.max(1, Math.floor(rect.width));
            const h = Math.max(1, Math.floor(rect.height));
            renderer.setSize(w, h, false);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(stage);

        // dev-only 验收探针 (#81)：巡检/子代理可读 renderer.info.programs / memory
        if (import.meta.env.DEV) {
            (window as unknown as Record<string, unknown>).__physvisRenderer = renderer;
        }

        setRenderer(renderer);

        return () => {
            ro.disconnect();
            if (import.meta.env.DEV) {
                delete (window as unknown as Record<string, unknown>).__physvisRenderer;
            }
            renderer.dispose();
            try {
                renderer.forceContextLoss();
            } catch {
                // 防御异常
            }
            renderer.domElement.remove();
        };
    }, []);

    // children 等 renderer 就绪后再渲染并显式注入实例, 保证 EquipmentStage 挂载时 renderer 已存在
    return (
        <div className="projectile-3d-stage" ref={stageRef}>
            <div className="stage-canvas-host" ref={hostRef} />
            {renderer ? children(renderer) : null}
        </div>
    );
}

export default StageRenderer;
