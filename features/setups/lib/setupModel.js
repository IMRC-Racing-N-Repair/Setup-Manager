import { CHASSIS_PROFILES, getChassisProfileById, matchChassisProfile } from './setupChassisProfiles';
export { CHASSIS_PROFILES, CHASSIS_PROFILE_ORDER } from './setupChassisProfiles';

export const SETUP_TABS = [
  'Gearing',
  'Tires',
  'Suspension',
  'Geometry',
  'Corner Weights',
  'Results',
  'History',
];

export const SETUP_ROUNDS = [
  'Practice',
  'Heat 1',
  'Heat 2',
  'Heat 3',
  'Qual 1',
  'Qual 2',
  'Qual 3',
  'Main A',
  'Main B',
  'Main C',
];

export const CORNERS = ['LF', 'RF', 'LR', 'RR'];
export const FRONT_CORNERS = ['LF', 'RF'];

function firstText(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim()) || '';
}

export function getVehicleChassisText(vehicle = {}, setup = {}) {
  return [
    setup?.vehicleChassisStyle,
    setup?.chassisStyle,
    setup?.chassisProfile?.label,
    vehicle?.chassisStyle,
    vehicle?.chassis,
    vehicle?.style,
    vehicle?.vehicleStyle,
    vehicle?.vehicleType,
    vehicle?.type,
    vehicle?.class,
    vehicle?.className,
    vehicle?.vehicleClass,
    vehicle?.manufacturer,
    vehicle?.model,
    vehicle?.name,
    vehicle?.vehicleName,
    setup?.vehicleName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function detectVehicleChassisProfile(vehicle = {}, setup = {}) {
  const directId = firstText(setup?.chassisProfileId, setup?.chassisProfile?.id, vehicle?.chassisProfileId, vehicle?.setupProfileId);
  const directProfile = getChassisProfileById(directId);
  const matchedProfile = matchChassisProfile(getVehicleChassisText(vehicle, setup));

  // Repair older setups that were saved with a generic or conflicting profile
  // even though their vehicle/chassis text clearly identifies a Pan-Car.
  if (matchedProfile?.id === 'panCar' && directProfile?.id !== 'panCar') return matchedProfile;
  if (directProfile) return directProfile;
  return matchedProfile;
}


export function getSetupChassisProfile(setup = {}) {
  return detectVehicleChassisProfile({}, setup);
}

export function getVehicleChassisStyleLabel(vehicle = {}) {
  return firstText(vehicle?.chassisStyle, vehicle?.chassis, vehicle?.vehicleStyle, vehicle?.vehicleType, vehicle?.type, vehicle?.className, vehicle?.class, '');
}

export function createEmptyCornerMap(value = '') {
  return CORNERS.reduce((acc, corner) => {
    acc[corner] = value;
    return acc;
  }, {});
}

export function createNestedCornerMap(keys) {
  return CORNERS.reduce((acc, corner) => {
    acc[corner] = keys.reduce((inner, key) => {
      inner[key] = '';
      return inner;
    }, {});
    return acc;
  }, {});
}

export function getEntityId(item) {
  if (!item) return '';
  return String(
    item.id ||
      item.vehicleId ||
      item.trackId ||
      item.key ||
      item.uuid ||
      item.name ||
      item.vehicleName ||
      item.trackName ||
      ''
  );
}

export function getVehicleDisplayName(vehicle) {
  if (!vehicle) return 'Unknown Vehicle';
  return (
    vehicle.name ||
    vehicle.vehicleName ||
    vehicle.title ||
    [vehicle.manufacturer, vehicle.model].filter(Boolean).join(' ') ||
    'Unnamed Vehicle'
  );
}

export function getTrackDisplayName(track) {
  if (!track) return 'Unknown Track';
  return track.name || track.trackName || track.title || track.locationName || 'Unnamed Track';
}

export function makeSetupId() {
  return `setup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeSetupKey(vehicleId, trackId) {
  return `${String(vehicleId || '').trim()}__${String(trackId || '').trim()}`;
}

export function createDefaultSetup({ vehicle, track, vehicleId, trackId }) {
  const now = new Date().toISOString();
  const resolvedVehicleId = String(vehicleId || getEntityId(vehicle));
  const resolvedTrackId = String(trackId || getEntityId(track));

  return {
    id: makeSetupId(),
    vehicleId: resolvedVehicleId,
    trackId: resolvedTrackId,
    vehicleName: getVehicleDisplayName(vehicle),
    trackName: getTrackDisplayName(track),
    vehicleChassisStyle: getVehicleChassisStyleLabel(vehicle),
    chassisProfile: detectVehicleChassisProfile(vehicle),
    createdAt: now,
    updatedAt: now,
    savedAt: null,
    readOnly: false,
    runLine: track?.runLine || track?.raceLine || track?.line || track?.preferredLine || '',
    chassis: {
      batteryPosition: '',
      motorPosition: '',
      ballast: '',
      notes: '',
    },
    electronics: {
      batteryOrientation: '',
      batteryWeight: '',
      escPosition: '',
      receiverPosition: '',
      servoPosition: '',
      servoMountPosition: '',
      servoMountAngle: '',
      transponderPosition: '',
      fanPosition: '',
      notes: '',
    },
    drivetrain: {
      transmission: '',
      slipper: '',
      slipperPads: '',
      rearHubPosition: '',
      diffType: '',
      diffSetting: '',
      diffFluid: '',
      diffHeight: '',
      internalGears: '',
      planetGears: '',
      frontDiffType: '',
      frontDiffSetting: '',
      frontDiffFluid: '',
      centerDiffType: '',
      centerDiffSetting: '',
      centerDiffFluid: '',
      rearDiffType: '',
      rearDiffSetting: '',
      rearDiffFluid: '',
      rearDiffHeight: '',
      rearDiffGears: '',
      notes: '',
    },
    gearing: {
      spur: '',
      pinion: '',
      tireDiameter: '',
      transmissionRatio: '',
      rollout: '',
      targetRollout: '',
      notes: '',
    },
    tires: {
      LF: '',
      RF: '',
      LR: '',
      RR: '',
      compound: createEmptyCornerMap(),
      size: createEmptyCornerMap(),
      camberCut: createEmptyCornerMap(),
      notes: '',
    },
    suspension: {
      springs: createEmptyCornerMap(),
      springPreload: createEmptyCornerMap(),
      springLength: createEmptyCornerMap(),
      outsideShockPosition: createEmptyCornerMap(),
      axleShims: createEmptyCornerMap(),
      centerSpring: '',
      centerSpringPreload: '',
      centerShockLength: '',
      oil: createEmptyCornerMap(),
      centerOil: '',
      damper: createEmptyCornerMap(),
      centerDamper: '',
      shockPosition: createNestedCornerMap(['top', 'bottom']),
      centerShockPosition: {
        front: '',
        rear: '',
        frontChassisPosition: '',
        frontTowerPosition: '',
        rearShims: '',
      },
      rideHeight: createEmptyCornerMap(),
      podHeight: '',
      droop: createEmptyCornerMap(),
      podDroop: '',
      wheelHubKingpinPosition: createNestedCornerMap(['top', 'bottom']),
      notes: '',
    },
    geometry: {
      camber: createEmptyCornerMap(),
      toe: createEmptyCornerMap(),
      caster: {
        LF: '',
        RF: '',
      },
      casterBlockSpacing: createEmptyCornerMap(),
      frontToe: '',
      ackermanAngle: '',
      frontRollCenter: '',
      frontSwayBar: '',
      rearToe: '',
      rearToeBlock: '',
      rearAxleHeight: '',
      antiSquat: '',
      rearRollCenter: '',
      rearSwayBar: '',
      rearSteer: '',
      tPlateRollCenterShim: '',
      tweak: '',
      armLocation: createNestedCornerMap(['upper', 'lower']),
      shockMount: createNestedCornerMap(['upper', 'lower']),
      notes: '',
    },
    cornerWeights: {
      unit: 'grams',
      LF: '',
      RF: '',
      LR: '',
      RR: '',
      totalWeight: '',
      crossWeight: '',
      leftBias: '',
      rightBias: '',
      frontBias: '',
      rearBias: '',
      notes: '',
    },
    results: {
      round: 'Practice',
      fastLap: '',
      avgLap: '',
      totalLaps: '',
      totalTime: '',
      motorTempF: '',
      notes: '',
    },
  };
}

export function normalizeSetup(setup, context = {}) {
  const base = createDefaultSetup(context);
  const chassisProfile = detectVehicleChassisProfile(context.vehicle, setup || base);
  const merged = {
    ...base,
    ...(setup || {}),
    vehicleChassisStyle: setup?.vehicleChassisStyle || base.vehicleChassisStyle,
    chassisProfile,
    chassis: { ...base.chassis, ...(setup?.chassis || {}) },
    electronics: { ...base.electronics, ...(setup?.electronics || {}) },
    drivetrain: { ...base.drivetrain, ...(setup?.drivetrain || {}) },
    gearing: { ...base.gearing, ...(setup?.gearing || {}) },
    tires: {
      ...base.tires,
      ...(setup?.tires || {}),
      compound: { ...base.tires.compound, ...(setup?.tires?.compound || {}) },
      size: { ...base.tires.size, ...(setup?.tires?.size || {}) },
      camberCut: { ...base.tires.camberCut, ...(setup?.tires?.camberCut || {}) },
    },
    suspension: {
      ...base.suspension,
      ...(setup?.suspension || {}),
      springs: { ...base.suspension.springs, ...(setup?.suspension?.springs || {}) },
      springPreload: { ...base.suspension.springPreload, ...(setup?.suspension?.springPreload || {}) },
      springLength: { ...base.suspension.springLength, ...(setup?.suspension?.springLength || {}) },
      outsideShockPosition: { ...base.suspension.outsideShockPosition, ...(setup?.suspension?.outsideShockPosition || {}) },
      axleShims: { ...base.suspension.axleShims, ...(setup?.suspension?.axleShims || {}) },
      oil: { ...base.suspension.oil, ...(setup?.suspension?.oil || {}) },
      damper: { ...base.suspension.damper, ...(setup?.suspension?.damper || {}) },
      shockPosition: mergeNestedCorners(base.suspension.shockPosition, setup?.suspension?.shockPosition),
      centerShockPosition: {
        ...base.suspension.centerShockPosition,
        ...(setup?.suspension?.centerShockPosition || {}),
      },
      rideHeight: { ...base.suspension.rideHeight, ...(setup?.suspension?.rideHeight || {}) },
      droop: { ...base.suspension.droop, ...(setup?.suspension?.droop || {}) },
      wheelHubKingpinPosition: mergeNestedCorners(
        base.suspension.wheelHubKingpinPosition,
        setup?.suspension?.wheelHubKingpinPosition
      ),
    },
    geometry: {
      ...base.geometry,
      ...(setup?.geometry || {}),
      camber: { ...base.geometry.camber, ...(setup?.geometry?.camber || {}) },
      toe: { ...base.geometry.toe, ...(setup?.geometry?.toe || {}) },
      caster: { ...base.geometry.caster, ...(setup?.geometry?.caster || {}) },
      casterBlockSpacing: { ...base.geometry.casterBlockSpacing, ...(setup?.geometry?.casterBlockSpacing || {}) },
      armLocation: mergeNestedCorners(base.geometry.armLocation, setup?.geometry?.armLocation),
      shockMount: mergeNestedCorners(base.geometry.shockMount, setup?.geometry?.shockMount),
    },
    cornerWeights: { ...base.cornerWeights, ...(setup?.cornerWeights || {}) },
    results: { ...base.results, ...(setup?.results || {}) },
  };

  // Backward compatibility for older setup drafts that stored electronics under chassis.
  merged.electronics.escPosition = merged.electronics.escPosition || setup?.chassis?.escPosition || '';
  merged.electronics.receiverPosition = merged.electronics.receiverPosition || setup?.chassis?.receiverPosition || '';

  // Backward compatibility for older setup drafts that used one generic diff field.
  merged.drivetrain.rearDiffSetting = merged.drivetrain.rearDiffSetting || setup?.drivetrain?.diffSetting || '';
  merged.drivetrain.rearDiffFluid = merged.drivetrain.rearDiffFluid || setup?.drivetrain?.diffFluid || '';

  merged.runLine = merged.runLine || context.track?.runLine || context.track?.raceLine || context.track?.line || context.track?.preferredLine || '';
  merged.vehicleId = String(merged.vehicleId || context.vehicleId || getEntityId(context.vehicle));
  merged.trackId = String(merged.trackId || context.trackId || getEntityId(context.track));
  merged.vehicleName = merged.vehicleName || getVehicleDisplayName(context.vehicle);
  merged.trackName = merged.trackName || getTrackDisplayName(context.track);
  merged.vehicleChassisStyle = merged.vehicleChassisStyle || getVehicleChassisStyleLabel(context.vehicle);
  merged.chassisProfile = detectVehicleChassisProfile(context.vehicle, merged);

  return merged;
}

function mergeNestedCorners(base, incoming = {}) {
  return CORNERS.reduce((acc, corner) => {
    acc[corner] = {
      ...(base?.[corner] || {}),
      ...(incoming?.[corner] || {}),
    };
    return acc;
  }, {});
}
