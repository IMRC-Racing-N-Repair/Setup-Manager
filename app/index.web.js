import { Fragment } from 'react';

import DashboardScreen from '../src/dashboard/DashboardScreen';
import FirstUseHowToUseGate from '../features/support/components/FirstUseHowToUseGate';

export default function WebHomeScreen() {
  return (
    <Fragment>
      <DashboardScreen />
      <FirstUseHowToUseGate />
    </Fragment>
  );
}
