/**
 * 3D 器材库 — 基础几何 / 材质 / 文字精灵助手
 * 从 Projectile3DStage 提取并扩展，供所有 3D 实验场景复用。
 */
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// 基础几何体
// ---------------------------------------------------------------------------

export function makeBox(
    width: number,
    height: number,
    depth: number,
    color: number,
    roughness = 0.52,
    metalness = 0.08
): THREE.Mesh {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, roughness, metalness })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

export function makeCylinder(
    radius: number,
    height: number,
    color: number,
    metalness = 0.18,
    roughness = 0.34
): THREE.Mesh {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 48),
        new THREE.MeshStandardMaterial({ color, roughness, metalness })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

export function makeSphere(
    radius: number,
    color: number,
    opts: { roughness?: number; metalness?: number; emissive?: number; emissiveIntensity?: number } = {}
): THREE.Mesh {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 48, 48),
        new THREE.MeshStandardMaterial({
            color,
            roughness: opts.roughness ?? 0.22,
            metalness: opts.metalness ?? 0.18,
            emissive: opts.emissive ?? 0x000000,
            emissiveIntensity: opts.emissiveIntensity ?? 0
        })
    );
    mesh.castShadow = true;
    return mesh;
}

// ---------------------------------------------------------------------------
// 文字精灵（中文标注）
// ---------------------------------------------------------------------------

export function makeTextSprite(
    text: string,
    color = '#334155',
    fontSize = 40,
    scale = { x: 1.65, y: 0.55 }
): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 384;
    canvas.height = 128;
    ctx.font = `600 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale.x, scale.y, 1);
    return sprite;
}

/** 复用已有 sprite 的 canvas，更新文字（避免重复创建纹理） */
export function updateTextSprite(sprite: THREE.Sprite, text: string, color = '#334155', fontSize = 40): void {
    const canvas = (sprite.material as THREE.SpriteMaterial).map?.image as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `600 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    (sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// 线段 / 箭头
// ---------------------------------------------------------------------------

export function makeLine(points: THREE.Vector3[], color: number, opacity = 0.8): THREE.Line {
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
}

export function makeArrow(
    dir: THREE.Vector3,
    origin: THREE.Vector3,
    length: number,
    color: number,
    headLength = 0.24,
    headWidth = 0.13
): THREE.ArrowHelper {
    const arrow = new THREE.ArrowHelper(dir.clone().normalize(), origin.clone(), length, color, headLength, headWidth);
    return arrow;
}

// ---------------------------------------------------------------------------
// 运动证据（残影球、轨迹线、投影线、地面阴影）
// ---------------------------------------------------------------------------

export function makeTrajectoryLine(color = 0x2563eb, opacity = 0.82): THREE.Line {
    return makeLine([], color, opacity);
}

export function makeGhostBalls(count: number, radius: number, color = 0x60a5fa): THREE.Mesh[] {
    return Array.from({ length: count }, (_, i) => {
        const ghost = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 0.52, 24, 24),
            new THREE.MeshStandardMaterial({
                color,
                transparent: true,
                opacity: 0.12 + i * 0.018,
                roughness: 0.35
            })
        );
        ghost.castShadow = false;
        return ghost;
    });
}

export function makeShadowPlate(radius: number): THREE.Mesh {
    const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 2.2, radius * 1.2),
        new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.16 })
    );
    plate.rotation.x = -Math.PI / 2;
    return plate;
}

export function makeProjectionLine(color = 0x0f766e, opacity = 0.56): THREE.Line {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

// ---------------------------------------------------------------------------
// 环境（地面、网格、光照）
// ---------------------------------------------------------------------------

export interface Environment {
    ground: THREE.Mesh;
    grid: THREE.GridHelper;
    wall: THREE.Mesh;
    lights: THREE.Light[];
}

export function createEnvironment(scene: THREE.Scene, bgColor = 0xf8fafc): Environment {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 8),
        new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.82, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(3.6, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(14, 14, 0xcbd5e1, 0xe5edf7);
    grid.position.set(3.6, 0.014, 0);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.26;
    scene.add(grid);

    const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 4),
        new THREE.MeshStandardMaterial({ color: bgColor, roughness: 0.9, metalness: 0 })
    );
    wall.position.set(3.6, 2, -3.05);
    wall.receiveShadow = true;
    scene.add(wall);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xdbeafe, 2.0);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-3, 7, 5);
    key.castShadow = true;
    // 1024x1024 shadow map: PCFShadowMap 配合 radius=2 既能保证阴影柔和无明显硬锯齿, 又极大降低显存分配开销 (从 64MB 降到 4MB), 避免快速切换多场景时 GPU 上下文卡死
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 2;
    key.shadow.bias = -0.0005;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 30;
    scene.add(key);

    const fill = new THREE.PointLight(0x93c5fd, 28, 18);
    fill.position.set(6, 4, -5);
    scene.add(fill);

    return { ground, grid, wall, lights: [hemi, key, fill] };
}

// ---------------------------------------------------------------------------
// 释放资源
// ---------------------------------------------------------------------------

export function disposeObject(obj: THREE.Object3D): void {
    obj.traverse(child => {
        const drawable = child as THREE.Mesh | THREE.Line | THREE.Sprite;
        if ('geometry' in drawable && drawable.geometry) drawable.geometry.dispose();
        const material = drawable.material;
        if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
        } else if (material) {
            material.dispose();
        }
    });
}

export function clearGroup(group: THREE.Group): void {
    [...group.children].forEach(child => {
        group.remove(child);
        disposeObject(child);
    });
}
