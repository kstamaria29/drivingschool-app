import { useWindowDimensions } from "react-native";

const TABLET_MIN_WIDTH = 768;
const COMPACT_MAX_WIDTH = 600;

export function useNavigationLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const minDimension = Math.min(width, height);
  const isCompact = minDimension < COMPACT_MAX_WIDTH;
  const isTablet = minDimension >= TABLET_MIN_WIDTH;
  const isSidebar = isTablet && isLandscape;

  return {
    isTablet,
    isLandscape,
    isSidebar,
    isCompact,
  };
}
