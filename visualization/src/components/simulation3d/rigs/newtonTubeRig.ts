/**
 * 牛顿管（羽钱管）3D 实验 Rig
 * 严格遵循统一 3D 渲染管线：真实石英管、双体动力学随动、真空度读数、单源坐标映射
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createNewtonTube, type NewtonTubeHandles } from '../equipment/newtonTube';
import { createHeightRuler, updateHeightRuler, type HeightRulerHandles } from '../equipment/heightRuler';
import { updateTextSprite } from '../primitives';
import { getFrame } from '../../../rendering/renderingUtils';
import { num } from './params';

const WORLD_SCALE = 0.16;

interface NewtonTubeRigHandles {
    tubeHandles: NewtonTubeHandles;
    heightHandles: HeightRulerHandles;
}

export const newtonTubeRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: 0.001, // 由管内硬币与羽毛主导视觉

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const { group: tubeGroup, handles: tubeHandles } = createNewtonTube();
        group.add(tubeGroup);

        const { group: heightGroup, handles: heightHandles } = createHeightRuler();
        heightGroup.position.set(-0.32, 0, 0);
        group.add(heightGroup);

        scene.add(group);

        const handles: NewtonTubeRigHandles = { tubeHandles, heightHandles };
        this.updateEquipment(handles, params);

        return { group, handles };
    },

    updateEquipment(handles, params) {
        const h = handles as NewtonTubeRigHandles;
        const withAir = num(params['withAir'], 1) > 0.5;
        const height = num(params['height'], 5);

        // 标尺联动
        if (h.heightHandles) {
            updateHeightRuler(
                h.heightHandles,
                0.28,
                -0.32,
                Math.min(1.8, height * WORLD_SCALE),
                withAir ? '空气介质 (有阻力)' : '真空介质 (无阻力)'
            );
        }

        // 气压读数联动
        if (h.tubeHandles?.pressureLabel) {
            if (withAir) {
                updateTextSprite(h.tubeHandles.pressureLabel, '常压: 101.3 kPa (有阻力)', '#ef4444', 24);
                if (h.tubeHandles.valve) h.tubeHandles.valve.rotation.z = Math.PI / 2;
            } else {
                updateTextSprite(h.tubeHandles.pressureLabel, '高真空: 0.1 kPa (无阻力)', '#10b981', 24);
                if (h.tubeHandles.valve) h.tubeHandles.valve.rotation.z = 0;
            }
        }
    },

    onAnimate(handles, ctx) {
        const h = handles as NewtonTubeRigHandles;
        if (!h.tubeHandles) return;

        const { coin, feather, topY, bottomY } = h.tubeHandles;
        const withAir = num(ctx.params['withAir'], 1) > 0.5;
        const g = num(ctx.params['g'], 9.8);
        const totalH = num(ctx.params['height'], 5);
        const t = ctx.time;

        const tubeSpan = topY - bottomY - 0.08;

        // 单一真源: 引擎双体轨迹 (y=H→0) → 真实下落距离 → 管内 [bottomY, topY] 映射。
        // 视觉飘落微摆动仅限水平 x / rotation.z, 不改竖直物理高度。
        const dropFromEngine = (trajectoryIndex: number): number | null => {
            const frame = ctx.result ? getFrame(ctx.result, t, trajectoryIndex) : null;
            if (!frame) return null;
            return Math.max(0, Math.min(totalH, totalH - frame.position.y));
        };
        const toY = (drop: number): number => topY - 0.04 - (drop / Math.max(1e-3, totalH)) * tubeSpan;

        // 1. 硬币下落 (无引擎结果时解析回退自由落体)
        const coinDrop = dropFromEngine(0) ?? Math.min(totalH, 0.5 * g * t * t);
        coin.position.y = toY(coinDrop);

        // 2. 羽毛下落 (无引擎结果时按介质解析回退)
        let featherDrop = dropFromEngine(1);
        if (featherDrop === null) {
            if (!withAir) {
                featherDrop = coinDrop;
            } else {
                // 与引擎同款线性阻力解析解 (v_t=1.6 m/s, τ=v_t/g)
                const vTerminal = 1.6;
                const tau = vTerminal / Math.max(1e-6, g);
                featherDrop = Math.min(totalH, vTerminal * (t - tau * (1 - Math.exp(-t / tau))));
            }
        }
        if (!withAir) {
            // 真空：羽毛与硬币严格同步下落 (伽利略/牛顿发现)
            feather.position.y = coin.position.y;
            feather.position.x = 0.025;
            feather.rotation.z = 0.2;
        } else {
            feather.position.y = toY(featherDrop);
            // 飘落摆动 (仅视觉, 不影响竖直物理高度)
            feather.position.x = 0.025 + Math.sin(t * 8) * 0.02;
            feather.rotation.z = 0.2 + Math.cos(t * 7) * 0.35;
        }
    },

    getVisualPosition(pos, params) {
        const h = num(params['height'], 5);
        const topY = 1.8;
        const bottomY = 0.16;
        // 双体契约 (#174): 引擎 y ∈ [0, H] (y=H 管顶释放点, y=0 管底), 下落距离 = H − y
        const drop = Math.max(0, Math.min(h, h - pos.y));
        const progress = drop / Math.max(1e-3, h);
        const y = topY - 0.04 - progress * (topY - bottomY - 0.08);
        return new THREE.Vector3(0, y, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.76, 0);
    }
};
