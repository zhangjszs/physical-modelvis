  // ========================================================================
  // 选必三 热力学 — 探究做功与内能关系
  // ========================================================================
  {
    id: 'joule-mechanical',
    name: '探究做功与内能关系 (机械功)',
    model: 'joule-mechanical',
    parameters: [
      { name: 'mass', label: '重物质量 m', unit: 'kg', value: 5, min: 0.1, max: 30, step: 0.1, default: 5, description: '下落重物质量 (kg)' },
      { name: 'height', label: '下落高度 h', unit: 'm', value: 1.5, min: 0.1, max: 5, step: 0.05, default: 1.5, description: '重物每次下落的高度 (m)' },
      { name: 'drops', label: '下落次数 n', unit: '次', value: 100, min: 1, max: 500, step: 1, default: 100, description: '重物下落次数 (反映总机械功 W = n·m·g·h)' },
      { name: 'waterMass', label: '水当量 M', unit: 'kg', value: 0.5, min: 0.05, max: 3, step: 0.05, default: 0.5, description: '量热器内水质量 (kg)' },
      { name: 'specificHeat', label: '比热容 c', unit: 'J/(kg·K)', value: 4184, min: 1000, max: 5000, step: 50, default: 4184, description: '水的比热容 J/(kg·K)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: '机械功-热量曲线展示时长' },
    ],
    buildProblem: (params) => {
      const mass = params['mass'] ?? 5;
      const height = params['height'] ?? 1.5;
      const drops = Math.max(1, Math.floor(params['drops'] ?? 100));
      const waterMass = params['waterMass'] ?? 0.5;
      const specificHeat = params['specificHeat'] ?? 4184;
      const duration = params['duration'] ?? 5;
      return {
        id: `joule-mech-${Date.now()}`,
        title: '探究做功与内能关系 (机械功)',
        model: 'joule-mechanical' as const,
        bodies: [{ id: 'weight', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          jouleMechanical: {
            mass,
            height,
            drops,
            waterMass,
            specificHeat,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'joule-electrical',
    name: '探究做功与内能关系 (电功)',
    model: 'joule-electrical',
    parameters: [
      { name: 'voltage', label: '电源电压 U', unit: 'V', value: 12, min: 0.1, max: 30, step: 0.1, default: 12, description: '电加热器两端电压 (V)' },
      { name: 'resistance', label: '电阻 R', unit: 'Ω', value: 10, min: 1, max: 100, step: 0.5, default: 10, description: '加热器电阻 (Ω)' },
      { name: 'time', label: '通电时间 t', unit: 's', value: 300, min: 1, max: 1200, step: 1, default: 300, description: '通电时长 (s)' },
      { name: 'waterMass', label: '水当量 M', unit: 'kg', value: 0.5, min: 0.05, max: 3, step: 0.05, default: 0.5, description: '量热器内水质量 (kg)' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: '电功-热量曲线展示时长' },
    ],
    buildProblem: (params) => {
      const voltage = params['voltage'] ?? 12;
      const resistance = params['resistance'] ?? 10;
      const time = params['time'] ?? 300;
      const waterMass = params['waterMass'] ?? 0.5;
      const duration = params['duration'] ?? 5;
      return {
        id: `joule-elec-${Date.now()}`,
        title: '探究做功与内能关系 (电功)',
        model: 'joule-electrical' as const,
        bodies: [{ id: 'heater', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          jouleElectrical: {
            voltage,
            resistance,
            time,
            waterMass,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'adiabatic-compression',
    name: '绝热压缩 (气体点火)',
    model: 'adiabatic-compression',
    parameters: [
      { name: 'initialTemp', label: '初始温度 T₁', unit: 'K', value: 300, min: 250, max: 400, step: 5, default: 300, description: '压缩前气体初温 (K)' },
      { name: 'compressionRatio', label: '压缩比 r = V₁/V₂', unit: '', value: 9, min: 3, max: 20, step: 0.5, default: 9, description: '汽油机典型压缩比 8~12; 柴油机 15~22' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: '绝热 T-p-V 曲线展示时长' },
    ],
    buildProblem: (params) => {
      const initialTemp = params['initialTemp'] ?? 300;
      const compressionRatio = params['compressionRatio'] ?? 9;
      const duration = params['duration'] ?? 5;
      return {
        id: `adiabatic-${Date.now()}`,
        title: '绝热压缩 (气体点火)',
        model: 'adiabatic-compression' as const,
        bodies: [{ id: 'piston', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          adiabaticCompression: {
            initialTemp,
            compressionRatio,
            gamma: 1.40,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'heat-transfer',
    name: '热传递 (三种模式对比)',
    model: 'heat-transfer',
    parameters: [
      { name: 'mode', label: '主导传热模式', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=热传导; 1=热对流; 2=热辐射' },
      { name: 'medium', label: '材料', unit: '', value: 0, min: 0, max: 3, step: 1, default: 0, description: '0=铜 (k=401); 1=玻璃 (k=1.0); 2=钢; 3=聚苯乙烯' },
      { name: 'ambientTemp', label: '环境温度 T_env', unit: 'K', value: 350, min: 250, max: 1000, step: 5, default: 350, description: '高温热源/环境 (K)' },
      { name: 'initialTemp', label: '物体初温 T₀', unit: 'K', value: 300, min: 200, max: 600, step: 5, default: 300, description: '被加热/冷却物体初温 (K)' },
      { name: 'time', label: '模拟时间', unit: 's', value: 60, min: 5, max: 600, step: 5, default: 60, description: '传热持续时长 (s)（观察温度上升曲线）' },
      { name: 'duration', label: '展示时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: 'T-t / Qdot-t 曲线对比展示时长' },
    ],
    buildProblem: (params) => {
      const modeNum = params['mode'] ?? 0;
      const mode = modeNum === 1 ? 'convection' as const : modeNum === 2 ? 'radiation' as const : 'conduction' as const;
      const mediumNum = params['medium'] ?? 0;
      const materialType = mediumNum === 1 ? 'glass' as const : mediumNum === 2 ? 'steel' as const : mediumNum === 3 ? 'polystyrene' as const : 'copper' as const;
      const ambientTemp = params['ambientTemp'] ?? 350;
      const initialTemp = params['initialTemp'] ?? 300;
      const time = params['time'] ?? 60;
      const duration = params['duration'] ?? 5;
      return {
        id: `heat-transfer-${Date.now()}`,
        title: '热传递 (三种模式对比)',
        model: 'heat-transfer' as const,
        bodies: [{ id: 'sample', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          heatTransfer: {
            mode,
            materialType,
            ambientTemp,
            initialTemp,
            time,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'energy-transformation',
    name: '能量转化 (能量守恒)',
    model: 'energy-transformation',
    parameters: [
      { name: 'mode', label: '实验模式', unit: '', value: 0, min: 0, max: 2, step: 1, default: 0, description: '0=单摆; 1=发电机; 2=光伏电池' },
      { name: 'inputEnergy', label: '输入能量 E_in', unit: 'J', value: 100, min: 1, max: 100000, step: 1, default: 100, description: '输入能量的大小 (J)' },
      { name: 'efficiency', label: '转化效率 η', unit: '', value: 0.85, min: 0.05, max: 0.99, step: 0.01, default: 0.85, description: '有用输出 / 输入 (0~1)' },
      { name: 'duration', label: '展示时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: '能量柱 + 效率曲线展示时长' },
    ],
    buildProblem: (params) => {
      const modeNum = params['mode'] ?? 0;
      const modeVal = modeNum === 1 ? 'generator' as const : modeNum === 2 ? 'photovoltaic' as const : 'pendulum' as const;
      const inputEnergy = params['inputEnergy'] ?? 100;
      const efficiency = params['efficiency'] ?? 0.85;
      const duration = params['duration'] ?? 5;
      return {
        id: `energy-trans-${Date.now()}`,
        title: '能量转化 (能量守恒)',
        model: 'energy-transformation' as const,
        bodies: [{ id: 'device', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          energyTransformation: {
            mode: modeVal,
            inputEnergy,
            efficiency,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'perpetuum-mobile',
    name: '永动机不可能 (热二律)',
    model: 'perpetuum-mobile',
    parameters: [
      { name: 'mode', label: '演示模式', unit: '', value: 0, min: 0, max: 1, step: 1, default: 0, description: '0=卡诺循环 T-S 图 + 效率上限; 1=开尔文表述判定' },
      { name: 'hotTemp', label: '热源温度 T_hot', unit: 'K', value: 600, min: 200, max: 1500, step: 10, default: 600, description: '高温热源温度 (K)' },
      { name: 'coldTemp', label: '冷源温度 T_cold', unit: 'K', value: 300, min: 30, max: 800, step: 10, default: 300, description: '低温冷源温度 (K)' },
      { name: 'duration', label: '展示时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: 'T-S 图 + η-ξ 曲线 + 判定结果展示时长' },
    ],
    buildProblem: (params) => {
      const modeNum = params['mode'] ?? 0;
      const mode = modeNum === 1 ? 'kelvin' as const : 'carnot' as const;
      const hotTemp = params['hotTemp'] ?? 600;
      const coldTemp = params['coldTemp'] ?? 300;
      const duration = params['duration'] ?? 5;
      const durationSec = duration;
      return {
        id: `perpetuum-${Date.now()}`,
        title: '永动机不可能 (热二律)',
        model: 'perpetuum-mobile' as const,
        bodies: [{ id: 'engine', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          perpetuumMobile: {
            hotTemp,
            coldTemp,
            mode,
          },
        },
        environment: {},
        timeConfig: { duration: durationSec, dt: durationSec / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'heat-direction',
    name: '热力学方向性 (热二定律)',
    model: 'heat-direction',
    parameters: [
      { name: 'hotTemp', label: '高温物体 T_hot', unit: 'K', value: 400, min: 250, max: 550, step: 5, default: 400, description: '高温热源初始温度 (K)' },
      { name: 'coldTemp', label: '低温物体 T_cold', unit: 'K', value: 250, min: 150, max: 350, step: 5, default: 250, description: '低温物体初始温度 (K)' },
      { name: 'thermalConductivity', label: '等效导热系数 k', unit: 'W/(m·K)', value: 5, min: 0.1, max: 100, step: 0.1, default: 5, description: '接触界面等效导热系数 (τ = 10 / (k+0.01))' },
      { name: 'duration', label: '模拟时长', unit: 's', value: 5, min: 1, max: 30, step: 0.5, default: 5, description: '温度趋衡 T-t 曲线展示时长' },
    ],
    buildProblem: (params) => {
      const hotTemp = params['hotTemp'] ?? 400;
      const coldTemp = params['coldTemp'] ?? 250;
      const thermalConductivity = params['thermalConductivity'] ?? 5;
      const duration = params['duration'] ?? 5;
      return {
        id: `heat-dir-${Date.now()}`,
        title: '热力学方向性 (热二定律)',
        model: 'heat-direction' as const,
        bodies: [{ id: 'contact', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          heatDirection: {
            hotTemp,
            coldTemp,
            thermalConductivity,
            duration,
          },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
