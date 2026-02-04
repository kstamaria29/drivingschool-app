import { Image, type ImageProps } from "react-native";

import { cn } from "../utils/cn";

type Props = ImageProps;

export function AppImage({ className, ...props }: Props) {
  return <Image className={cn(className)} {...props} />;
}

