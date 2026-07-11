import { SCENES } from './scenes';

export { SCENES };

export function getDefaultParams(sceneId: string): Record<string, number> {
    const scene = SCENES.find(s => s.id === sceneId);
    if (!scene) return {};
    const params: Record<string, number> = {};
    for (const p of scene.parameters) {
        params[p.name] = p.default;
    }
    return params;
}
