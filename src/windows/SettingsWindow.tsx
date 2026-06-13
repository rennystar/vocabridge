import AuxiliaryWindowFrame from "../components/AuxiliaryWindowFrame";
import SettingsSections from "../components/SettingsSections";
import { ScrollArea } from "../components/ui/scroll-area";
import { useSettingsState } from "../hooks/useSettingsState";
import { useWindowShortcuts } from "../hooks/useWindowShortcuts";
import { closeSettingsWindow } from "../lib/windowApi";

export default function SettingsWindow() {
  const { settings, sources, saveSettings } = useSettingsState();
  useWindowShortcuts({
    onEscape: () => void closeSettingsWindow(),
  });

  return (
    <AuxiliaryWindowFrame
      title="Settings"
      closeLabel="Close settings"
      onClose={() => void closeSettingsWindow()}
      showHeaderDivider={false}
    >
      <ScrollArea className="flex-1">
        <div className="p-4 pt-2" data-testid="settings-content">
          <SettingsSections
            settings={settings}
            availableSources={sources}
            onUpdate={(nextSettings) => void saveSettings(nextSettings)}
          />
        </div>
      </ScrollArea>
    </AuxiliaryWindowFrame>
  );
}
