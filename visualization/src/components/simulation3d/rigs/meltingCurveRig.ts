/**
 * 熔化曲线实验 rig — 铁架台 + 石棉网 + 酒精灯水浴加热 + 试管固液相变 + 温度计
 * 探究晶体 (有固定熔点/温度平台/固液共存) 与非晶体 (无固定熔点/连续软化) 熔化规律
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeSphere, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface MeltHandles {
    sampleSolid: THREE.Mesh;
    sampleLiquid: THREE.Mesh;
    flame: THREE.Mesh;
    thermometerMercury: THREE.Mesh;
    label: THREE.Sprite;
}

export const meltingCurveRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();

        // ==================== 1. 实验室铁架台系统 ====================
        const stand = new THREE.Group();
        // 铸铁厚底座
        const base = makeBox(0.95, 0.08, 0.7, 0x1e293b, 0.6, 0.2);
        base.position.set(-0.55, 0.04, 0);
        stand.add(base);

        // 不锈钢立杆
        const pole = makeCylinder(0.024, 2.6, 0x94a3b8, 0.2, 0.85);
        pole.position.set(-0.55, 1.3, 0);
        stand.add(pole);

        // 下铁圈 (支撑石棉网与烧杯)
        const lowerClamp = makeBox(0.08, 0.08, 0.08, 0x334155, 0.4, 0.4);
        lowerClamp.position.set(-0.55, 0.85, 0);
        stand.add(lowerClamp);
        const lowerRod = makeCylinder(0.015, 0.55, 0xd4d4d8, 0.2, 0.8);
        lowerRod.rotation.z = Math.PI / 2;
        lowerRod.position.set(-0.28, 0.85, 0);
        stand.add(lowerRod);
        const ironRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.48, 0.025, 12, 36),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.6 })
        );
        ironRing.rotation.x = Math.PI / 2;
        ironRing.position.set(0, 0.85, 0);
        stand.add(ironRing);

        // 上试管夹 (夹持内试管)
        const upperClamp = makeBox(0.08, 0.08, 0.08, 0x334155, 0.4, 0.4);
        upperClamp.position.set(-0.55, 1.7, 0);
        stand.add(upperClamp);
        const upperRod = makeCylinder(0.015, 0.55, 0xd4d4d8, 0.2, 0.8);
        upperRod.rotation.z = Math.PI / 2;
        upperRod.position.set(-0.28, 1.7, 0);
        stand.add(upperRod);
        const testTubeClamp = makeBox(0.18, 0.04, 0.12, 0xd97706, 0.3, 0.8);
        testTubeClamp.position.set(0, 1.7, 0);
        stand.add(testTubeClamp);
        group.add(stand);

        // ==================== 2. 石棉网与水浴烧杯 ====================
        // 石棉网 (圆形陶瓷白板 + 金属网边)
        const gauze = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.02, 36),
            new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9, metalness: 0.1 })
        );
        gauze.position.set(0, 0.87, 0);
        group.add(gauze);

        // 玻璃烧杯 (水浴容器)
        const beaker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.46, 0.46, 0.75, 36, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xe0f2fe,
                transparent: true,
                opacity: 0.28,
                roughness: 0.06,
                transmission: 0.9,
                ior: 1.48,
                side: THREE.DoubleSide
            })
        );
        beaker.position.set(0, 1.25, 0);
        group.add(beaker);

        // 烧杯内温水
        const bathWater = new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 0.55, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.55,
                roughness: 0.1,
                transmission: 0.85
            })
        );
        bathWater.position.set(0, 1.15, 0);
        group.add(bathWater);

        // ==================== 3. 试管与相变样品 ====================
        // 试管
        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 1.1, 28, 1, true),
            new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.35,
                roughness: 0.05,
                transmission: 0.92,
                side: THREE.DoubleSide
            })
        );
        tube.position.set(0, 1.5, 0);
        group.add(tube);

        // 样品固相 (晶体颗粒状/非晶体块状)
        const sampleSolid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.45, 24),
            new THREE.MeshStandardMaterial({
                color: 0x64748b,
                roughness: 0.7,
                metalness: 0.1
            })
        );
        sampleSolid.position.set(0, 1.25, 0);
        group.add(sampleSolid);

        // 样品液相 (熔化后生成的透明/半透明液体)
        const sampleLiquid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.145, 0.145, 0.45, 24),
            new THREE.MeshPhysicalMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.0,
                roughness: 0.1,
                transmission: 0.8
            })
        );
        sampleLiquid.position.set(0, 1.25, 0);
        group.add(sampleLiquid);

        // 插入试管中心的红色水银/酒精温度计
        const thermometerStem = makeCylinder(0.016, 1.2, 0xd4d4d8, 0.1, 0.9);
        thermometerStem.position.set(0, 1.6, 0);
        group.add(thermometerStem);
        const thermometerBulb = makeSphere(0.035, 0xdc2626, { emissive: 0x991b1b, emissiveIntensity: 0.4 });
        thermometerBulb.position.set(0, 1.05, 0);
        group.add(thermometerBulb);
        const thermometerMercury = makeCylinder(0.012, 0.5, 0xdc2626, 0.2, 0.7);
        thermometerMercury.position.set(0, 1.3, 0);
        group.add(thermometerMercury);

        // ==================== 4. 酒精灯与跳跃火焰 ====================
        const burner = makeCylinder(0.32, 0.42, 0x94a3b8, 0.3, 0.4);
        burner.position.set(0, 0.21, 0);
        group.add(burner);
        const wick = makeCylinder(0.04, 0.12, 0xd4d4d8, 0.4, 0.2);
        wick.position.set(0, 0.47, 0);
        group.add(wick);

        // 酒精灯内外火焰
        const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.35, 20),
            new THREE.MeshStandardMaterial({
                color: 0xf59e0b,
                emissive: 0xd97706,
                emissiveIntensity: 0.9,
                transparent: true,
                opacity: 0.85
            })
        );
        flame.position.set(0, 0.65, 0);
        group.add(flame);

        // 状态 HUD
        const label = makeTextSprite('熔化相变曲线', '#0f172a', 26, { x: 2.3, y: 0.36 });
        label.position.set(0, 2.65, 0);
        group.add(label);

        const handles: MeltHandles = {
            sampleSolid,
            sampleLiquid,
            flame,
            thermometerMercury,
            label
        };
        updateMelt(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateMelt(handles as unknown as MeltHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as MeltHandles;
        if (!h.flame) return;

        // 火焰抖动微动画
        const flicker = 1.0 + Math.sin(ctx.time * 18.0) * 0.08 + Math.cos(ctx.time * 26.0) * 0.05;
        h.flame.scale.set(flicker, flicker * 1.1, flicker);

        // 固液相变动态演示
        const cycle = (ctx.time % 6.0) / 6.0;
        const isNonCrystal = Math.round(num(ctx.params['medium'], 0)) === 1;

        // 晶体有平台：前 20% 固态升温，20%~70% 固液共存 (熔化平台)，70%~100% 液态升温
        let meltRatio = 0;
        if (isNonCrystal) {
            meltRatio = cycle; // 非晶体连续软化熔化
        } else {
            if (cycle < 0.2) meltRatio = 0;
            else if (cycle < 0.75) meltRatio = (cycle - 0.2) / 0.55;
            else meltRatio = 1.0;
        }

        h.sampleSolid.scale.set(1.0 - meltRatio * 0.8, 1.0 - meltRatio * 0.85, 1.0 - meltRatio * 0.8);
        (h.sampleLiquid.material as THREE.MeshPhysicalMaterial).opacity = meltRatio * 0.8;

        // 温度计液柱随温度升高
        const tHeight = 0.2 + cycle * 0.65;
        h.thermometerMercury.scale.y = tHeight / 0.5;
        h.thermometerMercury.position.y = 1.05 + tHeight / 2;
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.25 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.3, 0);
    }
};

function updateMelt(h: MeltHandles, params: Record<string, number>): void {
    const isNonCrystal = Math.round(num(params['medium'], 0)) === 1;
    const Tm = num(params['meltingPoint'], 0);
    const rate = num(params['heatingRate'], 5);

    const typeName = isNonCrystal ? '非晶体 (石蜡/玻璃)' : '晶体 (海波/冰/金属)';
    const plateauInfo = isNonCrystal
        ? '连续吸热升温软化，无固液共存温度平台'
        : `存在恒温熔化平台 T=Tm=${Tm.toFixed(0)}°C (固液共存态)`;

    setLabel(h.label, `样品: ${typeName} | 加热率=${rate.toFixed(1)}°C/min | ${plateauInfo}`, '#0f172a');
}
