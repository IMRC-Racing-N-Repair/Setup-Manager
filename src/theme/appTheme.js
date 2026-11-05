// src/theme/appTheme.js
import { AppColors } from './colors';

export const AppTheme = {
  colors: AppColors,
  radius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    round: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  type: {
    micro: 10,
    label: 11,
    body: 14,
    title: 22,
    display: 32,
    tight: 0.2,
    tracked: 1.2,
  },
  line: {
    hairline: 1,
    strong: 2,
  },
  shadow: {
    color: '#000000',
    opacity: 0.16,
    radius: 5,
    elevation: 2,
  },
};
