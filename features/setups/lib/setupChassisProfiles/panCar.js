import { buildChassisProfile } from './sharedLayouts';

const panCarProfile = buildChassisProfile({
  id: 'panCar',
  label: 'Pan Car / Oval',
  layoutKey: 'panCar',
  layoutFamily: 'panCar',
  driveType: 'panCar',
  match: /pan(?:\s|[-_–—])*car|oval(?:\s|[-_–—])*pan|oval(?:\s|[-_–—])*car|1\/12|12th|world\s*gt|\bwgt\b|crc|associated\s*rc10r5|rc10r5|rc10r6|rc10r6\.2|crc\s*ck/i,
});

export default panCarProfile;
