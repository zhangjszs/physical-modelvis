/**
 * 螺旋弹簧 3D 器材组件
 * 支持圈数、线径、弹簧外径，支持动态拉伸与压缩
 */
import * as THREE from 'three';

export interface HelicalSpringHandles {
    mesh: THREE.Mesh;
    curve: THREE.Curve<THREE.Vector3>;
    radius: number;
    coils: number;
    wireRadius: number;
}

class HelixCurve extends THREE.Curve<THREE.Vector3> {
    constructor(
        public length: number = 1.0,
        public radius: number = 0.08,
        public coils: number = 10,
        public startPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
        public direction: THREE.Vector3 = new THREE.Vector3(0, -1, 0)
    ) {
        super();
    }

    getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
        const phi = t * Math.PI * 2 * this.coils;
        const x = Math.cos(phi) * this.radius;
        const z = Math.sin(phi) * this.radius;

        // 根据 direction 方向计算局部坐标
        const dir = this.direction.clone().normalize();
        const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(dir, up).normalize();
        const forward = new THREE.Vector3().crossVectors(right, dir).normalize();

        const p = this.startPoint.clone();
        p.addScaledVector(dir, t * this.length);
        p.addScaledVector(right, x);
        p.addScaledVector(forward, z);

        return optionalTarget.copy(p);
    }
}

export function createHelicalSpring(
    length = 0.8,
    radius = 0.06,
    coils = 8,
    wireRadius = 0.009,
    color = 0x94a3b8
): { group: THREE.Group; handles: HelicalSpringHandles } {
    const group = new THREE.Group();
    const curve = new HelixCurve(length, radius, coils);
    const geometry = new THREE.TubeGeometry(curve, coils * 16, wireRadius, 8, false);
    const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.75
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const handles: HelicalSpringHandles = {
        mesh,
        curve,
        radius,
        coils,
        wireRadius
    };

    return { group, handles };
}

/**
 * 动态更新弹簧长度与端点位置
 */
export function updateHelicalSpring(handles: HelicalSpringHandles, start: THREE.Vector3, end: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    if (len < 1e-4) return;

    handles.curve = new HelixCurve(len, handles.radius, handles.coils, start, dir.normalize());
    handles.mesh.geometry.dispose();
    handles.mesh.geometry = new THREE.TubeGeometry(handles.curve, handles.coils * 16, handles.wireRadius, 8, false);
}
