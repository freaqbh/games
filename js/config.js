export const CONFIG = {
  // ===== RENDERING =====
  render: {
    fov: 75,
    near: 0.05,
    far: 60,
    shadowMapSize: 2048,
    pixelRatioMax: 2,
    antialias: true,
  },

  // ===== FOG =====
  fog: {
    color: 0x050505,
    near: 1.5,
    far: 28,
    densityFloor: 0.015,
    densityCeiling: 0.06,
  },

  // ===== PLAYER MOVEMENT =====
  player: {
    eyeHeight: 1.65,
    crouchHeight: 0.9,
    walkSpeed: 2.8,
    runSpeed: 5.2,
    crouchSpeed: 1.3,
    acceleration: 25,
    deceleration: 18,
    gravity: 22,
    jumpForce: 6.5,
    sprintStaminaMax: 100,
    sprintStaminaDrain: 22,
    sprintStaminaRegen: 12,
    sprintStaminaMin: 15,
    headBobFrequency: 8,
    headBobAmplitude: 0.035,
    headBobRunAmplitude: 0.06,
    breathingAmplitude: 0.008,
    breathingFrequency: 2.5,
    footstepInterval: 0.55,
    footstepRunInterval: 0.32,
    interactionDistance: 3.0,
    interactionRadius: 0.08,
    bodyRadius: 0.3,
  },

  // ===== FLASHLIGHT =====
  flashlight: {
    intensity: 250,
    angle: Math.PI / 6.5,
    penumbra: 0.5,
    distance: 22,
    decay: 1.4,
    batteryMax: 100,
    batteryDrainPerSec: 0.55,
    batteryLowThreshold: 20,
    flickerChance: 0.012,
    flickerDuration: 0.08,
    intensityLowBattery: 50,
  },

  // ===== SANITY =====
  sanity: {
    max: 100,
    startVal: 100,
    drainInDarkness: 1.8,
    drainNearEntity: 6.0,
    drainDuringChase: 3.0,
    drainOnScare: 15,
    drainOnJumpscare: 35,
    regenInLight: 2.5,
    regenSafeRoom: 5.0,
    hallucinationThreshold: 50,
    severeHallucinationThreshold: 25,
    colorDesaturateThreshold: 40,
    heartbeatThreshold: 55,
    recoveryDelay: 5,
  },

  // ===== ENTITY (Hollow One) =====
  entity: {
    height: 2.7,
    width: 0.35,
    walkSpeed: {
      act1: 0,
      act2: 2.0,
      act3: 3.0,
      act4: 3.8,
    },
    runSpeed: {
      act1: 0,
      act2: 4.0,
      act3: 5.2,
      act4: 6.5,
    },
    detectionRange: 16,
    visionConeAngle: Math.PI / 4,
    visionRange: 20,
    hearingRange: 12,
    hearingRunRange: 18,
    hearingInteractionRange: 8,
    investigationTime: 8,
    searchTime: 12,
    attackRange: 1.8,
    attackCooldown: 2.5,
    teleportCooldown: 15,
    patrolWaitTime: 4,
    waypointReachedDist: 1.2,
    loseSightTime: 5,
    speedRampUp: 0.5,
    doorOpenChance: 0.7,
    whisperRange: 14,
    boneCrackInterval: 2.5,
  },

  // ===== SHADOW CHILDREN =====
  shadowChildren: {
    count: 5,
    appearDistance: 12,
    disappearDistance: 6,
    stareDuration: 4,
    maxActive: 2,
    hallucinationSanityThreshold: 50,
    whisperInterval: 8,
  },

  // ===== AUDIO =====
  audio: {
    masterVolume: 0.7,
    ambientGain: 0.35,
    musicGain: 0.3,
    foleyGain: 0.5,
    entityGain: 0.45,
    stingerGain: 0.7,
    heartbeatGain: 0.3,
    maxDistance: 30,
    refDistance: 3,
    rolloff: 1.2,
  },

  // ===== WORLD =====
  world: {
    wallHeight: 3.5,
    wallThickness: 0.2,
    floorThickness: 0.15,
    ceilingThickness: 0.1,
    roomGridSize: 6,
    doorWidth: 1.1,
    doorHeight: 2.3,
    ambientLight: 0x1a1a22,
    ambientIntensity: 0.08,
    ambientColor: 0x222230,
  },

  // ===== POST-PROCESSING =====
  post: {
    vignetteBase: 0.35,
    vignetteMax: 0.75,
    grainBase: 0.06,
    grainMax: 0.16,
    chromaticBase: 0.0008,
    chromaticMax: 0.004,
    desaturateBase: 0.0,
    desaturateMax: 0.6,
    shakeBase: 0,
    shakeMax: 0.015,
  },

  // ===== JUMPSCARE =====
  jumpscare: {
    enabled: false, // Set to true to re-enable jumpscares
    flashDuration: 0.12,
    faceDuration: 1.2,
    screenShakeIntensity: 0.04,
    screenShakeDuration: 0.6,
    recoveryTime: 1.5,
    entityTeleportDist: 2.5,
  },

  // ===== GAME STATE =====
  game: {
    checkpointAct: 1,
    maxDeathMessages: 12,
    autoSaveInterval: 30,
    endingRitualItemsRequired: 5,
  },

  // ===== SAVE KEY =====
  saveKey: 'ashgrove_save_v1',
  settingsKey: 'ashgrove_settings_v1',
};
