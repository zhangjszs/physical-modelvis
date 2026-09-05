/**
 * 表面张力实验 rig — 精密 U 型金属框架 + 轻质滑动金属横丝 + 肥皂液膜 + 微量测力计
 * 测量拉膜平衡力 F，验证液面表面张力公式 F_合 = 2·σ·L (双层液膜两侧收缩力)
 */
import * as THREE from 'three';
import { SceneRig } from '../EquipmentStage';
import { makeBox, makeCylinder, makeArrow, makeTextSprite } from '../primitives';
import { num, setLabel } from './params';

const WORLD_SCALE = 0.16;

interface SurfaceTensionHandles {
    sliderGroup: THREE.Group;
    filmMesh: THREE.Mesh;
    fUpArrow: THREE.ArrowHelper;
    fDownArrow: THREE.ArrowHelper;
    scaleGroup: THREE.Group;
    label: THREE.Sprite;
}

export const surfaceTensionRig: SceneRig = {
    worldScale: WORLD_SCALE,
    clampToGround: true,

    buildEquipment(_scene, params) {
        const group = new THREE.Group();
        const frameW = 1.4;
        const frameH = 1.8;
        const baseY = 0.1;

        // ==================== 1. U 型精密金属导轨框架 ====================
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x475569,
            roughness: 0.3,
            metalness: 0.8
        });

        // 重型防滑底座
        const basePlate = makeBox(frameW + 0.5, 0.08, 0.6, 0x1e293b, 0.5, 0.3);
        basePlate.position.set(0, baseY + 0.04, 0);
        group.add(basePlate);

        // U 型框底梁
        const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(frameW + 0.08, 0.06, 0.06), frameMat);
        bottomBar.position.set(0, baseY + 0.08, 0);
        group.add(bottomBar);

        // 左导轨立柱
        const leftRail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, frameH, 24), frameMat);
        leftRail.position.set(-frameW / 2, baseY + 0.08 + frameH / 2, 0);
        group.add(leftRail);

        // 右导轨立柱
        const rightRail = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, frameH, 24), frameMat);
        rightRail.position.set(frameW / 2, baseY + 0.08 + frameH / 2, 0);
        group.add(rightRail);

        // ==================== 2. 肥皂薄膜 (高反射虹彩双层膜) ====================
        const filmMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(frameW - 0.04, 1.0),
            new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.42,
                roughness: 0.05,
                metalness: 0.1,
                transmission: 0.75,
                ior: 1.35,
                side: THREE.DoubleSide
            })
        );
        filmMesh.position.set(0, baseY + 0.08 + 0.5, 0);
        group.add(filmMesh);

        // ==================== 3. 轻质可滑动金属横丝 ====================
        const sliderGroup = new THREE.Group();
        // 横丝本体
        const sliderBar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, frameW + 0.16, 24),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.85 })
        );
        sliderBar.rotation.z = Math.PI / 2;
        sliderGroup.add(sliderBar);

        // 两侧微型滑套环
        for (const side of [-frameW / 2, frameW / 2]) {
            const sleeve = new THREE.Mesh(
                new THREE.CylinderGeometry(0.035, 0.035, 0.06, 20),
                new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.7 })
            );
            sleeve.position.set(side, 0, 0);
            sliderGroup.add(sleeve);
        }

        // 中心挂环
        const hookRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.035, 0.008, 12, 24),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9 })
        );
        hookRing.position.set(0, 0.04, 0);
        sliderGroup.add(hookRing);
        group.add(sliderGroup);

        // ==================== 4. 上置微量弹簧测力计 ====================
        const scaleGroup = new THREE.Group();
        const scaleCylinder = makeCylinder(0.06, 0.55, 0x0284c7, 0.3, 0.4);
        scaleGroup.add(scaleCylinder);
        const scaleRod = makeCylinder(0.012, 0.32, 0xd4d4d8, 0.2, 0.9);
        scaleRod.position.set(0, -0.38, 0);
        scaleGroup.add(scaleRod);
        group.add(scaleGroup);

        // ==================== 5. 受力分析矢量箭头 ====================
        // 上拉外力 F
        const fUpArrow = makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 0.55, 0xdc2626, 0.16, 0.09);
        group.add(fUpArrow);

        // 向下表面张力合力 F_sigma = 2*sigma*L
        const fDownArrow = makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            0.45,
            0x2563eb,
            0.16,
            0.09
        );
        group.add(fDownArrow);

        // 状态 HUD
        const label = makeTextSprite('表面张力拉膜实验', '#0f172a', 26, { x: 2.3, y: 0.36 });
        label.position.set(0, baseY + frameH + 0.65, 0);
        group.add(label);

        const handles: SurfaceTensionHandles = {
            sliderGroup,
            filmMesh,
            fUpArrow,
            fDownArrow,
            scaleGroup,
            label
        };
        updateST(handles, params);

        return { group, handles: handles as unknown as Record<string, unknown> };
    },

    updateEquipment(handles, params) {
        updateST(handles as unknown as SurfaceTensionHandles, params);
    },

    onAnimate(handles, ctx) {
        const h = handles as unknown as SurfaceTensionHandles;
        if (!h.sliderGroup || !h.filmMesh) return;

        // 动态拉膜缓慢上升模拟
        const baseY = 0.1;
        const frameBottomY = baseY + 0.08;
        const cycle = (ctx.time % 5.0) / 5.0; // 5秒拉伸循环
        const currentHeight = 0.4 + Math.sin(cycle * Math.PI) * 0.95;

        // 更新滑横丝位置
        const sliderY = frameBottomY + currentHeight;
        h.sliderGroup.position.set(0, sliderY, 0);

        // 更新液膜缩放与位置
        h.filmMesh.scale.y = currentHeight / 1.0;
        h.filmMesh.position.y = frameBottomY + currentHeight / 2;

        // 更新测力计位置
        h.scaleGroup.position.set(0, sliderY + 0.68, 0);

        // 更新受力箭头位置
        h.fUpArrow.position.set(0, sliderY + 0.06, 0);
        h.fDownArrow.position.set(0, sliderY - 0.06, 0);
    },

    getVisualPosition(pos) {
        return new THREE.Vector3(pos.x * WORLD_SCALE, 1.0 + pos.y * WORLD_SCALE, 0);
    },

    getOrigin() {
        return new THREE.Vector3(0, 1.0, 0);
    }
};

function updateST(h: SurfaceTensionHandles, params: Record<string, number>): void {
    const isMercury = Math.round(num(params['medium'], 0)) === 1;
    const L_cm = num(params['sliderLength'], 4.0);
    const T = num(params['temperature'], 20);

    const sigma0 = isMercury ? 0.487 : 0.072; // N/m (20°C)
    const sigma = Math.max(0.01, sigma0 * (1 - (T - 20) * 0.002));
    const L_m = L_cm / 100;
    // 双层液膜表面张力合力
    const F_sigma = 2 * sigma * L_m;

    const medName = isMercury ? '水银' : '水/肥皂液';
    setLabel(
        h.label,
        `介质: ${medName} | 丝长 L=${L_cm.toFixed(1)}cm  T=${T.toFixed(0)}°C | σ=${(sigma * 1000).toFixed(1)}mN/m  拉力 F=2σL=${(F_sigma * 1000).toFixed(2)}mN`,
        '#0f172a'
    );
}
