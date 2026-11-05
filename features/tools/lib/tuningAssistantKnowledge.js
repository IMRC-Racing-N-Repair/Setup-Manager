// Vehicle choices and complete adjustment indexes for the manual Tuning Assistant.
// Results come from the selected discipline, car, turn section, and handling feel.

export const CAR_OPTIONS = [
  { label: 'Pan Car / Formula', value: 'pan_formula' },
  { label: 'Touring Car', value: 'touring' },
  { label: 'Losi NASCAR', value: 'losi_nascar' },
  { label: '2WD Buggy / Truck', value: 'offroad_2wd' },
  { label: '4WD Buggy / Truggy', value: 'offroad_4wd' },
  { label: '2WD SCT', value: 'sct_2wd' },
  { label: '4WD SCT', value: 'sct_4wd' },
];

export const RACING_STYLE_OPTIONS = [
  { label: 'Oval', value: 'oval' },
  { label: 'On-Road', value: 'onroad' },
  { label: 'Off-Road', value: 'offroad' },
];

// Every car can be evaluated for every racing style. The profile id keeps both
// selections so the answer can combine chassis-specific and style-specific data.
export const STYLE_OPTIONS_BY_CAR = CAR_OPTIONS.reduce((result, car) => {
  result[car.value] = RACING_STYLE_OPTIONS.map((style) => ({
    ...style,
    value: `${car.value}_${style.value}`,
  }));
  return result;
}, {});

export const ADJUSTMENT_GROUP_ORDER = [
  'Tires & Track',
  'Steering & Front Geometry',
  'Suspension & Roll',
  'Rear / Pod Geometry',
  'Drivetrain & Power',
  'Weight, Flex & Aero',
];

export const ADJUSTMENT_CATALOG = {
  tires: {
    group: 'Tires & Track',
    label: 'Tires / Compound',
    aliases: ['tire', 'tires', 'compound', 'rubber', 'foam'],
    summary: 'The largest grip change. Match compound and construction to surface, temperature, and run length before chasing chassis settings.',
  },
  inserts: {
    group: 'Tires & Track',
    label: 'Tire Inserts',
    aliases: ['insert', 'inserts'],
    summary: 'Changes carcass support and response. Firmer inserts sharpen response and support high grip; softer inserts add compliance but can roll over.',
  },
  tirePrep: {
    group: 'Tires & Track',
    label: 'Tire Prep / Sauce / Temperature',
    aliases: ['sauce', 'additive', 'tire prep', 'warmers', 'tire temperature', 'tire temp'],
    summary: 'Changes available front or rear grip and how quickly it arrives. Keep application legal, repeatable, and balanced with measured tire temperatures.',
  },
  foamDiameter: {
    group: 'Tires & Track',
    label: 'Foam Diameter / Cut',
    aliases: ['foam diameter', 'tire diameter', 'cut tire', 'tire size'],
    summary: 'Changes ride height, rollout, sidewall support, and balance. Recheck ride height and rollout every time foam diameter changes.',
  },
  stagger: {
    group: 'Tires & Track',
    label: 'Rear Stagger',
    aliases: ['stagger', 'rear stagger'],
    summary: 'Oval-only left/right rear diameter difference that strongly changes rotation and drive. Small changes affect center and exit together.',
  },
  frontToe: {
    group: 'Steering & Front Geometry',
    label: 'Front Toe',
    aliases: ['front toe', 'toe out', 'toe-out', 'toe in', 'toe-in'],
    summary: 'Toe-out generally quickens turn-in; toe-in calms response and adds stability. Excess toe scrubs speed and overheats tires.',
  },
  rearToe: {
    group: 'Rear / Pod Geometry',
    label: 'Rear Toe-In',
    aliases: ['rear toe', 'rear toe in', 'rear toe-in'],
    summary: 'More rear toe-in adds braking and on-power stability but increases understeer and drag. Less frees rotation but reduces rear security.',
  },
  camber: {
    group: 'Steering & Front Geometry',
    label: 'Camber',
    aliases: ['camber', 'negative camber'],
    summary: 'Controls the tire contact patch while the chassis rolls. Set it from tire wear and temperatures; too much loses braking and drive contact.',
  },
  caster: {
    group: 'Steering & Front Geometry',
    label: 'Caster',
    aliases: ['caster', 'caster block'],
    summary: 'Changes initial versus progressive steering and straight-line stability. It also changes dynamic camber, so camber must be rechecked.',
  },
  ackermann: {
    group: 'Steering & Front Geometry',
    label: 'Ackermann',
    aliases: ['ackermann', 'steering plate', 'steering rack shim'],
    summary: 'Changes the inside-to-outside steering-angle relationship and where steering builds through the corner. It affects entry, center, and tire scrub.',
  },
  bumpSteer: {
    group: 'Steering & Front Geometry',
    label: 'Bump Steer',
    aliases: ['bump steer', 'bumpsteer', 'steering link shim'],
    summary: 'Changes toe as suspension moves. Near-zero is the consistent baseline; deliberate bump steer can tune mid-corner response but may become nervous.',
  },
  steeringLock: {
    group: 'Steering & Front Geometry',
    label: 'Steering Lock / EPA / Rate',
    aliases: ['steering lock', 'steering rate', 'dual rate', 'epa', 'end point', 'endpoint'],
    summary: 'Limits available steering and response. Too little hides chassis steering; too much scrubs the front tires and can make the car snap.',
  },
  steeringExpo: {
    group: 'Steering & Front Geometry',
    label: 'Steering Expo / Speed',
    aliases: ['steering expo', 'expo', 'steering speed'],
    summary: 'Changes how quickly driver input reaches the tires without changing mechanical grip. Use it to make the car easier to place, not to hide a bad setup.',
  },
  servoSaver: {
    group: 'Steering & Front Geometry',
    label: 'Servo Saver',
    aliases: ['servo saver', 'saver spring'],
    summary: 'Tighter settings increase response but transmit more impact to the servo; looser settings calm response and can feel vague.',
  },
  frontOffset: {
    group: 'Steering & Front Geometry',
    label: 'Front Wheel Offset / Width',
    aliases: ['front offset', 'front wheel offset', 'front width'],
    summary: 'Changes front track width, response, and leverage. Recheck body clearance, scrub, and total legal width after adjustment.',
  },
  frontWheelbase: {
    group: 'Steering & Front Geometry',
    label: 'Front Wheelbase',
    aliases: ['front wheelbase', 'front axle position'],
    summary: 'Changes weight distribution and steering timing on Pan-Cars. Small spacer changes can alter entry response and stability.',
  },
  frontSprings: {
    group: 'Suspension & Roll',
    label: 'Front Springs / Kingpin Springs',
    aliases: ['front spring', 'front springs', 'kingpin spring', 'kingpin springs'],
    summary: 'Softer normally adds front compliance and grip; stiffer sharpens response and reduces roll. Match spring rate to damping and available travel.',
  },
  springs: {
    group: 'Suspension & Roll',
    label: 'Front / Rear Springs',
    aliases: ['spring', 'springs', 'spring rate'],
    summary: 'Softer increases roll and mechanical grip; stiffer reduces grip at that end and sharpens response. Balance front against rear.',
  },
  shockOil: {
    group: 'Suspension & Roll',
    label: 'Shock Oil / Damping',
    aliases: ['shock oil', 'damper oil', 'damping', 'dampening'],
    summary: 'Controls the speed of weight transfer, not static load. Thicker slows movement; thinner lets the chassis take a set faster.',
  },
  pistons: {
    group: 'Suspension & Roll',
    label: 'Shock Pistons / Pack',
    aliases: ['piston', 'pistons', 'shock pack', 'pack'],
    summary: 'Hole count and diameter change high-speed versus low-speed damping. More restriction adds pack; less improves compliance on rough sections.',
  },
  shockPosition: {
    group: 'Suspension & Roll',
    label: 'Shock Mounting Position',
    aliases: ['shock position', 'shock angle', 'shock hole', 'damper position'],
    summary: 'Changes motion ratio, progression, response, and side grip. Move one end at a time and confirm the shock still has full travel.',
  },
  droop: {
    group: 'Suspension & Roll',
    label: 'Droop / Downstops',
    aliases: ['droop', 'downstop', 'downstops', 'down travel'],
    summary: 'Controls how much weight transfers during braking and acceleration. More travel adds transfer and rough-track compliance; less adds stability.',
  },
  rideHeight: {
    group: 'Suspension & Roll',
    label: 'Ride Height / Rake',
    aliases: ['ride height', 'rake', 'chassis height'],
    summary: 'Changes center of gravity, roll, chassis contact, and front/rear weight transfer. Reset after tire-diameter or spring-preload changes.',
  },
  antiRollBars: {
    group: 'Suspension & Roll',
    label: 'Anti-Roll Bars',
    aliases: ['anti roll bar', 'anti-roll bar', 'sway bar', 'roll bar'],
    summary: 'A stiffer bar reduces grip at that end. Front bar mainly changes entry; rear bar strongly changes center and exit balance.',
  },
  rollCenters: {
    group: 'Suspension & Roll',
    label: 'Front / Rear Roll Centers',
    aliases: ['roll center', 'roll centre', 'roll centers', 'roll centres'],
    summary: 'Changes immediate response, chassis roll, and how grip builds. Lower often adds mechanical grip; direction and mounting method remain chassis-specific.',
  },
  camberLinks: {
    group: 'Suspension & Roll',
    label: 'Camber-Link Length / Height',
    aliases: ['camber link', 'upper link', 'link length', 'link height'],
    summary: 'Changes roll center and camber gain. Shorter links react faster and gain more camber; longer links calm response and improve consistency.',
  },
  chassisFlex: {
    group: 'Weight, Flex & Aero',
    label: 'Chassis / Brace Flex',
    aliases: ['chassis flex', 'flex', 'brace', 'stiffener'],
    summary: 'Softer flex usually adds mechanical grip and forgiveness; stiffer flex sharpens response and supports high-grip conditions.',
  },
  trackWidth: {
    group: 'Suspension & Roll',
    label: 'Track Width',
    aliases: ['track width', 'track-width', 'width'],
    summary: 'Changes load transfer, stability, response, and legal overall width. Front and rear changes do not produce identical effects.',
  },
  wheelbase: {
    group: 'Rear / Pod Geometry',
    label: 'Wheelbase / Rear Hub Position',
    aliases: ['wheelbase', 'hub position', 'rear hub position'],
    summary: 'Shorter wheelbase rotates faster and can add rearward transfer; longer wheelbase is calmer, more stable, and often improves exit steering.',
  },
  antiSquat: {
    group: 'Rear / Pod Geometry',
    label: 'Rear Anti-Squat',
    aliases: ['anti squat', 'anti-squat'],
    summary: 'Controls how acceleration load reaches the rear suspension. More can add smooth-track drive; less is usually more compliant on bumps.',
  },
  antiDive: {
    group: 'Steering & Front Geometry',
    label: 'Front Anti-Dive / Pro-Dive',
    aliases: ['anti dive', 'anti-dive', 'pro dive', 'pro-dive'],
    summary: 'Changes front suspension movement under braking and therefore entry steering, stability, and how quickly the nose takes a set.',
  },
  kickUp: {
    group: 'Steering & Front Geometry',
    label: 'Front Kick-Up / Arm Sweep',
    aliases: ['kick up', 'kick-up', 'arm sweep', 'front sweep'],
    summary: 'Changes total caster, braking weight transfer, bump behavior, and entry response. Recheck caster and ride height after changing it.',
  },
  rearArmLength: {
    group: 'Rear / Pod Geometry',
    label: 'Rear Arm Length',
    aliases: ['rear arm', 'rear arm length'],
    summary: 'Shorter settings rotate faster; longer settings are calmer and more stable, with different behavior over bumps.',
  },
  sideSprings: {
    group: 'Rear / Pod Geometry',
    label: 'Side Springs',
    aliases: ['side spring', 'side springs'],
    summary: 'Controls Pan-Car roll support and left/right balance. Stiffer support sharpens response; softer support adds grip and compliance.',
  },
  sideDampers: {
    group: 'Rear / Pod Geometry',
    label: 'Side Tubes / Side Dampers',
    aliases: ['side tube', 'side tubes', 'side damper', 'side shock', 'tube lube'],
    summary: 'Controls the speed of pod roll. More damping slows weight transfer and adds support; less lets the rear take a set faster.',
  },
  centerSpring: {
    group: 'Rear / Pod Geometry',
    label: 'Center / Rear Pod Spring',
    aliases: ['center spring', 'centre spring', 'pod spring', 'rear spring'],
    summary: 'Controls rear pod support and pitch. It changes center balance, forward traction, and how quickly the car transitions to power.',
  },
  centerShock: {
    group: 'Rear / Pod Geometry',
    label: 'Center Shock / Pod Damping',
    aliases: ['center shock', 'centre shock', 'pod damping', 'pod damper'],
    summary: 'Controls Pan-Car pod pitch speed, bump handling, and exit support. Preload also changes ride attitude and available travel.',
  },
  podPivot: {
    group: 'Rear / Pod Geometry',
    label: 'Pod Pivot Position / Roll Center',
    aliases: ['pod pivot', 'center pivot', 'centre pivot', 'pod roll center', 'pod roll centre'],
    summary: 'Changes rear geometry, roll center, forgiveness, and rotation. A rearward pivot is commonly more aggressive; forward is more stable.',
  },
  podDroop: {
    group: 'Rear / Pod Geometry',
    label: 'Pod Droop / Pod Angle',
    aliases: ['pod droop', 'pod angle', 'rear pod angle'],
    summary: 'Changes rear suspension travel and attitude under power and bumps. Keep side links aligned and verify full, bind-free movement.',
  },
  podWeight: {
    group: 'Weight, Flex & Aero',
    label: 'Pod Weight Balance',
    aliases: ['pod weight', 'pod balance', 'left pod weight', 'right pod weight'],
    summary: 'Changes left/right rear loading and traction. Use scales and keep motor, axle, and electronics changes from accidentally introducing tweak.',
  },
  tweakCross: {
    group: 'Weight, Flex & Aero',
    label: 'Tweak / Cross Weight',
    aliases: ['tweak', 'cross weight', 'crossweight', 'corner weight'],
    summary: 'Changes diagonal tire loading. It is a primary oval tool but should remain a measured baseline on road-course cars rather than a hidden steering fix.',
  },
  rearTrack: {
    group: 'Rear / Pod Geometry',
    label: 'Rear Track Width',
    aliases: ['rear track', 'rear track width', 'rear width', 'rear hub width'],
    summary: 'Changes rear stability, rotation, leverage, and overall legal width. Recheck axle shims and wheel clearance after adjustment.',
  },
  rearAxleHeight: {
    group: 'Rear / Pod Geometry',
    label: 'Rear Axle Height',
    aliases: ['rear axle height', 'axle height', 'ride height eccentric'],
    summary: 'Sets rear ride height and changes axle/pod relationship. Recheck chassis rake, pod droop, and tire clearance.',
  },
  sideLinks: {
    group: 'Rear / Pod Geometry',
    label: 'Side Links / T-Plate',
    aliases: ['side link', 'side links', 't plate', 't-plate', 't plate screw', 'pod screw'],
    summary: 'Controls lateral pod location, bind, roll stiffness, and rear steer. Keep links aligned with the chosen pivot and confirm free movement.',
  },
  frontDiff: {
    group: 'Drivetrain & Power',
    label: 'Front Differential / Spool',
    aliases: ['front diff', 'front differential', 'spool'],
    summary: 'Front diff action changes off-power steering, on-power pull, and stability. A spool is direct and precise; a differential is more forgiving.',
  },
  centerDiff: {
    group: 'Drivetrain & Power',
    label: 'Center Differential',
    aliases: ['center diff', 'centre diff', 'center differential', 'centre differential'],
    summary: 'Controls front-to-rear drive. Thicker usually sends more drive rearward and adds on-power rotation; thinner feeds the front and suits rougher tracks.',
  },
  rearDiff: {
    group: 'Drivetrain & Power',
    label: 'Rear Differential',
    aliases: ['rear diff', 'rear differential', 'ball diff', 'gear diff'],
    summary: 'Changes corner rotation, rear traction, wheelspin, and power delivery. Build consistency matters as much as oil or adjustment value.',
  },
  solidBallDiff: {
    group: 'Drivetrain & Power',
    label: 'Solid Axle vs Ball Differential',
    aliases: ['solid axle', 'ball differential', 'ball diff', 'locked axle'],
    summary: 'A solid axle is direct and predictable on higher grip; a ball differential can add forgiveness and traction on lower grip.',
  },
  diffHeight: {
    group: 'Drivetrain & Power',
    label: 'Differential / Spool Height',
    aliases: ['diff height', 'differential height', 'spool height'],
    summary: 'Changes driveshaft angle, roll behavior, and surface response. Use the chassis maker’s carpet/asphalt baseline before fine tuning.',
  },
  slipper: {
    group: 'Drivetrain & Power',
    label: 'Slipper Clutch',
    aliases: ['slipper', 'slipper clutch'],
    summary: 'Controls the first hit of power to the rear tires. Looser smooths drive but can overheat; tighter is direct but may create wheelspin.',
  },
  brakes: {
    group: 'Drivetrain & Power',
    label: 'Brake / Drag Brake',
    aliases: ['brake', 'brakes', 'drag brake', 'brake balance'],
    summary: 'Changes entry weight transfer and rear stability. Excess brake can look like entry oversteer; too little can look like entry push.',
  },
  throttle: {
    group: 'Drivetrain & Power',
    label: 'Throttle Curve / Punch / Boost',
    aliases: ['throttle', 'punch', 'boost', 'turbo', 'throttle curve'],
    summary: 'Changes how available grip is used on exit. Smooth delivery should be established before sacrificing mechanical steering or rear grip.',
  },
  gearing: {
    group: 'Drivetrain & Power',
    label: 'Gearing / Rollout',
    aliases: ['gear', 'gearing', 'rollout', 'pinion', 'spur'],
    summary: 'Changes acceleration, motor temperature, braking feel, and how abruptly torque reaches the tires. Recheck temperatures after every ratio change.',
  },
  beltTension: {
    group: 'Drivetrain & Power',
    label: 'Belt Tension / Drivetrain Drag',
    aliases: ['belt', 'belt tension', 'drivetrain drag', 'free drivetrain'],
    summary: 'Too tight adds drag and heat; too loose can skip. Equal, free drivetrain behavior is required before differential or handling changes mean anything.',
  },
  weightBalance: {
    group: 'Weight, Flex & Aero',
    label: 'Battery / Ballast / Weight Balance',
    aliases: ['battery position', 'ballast', 'weight balance', 'weight distribution', 'weight forward', 'weight rearward'],
    summary: 'Forward/rearward and left/right weight placement changes rotation, stability, traction, and jump attitude. Recheck scales after moving equipment.',
  },
  servoPosition: {
    group: 'Weight, Flex & Aero',
    label: 'Servo Position / Mount Flex',
    aliases: ['servo position', 'servo mount', 'floating servo'],
    summary: 'Changes front weight and local chassis flex. Floating mounts can add forgiveness; fixed mounts may sharpen response.',
  },
  ars: {
    group: 'Rear / Pod Geometry',
    label: 'Active Rear Suspension / Rear Steer',
    aliases: ['ars', 'active rear suspension', 'rear steer'],
    summary: 'Changes rear toe dynamically through suspension travel. It can tune rotation and exit stability but must be set symmetrically.',
  },
  bodyAero: {
    group: 'Weight, Flex & Aero',
    label: 'Body / Wing / Aero Balance',
    aliases: ['body', 'wing', 'aero', 'downforce', 'body position', 'wing position'],
    summary: 'Changes high-speed front/rear grip and stability. Body rub or chassis contact must be eliminated before treating it as an aero balance problem.',
  },
  frontWing: {
    group: 'Weight, Flex & Aero',
    label: 'Front Wing / Front Aero',
    aliases: ['front wing', 'front aero', 'front downforce'],
    summary: 'More front wing or a more aggressive front element adds high-speed steering, but too much can make entry nervous and overload the front tires.',
  },
  rearWing: {
    group: 'Weight, Flex & Aero',
    label: 'Rear Wing Angle / Height',
    aliases: ['rear wing', 'wing angle', 'wing height', 'rear aero', 'rear downforce'],
    summary: 'More rear wing angle or rear downforce adds high-speed rear security and drag. Less frees rotation but can make the car loose in fast corners.',
  },
  podAngle: {
    group: 'Rear / Pod Geometry',
    label: 'Rear Pod Angle',
    aliases: ['pod angle', 'rear pod angle'],
    summary: 'Fine-tunes how the rear pod sits and works through travel. Change it in small steps, then recheck ride height, droop, and tweak.',
  },
};

const COMMON_INDEPENDENT = [
  'tires', 'inserts', 'camber', 'frontToe', 'caster', 'ackermann', 'bumpSteer',
  'steeringLock', 'steeringExpo', 'servoSaver', 'springs', 'shockOil', 'pistons',
  'shockPosition', 'droop', 'rideHeight', 'antiRollBars', 'rollCenters', 'camberLinks',
  'trackWidth', 'wheelbase', 'brakes', 'throttle', 'gearing', 'weightBalance', 'bodyAero',
];

const COMMON_PAN = [
  'tires', 'foamDiameter', 'frontToe', 'camber', 'caster', 'ackermann', 'bumpSteer',
  'steeringLock', 'steeringExpo', 'frontOffset', 'frontWheelbase', 'frontSprings',
  'rideHeight', 'rearAxleHeight', 'sideSprings', 'sideDampers', 'centerSpring',
  'centerShock', 'podPivot', 'podDroop', 'podWeight', 'sideLinks', 'rearTrack',
  'solidBallDiff', 'brakes', 'throttle', 'gearing', 'weightBalance', 'servoPosition',
  'chassisFlex', 'tweakCross', 'bodyAero',
];

const CAR_ADJUSTMENT_KEYS = {
  pan_formula: [
    ...COMMON_PAN, 'inserts', 'tirePrep', 'podAngle', 'frontWing', 'rearWing',
  ],
  touring: [
    ...COMMON_INDEPENDENT, 'tirePrep', 'antiDive', 'antiSquat', 'rearToe', 'frontDiff',
    'rearDiff', 'diffHeight', 'beltTension', 'chassisFlex', 'ars', 'servoPosition',
  ],
  offroad_2wd: [
    ...COMMON_INDEPENDENT, 'rearToe', 'antiSquat', 'kickUp', 'rearArmLength',
    'rearDiff', 'slipper', 'chassisFlex',
  ],
  offroad_4wd: [
    ...COMMON_INDEPENDENT, 'rearToe', 'antiSquat', 'kickUp', 'rearArmLength',
    'frontDiff', 'centerDiff', 'rearDiff', 'beltTension', 'chassisFlex',
  ],
  sct_2wd: [
    ...COMMON_INDEPENDENT, 'rearToe', 'antiSquat', 'kickUp', 'rearArmLength',
    'rearDiff', 'slipper', 'chassisFlex',
  ],
  sct_4wd: [
    ...COMMON_INDEPENDENT, 'rearToe', 'antiSquat', 'kickUp', 'rearArmLength',
    'frontDiff', 'centerDiff', 'rearDiff', 'beltTension', 'chassisFlex',
  ],
  losi_nascar: [
    'tires', 'camber', 'steeringLock', 'steeringExpo', 'springs', 'shockOil',
    'pistons', 'shockPosition', 'rideHeight', 'frontDiff', 'rearDiff', 'brakes',
    'throttle', 'gearing', 'bodyAero',
  ],
};

export const PROFILE_ADJUSTMENT_KEYS = CAR_OPTIONS.reduce((result, car) => {
  STYLE_OPTIONS_BY_CAR[car.value].forEach((style) => {
    result[style.value] = [...CAR_ADJUSTMENT_KEYS[car.value]];
  });
  return result;
}, {});

// Stagger is an asymmetric oval adjustment, not a general Pan/Formula setting.
PROFILE_ADJUSTMENT_KEYS.pan_formula_oval.push('stagger');

export function carForProfile(profileId) {
  for (const [carId, options] of Object.entries(STYLE_OPTIONS_BY_CAR)) {
    if (options.some((option) => option.value === profileId)) return carId;
  }
  return 'pan_formula';
}

export function classLabel(profileId) {
  for (const car of CAR_OPTIONS) {
    const style = STYLE_OPTIONS_BY_CAR[car.value]
      .find((option) => option.value === profileId);
    if (style) return `${car.label} • ${style.label}`;
  }
  return 'Pan Car / Formula • Oval';
}

export function adjustmentsForProfile(profileId) {
  const seen = new Set();
  return (PROFILE_ADJUSTMENT_KEYS[profileId] || PROFILE_ADJUSTMENT_KEYS.pan_formula_oval)
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((key) => ({ id: key, ...ADJUSTMENT_CATALOG[key] }))
    .filter((item) => item.label);
}
