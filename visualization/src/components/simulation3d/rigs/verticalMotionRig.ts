/**
 * 竖直运动与上抛 rig — 地面发射基座 + 智能最高点标记 + 竖直高度标尺 + 缓冲垫
 * 验证竖直上抛对称性与速度位移关系 v² - v₀² = 2gh
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { createHeightRuler, updateHeightRuler } from '../equipment/heightRuler';
import { makeBox, makeCylinder, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;
const BALL_RADIUS = 0.22;

interface VerticalHandles {
    launcherBase: THREE.Group;
    apexMarker: THREE.Group;
    heightRuler: ReturnType<typeof createHeightRuler>['handles'];
    apexLabel: THREE.Sprite;
    infoLabel: THREE.Sprite;
}

export const verticalMotionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    ballRadius: BALL_RADIUS,
    clampToGround: true,

    buildEquipment(scene, params) {
        const group = new THREE.Group();

        const v0y = num(params['v0y'], 20);
        const g = num(params['g'], 9.8);
        const hMax = g > 0 ? (v0y * v0y) / (2 * g) : 0;
        const visualHMax = hMax * WORLD_SCALE;

        // 1. 地面垂直发射筒与反冲吸收底座
        const launcherBase = new THREE.Group();
        const basePlate = makeBox(1.1, 0.08, 1.1, 0x1e293b, 0.6, 0.2);
        basePlate.position.set(0, 0.04, 0);
        launcherBase.add(basePlate);

        const barrel = makeCylinder(0.24, 0.35, 0x475569, 0.3, 0.8);
        barrel.position.set(0, 0.22, 0);
        launcherBase.add(barrel);
        group.add(launcherBase);

        // 2. 最高点 H_max 激光水平指示线
        const apexMarker = new THREE.Group();
        const pts = [new THREE.Vector3(-1.2, 0, 0), new THREE.Vector3(1.2, 0, 0)];
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineDashedMaterial({ color: 0xef4444, dashSize: 0.06, gapSize: 0.04 })
        );
        line.computeLineDistances();
        apexMarker.add(line);
        apexMarker.position.set(0, visualHMax + BALL_RADIUS, 0);
        group.add(apexMarker);

        const apexLabel = makeTextSprite(`最高点 H = ${hMax.toFixed(1)} m`, '#ef4444', 24, { x: 0.9, y: 0.22 });
        apexLabel.position.set(1.4, visualHMax + BALL_RADIUS, 0);
        group.add(apexLabel);

        // 3. 竖直高度标尺 (沿左侧测量)
        const { group: heightGroup, handles: heightRuler } = createHeightRuler();
        scene.add(heightGroup);

        // 4. 运动学对称性标牌
        const infoLabel = makeTextSprite(
            `v₀y = ${v0y.toFixed(1)} m/s, g = ${g.toFixed(1)} m/s² → H_max = ${hMax.toFixed(1)} m (上升时间 t_上 = ${(v0y / g).toFixed(2)}s)`,
            '#2563eb',
            24,
            { x: 1.5, y: 0.22 }
        );
        infoLabel.position.set(0, visualHMax + 0.8, 0.2);
        group.add(infoLabel);

        scene.add(group);

        const handles: VerticalHandles = {
            launcherBase,
            apexMarker,
            heightRuler,
            apexLabel,
            infoLabel
        };

        updateVertical(handles, v0y, g);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        const h = handles as unknown as VerticalHandles;
        const v0y = num(params['v0y'], 20);
        const g = num(params['g'], 9.8);
        updateVertical(h, v0y, g);
    },

    getVisualPosition(pos, _params) {
        // 严格地面停靠，落地时小球表面贴紧发射筒口停稳
        const visualY = BALL_RADIUS + Math.max(0, pos.y) * WORLD_SCALE;
        return new THREE.Vector3(pos.x * WORLD_SCALE, visualY, 0);
    },

    getOrigin(_params) {
        return new THREE.Vector3(0, BALL_RADIUS, 0);
    }
};

function updateVertical(h: VerticalHandles, v0y: number, g: number): void {
    const hMax = g > 0 ? (v0y * v0y) / (2 * g) : 0;
    const visualHMax = hMax * WORLD_SCALE;

    h.apexMarker.position.set(0, visualHMax + BALL_RADIUS, 0);
    h.apexLabel.position.set(1.4, visualHMax + BALL_RADIUS, 0);
    setLabel(h.apexLabel, `最高点 H = ${hMax.toFixed(1)} m`, '#ef4444');

    const tUp = g > 0 ? v0y / g : 0;
    setLabel(
        h.infoLabel,
        `v₀y = ${v0y.toFixed(1)} m/s, g = ${g.toFixed(1)} m/s² → H_max = ${hMax.toFixed(1)} m (t_上 = ${tUp.toFixed(2)}s)`,
        '#2563eb'
    );

    updateHeightRuler(h.heightRuler, -0.45, 0.05, visualHMax + BALL_RADIUS, `H = ${hMax.toFixed(1)} m`);
}
