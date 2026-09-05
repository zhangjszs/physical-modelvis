/**
 * 永动机原理剖析实验 rig — 高温热源 + 工质热机气缸 + 低温冷源 + 卡诺闭合热力循环 + 飞轮做功
 * 剖析第一类永动机 (违反热力学第一定律 ΔU = Q + W, 不消耗能量做功) 与第二类永动机 (违反热力学第二定律开尔文/克劳修斯表述, 效率不可能达到 100%)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface PerpetuumHandles {
    hotReservoir: THREE.Mesh;
    coldReservoir: THREE.Mesh;
    cylinderPiston: THREE.Group;
    flywheel: THREE.Mesh;
    flowCycleRing: THREE.Mesh;
    label: THREE.Sprite;
}

export const perpetuumMobileRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const cy = 1.1;

        // 铸铁实验底座
        const base = makeBox(3.4, 0.12, 1.4, 0x1e293b, 0.6, 0.2);
        base.position.set(0, cy - 0.55, 0);
        group.add(base);

        // ==================== 1. 高温热源 T_hot (左侧红体) ====================
        const hotReservoir = makeBox(0.8, 0.9, 0.8, 0xdc2626, 0.3, 0.2);
        hotReservoir.position.set(-1.25, cy, 0);
        group.add(hotReservoir);

        // ==================== 2. 低温冷源 T_cold (右侧蓝体) ====================
        const coldReservoir = makeBox(0.8, 0.9, 0.8, 0x2563eb, 0.3, 0.2);
        coldReservoir.position.set(1.25, cy, 0);
        group.add(coldReservoir);

        // ==================== 3. 中置工质气缸与连杆活塞 ====================
        const cylinderPiston = new THREE.Group();
        // 玻璃透明气缸体
        const wall = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.38, 0.95, 32, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xbfdbfe,
                transparent: true,
                opacity: 0.28,
                roughness: 0.08,
                transmission: 0.88,
                side: THREE.DoubleSide
            })
        );
        wall.position.set(0, cy + 0.15, 0);
        cylinderPiston.add(wall);

        // 金属活塞与推杆
        const piston = makeCylinder(0.36, 0.1, 0x334155, 0.3, 0.8);
        piston.position.set(0, cy + 0.35, 0);
        cylinderPiston.add(piston);
        const rod = makeCylinder(0.035, 0.65, 0xd4d4d8, 0.2, 0.9);
        rod.position.set(0, cy + 0.72, 0);
        cylinderPiston.add(rod);
        group.add(cylinderPiston);

        // ==================== 4. 动力输出飞轮 (做功输出) ====================
        const flywheel = new THREE.Mesh(
            new THREE.TorusGeometry(0.38, 0.06, 16, 40),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.85 })
        );
        flywheel.rotation.y = Math.PI / 2;
        flywheel.position.set(0, cy + 1.25, 0);
        group.add(flywheel);

        // ==================== 5. 热量循环回路环 ====================
        const flowCycleRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.72, 0.032, 12, 48),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.5 })
        );
        flowCycleRing.rotation.x = Math.PI / 2;
        flowCycleRing.position.set(0, cy - 0.15, 0);
        group.add(flowCycleRing);

        // 热流输入与冷流排出箭头
        group.add(
            makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.9, cy - 0.15, 0), 0.45, 0xdc2626, 0.14, 0.08)
        );
        group.add(
            makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0.45, cy - 0.15, 0), 0.45, 0x2563eb, 0.14, 0.08)
        );

        // 状态 HUD
        const label = makeTextSprite('热机卡诺循环与永动机判定', '#0f172a', 26, { x: 2.5, y: 0.36 });
        label.position.set(0, cy + 1.85, 0);
        group.add(label);

        const handles: PerpetuumHandles = {
            hotReservoir,
            coldReservoir,
            cylinderPiston,
            flywheel,
            flowCycleRing,
            label
        };
        updatePM(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updatePM(handles as unknown as PerpetuumHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as PerpetuumHandles;
        if (!h.flywheel) return;

        // 飞轮连续旋转
        h.flywheel.rotation.x = ctx.time * 5.0;

        // 活塞往复运动
        const stroke = Math.sin(ctx.time * 5.0) * 0.15;
        h.cylinderPiston.position.y = stroke;
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.1 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.1, 0);
    }
};

function updatePM(h: PerpetuumHandles, params: Record<string, number>): void {
    const isKelvin = Math.round(num(params['mode'], 0)) === 1;
    const Th = num(params['hotTemp'], 600); // K
    const Tc = num(params['coldTemp'], 300); // K

    // 卡诺最大理论效率 eta_C = 1 - Tc / Th
    const etaC = Math.max(0, 1 - Tc / Math.max(1, Th));

    const modeName = isKelvin ? '开尔文表述判定 (单热源热机不可能)' : '卡诺循环理论极限 (双热源)';
    const kelvinDesc = isKelvin
        ? '第二类永动机不可行: 不可能从单一热源吸热使之完全变为有用功而不产生其他影响'
        : `理论极限效率 η_max = 1 - T_c/T_h = ${(etaC * 100).toFixed(1)}% < 100% (必有废热排出)`;

    setLabel(h.label, `判定: ${modeName} | T_h=${Th.toFixed(0)}K  T_c=${Tc.toFixed(0)}K | ${kelvinDesc}`, '#0f172a');
}
