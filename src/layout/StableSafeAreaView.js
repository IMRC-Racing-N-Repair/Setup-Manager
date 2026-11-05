import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ALL_EDGES = ['top', 'right', 'bottom', 'left'];

function numericPadding(...values) {
  const value = values.find((item) => typeof item === 'number');
  return value || 0;
}

/**
 * JS-driven safe-area container.
 *
 * The native SafeAreaView can briefly mount with zero padding and update on a
 * later frame. The app root already waits for stable insets, so applying those
 * same values as ordinary View padding keeps every first visible frame fixed.
 */
export default function StableSafeAreaView({ edges = ALL_EDGES, style, ...props }) {
  const insets = useSafeAreaInsets();
  const edgeSet = useMemo(() => new Set(edges), [edges]);
  const flatStyle = StyleSheet.flatten(style) || {};

  const insetStyle = {
    paddingTop:
      numericPadding(flatStyle.paddingTop, flatStyle.paddingVertical, flatStyle.padding) +
      (edgeSet.has('top') ? insets.top : 0),
    paddingRight:
      numericPadding(flatStyle.paddingRight, flatStyle.paddingHorizontal, flatStyle.padding) +
      (edgeSet.has('right') ? insets.right : 0),
    paddingBottom:
      numericPadding(flatStyle.paddingBottom, flatStyle.paddingVertical, flatStyle.padding) +
      (edgeSet.has('bottom') ? insets.bottom : 0),
    paddingLeft:
      numericPadding(flatStyle.paddingLeft, flatStyle.paddingHorizontal, flatStyle.padding) +
      (edgeSet.has('left') ? insets.left : 0),
  };

  return <View {...props} style={[style, insetStyle]} />;
}
