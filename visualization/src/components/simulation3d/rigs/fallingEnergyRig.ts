/**
 * 验证机械能守恒定律 rig — 重物下落 + 打点计时器 + 纸带夹 + 动能势能转化标牌
 * 验证 mgh = 1/2 mv²
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createIronStand } from '../equipment/ironStand';
import { createTickerTimer } from '../equipment/tickerTimer';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeBox, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.2;

interface FallingEnergyHandles {
    stand: THREE.Group;
    tickerTimer: THREE.Group;
    paperTape: THREE.Mesh;
    landingBox: THREE.Group;
    heightRuler: ReturnType<typeof createHeightRuler>['handles'];
    energyLabel: THREE.Sprite;
}

export const fallingEnergyRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const h0 = num(params['h0'] ?? params['height'], 5);
        const visualH = Math.max(0.8, h0 * WORLD_SCALE);

        // 1. 高立柱铁架台
        const { group: stand } = createIronStand(visualH + 0.9);
        stand.position.set(-0.7, 0, 0);
        scene.add(stand);

        // 2. 顶部电磁打点计时器
        const { group: tickerTimer } = createTickerTimer();
        tickerTimer.position.set(0, visualH + BALL_RADIUS + 0.15, 0);
        scene.add(tickerTimer);

        // 3. 纸带 (随下落拉长)
        const paperTape = makeBox(0.04, visualH, 0.002, 0xf8fafc, 0.9, 0);
        paperTape.position.set(0, (visualH + BALL_RADIUS) / 2 + 0.1, 0);
        scene.add(paperTape);

        // 4. 底部接料海绵盒
        const landingBox = new THREE.Group();
        const boxFrame = makeBox(0.8, 0.08, 0.8, 0x1e293b, 0.8, 0.1);
        boxFrame.position.set(0, 0.04, 0);
        landingBox.add(boxFrame);
        const sponge = makeBox(0.72, 0.05, 0.72, 0x3b82f6, 0.9, 0);
        sponge.position.set(0, 0.07, 0);
        landingBox.add(sponge);
        scene.add(landingBox);

        // 5. 侧边高度标尺
        const { group: heightGroup, handles: heightRuler } = createHeightRuler();
        scene.add(heightGroup);

        // 6. 机械能守恒读数标牌
        const energyLabel = makeTextSprite(`ΔE_p = mgh ⇌ ΔE_k = 1/2 mv² | 机械能守恒`, '#16a34a', 24, {
            x: 1.4,
            y: 0.22
        });
        energyLabel.position.set(0, visualH + 0.55, 0.25);
        scene.add(energyLabel);

        const handles: FallingEnergyHandles = {
            stand,
            tickerTimer,
            paperTape,
            landingBox,
            heightRuler,
            energyLabel
        };

        updateEnergy(handles, h0);

        return { group: new THREE.Group(), handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h0 = num(params['h0'] ?? params['height'], 5);
        updateEnergy(handles as unknown as FallingEnergyHandles, h0);
    },

    getVisualPosition(pos, _params) {
        // 触底接触海绵垫停稳
        const visualY = BALL_RADIUS + Math.max(0, pos.y) * WORLD_SCALE;
        return new THREE.Vector3(pos.x * WORLD_SCALE, visualY, 0);
    },

    getOrigin(params) {
        const h0 = num(params['h0'] ?? params['height'], 5);
        return new THREE.Vector3(0, BALL_RADIUS + h0 * WORLD_SCALE, 0);
    }
};

function updateEnergy(h: FallingEnergyHandles, h0: number): void {
    const visualH = Math.max(0.8, h0 * WORLD_SCALE);
    h.tickerTimer.position.set(0, visualH + BALL_RADIUS + 0.15, 0);
    h.energyLabel.position.set(0, visualH + 0.55, 0.25);

    updateHeightRuler(h.heightRuler, -0.35, 0.05, visualH + BALL_RADIUS, `h₀ = ${h0.toFixed(1)} m`);

    setLabel(h.energyLabel, `ΔE_p = mgh ⇌ ΔE_k = 1/2 mv² | h₀=${h0.toFixed(1)}m`, '#16a34a');
}
