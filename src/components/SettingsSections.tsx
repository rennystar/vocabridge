import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { DEFAULT_GLOBAL_HOTKEY } from "../lib/defaultSettings";
import { SOURCE_LABELS } from "../lib/sourceLabels";
import type { DictSource, Settings } from "../lib/types";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

interface SettingsSectionsProps {
  settings: Settings;
  availableSources: DictSource[];
  onUpdate: (settings: Settings) => void;
}

export default function SettingsSections({
  settings,
  availableSources,
  onUpdate,
}: SettingsSectionsProps) {
  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    onUpdate({ ...settings, [key]: value });
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Appearance">
        <FieldBlock label="Display size">
          <TextToggleGroup
            value={settings.displaySize}
            options={DISPLAY_SIZE_OPTIONS}
            ariaLabel="Display size"
            onValueChange={(value) =>
              update("displaySize", value as Settings["displaySize"])
            }
          />
        </FieldBlock>
      </Section>

      <Section title="Lookup">
        {availableSources.length > 1 && (
          <Field label="Default dictionary">
            <Select
              value={settings.dictSource}
              onValueChange={(value) => update("dictSource", value as DictSource)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {availableSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {SOURCE_LABELS[source].full}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}

        <FieldBlock label="History click">
          <TextToggleGroup
            value={settings.historyClickBehavior}
            options={HISTORY_CLICK_OPTIONS}
            ariaLabel="History click behavior"
            onValueChange={(value) =>
              update(
                "historyClickBehavior",
                value as Settings["historyClickBehavior"],
              )
            }
          />
        </FieldBlock>

        <FieldBlock label="Search delay">
          <DelayToggleGroup
            value={settings.searchDelay}
            options={SEARCH_DELAY_OPTIONS}
            ariaLabel="Search delay"
            onValueChange={(value) => update("searchDelay", value)}
          />
        </FieldBlock>

        <FieldBlock label="Clear delay">
          <DelayToggleGroup
            value={settings.clearDelay}
            options={CLEAR_DELAY_OPTIONS}
            ariaLabel="Clear delay"
            onValueChange={(value) => update("clearDelay", value)}
          />
        </FieldBlock>

        <SwitchRow
          label="Convert Korean layout"
          checked={settings.convertKoreanInput}
          onCheckedChange={(checked) => update("convertKoreanInput", checked)}
        />
      </Section>

      <Section title="Results">
        <Field label="Examples">
          <Select
            value={settings.exampleDisplay}
            onValueChange={(value) =>
              update("exampleDisplay", value as Settings["exampleDisplay"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All examples</SelectItem>
                <SelectItem value="firstPerMeaning">
                  First example per meaning
                </SelectItem>
                <SelectItem value="hidden">Hide examples</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <SwitchRow
          label="Collapse examples"
          checked={settings.collapseExamples}
          onCheckedChange={(checked) => update("collapseExamples", checked)}
        />

        <SwitchRow
          label="Highlight search term"
          checked={settings.highlightExampleTerms}
          onCheckedChange={(checked) => update("highlightExampleTerms", checked)}
        />
      </Section>

      <Section title="Audio">
        <SwitchRow
          label="Auto-play audio"
          checked={settings.autoPlayAudio}
          onCheckedChange={(checked) => update("autoPlayAudio", checked)}
        />
        <Field label="Preferred pronunciation">
          <Select
            value={settings.preferredRegion}
            onValueChange={(value) => update("preferredRegion", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="uk">UK</SelectItem>
                <SelectItem value="us">US</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Window">
        <SwitchRow
          label="Always on top"
          checked={settings.alwaysOnTop}
          onCheckedChange={(checked) => update("alwaysOnTop", checked)}
        />
        <Field label="Global hotkey">
          <HotkeyRecorder
            value={settings.globalHotkey}
            onChange={(value) => update("globalHotkey", value)}
          />
        </Field>
      </Section>
    </div>
  );
}

function HotkeyRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const recorderRef = useRef<HTMLButtonElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  useEffect(() => {
    cancelRecording();
  }, [cancelRecording, value]);

  useEffect(() => {
    if (!isRecording) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cancelRecording();
      }
    };

    window.addEventListener("blur", cancelRecording);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", cancelRecording);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancelRecording, isRecording]);

  function startRecording() {
    setIsRecording(true);
    recorderRef.current?.focus();
  }

  function resetHotkey() {
    cancelRecording();
    if (value !== DEFAULT_GLOBAL_HOTKEY) {
      onChange(DEFAULT_GLOBAL_HOTKEY);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!isRecording) return;

    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    cancelRecording();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isRecording) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      cancelRecording();
      return;
    }

    const nextHotkey = formatHotkey(event);
    if (!nextHotkey) return;

    onChange(nextHotkey);
    cancelRecording();
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-2"
        onBlur={handleBlur}
      >
        <button
          ref={recorderRef}
          type="button"
          data-testid="hotkey-recorder"
          onClick={startRecording}
          onKeyDown={handleKeyDown}
          className="flex h-9 min-w-0 flex-1 items-center rounded-md border border-app-border bg-app-bg px-3 text-left text-sm font-medium text-app-muted outline-none transition-colors focus:ring-1 focus:ring-app-accent"
          aria-label="Current global hotkey"
        >
          <span className="truncate">
            {isRecording ? "Press shortcut" : value}
          </span>
        </button>
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="h-9 shrink-0 px-3 text-xs"
          onClick={isRecording ? cancelRecording : startRecording}
          aria-label={isRecording ? "Cancel shortcut change" : "Change shortcut"}
        >
          {isRecording ? "Cancel" : "Change"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="h-9 shrink-0 px-3 text-xs"
          onClick={resetHotkey}
          aria-label="Reset shortcut"
        >
          Reset
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-app-dim">
        {isRecording
          ? "Use a modifier plus a key. Esc cancels."
          : "Focuses the main window from anywhere."}
      </p>
    </div>
  );
}

const MODIFIER_KEYS = new Set([
  "Alt",
  "Control",
  "Meta",
  "OS",
  "Shift",
]);

function formatHotkey(event: KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(event.key)) return null;

  const key = normalizeHotkeyKey(event.code, event.key);
  if (!key) return null;

  const modifiers: string[] = [];
  if (event.metaKey || event.ctrlKey) modifiers.push("CmdOrCtrl");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.altKey) modifiers.push("Alt");
  if (modifiers.length === 0) return null;

  return [...modifiers, key].join("+");
}

const CODE_KEY_MAP: Record<string, string> = {
  Backquote: "`",
  Backslash: "\\",
  Backspace: "Backspace",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Delete: "Delete",
  End: "End",
  Enter: "Enter",
  Equal: "=",
  Home: "Home",
  Minus: "-",
  PageDown: "PageDown",
  PageUp: "PageUp",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
  Space: "Space",
  Tab: "Tab",
};

function normalizeHotkeyKey(code: string, key: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  if (/^F\d{1,2}$/.test(code)) return code;
  if (code.startsWith("Arrow")) return code;
  if (CODE_KEY_MAP[code]) return CODE_KEY_MAP[code];

  if (key.length === 1) {
    if (key === " ") return "Space";
    return key.toUpperCase();
  }

  if (key.startsWith("Arrow")) return key;

  const namedKeys = new Set([
    "Backspace",
    "Delete",
    "End",
    "Enter",
    "Home",
    "PageDown",
    "PageUp",
    "Space",
    "Tab",
  ]);

  return namedKeys.has(key) ? key : null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase text-app-muted/80">
        {title}
      </h2>
      <div className="flex flex-col gap-4 rounded-md border border-app-border/50 bg-app-panel/60 p-4">
        {children}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-app-text/80">{label}</span>
      {children}
    </label>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-app-text/80">{label}</span>
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-sm font-medium text-app-text/80">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface DelayOption {
  label: string;
  valueLabel: string;
  value: number;
}

interface TextOption {
  label: string;
  value: string;
}

const DISPLAY_SIZE_OPTIONS: TextOption[] = [
  { label: "Compact", value: "compact" },
  { label: "Default", value: "default" },
  { label: "Large", value: "large" },
];

const HISTORY_CLICK_OPTIONS: TextOption[] = [
  { label: "Saved snapshot", value: "savedSnapshot" },
  { label: "Refresh", value: "refreshFromDictionary" },
];

const SEARCH_DELAY_OPTIONS: DelayOption[] = [
  { label: "Fast", valueLabel: "0.8s", value: 800 },
  { label: "Normal", valueLabel: "1s", value: 1000 },
  { label: "Relaxed", valueLabel: "1.5s", value: 1500 },
];

const CLEAR_DELAY_OPTIONS: DelayOption[] = [
  { label: "Quick", valueLabel: "2s", value: 2000 },
  { label: "Normal", valueLabel: "3s", value: 3000 },
  { label: "Long", valueLabel: "5s", value: 5000 },
  { label: "Hold", valueLabel: "10s", value: 10000 },
];

function TextToggleGroup({
  value,
  options,
  ariaLabel,
  onValueChange,
}: {
  value: string;
  options: TextOption[];
  ariaLabel: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(nextValue) => {
        if (!nextValue) return;
        onValueChange(nextValue);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function DelayToggleGroup({
  value,
  options,
  ariaLabel,
  onValueChange,
}: {
  value: number;
  options: DelayOption[];
  ariaLabel: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={String(value)}
      aria-label={ariaLabel}
      onValueChange={(nextValue) => {
        if (!nextValue) return;
        onValueChange(Number(nextValue));
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={String(option.value)}
          aria-label={`${option.label} ${option.valueLabel}`}
        >
          <span className="flex flex-col items-center leading-tight">
            <span>{option.label}</span>
            <span className="text-[0.7rem] text-app-dim">
              {option.valueLabel}
            </span>
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
