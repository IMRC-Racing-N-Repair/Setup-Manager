import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeAreaLayout(options = {}) {
  const insetsRaw = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const edgeGap = options.edgeGap ?? 10;
  const horizontalGap = options.horizontalGap ?? 12;
  const modalSize = options.modalSize ?? 'large';

  return useMemo(() => {
    const insets = {
      top: Math.max(insetsRaw.top, 0), bottom: Math.max(insetsRaw.bottom, 0),
      left: Math.max(insetsRaw.left, 0), right: Math.max(insetsRaw.right, 0),
    };
    const usableWidth = Math.max(0, width - insets.left - insets.right);
    const usableHeight = Math.max(0, height - insets.top - insets.bottom);
    const modalAvailableWidth = Math.max(0, usableWidth - horizontalGap * 2);
    const modalAvailableHeight = Math.max(0, usableHeight - edgeGap * 2);
    const isSmallPhone = usableWidth < 375;
    const isTablet = usableWidth >= 600;
    const isLargeTablet = usableWidth >= 900;
    const horizontalPadding = isSmallPhone ? 12 : isTablet ? (isLargeTablet ? 32 : 24) : 16;
    const modalCaps = { small: 480, normal: 680, large: 900, full: 1200 };
    const modalMaxWidth = modalCaps[modalSize] || modalCaps.large;
    return {
      insets, width, height, fontScale, usableWidth, usableHeight,
      isSmallPhone, isTablet, isLargeTablet,
      compact: isSmallPhone || usableHeight < 700,
      isShortScreen: usableHeight < 620,
      isLandscape: usableWidth > usableHeight,
      modalAvailableWidth,
      modalAvailableHeight,
      horizontalPadding,
      contentWidth: Math.max(0, usableWidth - horizontalPadding * 2),
      screenStyle: { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
      pageContentStyle: { width: '100%', paddingHorizontal: horizontalPadding, alignSelf: 'center' },
      modalBackdropStyle: {
        paddingTop: insets.top + edgeGap, paddingBottom: insets.bottom + edgeGap,
        paddingLeft: insets.left + horizontalGap, paddingRight: insets.right + horizontalGap,
      },
      modalCardStyle: {
        width: '100%', maxWidth: Math.min(modalMaxWidth, modalAvailableWidth),
        // Do not set minHeight here. Modal components own their minimum size;
        // overriding it with 0 can collapse flex-based ScrollViews to the header.
        maxHeight: modalAvailableHeight, alignSelf: 'center', overflow: 'hidden', flexShrink: 1,
      },
    };
  }, [width,height,fontScale,insetsRaw.top,insetsRaw.bottom,insetsRaw.left,insetsRaw.right,edgeGap,horizontalGap,modalSize]);
}
