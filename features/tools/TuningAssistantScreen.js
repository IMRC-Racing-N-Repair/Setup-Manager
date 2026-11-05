// features/tools/TuningAssistantScreen.js
// IMRC 3-Section Turn Solver
// Class-specific RC tuning help for entry, center, and exit.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaLayout } from '../../src/layout/safeAreaLayout';
import {
  Segmented,
  ToolCard,
  ToolScaffold,
  TOOL_CARD_2,
  TOOL_GREEN,
  TOOL_LINE,
  TOOL_MUTED,
  TOOL_TEXT,
  goBack,
} from './ToolShared';
import {
  ADJUSTMENT_GROUP_ORDER,
  CAR_OPTIONS,
  STYLE_OPTIONS_BY_CAR,
  adjustmentsForProfile,
  carForProfile,
  classLabel,
} from './lib/tuningAssistantKnowledge';

const STORAGE_KEY = '@imrcToolsTurnSolver_v2';
const LEGACY_STORAGE_KEY = '@imrcToolsTurnSolver_v1';

const DEFAULT_STATE = {
  carId: 'pan_formula',
  classStyle: 'pan_formula_oval',
  sectionId: 'in',
  feel: 'tight',
};

const SOURCES = {
  oval: {
    label: '[OVAL] Oval Pan Car Setup Guide',
    url: 'https://site.petitrc.com/reglages/OvalPanCarSetupGuide2007.pdf',
  },
  dirtOval: {
    label: '[CUSTOM WORKS] Dirt Oval Racing Kit Manual',
    url: 'https://www.customworksrc.com/aa_support/current%20models/0970/0970%20manual%20web.pdf',
  },
  tekno: {
    label: '[TEKNO] Tekno RC Set Up Guide',
    url: 'https://www.teknorc.com/wp-content/uploads/2014/06/Set_Up_Guide.pdf',
  },
  sct: {
    label: '[SCT] Tekno SCT Rear Hub Tuning Guide',
    url: 'https://www.teknorc.com/wp-content/uploads/2013/03/TKR6852X-instructions_new.pdf',
  },
  hudy: {
    label: '[HUDY] HUDY RC Car Set-up Book',
    url: 'https://www.hudy.net/xhudy/showfile.php?file_id=692',
  },
  x12: {
    label: '[XRAY X12] On-Road Pan-Car Adjustment Guide',
    url: 'https://teamxray.com/x12/2026/en/',
  },
  x4: {
    label: '[XRAY X4] Touring Car Adjustment Guide',
    url: 'https://teamxray.com/x4/2026/en/',
  },
  x1: {
    label: '[XRAY X1] Formula Car Adjustment Guide',
    url: 'https://teamxray.com/x1/2025/en/',
  },
  x12Manual: {
    label: '[XRAY X12] On-Road Pan-Car Manual',
    url: 'https://teamxray.com/downloads/10/x12_2021_manual_low.pdf',
  },
  xb2: {
    label: '[XRAY XB2] 2WD Off-Road Adjustment Guide',
    url: 'https://teamxray.com/xb2/2026/en/',
  },
  xb4: {
    label: '[XRAY XB4] 4WD Off-Road Adjustment Guide',
    url: 'https://teamxray.com/xb4/2026/en/',
  },
  xraySetups: {
    label: '[XRAY] Manufacturer Setup Sheets',
    url: 'https://setup.teamxray.com/',
  },
  sctCurrent: {
    label: '[TEKNO SCT410 2.0] Manual & Setup Sheets',
    url: 'https://www.teknorc.com/shop/tkr9500-sct410-2-0-1-10th-4x4-short-course-truck-kit/',
  },
  losiNascar: {
    label: '[LOSI NASCAR] Official Vehicle & Tuning Guide',
    url: 'https://www.losi.com/product/losi-1-12-nascar-rc-race-car-kyle-larson-no.-5-valvoline-2025-chevrolet-camaro-zl1-2s-awd-rtr-brushed-on-road-battery-and-charger-included/LOS1122505.html',
  },
  losiNascarManual: {
    label: '[LOSI NASCAR] Official Instruction Manual',
    url: 'https://www.losi.com/on/demandware.static/-/Sites-horizon-master/default/dw24408645/Manuals/LOS11226_MANUAL_EN.pdf',
  },
};

const TURN_SECTIONS = [
  {
    id: 'in',
    number: 1,
    label: 'IN',
    color: '#ff7a00',
  },
  {
    id: 'center',
    number: 2,
    label: 'CENTER',
    color: '#48b93c',
  },
  {
    id: 'out',
    number: 3,
    label: 'OUT',
    color: '#2295e7',
  },
];

function fix(changes, more, also, avoid) {
  return { changes, more, also, avoid };
}

const TUNING_DATA = {
  pan: {
    sources: ['oval', 'x12', 'x1', 'hudy'],
    in: {
      checks: [
        'Check tire condition, stagger, and left/right diameter.',
        'Check front kingpins, steering links, servo saver, pod, and side links for bind or slop.',
        'Recheck ride height, tweak, cross weight, and brake or drag-brake amount.',
      ],
      tight: fix(
        [
          'Move 5 g of existing ballast toward the LF; if no legal ballast can be moved, reduce cross weight 0.2–0.5 percentage point with the chassis tweak adjustment.',
          'Try the next-softer RF spring.',
          'Move the LF tire out a small amount.',
        ],
        [
          'Add a small amount of LF camber while watching the contact patch.',
          'Add a little toe-out or steering rate only if initial response is truly slow.',
          'Use slightly thicker RR shock oil if the rear rolls too quickly on entry.',
          'Reduce front-end trail one spacer position to quicken the first steering response; then recheck caster and camber.',
          'Increase steering speed or rate 3–5%; if using expo, move 3% toward more response around center after confirming the radio’s expo direction.',
        ],
        'LF load, RF spring, and steering response also affect center balance; too much entry steering can make center loose.',
        'Do not make a large steering or weight change before checking tweak and front-end freedom.'
      ),
      loose: fix(
        [
          'Decrease LR side-spring rate one adjacent step and leave the LR damper setting unchanged for this run.',
          'Try the next-stiffer RF spring.',
          'Remove a small amount of LF weight or move the LF tire in slightly.',
        ],
        [
          'Move both side-shock upper mounts up one hole if the car rolls too abruptly.',
          'Reduce excessive toe-out, steering rate, or aggressive expo.',
          'Reduce drag brake or soften initial brake response.',
          'Increase front-end trail one spacer position to calm the first steering response; then recheck caster and camber.',
          'Reduce RR shock pack if it hikes the rear too quickly.',
        ],
        'Calming entry steering protects the rear, but too much will create a push before center.',
        'Do not add so much rear security that the car stops rotating into the corner.'
      ),
    },
    center: {
      checks: [
        'Check tire temperatures and the front contact patch after a full run.',
        'Verify the center shock, side dampers, side links, and pod move freely.',
        'Recheck tweak, axle height, and chassis clearance at full roll.',
      ],
      tight: fix(
        [
          'Try the next-stiffer center spring.',
          'Try a slightly stiffer LF spring.',
          'Move the LR tire in a small amount.',
        ],
        [
          'Reduce center-tube damping one small step if the pod feels bound.',
          'Add 0.5° negative LF camber only when the tire’s outer edge is hotter or more worn; remove 0.5° when the inner edge is doing most of the work.',
          'Increase center-shock preload 1/4 turn only when the shock settles below the saved ride-height mark; otherwise leave preload unchanged.',
          'Widen front track 0.5 mm per side; if already at legal width, increase steering lock 3% instead.',
          'Decrease both rear side-spring rates one step; if already at the soft baseline, use the next lighter side-tube/damper lube instead.',
        ],
        'Center spring, side damping, and LR track width affect the whole loaded part of the corner, including exit.',
        'Do not make several pod and front-end changes together; the problem can move directly to exit.'
      ),
      loose: fix(
        [
          'Try the next-softer center spring.',
          'Add cross weight in a small step without exceeding the setup baseline.',
          'Try a slightly softer LF spring.',
        ],
        [
          'Increase center-shock preload 1/4 turn, then reset ride height and confirm the shock still has full up-travel.',
          'Increase center-tube damping one small step.',
          'Move the LR tire out slightly if more rear support is needed.',
          'Reduce excessive LF camber after checking tire wear.',
          'Increase both side-tube/damper resistances one adjacent lube or oil grade; keep left and right equal.',
        ],
        'Adding center support calms the apex, but it can also slow rotation and tighten exit.',
        'Do not hide a pod bind or damaged rear tire with a large cross-weight change.'
      ),
    },
    out: {
      checks: [
        'Check rear stagger, rear axle freedom, rear tires, and side-damper movement.',
        'Confirm the center shock has enough compression and up-travel.',
        'Check throttle delivery and make sure the steering is being unwound.',
      ],
      tight: fix(
        [
          'Remove a small amount of cross weight.',
          'Move the LR tire in slightly.',
          'Try the next-softer RR side spring.',
        ],
        [
          'Add the center pod / T-plate screw when the chassis supports it.',
          'Move the wing forward a small amount.',
          'Use slightly softer LR shock oil or side damping.',
          'Reduce excessive rear stagger.',
          'Move the battery rearward one marked slot for more rotation; if battery position is fixed, narrow rear track 0.5 mm per side instead.',
        ],
        'Freeing exit improves rotation, but reducing too much cross or rear support removes forward bite.',
        'Do not add steering when the rear pod or center shock is preventing rotation.'
      ),
      loose: fix(
        [
          'Move the RR tire out slightly.',
          'Try the next-stiffer RR side spring.',
          'Remove the center pod / T-plate screw when the chassis supports it.',
        ],
        [
          'Move the wing rearward a small amount.',
          'Move the RR side-shock mount down or the LR mount up one hole.',
          'Add a small amount of cross weight.',
          'Reduce rear stagger in a small step.',
          'If the rear starts sliding before throttle, increase both side dampers one lube/oil grade; if it starts with trigger input, reduce throttle punch 5% instead.',
        ],
        'RR support and cross weight add exit security, but too much can make center push and overheat the tires.',
        'Do not use a large cross-weight change before checking tires, stagger, and power delivery.'
      ),
    },
  },

  '2wd': {
    sources: ['tekno', 'xb2', 'xraySetups'],
    in: {
      checks: [
        'Check front and rear tires, inserts, and tire preparation for the surface.',
        'Check steering endpoints, servo saver, toe, and suspension for bind or crash damage.',
        'Recheck ride height, droop, and brake or drag-brake amount.',
      ],
      tight: fix(
        [
          'Add a small amount of front toe-out.',
          'Use less caster or a more aggressive Ackermann position.',
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
        ],
        [
          'Add front droop or reduce rear droop for more entry weight transfer.',
          'Use a shorter front camber link / more front camber gain.',
          'Lower the front roll center when the chassis allows it.',
          'Shorten the wheelbase slightly for quicker rotation.',
          'Move battery weight forward in a small step.',
          'Reduce front shock pack if the front will not take a set.',
        ],
        'Toe-out, caster, Ackermann, and front droop add entry response; too much makes center nervous or loose.',
        'Do not change rear toe first for a problem that begins before the chassis is fully set.'
      ),
      loose: fix(
        [
          'Reduce front toe-out or add a small amount of toe-in.',
          'Use more caster or a smoother Ackermann position.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
        ],
        [
          'Reduce rear droop to limit forward weight transfer under braking.',
          'Lengthen the front camber link for a calmer response.',
          'Lengthen the wheelbase for more stability.',
          'Add a small amount of rear toe-in.',
          'Move battery weight rearward slightly.',
          'Soften initial brake and steering expo.',
        ],
        'Caster, wheelbase, and rear toe calm entry, but also reduce rotation and can create exit push.',
        'Do not add rear toe to cover an over-braked or damaged car; it costs rotation and speed.'
      ),
    },
    center: {
      checks: [
        'Check tire wear, temperatures, and camber at race ride height.',
        'Make sure shocks, anti-roll bars, and suspension links move freely and evenly.',
        'Inspect the rear diff for inconsistent or grabby action.',
      ],
      tight: fix(
        [
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Increase rear anti-roll-bar stiffness one adjacent bar size; keep the rear springs unchanged for this run.',
          'Add a small amount of negative front camber only if the contact patch needs it.',
        ],
        [
          'Lower the front roll center or raise the rear roll center slightly.',
          'Use a shorter front camber link for more camber gain.',
          'Reduce front shock damping or pack.',
          'Move a small amount of weight forward.',
          'Add controlled bump steer only as a fine change on smooth tracks.',
          'Decrease rear gear-diff oil one viscosity grade; for a ball diff, rebuild to baseline and loosen only 1/8 turn.',
        ],
        'Springs and anti-roll bars trade grip between the front and rear; more front grip usually means less rear security.',
        'Do not add camber without reading tire wear; too much removes useful contact patch.'
      ),
      loose: fix(
        [
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
          'Use slightly less negative rear camber if the tire rides on its inside edge.',
        ],
        [
          'Lower the rear roll center or lengthen the rear camber link for stability.',
          'Add rear toe-in in a small step.',
          'Decrease rear shock oil one manufacturer grade on both rear shocks; stop if the chassis begins bottoming or packing.',
          'Move battery weight rearward slightly.',
          'Reduce aggressive steering rate at steady corner load.',
          'Service or soften an inconsistent rear differential.',
        ],
        'Adding rear grip at center reduces steering everywhere and may make the car tight on exit.',
        'Do not stiffen both ends together unless the track requires it; that changes total grip as well as balance.'
      ),
    },
    out: {
      checks: [
        'Check rear tires, rear diff, slipper, driveshafts, and drivetrain drag.',
        'Verify rear toe, wheelbase spacers, anti-squat, and droop are equal side to side.',
        'Check throttle curve and make sure the steering is unwinding.',
      ],
      tight: fix(
        [
          'Reduce rear toe-in in a small step.',
          'Stiffen the rear anti-roll bar slightly.',
          'Reduce front droop to keep more load on the front during acceleration.',
        ],
        [
          'Lengthen the wheelbase for more on-power steering.',
          'Use a longer rear camber link when it adds exit steering on the chassis.',
          'Raise the rear roll center slightly.',
          'Move battery weight forward.',
          'Decrease rear gear-diff oil one viscosity grade; for a ball diff, rebuild to baseline and loosen only 1/8 turn.',
          'Use less anti-squat on rough tracks if the rear is skipping.',
        ],
        'Less rear toe and a stiffer rear bar add exit rotation, but reduce rear stability and forward bite.',
        'Do not remove large amounts of rear toe or diff support; rotation can turn into wheelspin.'
      ),
      loose: fix(
        [
          'Add rear toe-in in a small step.',
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Add front droop to increase rearward weight transfer under acceleration.',
        ],
        [
          'Shorten the wheelbase slightly for more rearward weight transfer and drive.',
          'Add anti-squat on smooth high grip; use less on rough tracks.',
          'Move battery weight rearward.',
          'Lower the rear roll center or use a more stable rear camber-link position.',
          'Decrease rear shock oil one manufacturer grade on both rear shocks; stop if the chassis begins bottoming on bumps.',
          'If the diff is grabby, decrease gear-diff oil one grade or loosen a correctly built ball diff 1/8 turn; if only the initial hit spins, loosen the slipper nut 1/8 turn instead.',
        ],
        'Rear toe, front droop, and rearward weight add exit traction, but slow rotation and can create on-power push.',
        'Do not tune around excessive throttle punch; fix power delivery before sacrificing steering.'
      ),
    },
  },

  '4wd': {
    sources: ['tekno', 'xb4', 'xraySetups'],
    in: {
      checks: [
        'Check tires, steering travel, toe, and suspension for bind or crash damage.',
        'Verify front, center, and rear diffs are smooth, equal, and filled as intended.',
        'Recheck ride height, droop, and brake balance.',
      ],
      tight: fix(
        [
          'Use slightly thinner front diff oil for more off-power steering.',
          'Add a small amount of front toe-out.',
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
        ],
        [
          'Use less caster or a more aggressive Ackermann position.',
          'Add front droop or reduce rear droop.',
          'Use a shorter front camber link / lower front roll center.',
          'Use slightly thinner center diff oil for more front drive.',
          'Shorten the wheelbase slightly.',
          'Move battery weight forward.',
        ],
        'Thinner front or center diff oil adds entry response, but going too thin reduces consistency and on-power drive.',
        'Do not make a large differential jump before confirming the oils are fresh and the diffs are built equally.'
      ),
      loose: fix(
        [
          'Use slightly thicker front diff oil for more entry stability.',
          'Reduce front toe-out or add a small amount of toe-in.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
        ],
        [
          'Use more caster or a smoother Ackermann position.',
          'Reduce rear droop to limit forward weight transfer.',
          'Lengthen the front camber link.',
          'Lengthen the wheelbase.',
          'Add rear toe-in in a small step.',
          'Move battery weight rearward.',
        ],
        'Thicker front diff oil and calmer steering improve stability, but reduce off-power rotation.',
        'Do not use very thick front diff oil to cover a braking or rear-grip problem.'
      ),
    },
    center: {
      checks: [
        'Read tire wear and camber at race ride height.',
        'Check anti-roll bars, shocks, and suspension links for equal free movement.',
        'Verify all three diffs are smooth and not overheated or leaking.',
      ],
      tight: fix(
        [
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Increase rear anti-roll-bar stiffness one adjacent bar size; keep the rear springs unchanged for this run.',
          'Add negative front camber only if the contact patch needs it.',
        ],
        [
          'Lower the front roll center or raise the rear roll center slightly.',
          'Use a shorter front camber link for more camber gain.',
          'Reduce front shock pack or damping.',
          'Move battery weight forward.',
          'Use slightly thinner rear diff oil for more corner traction and rotation.',
          'Change the steering-link height by one 0.5 mm shim, then measure toe at ride height and compression; keep it only if the unwanted toe change is reduced.',
        ],
        'Bar, spring, roll-center, and diff changes shift grip between axles; more rotation usually means less rear security.',
        'Do not change differential and suspension balance in the same run.'
      ),
      loose: fix(
        [
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
          'Use less negative rear camber if the tire rides on its inside edge.',
        ],
        [
          'Lower the rear roll center or lengthen the rear camber link.',
          'Add rear toe-in in a small step.',
          'Move battery weight rearward.',
          'Use slightly thinner rear diff oil when more rear corner traction is needed.',
          'Decrease rear shock oil one manufacturer grade on both rear shocks; stop if the chassis begins bottoming.',
          'Reduce steering rate at steady corner load.',
        ],
        'More rear grip calms center, but reduces steering and can make the car tight when power is added.',
        'Do not keep thinning diff oil after handling becomes inconsistent or grabby.'
      ),
    },
    out: {
      checks: [
        'Check diff temperatures, leaks, drivetrain drag, and equal left/right drive.',
        'Verify rear toe, anti-squat, wheelbase, and droop are equal side to side.',
        'Check throttle delivery and make sure steering is unwinding.',
      ],
      tight: fix(
        [
          'Use slightly thicker front diff oil for more on-power steering.',
          'Use slightly thicker center diff oil for more rearward drive and rotation.',
          'Stiffen the rear anti-roll bar slightly.',
        ],
        [
          'Reduce rear toe-in in a small step.',
          'Reduce front droop to retain more front load under power.',
          'Lengthen the wheelbase.',
          'Raise the rear roll center slightly.',
          'Move battery weight forward.',
          'Use a longer rear camber link when the chassis gains exit steering.',
        ],
        'Thicker center oil adds rearward drive and on-power steering, but too much can create wheelspin or hurt rough-track control.',
        'Do not thicken front and center diffs together by a large amount.'
      ),
      loose: fix(
        [
          'Use slightly thinner center diff oil for more drive to the front.',
          'Add rear toe-in in a small step.',
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
        ],
        [
          'Add front droop for more rearward weight transfer.',
          'Shorten the wheelbase slightly for more on-power traction.',
          'Move battery weight rearward.',
          'Add anti-squat on smooth high grip; use less on rough tracks.',
          'Use a more stable rear camber-link / roll-center position.',
          'Use thicker rear diff oil only when inside-wheel spin is the cause.',
        ],
        'More front drive, rear toe, and rear compliance improve exit security, but slow rotation and increase understeer.',
        'Do not tune diff oils around an aggressive throttle map or a mechanical drivetrain problem.'
      ),
    },
  },

  sct: {
    sources: ['tekno', 'sct', 'sctCurrent'],
    in: {
      checks: [
        'Inspect tires, inserts, steering travel, and the body for tire rub.',
        'Check the wide chassis, nerf bars, and body for track contact or snagging.',
        'Recheck ride height, droop, toe, and brake or drag-brake amount.',
      ],
      tight: fix(
        [
          'Add a small amount of front toe-out.',
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Use less caster or a more aggressive Ackermann position.',
        ],
        [
          'Add front droop or reduce rear droop.',
          'Use a shorter front camber link / lower front roll center.',
          'Shorten the wheelbase slightly.',
          'Move battery weight forward.',
          'Reduce front shock pack so the truck takes a set sooner.',
          'On 4WD, use slightly thinner front diff oil.',
        ],
        'More entry response helps the truck point, but the tall body amplifies roll and can turn it into center looseness.',
        'Do not lower the truck until the chassis or body drags; contact can feel like entry push.'
      ),
      loose: fix(
        [
          'Reduce front toe-out or add a small amount of toe-in.',
          'Increase front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Use more caster or a smoother Ackermann position.',
        ],
        [
          'Reduce rear droop to limit forward weight transfer.',
          'Lengthen the wheelbase.',
          'Add rear toe-in in a small step.',
          'Move battery weight rearward.',
          'Raise the body only enough to prevent contact.',
          'On 4WD, use slightly thicker front diff oil.',
        ],
        'Rear toe and a calmer front stabilize entry, but slow rotation and add understeer.',
        'Do not add large rear toe before checking tire rub, body contact, and braking.'
      ),
    },
    center: {
      checks: [
        'Read tire wear and check camber at race ride height.',
        'Verify shocks and anti-roll bars are free and equal.',
        'Look for chassis, nerf-bar, or body contact at full roll.',
      ],
      tight: fix(
        [
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Increase rear anti-roll-bar stiffness one adjacent bar size; keep the rear springs unchanged for this run.',
          'Add negative front camber only if the contact patch needs it.',
        ],
        [
          'Lower the front roll center or raise the rear roll center slightly.',
          'Use a shorter front camber link for more camber gain.',
          'Reduce front shock pack or damping.',
          'Move battery weight forward.',
          'Reduce steering deadband while keeping input smooth.',
          'On 4WD, use slightly thinner rear diff oil for corner traction.',
        ],
        'Bars and springs shift grip between axles, while the SCT body makes roll-balance changes feel larger.',
        'Do not use body roll as the only clue; tire rub and chassis contact can create the same push.'
      ),
      loose: fix(
        [
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
          'Use less negative rear camber if the contact patch needs it.',
        ],
        [
          'Lower the rear roll center or lengthen the rear camber link.',
          'Add rear toe-in in a small step.',
          'Move battery weight rearward.',
          'Decrease rear shock oil one manufacturer grade on both rear shocks; stop if the truck begins bottoming.',
          'Reduce steady-state steering rate.',
          'On 4WD, decrease rear diff oil one viscosity grade for more corner traction; stop if inside-wheel spin increases.',
        ],
        'Adding rear side grip reduces looseness, but also reduces steering and may make the truck tight on power.',
        'Do not soften the rear until the truck bottoms or rolls onto the body.'
      ),
    },
    out: {
      checks: [
        'Check tires, drivetrain, diff or slipper action, and rear body rub.',
        'Verify rear toe, anti-squat, wheelbase, and droop are equal.',
        'Check throttle map and make sure the steering is unwinding.',
      ],
      tight: fix(
        [
          'Reduce rear toe-in in a small step.',
          'Stiffen the rear anti-roll bar slightly.',
          'Reduce front droop to keep more load on the front under power.',
        ],
        [
          'Lengthen the wheelbase for more on-power steering.',
          'Raise the rear roll center slightly.',
          'Move battery weight forward.',
          'Use less anti-squat on rough tracks if the rear is skipping.',
          'On 2WD, free the rear diff or slipper in small steps.',
          'On 4WD, use slightly thicker center diff oil for more rotation.',
        ],
        'Less rear toe and more rear roll stiffness add rotation, but reduce rear stability and forward bite.',
        'Do not remove rear support before ruling out body rub, drivetrain drag, and delayed steering unwind.'
      ),
      loose: fix(
        [
          'Add rear toe-in in a small step.',
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Add front droop for more rearward weight transfer.',
        ],
        [
          'Shorten the wheelbase slightly for more on-power traction.',
          'Move battery weight rearward.',
          'Add anti-squat on smooth high grip; use less on rough tracks.',
          'Use a more stable rear camber-link / roll-center position.',
          'On 2WD, decrease gear-diff oil one grade or loosen a correctly built ball diff 1/8 turn; if only the initial hit spins, loosen the slipper 1/8 turn instead.',
          'On 4WD, use slightly thinner center diff oil for more front drive.',
        ],
        'Rear toe, droop, and smoother drive add exit security, but slow rotation and can make the truck push.',
        'Do not use suspension changes to cover a harsh throttle map or a grabbing drivetrain.'
      ),
    },
  },

  onroad: {
    sources: ['hudy', 'x4', 'xraySetups'],
    in: {
      checks: [
        'Check tire preparation and temperatures for an even left/right balance.',
        'Check steering, spool/diff, driveshafts, and suspension for bind.',
        'Recheck ride height, droop, tweak, toe, and brake balance.',
      ],
      tight: fix(
        [
          'Add a small amount of front toe-out.',
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Use a more aggressive Ackermann setting or slightly less caster.',
        ],
        [
          'Add front droop or reduce rear droop for more entry weight transfer.',
          'Use a shorter front camber link / more front camber gain.',
          'Lower the front roll center slightly.',
          'Move a small amount of weight forward.',
          'Reduce front shock pack or damping.',
          'Increase front tire preparation only within tire and class rules.',
        ],
        'Toe-out, Ackermann, front droop, and tire prep add entry steering, but can make center nervous or loose.',
        'Do not add tire additive or steering travel until tweak and suspension bind are checked.'
      ),
      loose: fix(
        [
          'Reduce front toe-out or add a small amount of toe-in.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
          'Use more caster or a smoother Ackermann setting.',
        ],
        [
          'Reduce rear droop to limit forward weight transfer.',
          'Lengthen the front camber link.',
          'Add rear toe-in in a small step.',
          'Move weight rearward slightly.',
          'Reduce front tire prep or increase rear prep within the rules.',
          'Soften initial braking and steering expo.',
        ],
        'Calming the front or adding rear grip stabilizes entry, but reduces rotation and can create exit push.',
        'Do not use a large rear-toe or tire-prep change to cover a tweaked chassis.'
      ),
    },
    center: {
      checks: [
        'Read tire temperatures across the tread and confirm camber.',
        'Check anti-roll bars, dampers, suspension, and diff for free equal movement.',
        'Verify the chassis is not rubbing and the car is not beginning to traction roll.',
      ],
      tight: fix(
        [
          'Decrease front spring rate one adjacent step; keep the front anti-roll bar unchanged for this run.',
          'Increase rear anti-roll-bar stiffness one adjacent bar size; keep the rear springs unchanged for this run.',
          'Add negative front camber only if the contact patch needs it.',
        ],
        [
          'Lower the front roll center or raise the rear roll center slightly.',
          'Use a shorter front camber link for more camber gain.',
          'Reduce front damper pack or oil weight.',
          'Move a small amount of weight forward.',
          'Increase front track width slightly when the chassis allows it.',
          'Increase the front prep application by one narrow band or one timed soak increment, using the same measured amount on both tires and staying within the rules.',
        ],
        'Springs, bars, roll centers, track width, and tire prep change total grip as well as front/rear balance.',
        'Do not chase mid-corner steering with camber alone; use tire temperatures to protect the contact patch.'
      ),
      loose: fix(
        [
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Increase front anti-roll-bar stiffness one adjacent bar size; keep the front springs unchanged for this run.',
          'Use less negative rear camber if the tire rides on its inside edge.',
        ],
        [
          'Lower the rear roll center or lengthen the rear camber link.',
          'Add rear toe-in in a small step.',
          'Move weight rearward slightly.',
          'Decrease rear damper oil one manufacturer grade on both rear dampers; stop if the chassis begins touching the track.',
          'Increase rear tire preparation within the rules.',
          'Reduce steady-state steering rate.',
        ],
        'More rear grip calms the apex, but also removes steering and can increase tire scrub and exit push.',
        'Do not soften the rear until the chassis rubs or begins traction rolling.'
      ),
    },
    out: {
      checks: [
        'Check tire temperatures, diff/spool action, driveshafts, belts, and drivetrain drag.',
        'Verify rear toe, droop, wheelbase, ride height, and tweak.',
        'Check throttle map and confirm the steering is unwinding.',
      ],
      tight: fix(
        [
          'Reduce rear toe-in in a small step.',
          'Stiffen the rear anti-roll bar slightly.',
          'Reduce front droop to retain more front load during acceleration.',
        ],
        [
          'Lengthen the wheelbase for more on-power steering.',
          'Raise the rear roll center slightly.',
          'Move a small amount of weight forward.',
          'Use a longer rear camber link when the chassis gains exit steering.',
          'Rebuild the rear differential to baseline if it has a tight spot; then decrease gear-diff oil one viscosity grade and keep it only if exit rotation improves.',
          'Reduce rear tire preparation slightly within the rules.',
        ],
        'Less rear toe and more rear roll stiffness free exit, but reduce rear grip and make power less forgiving.',
        'Do not remove rear toe or tire grip before checking drivetrain drag and steering unwind.'
      ),
      loose: fix(
        [
          'Add rear toe-in in a small step.',
          'Decrease rear spring rate one adjacent step; keep the rear anti-roll bar unchanged for this run.',
          'Add front droop for more rearward weight transfer.',
        ],
        [
          'Move weight rearward slightly.',
          'Lower the rear roll center or use a more stable rear camber-link position.',
          'Decrease rear damper oil one manufacturer grade, or use one less-restrictive piston option, on both rear shocks.',
          'Rebuild the rear differential to baseline, then decrease gear-diff oil one grade only if the current diff remains grabby under power.',
          'Increase rear tire preparation within the rules.',
          'Reduce steering rate as power is applied.',
        ],
        'Rear toe, compliance, and tire grip add exit security, but slow rotation and can make center push.',
        'Do not tune around an aggressive power map; smooth power delivery before giving away corner speed.'
      ),
    },
  },
};

const LOSI_NASCAR_DATA = {
  sources: ['losiNascarManual', 'losiNascar', 'hudy'],
  in: {
    checks: [
      'Check equal front tires, steering center, and front suspension freedom.',
      'Check the splitter, body, and nerf bars for tire or track contact.',
    ],
    tight: fix(
      [
        'Increase steering rate 3–5%.',
        'Increase negative front camber 0.5° only with adjustable camber links.',
        'Decrease front spring rate one available step.',
      ],
      [
        'Decrease front shock oil one grade.',
        'Use one lighter front differential grease/fluid only if the differential is serviceable and class rules allow it.',
      ],
      'More entry steering can make the car loose at center.',
      'Do not use an upgrade or adjustment that your class rules prohibit.'
    ),
    loose: fix(
      [
        'Reduce steering rate 3–5%.',
        'Reduce negative front camber 0.5° if the tire rides on its inside edge.',
        'Increase front spring rate one available step.',
      ],
      [
        'Increase front shock oil one grade.',
        'Use one heavier front differential grease/fluid only if the differential is serviceable and class rules allow it.',
      ],
      'Calmer entry steering can add center push.',
      'Do not tune around a bent link, rubbing body, or damaged tire.'
    ),
  },
  center: {
    checks: [
      'Check tire wear across all four tires and verify front/rear camber.',
      'Check all four shocks for equal travel, damping, and ride height.',
    ],
    tight: fix(
      [
        'Decrease front spring rate one available step.',
        'Increase rear spring rate one available step.',
        'Increase negative front camber 0.5° only if the outer tire edge is doing more work.',
      ],
      [
        'Decrease front shock oil one grade.',
        'Increase rear shock oil one grade.',
        'Increase steering rate 3–5%.',
      ],
      'More center steering can reduce rear security.',
      'Do not change camber without checking the tire contact patch.'
    ),
    loose: fix(
      [
        'Decrease rear spring rate one available step.',
        'Increase front spring rate one available step.',
        'Reduce negative rear camber 0.5° if the tire rides on its inside edge.',
      ],
      [
        'Decrease rear shock oil one grade.',
        'Reduce steering rate 3–5%.',
        'Use one lighter rear differential grease/fluid only if the differential is serviceable and class rules allow it.',
      ],
      'More rear grip can create center or exit push.',
      'Do not soften the rear if the chassis begins touching the track.'
    ),
  },
  out: {
    checks: [
      'Check rear tires, rear shock travel, and both differentials for smooth action.',
      'Check that steering is unwinding before full throttle.',
    ],
    tight: fix(
      [
        'Increase rear spring rate one available step.',
        'Increase steering rate 3–5%.',
        'Use one heavier front differential grease/fluid for more on-power steering only if class rules allow it.',
      ],
      [
        'Increase rear shock oil one grade.',
        'Reduce rear camber 0.5° only if the tire rides on its inside edge.',
      ],
      'More exit rotation reduces rear security.',
      'Do not change the differential before checking for drivetrain drag.'
    ),
    loose: fix(
      [
        'Decrease rear spring rate one available step.',
        'Decrease rear shock oil one grade.',
        'Reduce steering rate 3–5% as power is applied.',
      ],
      [
        'Reduce negative rear camber 0.5° if the tire rides on its inside edge.',
        'Use one heavier rear differential grease/fluid only when inside-wheel spin is the cause and class rules allow it.',
      ],
      'More rear grip can make the car push at center.',
      'Do not cover an aggressive trigger input or rubbing body with suspension changes.'
    ),
  },
};

const PAN_ONROAD_DATA = {
  sources: ['x12', 'x12Manual', 'hudy', 'xraySetups'],
  in: {
    checks: [
      'Check front tire preparation, foam diameter, and left/right temperature balance.',
      'Check kingpins, steering blocks, servo saver, side links, and pod for free movement.',
      'Recheck ride height, pod droop, chassis tweak, front toe, and body rub.',
    ],
    tight: fix(
      [
        'Add a small amount of front toe-out.',
        'Use a more aggressive Ackermann position.',
        'Decrease both front / kingpin spring rates one adjacent step; reset ride height afterward.',
      ],
      [
        'Use a stiffer front flex setting when the car needs sharper initial response on high grip.',
        'Move the pod pivot rearward for more initial steering and rotation on high-grip carpet.',
        'Move the battery rearward one small step for a more aggressive car.',
        'Increase front wheel offset / front track width within the rules.',
        'Change only one front setting per run: caster one insert, camber 0.5°, bump-steer height 0.5 mm, or steering lock 3%.',
        'Increase front tire preparation only within the tire and class rules.',
      ],
      'Toe, Ackermann, front flex, and a rearward pod pivot add entry response but can make center and exit less forgiving.',
      'Do not use oval cross-weight or LF/RF spring rules on an On-Road Pan-Car; keep the chassis mechanically tweak-free.'
    ),
    loose: fix(
      [
        'Reduce front toe-out or use a small amount of toe-in.',
        'Use a smoother Ackermann position.',
        'Use a softer front flex setting for more forgiveness and mechanical grip.',
      ],
      [
        'Move the pod pivot forward for a more stable, forgiving car.',
        'Move the battery forward one small step.',
        'Reduce excessive steering lock, rate, or aggressive expo.',
        'Use slightly less front tire preparation or more rear preparation within the rules.',
        'Lengthen the front wheelbase slightly when the chassis allows it.',
        'Use the ball differential option when low rear grip is the real cause.',
      ],
      'A forward battery and pod pivot calm entry and reduce wheel lift, but also reduce rotation and corner speed.',
      'Do not cover a tweaked pod, dragging kingpin, or uneven tire diameter with radio settings.'
    ),
  },
  center: {
    checks: [
      'Read front and rear tire temperatures and confirm the contact patches are even.',
      'Verify side springs, side dampers, center shock, and pod pivot move without bind.',
      'Check chassis clearance, rear axle height, pod roll center, and tweak after a full run.',
    ],
    tight: fix(
      [
        'Decrease both front / kingpin spring rates one adjacent step; reset ride height afterward.',
        'Add a small amount of front camber only when the tire contact patch needs it.',
        'Decrease both rear side-spring rates one adjacent step; if springs are already at baseline, use the next lighter side-tube/damper lube instead.',
      ],
      [
        'Use a softer front flex setting when the front slides at steady load.',
        'Lower the pod roll center in a small step when the chassis provides the adjustment.',
        'Move the pod pivot rearward for more rotation on high grip.',
        'Move the battery rearward slightly for a more aggressive balance.',
        'Increase front offset / track width within the rules.',
        'Decrease center-shock damping one oil grade first; if still tight, decrease pod-spring rate one step, then test pod angle one marked position in a separate run.',
      ],
      'Front spring, pod roll center, side damping, and battery position change both steady-corner grip and exit support.',
      'Do not add camber without using tire wear and temperature; too much removes usable contact patch.'
    ),
    loose: fix(
      [
        'Increase both rear side-spring rates exactly one adjacent step; reset preload only enough to level the pod.',
        'Increase both side-tube/damper resistances one adjacent lube or oil grade; do not change the springs in the same run.',
        'Move the pod pivot forward one marked hole or spacer position for more rear stability.',
      ],
      [
        'Move the battery forward for a more predictable, forgiving car.',
        'Increase both front / kingpin spring rates one adjacent step; reset ride height afterward.',
        'Widen rear track within legal limits when more rear stability is needed.',
        'Reduce excessive front tire preparation within the rules.',
        'Use a softer chassis / side-brace flex setting for overall mechanical grip.',
        'Increase pod-spring rate one step first; if still loose, increase center-shock damping one oil grade, then reduce pod droop 0.5 mm in a separate run.',
      ],
      'More pod support and rear stability calm center, but can reduce rotation and make the car tight as throttle is added.',
      'Do not stiffen side springs and side damping together in one test; each changes the timing differently.'
    ),
  },
  out: {
    checks: [
      'Check rear tires, rear track width, axle height, and solid axle / ball diff condition.',
      'Verify center shock travel, pod droop, pod angle, and side links under acceleration.',
      'Check throttle delivery, rollout, motor temperature, and steering unwind.',
    ],
    tight: fix(
      [
        'Move the pod pivot rearward one step for more rotation.',
        'Move the battery rearward slightly for a more aggressive balance.',
        'Decrease both rear side-spring rates one adjacent step and reset preload only enough to level the pod.',
      ],
      [
        'Decrease both side-tube/damper resistances one adjacent lube or oil grade so the pod rotates sooner.',
        'Narrow rear track only in a small, legal step.',
        'Add a little steering lock or rate only if the chassis is mechanically free.',
        'Decrease center-shock damping one oil grade; if the car still takes too long to rotate, decrease pod-spring rate one step in the next run.',
        'Reduce rear aero balance or move the body/wing forward when the body allows it.',
        'Rebuild a rough ball diff to baseline and reduce rollout one pinion tooth when motor torque is forcing the car wide.',
      ],
      'Rearward pod and battery positions add rotation and corner speed, but make the car more aggressive and reduce rear security.',
      'Do not narrow rear track or remove pod support before checking drivetrain drag and steering unwind.'
    ),
    loose: fix(
      [
        'Move the pod pivot forward for more forgiving rear traction.',
        'Move the battery forward one small step.',
        'Increase both rear side-spring rates one adjacent step; if roll timing is the problem instead, leave springs alone and increase both side dampers one lube/oil grade.',
      ],
      [
        'Use the ball differential option for low-grip conditions when the chassis supports it.',
        'Widen rear track within legal limits.',
        'Add rear aero balance or move the body/wing rearward when available.',
        'Increase center-shock damping one oil grade; keep the spring/preload unchanged and confirm full compression and droop remain.',
        'Reduce throttle punch, boost, or aggressive steering unwind.',
        'Move the servo or battery laterally up to 5 mm toward the lighter rear side until left/right rear scale loads match; then recheck total weight and tweak.',
      ],
      'A forward pod pivot, wider rear track, and smoother power add exit security but slow rotation and can create center push.',
      'Do not tune around uneven rear tires, a rough ball diff, or a pod that binds under power.'
    ),
  },
};

function sctProfile(drivetrain) {
  const base = TUNING_DATA.sct;
  const ownPrefix = drivetrain === '2wd' ? 'On 2WD, ' : 'On 4WD, ';
  const otherPrefix = drivetrain === '2wd' ? 'On 4WD, ' : 'On 2WD, ';
  const cleanMore = (items) => items
    .filter((item) => !item.startsWith(otherPrefix))
    .map((item) => {
      if (!item.startsWith(ownPrefix)) return item;
      const text = item.slice(ownPrefix.length);
      return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
    });

  const profile = { sources: base.sources };
  for (const sectionId of ['in', 'center', 'out']) {
    profile[sectionId] = { checks: base[sectionId].checks };
    for (const feel of ['tight', 'loose']) {
      profile[sectionId][feel] = {
        ...base[sectionId][feel],
        more: cleanMore(base[sectionId][feel].more),
      };
    }
  }
  return profile;
}

function formulaProfile() {
  const additions = {
    in: {
      checks: [
        'Check that the front and rear wings are square, secure, and not rubbing.',
        'Confirm both front tires/inserts match and the kingpins move freely.',
      ],
      tight: [
        'Increase front-wing angle about 1° or use the next higher-downforce front insert for high-speed entry push.',
        'Reduce rear-wing angle about 1° only when the rear is over-planted in fast corners.',
      ],
      loose: [
        'Reduce front-wing angle about 1°; if front wing is already at baseline, increase rear-wing angle about 1° instead.',
        'Move the battery forward one position for a calmer, more predictable car.',
      ],
    },
    center: {
      checks: [
        'Check front/rear wing balance at the speed where the problem happens.',
        'Verify pod angle, rear droop, side springs, and side dampers are equal and free.',
      ],
      tight: [
        'Increase front-wing angle about 1°; if front aero is already at the maker baseline, reduce rear-wing angle about 1° instead.',
        'Move both side-link front pivots inward one marked hole only when rear traction is secure.',
      ],
      loose: [
        'Increase rear-wing angle about 1°; if rear wing is already at the maker baseline, reduce front-wing angle about 1° instead.',
        'Move both side-link front pivots outward one marked hole for a calmer mid-corner balance.',
      ],
    },
    out: {
      checks: [
        'Inspect the rear tires, ball differential, pod angle, and rear-wing mount under load.',
        'Check throttle punch, rollout, and that steering is being unwound before full power.',
      ],
      tight: [
        'Reduce rear-wing angle about 1° when aero balance is holding the car wide in fast exits.',
        'Move the pod pivot rearward one marked hole only after rear traction is consistent.',
      ],
      loose: [
        'Increase rear-wing angle about 1° for high-speed exit security.',
        'Move the pod pivot forward one marked hole; if looseness begins only with trigger input, leave the pivot alone and reduce throttle punch 5% instead.',
      ],
    },
  };

  const profile = { sources: ['x12', 'x12Manual', 'x1', 'hudy', 'xraySetups'] };
  for (const sectionId of ['in', 'center', 'out']) {
    const base = PAN_ONROAD_DATA[sectionId];
    profile[sectionId] = {
      checks: [...additions[sectionId].checks, ...base.checks],
      tight: {
        ...base.tight,
        more: [...base.tight.more, ...additions[sectionId].tight],
      },
      loose: {
        ...base.loose,
        more: [...base.loose.more, ...additions[sectionId].loose],
      },
    };
  }
  return profile;
}

const STYLE_SUPPORT = {
  oval: {
    sources: ['dirtOval', 'oval'],
    checks: {
      in: 'Check left/right tire size, cross weight, and the saved oval baseline.',
      center: 'Compare LF/RF and LR/RR tire wear; confirm cross weight and chassis tweak.',
      out: 'Check rear-tire drive, differential action, and steering unwind in the race direction.',
    },
  },
  onroad: {
    sources: ['hudy'],
    checks: {
      in: 'Check left/right tire prep, temperature, ride height, and chassis tweak.',
      center: 'Read all four tire temperatures and confirm the chassis is not rubbing or traction rolling.',
      out: 'Check rear-tire temperature, drivetrain drag, throttle delivery, and steering unwind.',
    },
  },
  offroad: {
    sources: ['tekno'],
    checks: {
      in: 'Check tire compound, inserts, ride height, and suspension freedom for this surface.',
      center: 'Check tire wear, shock action, and whether the chassis is packing or touching the track.',
      out: 'Check rear tires, differential or slipper action, drivetrain drag, and throttle delivery.',
    },
  },
};

function styledProfile(base, styleId, carSources) {
  const style = STYLE_SUPPORT[styleId];
  const sources = [...new Set([...carSources, ...style.sources])];
  const profile = {
    sources,
    sourceGroups: {
      car: carSources,
      style: style.sources.filter((key) => !carSources.includes(key)),
    },
  };

  for (const sectionId of ['in', 'center', 'out']) {
    profile[sectionId] = {
      ...base[sectionId],
      checks: [style.checks[sectionId], ...base[sectionId].checks],
      tight: {
        ...base[sectionId].tight,
        changes: [...base[sectionId].tight.changes],
        more: [...base[sectionId].tight.more],
      },
      loose: {
        ...base[sectionId].loose,
        changes: [...base[sectionId].loose.changes],
        more: [...base[sectionId].loose.more],
      },
    };
  }

  return profile;
}

const FORMULA_BASE = formulaProfile();
const SCT_2WD_BASE = sctProfile('2wd');
const SCT_4WD_BASE = sctProfile('4wd');

const CAR_PROFILE_BASES = {
  pan_formula: {
    oval: TUNING_DATA.pan,
    onroad: FORMULA_BASE,
    offroad: FORMULA_BASE,
  },
  touring: {
    oval: TUNING_DATA.onroad,
    onroad: TUNING_DATA.onroad,
    offroad: TUNING_DATA.onroad,
  },
  losi_nascar: {
    oval: LOSI_NASCAR_DATA,
    onroad: LOSI_NASCAR_DATA,
    offroad: LOSI_NASCAR_DATA,
  },
  offroad_2wd: {
    oval: TUNING_DATA['2wd'],
    onroad: TUNING_DATA['2wd'],
    offroad: TUNING_DATA['2wd'],
  },
  offroad_4wd: {
    oval: TUNING_DATA['4wd'],
    onroad: TUNING_DATA['4wd'],
    offroad: TUNING_DATA['4wd'],
  },
  sct_2wd: {
    oval: SCT_2WD_BASE,
    onroad: SCT_2WD_BASE,
    offroad: SCT_2WD_BASE,
  },
  sct_4wd: {
    oval: SCT_4WD_BASE,
    onroad: SCT_4WD_BASE,
    offroad: SCT_4WD_BASE,
  },
};

const CAR_SOURCE_KEYS = {
  pan_formula: ['x12Manual', 'x1'],
  touring: ['x4'],
  losi_nascar: ['losiNascarManual', 'losiNascar'],
  offroad_2wd: ['xb2'],
  offroad_4wd: ['xb4'],
  sct_2wd: ['sctCurrent', 'sct'],
  sct_4wd: ['sctCurrent', 'sct'],
};

const TUNING_PROFILES = {};
for (const [carId, styles] of Object.entries(CAR_PROFILE_BASES)) {
  for (const [styleId, base] of Object.entries(styles)) {
    TUNING_PROFILES[`${carId}_${styleId}`] = styledProfile(
      base,
      styleId,
      CAR_SOURCE_KEYS[carId]
    );
  }
}

function normalizeState(parsed) {
  const legacyProfiles = {
    pan: 'pan_formula_oval',
    pan_oval: 'pan_formula_oval',
    pan_onroad: 'pan_formula_onroad',
    formula: 'pan_formula_onroad',
    onroad: 'touring_onroad',
    touring: 'touring_onroad',
    '2wd': 'offroad_2wd_offroad',
    offroad_2wd: 'offroad_2wd_offroad',
    '4wd': 'offroad_4wd_offroad',
    offroad_4wd: 'offroad_4wd_offroad',
    sct: 'sct_2wd_offroad',
    sct_2wd: 'sct_2wd_offroad',
    sct_4wd: 'sct_4wd_offroad',
  };
  const sectionMap = {
    in: 'in',
    in_center: 'center',
    center: 'center',
    center_out: 'out',
    out: 'out',
  };
  const requestedProfile = legacyProfiles[parsed?.classStyle] || parsed?.classStyle;
  const classStyle = TUNING_PROFILES[requestedProfile]
    ? requestedProfile
    : DEFAULT_STATE.classStyle;

  return {
    carId: carForProfile(classStyle),
    classStyle,
    sectionId: sectionMap[parsed?.sectionId] || DEFAULT_STATE.sectionId,
    feel: parsed?.feel === 'loose' ? 'loose' : 'tight',
  };
}

function getSection(sectionId) {
  return TURN_SECTIONS.find((item) => item.id === sectionId) || TURN_SECTIONS[0];
}

function ClassStylePicker({ options, value, onChange }) {
  const [visible, setVisible] = useState(false);
  const { modalBackdropStyle, modalCardStyle } = useSafeAreaLayout({ modalSize: 'small' });
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.carSelect, pressed && styles.pressed]}
      >
        <Text style={styles.carSelectText}>{selected?.label}</Text>
        <Text style={styles.carSelectArrow}>▾</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)} presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent>
        <View style={[styles.carModalOverlay, modalBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View style={[styles.carModalPanel, modalCardStyle]}>
            <Text style={styles.carModalTitle}>SELECT CAR</Text>
            <ScrollView style={styles.carModalScroll} showsVerticalScrollIndicator contentContainerStyle={styles.carModalOptions}>
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.carModalOption,
                    isSelected && styles.carModalOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.carModalOptionText, isSelected && styles.carModalOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {isSelected && <Text style={styles.carModalCheck}>✓</Text>}
                </Pressable>
              );
            })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SectionButton({ section, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionButton,
        selected && styles.sectionButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.sectionNum, { backgroundColor: section.color }]}>
        <Text style={styles.sectionNumText}>{section.number}</Text>
      </View>
      <Text style={[styles.sectionButtonText, selected && styles.sectionButtonTextSelected]} numberOfLines={1}>
        {section.label}
      </Text>
    </Pressable>
  );
}

function ResultHeading({ children }) {
  return (
    <View style={styles.subHeader}>
      <Text style={styles.subHeaderText}>{children}</Text>
    </View>
  );
}

const CHECK_RULES = [
  {
    words: ['wing', 'aero'],
    target: 'Look for: correct angle, straight mounts, no rubbing.',
  },
  {
    words: ['tire', 'foam diameter', 'stagger', 'insert'],
    target: 'Look for: matching tires and even wear/contact.',
  },
  {
    words: ['temperature', 'contact patch', 'camber'],
    target: 'Look for: even contact; no single hot or worn edge.',
  },
  {
    words: ['bind', 'slop', 'move freely', 'free movement', 'kingpin', 'suspension link', 'side link', 'side damper'],
    target: 'Look for: free movement, smooth return, no slop.',
  },
  {
    words: ['diff', 'drivetrain', 'driveshaft', 'belt', 'axle freedom', 'spool'],
    target: 'Look for: smooth rotation, no tight spot, leak, or heat.',
  },
  {
    words: ['ride height', 'droop', 'tweak', 'cross weight', 'rear toe', 'anti-squat', 'wheelbase', 'axle height', 'roll center'],
    target: 'Look for: matches the saved setup and left/right measurements.',
  },
  {
    words: ['body rub', 'chassis clearance', 'track contact', 'snagging', 'traction roll', 'chassis is not rubbing'],
    target: 'Look for: no fresh body, tire, or chassis rub marks.',
  },
  {
    words: ['center shock', 'pod', 'compression', 'up-travel'],
    target: 'Look for: free pod, equal tubes, full shock travel.',
  },
  {
    words: ['throttle', 'brake', 'steering unwind'],
    target: 'Look for: problem starts exactly with throttle or brake input.',
  },
];

function checkTargetFor(text) {
  const lower = text.toLowerCase();
  const matches = CHECK_RULES
    .filter((rule) => rule.words.some((word) => lower.includes(word)))
    .map((rule) => rule.target);

  return [...new Set(matches)].slice(0, 1).join(' ')
    || 'Look for: damage, a mismatch, or a change from baseline.';
}

function stepSizeFor(text) {
  const lower = text.toLowerCase();

  if (lower.includes('center-tube') || lower.includes('center tube')) {
    return '1 tube-lube/oil grade';
  }
  if (lower.includes('cross weight') || lower.includes('cross-weight')) {
    return '0.2–0.5%';
  }
  if (lower.includes('side-damper') || lower.includes('side damper') || lower.includes('side-tube') || lower.includes('side tube')) {
    return lower.includes('hole') ? '1 hole' : '1 lube/oil grade';
  }
  if (lower.includes('diff')) {
    return lower.includes('ball diff') ? '1 fluid/grease grade • ball diff: 1/8 turn' : '1 fluid/grease grade';
  }
  if (lower.includes('slipper')) {
    return '1/8 turn';
  }
  if (lower.includes('anti-roll') || lower.includes('sway bar')) {
    return '1 bar/blade step';
  }
  if (lower.includes('spring')) {
    return '1 spring rate';
  }
  if (lower.includes('shock oil') || lower.includes('damper') || lower.includes('shock pack') || lower.includes('piston')) {
    return '1 oil/piston step';
  }
  if (lower.includes('preload')) {
    return '1/4 collar turn';
  }
  if (lower.includes('wing') || lower.includes('aero')) {
    return '1° or 1 hole';
  }
  if (lower.includes('toe')) {
    return '0.5° total';
  }
  if (lower.includes('camber')) {
    return '0.5°';
  }
  if (lower.includes('droop') || lower.includes('ride height') || lower.includes('axle height')) {
    return '0.5 mm or 1 shim';
  }
  if (lower.includes('track width') || lower.includes('tire out') || lower.includes('tire in') || lower.includes('wheel offset')) {
    return '0.5 mm per side';
  }
  if (lower.includes('wheelbase') || lower.includes('pod pivot') || lower.includes('side-link') || lower.includes('side link')) {
    return '1 hole/spacer';
  }
  if (lower.includes('roll center') || lower.includes('camber link') || lower.includes('shock mount')) {
    return '1 hole or 0.5 mm shim';
  }
  if (lower.includes('caster') || lower.includes('ackermann') || lower.includes('bump steer')) {
    return '1 insert/hole or 0.5 mm shim';
  }
  if (lower.includes('weight') || lower.includes('battery')) {
    return '1 slot or 5–10 g';
  }
  if (lower.includes('tire preparation') || lower.includes('tire prep')) {
    return '1 prep band/time step';
  }
  if (lower.includes('throttle') || lower.includes('brake') || lower.includes('steering rate') || lower.includes('steering lock') || lower.includes('expo')) {
    return '3–5%';
  }
  if (lower.includes('flex') || lower.includes('brace')) {
    return '1 listed brace/screw position';
  }
  if (lower.includes('rollout') || lower.includes('pinion') || lower.includes('gearing')) {
    return '1 pinion tooth';
  }
  if (lower.includes('t-plate') || lower.includes('t plate') || lower.includes('pod screw')) {
    return '1 listed screw position';
  }
  if (lower.includes('anti-squat') || lower.includes('kick-up')) {
    return '1 insert or 1°';
  }
  if (lower.includes('stagger')) {
    return '1 tire-diameter step';
  }

  return '1 setup step';
}

function shortInstruction(text) {
  const firstClause = String(text || '').split(';')[0].trim();
  return firstClause.replace(/^Try\s+/i, 'Use ');
}

function CheckBullet({ text }) {
  return (
    <View style={styles.detailBullet}>
      <View style={styles.bulletRow}>
        <Text style={[styles.bulletMark, styles.bulletMarkStrong]}>•</Text>
        <Text style={[styles.bulletText, styles.bulletTextStrong]}>{text}</Text>
      </View>
      <Text style={styles.checkTarget}>{checkTargetFor(text)}</Text>
    </View>
  );
}

function ChangeBullet({ text, number, primary = false }) {
  return (
    <View style={styles.detailBullet}>
      <View style={styles.bulletRow}>
        <Text style={[styles.changeNumber, primary && styles.changeNumberPrimary]}>{number}</Text>
        <Text style={[styles.bulletText, primary && styles.changeTextPrimary]}>{shortInstruction(text)}</Text>
      </View>
      <Text style={styles.stepSize}>STEP: {stepSizeFor(text)}</Text>
    </View>
  );
}

function confirmationFor(sectionId, feel) {
  const results = {
    in: {
      tight: 'easier turn-in; rear stays stable.',
      loose: 'rear stays behind the car; no new push.',
    },
    center: {
      tight: 'smaller radius; rear stays stable.',
      loose: 'rear holds the line; no new push.',
    },
    out: {
      tight: 'power goes on sooner; no wheelspin.',
      loose: 'full throttle sooner; no fishtail or new push.',
    },
  };
  return results[sectionId]?.[feel] || 'the problem improves without a new problem.';
}

function SourceLinks({ sourceKeys, sourceGroups }) {
  const groups = sourceGroups
    ? [
      { label: 'CAR DOCUMENTS', keys: sourceGroups.car },
      { label: 'RACING STYLE DOCUMENTS', keys: sourceGroups.style },
    ]
    : [{ label: 'DOCUMENTS', keys: sourceKeys }];

  return (
    <View style={styles.sourceLinks}>
      {groups.map((group) => group.keys?.length ? (
        <View key={group.label}>
          <Text style={styles.sourceGroupTitle}>{group.label}</Text>
          {group.keys.map((key) => {
            const source = SOURCES[key];
            if (!source) return null;
            return (
              <Pressable
                key={key}
                onPress={() => Linking.openURL(source.url).catch(() => {})}
                style={({ pressed }) => [styles.sourceLink, pressed && styles.pressed]}
              >
                <Text style={styles.sourceLinkText}>• {source.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null)}
    </View>
  );
}

function HandlingPlan({ classStyle, sectionId, feel, showTitle = true }) {
  const [showMore, setShowMore] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const answerSection = getSection(sectionId);
  const classData = TUNING_PROFILES[classStyle] || TUNING_PROFILES.pan_formula_oval;
  const sectionData = classData[answerSection.id];
  const side = sectionData[feel];
  const feelTitle = feel === 'tight' ? 'TIGHT / PUSH' : 'LOOSE';
  const firstChanges = side.changes.slice(0, 3);
  const moreChanges = [...side.changes.slice(3), ...side.more];

  useEffect(() => {
    setShowMore(false);
    setShowSources(false);
  }, [classStyle, sectionId, feel]);

  return (
    <View>
      {showTitle && (
        <View style={styles.answerHeading}>
          <Text style={styles.answerTitle}>{feelTitle} • {answerSection.label}</Text>
          <Text style={styles.answerSection}>{classLabel(classStyle)}</Text>
        </View>
      )}

      <ResultHeading>Check first</ResultHeading>
      {sectionData.checks.slice(0, 2).map((item) => <CheckBullet key={item} text={item} />)}

      <ResultHeading>Change one at a time</ResultHeading>
      {firstChanges.map((item, index) => (
        <ChangeBullet key={item} text={item} number={index + 1} primary />
      ))}
      <Text style={styles.testRule}>KEEP IF: {confirmationFor(answerSection.id, feel)}</Text>

      {showMore && moreChanges.map((item, index) => (
        <ChangeBullet key={item} text={item} number={firstChanges.length + index + 1} />
      ))}

      <View style={styles.answerActions}>
        {!!moreChanges.length && (
          <Pressable onPress={() => setShowMore((value) => !value)} style={styles.smallToggle}>
            <Text style={styles.smallToggleText}>
              {showMore ? 'Less' : `More fixes (${moreChanges.length})`}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={() => setShowSources((value) => !value)} style={styles.smallToggle}>
          <Text style={styles.smallToggleText}>
            {showSources ? 'Hide docs' : `Docs (${classData.sources.length})`}
          </Text>
        </Pressable>
      </View>

      {showSources && (
        <SourceLinks sourceKeys={classData.sources} sourceGroups={classData.sourceGroups} />
      )}
    </View>
  );
}

function AdjustmentLibrary({ adjustments }) {
  return (
    <View style={styles.adjustmentLibrary}>
      {ADJUSTMENT_GROUP_ORDER.map((group) => {
        const items = adjustments.filter((item) => item.group === group);
        if (!items.length) return null;
        return (
          <View key={group} style={styles.adjustmentGroup}>
            <Text style={styles.adjustmentGroupTitle}>{group}</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.adjustmentItem}>
                <Text style={styles.adjustmentTitle}>{item.label}</Text>
                <Text style={styles.adjustmentText}>{item.summary}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export default function TuningAssistantScreen(props) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [showAllAdjustments, setShowAllAdjustments] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    ])
      .then(([currentRaw, legacyRaw]) => {
        if (!mounted) return;
        const raw = currentRaw || legacyRaw;
        if (!raw) return;

        try {
          setState(normalizeState(JSON.parse(raw)));
        } catch {}
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [state]);

  const styleOptions = STYLE_OPTIONS_BY_CAR[state.carId]
    || STYLE_OPTIONS_BY_CAR.pan_formula;
  const profileAdjustments = useMemo(
    () => adjustmentsForProfile(state.classStyle),
    [state.classStyle]
  );
  const selectCar = (carId) => {
    const firstClass = STYLE_OPTIONS_BY_CAR[carId]?.[0]?.value || 'pan_formula_oval';
    setShowAllAdjustments(false);
    setState((prev) => ({ ...prev, carId, classStyle: firstClass }));
  };

  const selectStyle = (classStyle) => {
    setShowAllAdjustments(false);
    setState((prev) => ({ ...prev, classStyle }));
  };

  const resetSolver = () => {
    setState(DEFAULT_STATE);
    setShowAllAdjustments(false);
  };

  return (
    <ToolScaffold title="Tuning Assistant" subtitle="3-section setup solver" onBack={() => goBack(props)}>
      <ToolCard compact style={styles.selectorCard}>
        <Text style={styles.selectorLabel}>CAR</Text>
        <ClassStylePicker
          options={CAR_OPTIONS}
          value={state.carId}
          onChange={selectCar}
        />

        <Text style={styles.selectorLabel}>RACING STYLE</Text>
        <Segmented
          value={state.classStyle}
          onChange={selectStyle}
          options={styleOptions}
        />

        <Text style={styles.selectorLabel}>TURN</Text>
        <View style={styles.sectionRow}>
          {TURN_SECTIONS.map((item) => (
            <SectionButton
              key={item.id}
              section={item}
              selected={state.sectionId === item.id}
              onPress={() => {
                setState((prev) => ({ ...prev, sectionId: item.id }));
              }}
            />
          ))}
        </View>

        <Text style={styles.selectorLabel}>FEEL</Text>
        <Segmented
          value={state.feel}
          onChange={(feel) => {
            setState((prev) => ({ ...prev, feel }));
          }}
          options={[
            { label: 'Tight / Push', value: 'tight' },
            { label: 'Loose', value: 'loose' },
          ]}
        />
      </ToolCard>

      <ToolCard compact style={styles.answerCard}>
        <HandlingPlan
          classStyle={state.classStyle}
          sectionId={state.sectionId}
          feel={state.feel}
        />
      </ToolCard>

      <View style={styles.footerActions}>
        <Pressable
          onPress={() => setShowAllAdjustments((value) => !value)}
          style={({ pressed }) => [styles.adjustmentToggle, pressed && styles.pressed]}
        >
          <Text style={styles.adjustmentToggleTitle}>All Adjustments ({profileAdjustments.length})</Text>
          <Text style={styles.referenceArrow}>{showAllAdjustments ? '⌃' : '⌄'}</Text>
        </Pressable>
        <Pressable
          onPress={resetSolver}
          style={({ pressed }) => [styles.resetToggle, pressed && styles.pressed]}
        >
          <Text style={styles.resetToggleText}>Reset</Text>
        </Pressable>
      </View>

      {showAllAdjustments && (
        <ToolCard compact>
          <Text style={styles.libraryTitle}>ALL ADJUSTMENTS</Text>
          <AdjustmentLibrary adjustments={profileAdjustments} />
        </ToolCard>
      )}

    </ToolScaffold>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  selectorCard: {
    backgroundColor: TOOL_CARD_2,
    borderColor: 'rgba(38,217,109,0.24)',
  },
  selectorLabel: {
    color: TOOL_MUTED,
    fontSize: 9.5,
    fontWeight: '900',
    marginTop: 7,
    marginBottom: 3,
  },
  carSelect: {
    minHeight: 30,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(38,217,109,0.24)',
  },
  carSelectText: {
    color: TOOL_TEXT,
    fontSize: 10.5,
    fontWeight: '900',
  },
  carSelectArrow: {
    color: TOOL_GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  carModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  carModalPanel: {
    borderRadius: 6,
    padding: 10,
    gap: 5,
    backgroundColor: '#11181d',
    borderWidth: 1,
    borderColor: 'rgba(38,217,109,0.30)',
  },
  carModalOptions: { gap: 5 },
  carModalScroll: { flexShrink: 1, minHeight: 0 },
  carModalTitle: {
    color: TOOL_GREEN,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 2,
  },
  carModalOption: {
    minHeight: 37,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  carModalOptionSelected: {
    backgroundColor: 'rgba(38,217,109,0.13)',
    borderColor: TOOL_LINE,
  },
  carModalOptionText: {
    color: TOOL_MUTED,
    fontSize: 11,
    fontWeight: '900',
  },
  carModalOptionTextSelected: {
    color: TOOL_GREEN,
  },
  carModalCheck: {
    color: TOOL_GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 5,
  },
  sectionButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 5,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(244,255,248,0.09)',
  },
  sectionButtonSelected: {
    backgroundColor: 'rgba(38,217,109,0.12)',
    borderColor: TOOL_LINE,
  },
  sectionNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '900',
  },
  sectionButtonText: {
    color: TOOL_MUTED,
    fontSize: 10,
    fontWeight: '900',
  },
  sectionButtonTextSelected: {
    color: TOOL_GREEN,
  },
  answerCard: {
    backgroundColor: TOOL_CARD_2,
    borderColor: 'rgba(38,217,109,0.28)',
  },
  answerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  answerTitle: {
    color: TOOL_GREEN,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  answerSection: {
    flexShrink: 1,
    color: TOOL_MUTED,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
  },
  subHeader: {
    marginTop: 7,
    marginBottom: 3,
  },
  subHeaderText: {
    color: TOOL_GREEN,
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  bulletMark: {
    color: TOOL_GREEN,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    width: 8,
    textAlign: 'center',
  },
  bulletMarkStrong: {
    color: '#ffd66b',
  },
  bulletText: {
    flex: 1,
    color: TOOL_MUTED,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '800',
  },
  bulletTextStrong: {
    color: TOOL_TEXT,
  },
  detailBullet: {
    marginBottom: 5,
  },
  checkTarget: {
    color: 'rgba(255,214,107,0.78)',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    marginLeft: 13,
  },
  changeNumber: {
    width: 17,
    height: 17,
    borderRadius: 9,
    overflow: 'hidden',
    textAlign: 'center',
    color: TOOL_MUTED,
    backgroundColor: 'rgba(255,255,255,0.07)',
    fontSize: 9.5,
    lineHeight: 17,
    fontWeight: '900',
  },
  changeNumberPrimary: {
    color: '#06110a',
    backgroundColor: TOOL_GREEN,
  },
  changeTextPrimary: {
    color: TOOL_TEXT,
    fontWeight: '900',
  },
  stepSize: {
    color: 'rgba(244,255,248,0.58)',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    marginLeft: 22,
  },
  testRule: {
    color: '#bfe4ff',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  answerActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  smallToggle: {
    minHeight: 27,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(38,217,109,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(38,217,109,0.18)',
  },
  smallToggleText: {
    color: TOOL_GREEN,
    fontSize: 9.5,
    fontWeight: '900',
  },
  sourceLinks: {
    gap: 1,
    marginTop: 5,
  },
  sourceGroupTitle: {
    color: TOOL_MUTED,
    fontSize: 8.5,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 1,
  },
  sourceLink: {
    minHeight: 20,
    justifyContent: 'center',
  },
  sourceLinkText: {
    color: '#9bd8ff',
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  adjustmentToggle: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34,149,231,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,149,231,0.22)',
  },
  adjustmentToggleTitle: {
    color: '#9bd8ff',
    fontSize: 10.5,
    fontWeight: '900',
  },
  resetToggle: {
    minHeight: 36,
    borderRadius: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  resetToggleText: {
    color: TOOL_MUTED,
    fontSize: 10.5,
    fontWeight: '900',
  },
  referenceArrow: {
    color: TOOL_GREEN,
    fontSize: 14,
    fontWeight: '900',
  },
  libraryTitle: {
    color: TOOL_GREEN,
    fontSize: 10,
    fontWeight: '900',
  },
  adjustmentLibrary: {
    gap: 7,
    marginTop: 5,
  },
  adjustmentGroup: {
    gap: 4,
  },
  adjustmentGroupTitle: {
    color: TOOL_GREEN,
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  adjustmentItem: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  adjustmentTitle: {
    color: TOOL_TEXT,
    fontSize: 10.5,
    fontWeight: '900',
  },
  adjustmentText: {
    color: TOOL_MUTED,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
  },
});
