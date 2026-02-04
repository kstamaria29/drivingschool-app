import { useWindowDimensions } from "react-native";

const TABLET_MIN_WIDTH = 768;

export function useNavigationLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= TABLET_MIN_WIDTH;
  const isSidebar = isTablet && isLandscape;

  return {
    isTablet,
    isLandscape,
    isSidebar,
  };
}

