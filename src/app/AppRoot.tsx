import { RootNavigation } from "../navigation/RootNavigation";
import { useConfigureNotifications } from "../features/notifications/setup";
import { useOpenPdfFromDownloadNotifications } from "../features/notifications/download-notifications";

type Props = {
  onBootReady?: () => void;
};

export function AppRoot({ onBootReady }: Props) {
  useConfigureNotifications();
  useOpenPdfFromDownloadNotifications();
  return <RootNavigation onBootReady={onBootReady} />;
}
