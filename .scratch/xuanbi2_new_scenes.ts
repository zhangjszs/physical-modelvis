  // ========================================================================
  // 选必二 电磁学 / 电磁波 / 传感器 / 互感 / 自感 / 传感器场景 — 14 模型
  // ========================================================================
  {
    id: 'current-balance',
    name: '电流天平 (安培力测量)',
    model: 'current-balance' as const,
    parameters: [
      { name: 'wireLen',       label: '导线有效长度 l',   unit: 'm',   value: 0.05,  min: 0.001, max: 1,   step: 0.001, default: 0.05,  description: '线圈垂直于磁场的单匝导线有效长度' },
      { name: 'turns',         label: '线圈匝数 n',         unit: '匝',  value: 20,    min: 1,     max: 1000, step: 1,    default: 20,    description: '线圈匝数' },
      { name: 'mass',          label: '砝码质量 m',         unit: 'kg',  value: 0.01,  min: 0.001, max: 1,   step: 0.001, default: 0.01,  description: '天平砝码质量' },
      { name: 'current',       label: '电流 I',              unit: 'A',   value: 1,     min: 0,     max: 100, step: 0.1,  default: 1,     description: '通过线圈的电流' },
      { name: 'magneticField', label: '磁感应强度 B',       unit: 'T',   value: 0.5,   min: 0.01, max: 10,  step: 0.01, default: 0.5,   description: '匀强磁场磁感应强度' },
      { name: 'gravity',       label: '重力加速度 g',       unit: 'm/s²', value: PHYSICS_CONSTANTS.g.value, min: 1, max: 20, step: 0.1, default: PHYSICS_CONSTANTS.g.value, description: '当地重力加速度' },
      { name: 'duration',      label: '模拟时长',           unit: 's',   value: 5,     min: 0.5,  max: 30,  step: 0.5,  default: 5,     description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const wireLen = params['wireLen'] ?? 0.05;
      const turns = params['turns'] ?? 20;
      const mass = params['mass'] ?? 0.01;
      const current = params['current'] ?? 1;
      const magneticField = params['magneticField'] ?? 0.5;
      const g = params['gravity'] ?? PHYSICS_CONSTANTS.g.value;
      const duration = params['duration'] ?? 5;
      return {
        id: `curBal-${Date.now()}`,
        title: '电流天平 (安培力测量)',
        model: 'current-balance',
        bodies: [{ id: 'balance', mass: { value: mass, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          currentBalance: { wireLen, turns, mass, current, magneticField, gravity: g },
        },
        environment: {
          gravity: { enabled: true, value: g },
        },
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  {
    id: 'eddy-current',
    name: '涡流现象 (阻尼摆动)',
    model: 'eddy-current' as const,
    parameters: [
      { name: 'magneticField', label: '磁感应强度 B',   unit: 'T',   value: 0.2,           min: 0.01, max: 5,      step: 0.01,  default: 0.2,           description: '交变磁场峰值 B' },
      { name: 'frequency',     label: '磁场频率 f',      unit: 'Hz',  value: 50,            min: 0.1,  max: 1e6,    step: 1,     default: 50,            description: '交变磁场频率' },
      { name: 'conductivity',  label: '电导率 σ',   unit: 'S/m', value: 5.8e7,         min: 1e3,  max: 1e8,    step: 1e5,   default: 5.8e7,         description: '导体电导率 (铜~5.8x10⁷ S/m)' },
      { name: 'thickness',     label: '导体厚度 d',      unit: 'm',   value: 0.001,         min: 1e-5, max: 0.1,    step: 0.0001, default: 0.001,       description: '金属板厚度 (m)' },
      { name: 'muR',           label: '相对磁导率 μC\r', unit: '',    value: 1,             min: 1,    max: 5000,  step: 1,     default: 1,             description: '导体相对磁导率 (非铁磁体=1)' },
      { name: 'duration',      label: '模拟时长',         unit: 's',   value: 10,            min: 0.5,  max: 60,    step: 0.5,   default: 10,            description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const magneticField = params['magneticField'] ?? 0.2;
      const frequency = params['frequency'] ?? 50;
      const conductivity = params['conductivity'] ?? 5.8e7;
      const thickness = params['thickness'] ?? 0.001;
      const muR = params['muR'] ?? 1;
      const duration = params['duration'] ?? 10;
      return {
        id: `eddy-${Date.now()}`,
        title: '涡流现象 (阻尼摆动)',
        model: 'eddy-current',
        bodies: [{ id: 'plate', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          eddyCurrent: { magneticField, frequency, conductivity, thickness, muR },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'em-damping',
    name: '电磁阻尼/驱动',
    model: 'em-damping' as const,
    parameters: [
      { name: 'magneticField',  label: '磁感应强度 B',         unit: 'T',       value: 0.3,     min: 0.01, max: 5,     step: 0.01,  default: 0.3,     description: '匀强磁场磁感应强度' },
      { name: 'angularSpeed',   label: '初始/目标角速度 ω₀', unit: 'rad/s',   value: 100,     min: 0,    max: 5000,  step: 10,    default: 100,     description: '初始 (阻尼) 或目标 (驱动) 角速度' },
      { name: 'conductivity',   label: '电导率 σ',         unit: 'S/m',     value: 5.8e7,   min: 1e3,  max: 1e8,   step: 1e5,   default: 5.8e7,   description: '导体电导率' },
      { name: 'inertia',        label: '转动惯量 J',            unit: 'kg·m²', value: 0.01,    min: 1e-9, max: 100,   step: 0.01,  default: 0.01,    description: '导体盘转动惯量' },
      { name: 'radius',         label: '导体盘半径 R',          unit: 'm',       value: 0.1,     min: 0.001, max: 10,    step: 0.01,  default: 0.1,     description: '导体盘半径' },
      { name: 'duration',       label: '模拟时长',               unit: 's',       value: 5,       min: 0.1,  max: 60,    step: 0.5,   default: 5,       description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const magneticField = params['magneticField'] ?? 0.3;
      const angularSpeed = params['angularSpeed'] ?? 100;
      const conductivity = params['conductivity'] ?? 5.8e7;
      const inertia = params['inertia'] ?? 0.01;
      const radius = params['radius'] ?? 0.1;
      const duration = params['duration'] ?? 5;
      return {
        id: `emd-${Date.now()}`,
        title: '电磁阻尼/驱动',
        model: 'em-damping',
        bodies: [{ id: 'disc', mass: { value: 0.5, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          emDamping: { mode: 'damping', magneticField, angularSpeed, conductivity, inertia, radius },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'mutual-inductance',
    name: '互感现象 (双线圈)',
    model: 'mutual-inductance' as const,
    parameters: [
      { name: 'L1',              label: '原线圈自感 L₁',   unit: 'H',   value: 0.1,   min: 1e-6, max: 1000, step: 0.01,  default: 0.1,   description: '原线圈自感 L1' },
      { name: 'L2',              label: '副线圈自感 L₂',   unit: 'H',   value: 0.05,  min: 1e-6, max: 1000, step: 0.01,  default: 0.05,  description: '副线圈自感 L2' },
      { name: 'coupling',        label: '耦合系数 k',           unit: '',    value: 0.6,   min: 0,     max: 1,    step: 0.01,  default: 0.6,   description: '耦合系数 (0=无耦合, 1=理想变压器)' },
      { name: 'frequency',       label: '交流频率 f',           unit: 'Hz',  value: 50,    min: 1,     max: 1e5,  step: 1,     default: 50,    description: '原边交流频率' },
      { name: 'primaryCurrent',  label: '原边电流峰值 I₀', unit: 'A',   value: 1,     min: 0,     max: 100,  step: 0.1,   default: 1,     description: '原边交流电流幅值 I0' },
      { name: 'duration',        label: '模拟时长',              unit: 's',   value: 0.2,   min: 0.05, max: 2,    step: 0.05,  default: 0.2,   description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const L1 = params['L1'] ?? 0.1;
      const L2 = params['L2'] ?? 0.05;
      const coupling = params['coupling'] ?? 0.6;
      const frequency = params['frequency'] ?? 50;
      const primaryCurrent = params['primaryCurrent'] ?? 1;
      const duration = params['duration'] ?? 0.2;
      return {
        id: `mutInd-${Date.now()}`,
        title: '互感现象 (双线圈)',
        model: 'mutual-inductance',
        bodies: [{ id: 'primary', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          mutualInductance: { L1, L2, coupling, frequency, primaryCurrent },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 1000, sampleCount: 1000 },
      };
    },
  },
  {
    id: 'self-inductance',
    name: '自感现象 (断电自感)',
    model: 'self-inductance' as const,
    parameters: [
      { name: 'inductance',   label: '自感 L',      unit: 'H',   value: 0.5, min: 1e-6, max: 1000, step: 0.01,  default: 0.5, description: '线圈自感 L' },
      { name: 'resistance',   label: '电阻 R',      unit: 'Ω',   value: 10,  min: 0.01, max: 1e6,  step: 1,     default: 10,  description: '电路电阻 R' },
      { name: 'emf',          label: '电源电动势 E', unit: 'V',   value: 12,  min: 0,     max: 1000, step: 0.5,   default: 12,  description: '直流电源电动势 E' },
      { name: 'duration',     label: '模拟时长',     unit: 's',   value: 0.5, min: 0.1,  max: 5,    step: 0.05,  default: 0.5, description: '仿真总时长 (含暂态过程)' },
    ],
    buildProblem: (params) => {
      const inductance = params['inductance'] ?? 0.5;
      const resistance = params['resistance'] ?? 10;
      const emf = params['emf'] ?? 12;
      const duration = params['duration'] ?? 0.5;
      return {
        id: `selfInd-${Date.now()}`,
        title: '自感现象 (断电自感)',
        model: 'self-inductance',
        bodies: [{ id: 'coil', mass: { value: 0.2, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          selfInductance: { inductance, resistance, emf, mode: 'turnOff' },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 500, sampleCount: 500 },
      };
    },
  },
  {
    id: 'em-wave-communication',
    name: '电磁波发射接收',
    model: 'em-wave-communication' as const,
    parameters: [
      { name: 'carrierFreq',       label: '载波频率 f_c', unit: 'MHz', value: 1,     min: 0.1,    max: 10000, step: 0.1,  default: 1,     description: '载波频率 fc (MHz)' },
      { name: 'audioFreq',         label: '音频频率 f_m', unit: 'kHz', value: 1,     min: 0.1,    max: 200,   step: 0.1,  default: 1,     description: '音频/基带信号频率 fm (kHz)' },
      { name: 'modulationIndex',   label: '调制指数 m/β', unit: '',     value: 0.8,   min: 0.01,   max: 5,     step: 0.01, default: 0.8,   description: '调制指数 (AM: m, FM: beta)' },
      { name: 'carrierAmplitude',  label: '载波峰值 V_c', unit: 'V',   value: 1,     min: 0.01,   max: 1000,  step: 0.1,  default: 1,     description: '载波峰值电压 Vc' },
      { name: 'distance',          label: '传输距离',     unit: 'km',   value: 10,    min: 0.001,  max: 1e5,   step: 1,    default: 10,    description: '发射-接收距离 (km)' },
      { name: 'duration',          label: '模拟时长',      unit: 'us',   value: 10,    min: 0.1,    max: 1000,  step: 0.1,  default: 10,    description: '仿真总时长 (用于显示多个周期)' },
    ],
    buildProblem: (params) => {
      const carrierFreqHz = (params['carrierFreq'] ?? 1) * 1e6;
      const audioFreqHz = (params['audioFreq'] ?? 1) * 1e3;
      const modulationIndex = params['modulationIndex'] ?? 0.8;
      const Vc = params['carrierAmplitude'] ?? 1;
      const distanceM = (params['distance'] ?? 10) * 1000;
      const duration = params['duration'] ?? 10;
      return {
        id: `emComm-${Date.now()}`,
        title: '电磁波发射接收',
        model: 'em-wave-communication',
        bodies: [{ id: 'antenna', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          emWaveComm: {
            carrierFreq: carrierFreqHz,
            audioFreq: audioFreqHz,
            modulationType: 'AM',
            modulationIndex,
            carrierAmplitude: Vc,
            distance: distanceM,
          },
        },
        environment: {},
        timeConfig: { duration: duration * 1e-6, dt: 1e-7, sampleCount: 800 },
      };
    },
  },
  {
    id: 'em-spectrum',
    name: '电磁波谱 (频段分布)',
    model: 'em-spectrum' as const,
    parameters: [
      { name: 'freqMinExp',  label: '频率下限 (10^n)', unit: '',   value: 1,  min: 0,    max: 15,  step: 1,  default: 1, description: '频率下限: 10^{n} Hz (n=1 → 10 Hz)' },
      { name: 'freqMaxExp',  label: '频率上限 (10^n)', unit: '',   value: 16, min: 3,    max: 22,  step: 1,  default: 16, description: '频率上限: 10^{n} Hz (n=16 → 10 PHz)' },
      { name: 'duration',    label: '模拟时长',         unit: 's',  value: 1,  min: 0.1,  max: 5,   step: 0.1, default: 1, description: '静态场景, 仅决定图表显示刷新' },
    ],
    buildProblem: (params) => {
      const freqMin = Math.pow(10, params['freqMinExp'] ?? 1);
      const freqMax = Math.pow(10, params['freqMaxExp'] ?? 16);
      const duration = params['duration'] ?? 1;
      return {
        id: `emSpec-${Date.now()}`,
        title: '电磁波谱 (频段分布)',
        model: 'em-spectrum',
        bodies: [{ id: 'probe', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          emSpectrum: { freqMin, freqMax, highlightBand: 'visible' },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 400 },
      };
    },
  },
  {
    id: 'hall-effect',
    name: '霍尔元件 (VH-IS)',
    model: 'hall-effect' as const,
    parameters: [
      { name: 'current',       label: '控制电流 I',      unit: 'A',   value: 1,     min: 0,     max: 100,     step: 0.1,   default: 1,     description: '霍尔元件控制电流 I' },
      { name: 'magneticField', label: '磁感应强度 B',    unit: 'T',   value: 0.3,   min: 0.001, max: 5,       step: 0.01,  default: 0.3,   description: '垂直于元件表面的磁场 B' },
      { name: 'chargeDensity', label: '载流子浓度 n',    unit: 'm^-3', value: 1e22,  min: 1e18,  max: 1e28,    step: 1e20,  default: 1e22,  description: '半导体载流子浓度 n' },
      { name: 'thickness',     label: '元件厚度 t',      unit: 'm',   value: 0.001, min: 1e-7,  max: 0.01,    step: 1e-4,  default: 0.001, description: '霍尔元件厚度 t (m)' },
      { name: 'duration',      label: '模拟时长',         unit: 's',   value: 1,     min: 0.1,   max: 5,       step: 0.1,   default: 1,     description: '静态场景显示时长' },
    ],
    buildProblem: (params) => {
      const current = params['current'] ?? 1;
      const magneticField = params['magneticField'] ?? 0.3;
      const chargeDensity = params['chargeDensity'] ?? 1e22;
      const thickness = params['thickness'] ?? 0.001;
      const duration = params['duration'] ?? 1;
      return {
        id: `hall-${Date.now()}`,
        title: '霍尔元件 (VH-IS)',
        model: 'hall-effect',
        bodies: [{ id: 'element', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          hallEffect: { current, magneticField, chargeDensity, thickness, carrierType: 'electron' },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'reed-switch',
    name: '干簧管 (磁控开关)',
    model: 'reed-switch' as const,
    parameters: [
      { name: 'magnetDistance',    label: '磁铁到干簧管距离 d', unit: 'mm', value: 5,  min: 0.1, max: 100, step: 0.1, default: 5,  description: '磁体与干簧管间距 d' },
      { name: 'pullInThreshold',   label: '吸合阈值 H_pull',     unit: 'mT', value: 50, min: 5,   max: 200, step: 1,   default: 50, description: '吸合磁场阈值 (mT)' },
      { name: 'releaseThreshold',  label: '释放阈值 H_rel',      unit: 'mT', value: 30, min: 5,   max: 200, step: 1,   default: 30, description: '释放磁场阈值 (mT)' },
      { name: 'duration',          label: '模拟时长',             unit: 's',  value: 1,  min: 0.1, max: 5,   step: 0.1, default: 1,  description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const magnetDistance = params['magnetDistance'] ?? 5;
      const pullInThreshold = params['pullInThreshold'] ?? 50;
      const releaseThreshold = params['releaseThreshold'] ?? 30;
      const duration = params['duration'] ?? 1;
      return {
        id: `reed-${Date.now()}`,
        title: '干簧管 (磁控开关)',
        model: 'reed-switch',
        bodies: [{ id: 'reed', mass: { value: 0.001, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          reedSwitch: { mode: 'magnetic', magnetDistance, pullInThreshold, releaseThreshold },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'photoresistor',
    name: '光敏电阻 (R-L特性)',
    model: 'photoresistor' as const,
    parameters: [
      { name: 'darkResistance',   label: '暗电阻 R_dark',     unit: 'Ohm', value: 1e6,   min: 1e3,  max: 1e9,  step: 1e5,  default: 1e6,   description: '无光照时的暗电阻 (\u3A9)' },
      { name: 'sensitivity',      label: '灵敏度 k',           unit: '1/lx', value: 2e-3,  min: 1e-5, max: 0.1,  step: 1e-4, default: 2e-3,  description: '指数灵敏度系数 k' },
      { name: 'lightIntensity',   label: '工作点光照度 E',    unit: 'lx',  value: 100,   min: 0.1,  max: 1e5,  step: 10,   default: 100,   description: '当前光照度 E (图亮度单位)' },
      { name: 'temperature',      label: '环境温度 T',         unit: 'degC', value: 25,    min: -20,  max: 80,   step: 1,    default: 25,    description: '环境工作温度 (度)' },
      { name: 'duration',         label: '模拟时长',            unit: 's',   value: 5,     min: 0.5,  max: 30,   step: 0.5,  default: 5,     description: '仿真总时长' },
    ],
    buildProblem: (params) => {
      const darkResistance = params['darkResistance'] ?? 1e6;
      const sensitivity = params['sensitivity'] ?? 2e-3;
      const lightIntensity = params['lightIntensity'] ?? 100;
      const temperatureCelsius = params['temperature'] ?? 25;
      const duration = params['duration'] ?? 5;
      return {
        id: `photo-${Date.now()}`,
        title: '光敏电阻 (R-L特性)',
        model: 'photoresistor',
        bodies: [{ id: 'ldr', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          photoresistor: { darkResistance, sensitivity, lightIntensity, temperatureCelsius },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 300, sampleCount: 300 },
      };
    },
  },
  {
    id: 'thermistor',
    name: '热敏电阻 (R-T特性)',
    model: 'thermistor' as const,
    parameters: [
      { name: 'temperature',  label: '当前温度 T',   unit: 'K',   value: 300,  min: 200, max: 600, step: 1,   default: 300, description: '热敏电阻工作温度 (K)' },
      { name: 'R0',           label: '基准电阻 R_0', unit: 'Ohm', value: 1e4, min: 1,   max: 1e6, step: 100, default: 1e4, description: 'T0=298 K 时的基准电阻' },
      { name: 'BValue',       label: '材料常数 B',    unit: 'K',   value: 3950, min: 1000, max: 6000, step: 100, default: 3950, description: 'NTC B 常数' },
      { name: 'duration',     label: '模拟时长',       unit: 's',   value: 1,    min: 0.1, max: 5,   step: 0.1, default: 1,   description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const temperature = params['temperature'] ?? 300;
      const R0 = params['R0'] ?? 1e4;
      const BValue = params['BValue'] ?? 3950;
      const duration = params['duration'] ?? 1;
      return {
        id: `therm-${Date.now()}`,
        title: '热敏电阻 (R-T特性)',
        model: 'thermistor',
        bodies: [{ id: 'thermBody', mass: { value: 0.01, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          thermistor: { temperature, mode: 'NTC', R0, BValue },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'strain-gauge',
    name: '电阻应变片 (惠斯通电桥)',
    model: 'strain-gauge' as const,
    parameters: [
      { name: 'strain',         label: '应变 ε',     unit: 'με', value: 1000,   min: -5000,  max: 5000, step: 50,  default: 1000, description: '当前应变 (微应变单位)' },
      { name: 'gaugeFactor',    label: '灵敏系数 K',      unit: '',    value: 2.1,   min: 1,      max: 200,  step: 0.1, default: 2.1,  description: '应变片灵敏系数 K (金属~2, 半导体~100)' },
      { name: 'bridgeVoltage',  label: '桥路供电 U_K',   unit: 'V',    value: 5,     min: 0.5,    max: 30,   step: 0.5, default: 5,    description: '惠斯通电桥供电电压' },
      { name: 'duration',       label: '模拟时长',         unit: 's',    value: 1,     min: 0.1,    max: 5,    step: 0.1, default: 1,    description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const strain = params['strain'] ?? 1000;
      const gaugeFactor = params['gaugeFactor'] ?? 2.1;
      const bridgeVoltage = params['bridgeVoltage'] ?? 5;
      const duration = params['duration'] ?? 1;
      return {
        id: `strain-${Date.now()}`,
        title: '电阻应变片 (惠斯通电桥)',
        model: 'strain-gauge',
        bodies: [{ id: 'element', mass: { value: 0.1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          strainGauge: { strain, gaugeFactor, bridgeVoltage },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 200, sampleCount: 200 },
      };
    },
  },
  {
    id: 'security-alarm',
    name: '门窗防盗报警 (磁控)',
    model: 'security-alarm' as const,
    parameters: [
      { name: 'magnetDistance',    label: '磁体到干簧管距离 d', unit: 'mm', value: 5,  min: 0,   max: 300, step: 1, default: 5,  description: '磁体与干簧管的间距' },
      { name: 'operateDistance',   label: '吸合距离 d_operate',  unit: 'mm', value: 15, min: 1,   max: 50,  step: 1, default: 15, description: '吸合距离阈值' },
      { name: 'releaseDistance',   label: '释放距离 d_release',  unit: 'mm', value: 25, min: 5,   max: 50,  step: 1, default: 25, description: '释放距离阈值' },
      { name: 'duration',          label: '模拟时长',             unit: 's',  value: 1,  min: 0.1, max: 5,   step: 0.1, default: 1, description: '静态场景显示' },
    ],
    buildProblem: (params) => {
      const magnetDistance = params['magnetDistance'] ?? 5;
      const operateDistance = params['operateDistance'] ?? 15;
      const releaseDistance = params['releaseDistance'] ?? 25;
      const duration = params['duration'] ?? 1;
      const doorState: 'closed' | 'open' = magnetDistance <= operateDistance ? 'closed' : 'open';
      return {
        id: `sec-${Date.now()}`,
        title: '门窗防盗报警 (磁控)',
        model: 'security-alarm',
        bodies: [{ id: 'door', mass: { value: 10, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          securityAlarm: { doorState, magnetDistance, operateDistance, releaseDistance },
        },
        environment: {},
        timeConfig: { duration, dt: duration / 100, sampleCount: 100 },
      };
    },
  },
  {
    id: 'light-control-switch',
    name: '光控开关 (光敏+继电器)',
    model: 'light-control-switch' as const,
    parameters: [
      { name: 'lightIntensity',  label: '当前光照度 L',     unit: 'lx',  value: 0.5,     min: 0.01,  max: 1e5, step: 0.5,  default: 0.5,   description: '当前环境光照强度 (夜晚玩\u0.5 lx, 白天~50000 lx)' },
      { name: 'threshold',       label: '触发阈值 L_th',   unit: 'lx',  value: 10,      min: 0.1,   max: 1e3, step: 1,    default: 10,    description: '路灯开关翻转阈值' },
      { name: 'Rfix',            label: '分压电阻 R_fix',  unit: 'ohm', value: 10000,   min: 100,   max: 1e6, step: 1000, default: 10000, description: '分压电路中固定电阻值' },
      { name: 'Esupply',         label: '电源电压 E',       unit: 'V',   value: 12,      min: 5,     max: 24,  step: 1,    default: 12,    description: '分压电路供电电压 E' },
      { name: 'duration',        label: '模拟时长',          unit: 'h',   value: 24,      min: 1,     max: 48,  step: 1,    default: 24,    description: '仿真总时长 (模拟 24h 光照变化)' },
    ],
    buildProblem: (params) => {
      const lightIntensity = params['lightIntensity'] ?? 0.5;
      const threshold = params['threshold'] ?? 10;
      const Rfix = params['Rfix'] ?? 10000;
      const Esupply = params['Esupply'] ?? 12;
      const durationH = params['duration'] ?? 24;
      return {
        id: `lcs-${Date.now()}`,
        title: '光控开关 (光敏+继电器)',
        model: 'light-control-switch',
        bodies: [{ id: 'lamp', mass: { value: 1, unit: 'kg' }, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }],
        constraints: {
          lightControlSwitch: {
            lightIntensity,
            threshold,
            Rfix,
            Esupply,
            VbeOn: 0.7,
            Rdark: 1e6,
            Rbright: 5000,
            timeSpanH: durationH,
            sampleCount: 240,
          },
        },
        environment: {},
        timeConfig: { duration: durationH * 3600, dt: durationH * 3600 / 240, sampleCount: 240 },
      };
    },
  },
