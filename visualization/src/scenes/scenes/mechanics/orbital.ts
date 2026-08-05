import type { SceneConfig } from '../../../types/visualization';

export const orbitalScene: SceneConfig = {
    id: 'orbital',
    name: '万有引力与航天 (卫星轨道)',
    model: 'orbital',
    parameters: [
        {
            name: 'altitude',
            label: '轨道高度 h',
            unit: 'km',
            value: 400,
            min: 200,
            max: 36000,
            step: 50,
            default: 400,
            description: '卫星距地表高度 (ISS ≈ 400km, GEO ≈ 36000km)'
        },
        {
            name: 'velocityFactor',
            label: '速度/圆轨道速度',
            unit: '',
            value: 1.0,
            min: 0.5,
            max: 1.5,
            step: 0.01,
            default: 1.0,
            description: '1.0 = 圆轨道; <1 = 椭圆(远地点在此); >1 = 椭圆(近地点在此)或逃逸'
        },
        {
            name: 'duration',
            label: '模拟时长',
            unit: 'min',
            value: 120,
            min: 1,
            max: 1440,
            step: 5,
            default: 120,
            description: '仿真总时长 (1440min = 1天，可观测多圈)'
        }
    ],
    buildProblem: params => {
        const h_km = params['altitude'] ?? 400;
        const velocityFactor = params['velocityFactor'] ?? 1.0;
        const durationMin = params['duration'] ?? 120;
        // 地球引力参数 GM (m³/s²)
        const GM = 3.986e14;
        const R_EARTH = 6.371e6;
        const r = R_EARTH + h_km * 1000;
        const vOrbit = Math.sqrt(GM / r);
        const v = vOrbit * velocityFactor;
        return {
            id: `orbital-${Date.now()}`,
            title: '万有引力与航天 (卫星轨道运动)',
            model: 'orbital',
            bodies: [
                {
                    id: 'satellite',
                    mass: { value: 1000, unit: 'kg' },
                    position: { x: r, y: 0 },
                    velocity: { x: 0, y: v }
                }
            ],
            constraints: { orbital: { GM, centralRadius: R_EARTH } },
            environment: {},
            // 步长自适应：近地轨道几分钟一圈，GEO 24h 一圈 — 每圈至少 600 步
            timeConfig: { duration: durationMin * 60, dt: 1, sampleCount: Math.min(5000, durationMin * 60) }
        };
    }
};
