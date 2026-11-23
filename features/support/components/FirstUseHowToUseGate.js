import { useEffect } from 'react';
import { useGuidedTour } from './GuidedTour';

export default function FirstUseHowToUseGate() {
  const { invite } = useGuidedTour();
  useEffect(invite, [invite]);
  return null;
}
