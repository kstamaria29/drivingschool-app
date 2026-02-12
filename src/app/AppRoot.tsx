import { RootNavigation } from "../navigation/RootNavigation";
import { useOpenPdfFromDownloadNotifications } from "../features/notifications/download-notifications";

type Props = {
  onBootReady?: () => void;
};

export function AppRoot({ onBootReady }: Props) {
  useOpenPdfFromDownloadNotifications();
  return <RootNavigation onBootReady={onBootReady} />;
}
