import React from 'react';
import AppScreenHeader from '../../../src/layout/AppScreenHeader';

export default function RaceDayHeader({
  title = 'RaceDay',
  subtitle,
  leftLabel = '‹ BACK',
  rightLabel,
  onLeftPress,
  onRightPress,
  rightTone = 'accent',
  topOffset = true,
}) {
  return (
    <AppScreenHeader
      title={title}
      subtitle={subtitle}
      onBack={onLeftPress}
      backLabel={String(leftLabel || 'BACK').replace(/^[‹←]\s*/, '')}
      rightLabel={rightLabel}
      onRightPress={onRightPress}
      rightTone={rightTone}
      applyTopInset={topOffset}
    />
  );
}

export { RaceDayHeader };
