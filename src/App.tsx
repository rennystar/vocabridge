import type { ReactNode } from "react";
import AppPreviewFrame from "./components/AppPreviewFrame";
import { currentWindowKind } from "./lib/windowKind";
import HistoryWindow from "./windows/HistoryWindow";
import MainWindow from "./windows/MainWindow";
import SettingsWindow from "./windows/SettingsWindow";

function App() {
  const kind = currentWindowKind();
  let windowContent: ReactNode;

  if (kind === "settings") {
    windowContent = <SettingsWindow />;
  } else if (kind === "history") {
    windowContent = <HistoryWindow />;
  } else {
    windowContent = <MainWindow />;
  }

  return <AppPreviewFrame kind={kind}>{windowContent}</AppPreviewFrame>;
}

export default App;
