import { RootNavigation } from "../navigation/RootNavigation";
import { useOpenPdfFromDownloadNotifications } from "../features/notifications/download-notifications";

export function AppRoot() {
  useOpenPdfFromDownloadNotifications();
  return <RootNavigation />;
}
