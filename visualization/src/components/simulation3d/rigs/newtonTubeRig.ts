/**
 * 牛顿管（羽钱管）3D 实验 Rig
 * 严格遵循统一 3D 渲染管线：真实石英管、双体动力学随动、真空度读数、单源坐标映射
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createNewtonTube, type NewtonTubeHandles } from '../equipment/newtonTube';
import { createHeightRuler, updateHeightRuler, type HeightRulerHandles } from '../equipment/heightRuler';
import { updateTextSprite } from '../primitives';
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
        this.updateEquipment(handles as unknown as Record<string, unknown>, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as NewtonTubeRigHandles;
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
        const h = handles as unknown as NewtonTubeRigHandles;
        if (!h.tubeHandles) return;

        const { coin, feather, topY, bottomY } = h.tubeHandles;
        const withAir = num(ctx.params['withAir'], 1) > 0.5;
        const g = num(ctx.params['g'], 9.8);
        const totalH = num(ctx.params['height'], 5);
        const t = ctx.time;

        const tubeSpan = topY - bottomY - 0.08;

        // 1. 硬币下落: 单一真源优先取 ctx.ballPos.y，回退到理论自由落体
        let coinY = ctx.ballPos?.y;
        if (coinY === undefined || !Number.isFinite(coinY)) {
            const coinDrop = 0.5 * g * t * t;
            const coinProgress = Math.min(1, Math.max(0, coinDrop / Math.max(1e-3, totalH)));
            coinY = topY - 0.04 - coinProgress * tubeSpan;
        } else {
            // 确保在玻璃管有效活动区间内
            coinY = Math.max(bottomY + 0.02, Math.min(topY - 0.04, coinY));
        }
        coin.position.y = coinY;

        // 2. 羽毛下落
        if (!withAir) {
            // 真空：羽毛与硬币严格同步下落 (伽利略/牛顿发现)
            feather.position.y = coinY;
            feather.position.x = 0.025;
            feather.rotation.z = 0.2;
        } else {
            // 空气中：羽毛受空气阻力影响，较慢下落并伴随轻微摆动飘落
            const vTerminal = 1.6; // 终端速度
            const featherDrop = Math.min(totalH, vTerminal * t * 0.45);
            const featherProgress = Math.min(1, Math.max(0, featherDrop / Math.max(1e-3, totalH)));
            const featherY = topY - 0.04 - featherProgress * tubeSpan;
            feather.position.y = featherY;
            // 飘落摆动
            feather.position.x = 0.025 + Math.sin(t * 8) * 0.02;
            feather.rotation.z = 0.2 + Math.cos(t * 7) * 0.35;
        }
    },

    getVisualPosition(pos, params) {
        const h = num(params['height'], 5);
        const topY = 1.8;
        const bottomY = 0.16;
        // 引擎 pos.y 轴向上为正，自由落体向下 pos.y <= 0，下落距离为 -pos.y
        const progress = Math.min(1, Math.max(0, -pos.y / Math.max(1e-3, h)));
        const y = topY - 0.04 - progress * (topY - bottomY - 0.08);
        return new THREE.Vector3(0, y, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, 1.76, 0);
    }
};
