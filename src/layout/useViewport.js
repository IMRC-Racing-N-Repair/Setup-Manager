import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const initialWebViewport = { width: 0, height: 0, scale: 1, fontScale: 1 };

export default function useViewport() {
  const dimensions = useWindowDimensions();
  const [mounted, setMounted] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expo exports HTML without knowing the browser's viewport.
  return mounted ? dimensions : initialWebViewport;
}
