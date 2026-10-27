/**
 * 3D 器材库 — 基础几何 / 材质 / 文字精灵助手
 * 从 Projectile3DStage 提取并扩展，供所有 3D 实验场景复用。
 */
import * as THREE from 'three';
import { applyShadowQuality, exposeShadowQualityProbe, type ShadowQualityTier } from './shadowQuality';

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

const TEXT_CANVAS_HEIGHT = 128;
const TEXT_CANVAS_MIN_WIDTH = 384;
const TEXT_FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", sans-serif';
const TEXT_PADDING_X = 24;

function textFont(fontSize: number): string {
    return `600 ${fontSize}px ${TEXT_FONT_FAMILY}`;
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number {
    ctx.font = textFont(fontSize);
    return ctx.measureText(text).width;
}

function drawCenteredText(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string,
    fontSize: number,
    y: number
): void {
    ctx.font = textFont(fontSize);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, y);
}

export function makeTextSprite(
    text: string,
    color = '#334155',
    fontSize = 40,
    scale = { x: 1.65, y: 0.55 }
): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const textWidth = measureTextWidth(ctx, text, fontSize);
    const needed = Math.ceil(textWidth + TEXT_PADDING_X * 2);
    // 1.5 倍余量吸收数值位数变化；宽度一旦确定不再修改（见 updateTextSprite 注释）
    const width = Math.max(TEXT_CANVAS_MIN_WIDTH, Math.ceil((needed * 1.5) / 64) * 64);
    canvas.width = width;
    canvas.height = TEXT_CANVAS_HEIGHT;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    // 保持调用方传入的横向像素比例：画布越宽，sprite 越宽，字形大小不变
    sprite.scale.set(scale.x * (width / TEXT_CANVAS_MIN_WIDTH), scale.y, 1);
    sprite.userData.textFontSize = fontSize;
    sprite.userData.textWidth = textWidth;
    // 保留当前文字原文 —— 契约测试要断言「标牌读数 == 引擎输出」,
    // 过去只能靠肉眼读贴图, 现在可在测试里直接读 userData.text。
    sprite.userData.text = text;
    drawCenteredText(canvas, ctx, text, color, fontSize, canvas.height / 2);
    texture.needsUpdate = true;
    return sprite;
}

/** 复用已有 sprite 的 canvas，更新文字（避免重复创建纹理；长文本首次超宽时重建纹理） */
export function updateTextSprite(sprite: THREE.Sprite, text: string, color = '#334155', fontSize = 40): void {
    const material = sprite.material as THREE.SpriteMaterial;
    const canvas = material.map?.image as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    sprite.userData.textFontSize = fontSize;

    // CanvasTexture 创建后再修改 canvas.width 会使后续 needsUpdate 不再上传（数值永远停在
    // 第一次扩容那一刻）。因此扩容时必须重建纹理并释放旧纹理，而不是只改画布尺寸。
    const textWidth = measureTextWidth(ctx, text, fontSize);
    const needed = Math.ceil(textWidth + TEXT_PADDING_X * 2);
    sprite.userData.textWidth = textWidth;
    // 保留当前文字原文 (契约测试读标牌数值用, 见 makeTextSprite 同处注释)
    sprite.userData.text = text;
    if (needed > canvas.width) {
        const factor = needed / canvas.width;
        canvas.width = needed;
        sprite.scale.x *= factor;
        const oldTexture = material.map;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
        oldTexture?.dispose();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCenteredText(canvas, ctx, text, color, fontSize, canvas.height / 2);
    material.map!.needsUpdate = true;
}

/** 按创建时记录的字号重绘单行标牌（供 rigs/params.ts 的 setLabel 复用扩宽能力） */
export function redrawTextSprite(sprite: THREE.Sprite, text: string, color = '#334155'): void {
    const fontSize = typeof sprite.userData.textFontSize === 'number' ? sprite.userData.textFontSize : 24;
    updateTextSprite(sprite, text, color, fontSize);
}

export interface TextPanelOptions {
    /** 面板标题（加粗、主题色） */
    title?: string;
    color?: string;
    titleColor?: string;
    fontSize?: number;
    lineHeight?: number;
    /** 面板世界高度；缺省按 24px 字号约 0.0055 world/px 换算，保证可读 */
    worldHeight?: number;
    background?: string;
    borderColor?: string;
    padding?: number;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * 多行说明/图例面板（半透明底板 + 自动换行宽度）。
 * 用于光电效应等需要成段解释的关键要素标注，避免多个单行标牌相互遮挡。
 */
export function makeTextPanelSprite(lines: string[], opts: TextPanelOptions = {}): THREE.Sprite {
    const color = opts.color ?? '#334155';
    const titleColor = opts.titleColor ?? '#1d4ed8';
    const fontSize = opts.fontSize ?? 22;
    const lineHeight = opts.lineHeight ?? Math.round(fontSize * 1.45);
    const padding = opts.padding ?? 18;
    const background = opts.background ?? 'rgba(248,250,252,0.94)';
    const borderColor = opts.borderColor ?? 'rgba(148,163,184,0.7)';

    const allLines = opts.title ? [opts.title, ...lines] : lines;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = textFont(fontSize);
    const maxWidth = allLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
    canvas.width = Math.max(160, Math.ceil(maxWidth + padding * 2));
    canvas.height = Math.ceil(allLines.length * lineHeight + padding * 2);

    roundRectPath(ctx, 0.5, 0.5, canvas.width - 1, canvas.height - 1, 10);
    ctx.fillStyle = background;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    allLines.forEach((line, i) => {
        const isTitle = Boolean(opts.title) && i === 0;
        ctx.font = textFont(fontSize);
        ctx.fillStyle = isTitle ? titleColor : color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line, canvas.width / 2, padding + lineHeight * (i + 0.5));
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    const worldHeight = opts.worldHeight ?? canvas.height * 0.0055;
    sprite.scale.set((worldHeight * canvas.width) / canvas.height, worldHeight, 1);
    sprite.userData.textFontSize = fontSize;
    return sprite;
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

export function createEnvironment(scene: THREE.Scene, bgColor = 0xf8fafc, shadowTier?: ShadowQualityTier): Environment {
    // 地面/背景墙要足够大: 斜俯视相机会看到平面的边界, 边缘露出会在画面里变成一条
    // 斜切的白线 (看着像凭空出现的一道坎), 故把地台从 14×8 扩到 20×14。
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 14),
        new THREE.MeshStandardMaterial({ color: 0xeef6ff, roughness: 0.82, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(3.6, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(20, 20, 0xcbd5e1, 0xe5edf7);
    grid.position.set(3.6, 0.014, 0);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.26;
    scene.add(grid);

    const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 4),
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
    // 阴影贴图自适应 (#95): 档位由设备能力驱动 (shadowQuality.ts), 缺省 medium =
    // M2.6 基线 1024² + radius=2 —— 保持阴影柔和无明显硬锯齿, 显存 4MB 量级,
    // 避免快速切换多场景时 GPU 上下文卡死; 低端设备降 512²(1MB), 高分设备升 2048²(16MB)
    exposeShadowQualityProbe(applyShadowQuality(key, shadowTier));
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

/**
 * 释放单个材质及其全部纹理属性。
 * 纹理必须显式 dispose：makeTextSprite 每次新建 CanvasTexture，仅靠 renderer
 * forceContextLoss 兜底时 GPU 端不会真正回收；上下文复用 (#81) 后更是直接泄漏。
 */
function disposeMaterial(material: THREE.Material): void {
    for (const key of Object.keys(material)) {
        const value = (material as unknown as Record<string, unknown>)[key];
        if (value instanceof THREE.Texture) value.dispose();
    }
    material.dispose();
}

export function disposeObject(obj: THREE.Object3D): void {
    obj.traverse(child => {
        const drawable = child as THREE.Mesh | THREE.Line | THREE.Sprite;
        if ('geometry' in drawable && drawable.geometry) drawable.geometry.dispose();
        const material = drawable.material;
        if (Array.isArray(material)) {
            material.forEach(disposeMaterial);
        } else if (material) {
            disposeMaterial(material);
        }
    });
}

export function clearGroup(group: THREE.Group): void {
    [...group.children].forEach(child => {
        group.remove(child);
        disposeObject(child);
    });
}
