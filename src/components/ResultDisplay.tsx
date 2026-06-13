import { useEffect, useRef, useState, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { playAudio } from "../lib/commands";
import type {
  DictEntry,
  ExampleDisplay,
  Pronunciation,
  WordEntry,
} from "../lib/types";

interface ResultDisplayProps {
  result: WordEntry | null;
  exampleDisplay: ExampleDisplay;
  collapseExamples: boolean;
  highlightExampleTerms: boolean;
  autoPlayAudio: boolean;
  preferredRegion: string;
}

export default function ResultDisplay({
  result,
  exampleDisplay,
  collapseExamples,
  highlightExampleTerms,
  autoPlayAudio,
  preferredRegion,
}: ResultDisplayProps) {
  const autoPlayedFor = useRef<string | null>(null);

  // Auto-play pronunciation for preferred region when a new result arrives
  useEffect(() => {
    if (!result || !autoPlayAudio) return;

    // Build a unique key for this result to avoid replaying on re-renders
    const resultKey = `${result.word}:${result.source}`;
    if (autoPlayedFor.current === resultKey) return;
    autoPlayedFor.current = resultKey;

    const url = findPreferredAudioUrl(result.entries, preferredRegion);
    if (url) {
      playAudio(url).catch(() => {
        // Audio playback errors are non-critical; silently ignore
      });
    }
  }, [result, autoPlayAudio, preferredRegion]);

  if (!result) return null;

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col px-6"
      data-testid="result-display"
    >
      {/* Headword */}
      <div
        className="shrink-0 -mx-6 bg-app-bg px-6 pb-[var(--vb-headword-pb)] pt-[var(--vb-headword-pt)] text-center"
        data-testid="result-headword"
      >
        <h1 className="text-[length:var(--vb-headword-size)] font-semibold leading-tight text-app-text">
          {result.word}
        </h1>
      </div>

      <div
        className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6 pb-6"
        data-testid="result-entries-scroll"
      >
        <div
          className="flex flex-col gap-[var(--vb-entry-gap)]"
          data-testid="result-entries-list"
        >
          {/* Entries grouped by part of speech */}
          {result.entries.map((entry, entryIdx) => (
            <EntrySection
              key={entryIdx}
              entry={entry}
              word={result.word}
              exampleDisplay={exampleDisplay}
              collapseExamples={collapseExamples}
              highlightExampleTerms={highlightExampleTerms}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Entry section for a single part-of-speech block ---------------------

interface EntrySectionProps {
  entry: DictEntry;
  word: string;
  exampleDisplay: ExampleDisplay;
  collapseExamples: boolean;
  highlightExampleTerms: boolean;
}

function EntrySection({
  entry,
  word,
  exampleDisplay,
  collapseExamples,
  highlightExampleTerms,
}: EntrySectionProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Part of speech + pronunciations row */}
      <div
        className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center gap-3 bg-app-bg px-6 py-[var(--vb-entry-header-py)]"
        data-testid="entry-header"
      >
        {entry.part_of_speech && (
          <span className="text-sm font-medium italic text-app-accent">
            {entry.part_of_speech}
          </span>
        )}
        {entry.pronunciations.map((p, i) => (
          <PronunciationBadge key={i} pronunciation={p} />
        ))}
      </div>

      {/* Definitions */}
      <ol className="flex list-inside list-decimal flex-col gap-2 text-[length:var(--vb-definition-size)] text-app-text/90">
        {entry.senses.map((sense, senseIdx) => {
          const examples = getVisibleExamples(sense.examples, exampleDisplay);

          return (
            <li key={senseIdx} className="leading-relaxed marker:text-app-dim">
              <span>{sense.definition}</span>
              {examples.length > 0 && (
                <ExampleBlock
                  examples={examples}
                  word={word}
                  collapseExamples={collapseExamples}
                  highlightExampleTerms={highlightExampleTerms}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// -- Pronunciation badge with optional audio button ----------------------

interface PronunciationBadgeProps {
  pronunciation: Pronunciation;
}

function PronunciationBadge({ pronunciation }: PronunciationBadgeProps) {
  const [playing, setPlaying] = useState(false);

  const handlePlay = async () => {
    if (!pronunciation.audio_url || playing) return;
    setPlaying(true);
    try {
      await playAudio(pronunciation.audio_url);
    } catch {
      // Audio errors are non-critical
    } finally {
      setPlaying(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1 text-sm text-app-muted">
      {pronunciation.region && (
        <span className="text-xs font-medium uppercase text-app-dim">
          {pronunciation.region}
        </span>
      )}
      {pronunciation.ipa && (
        <span className="font-phonetic text-app-text/80">
          /{pronunciation.ipa}/
        </span>
      )}
      {pronunciation.audio_url && (
        <button
          type="button"
          onClick={handlePlay}
          disabled={playing}
          className="ml-1 text-app-accent transition-colors hover:text-app-accent/75 disabled:opacity-50"
          aria-label={`Play ${pronunciation.region ?? ""} pronunciation`}
        >
          <Volume2 className="size-4" />
        </button>
      )}
    </span>
  );
}

// -- Example display -----------------------------------------------------

interface ExampleBlockProps {
  examples: string[];
  word: string;
  collapseExamples: boolean;
  highlightExampleTerms: boolean;
}

function ExampleBlock({
  examples,
  word,
  collapseExamples,
  highlightExampleTerms,
}: ExampleBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!collapseExamples) {
    return (
      <ExampleList
        examples={examples}
        word={word}
        highlightExampleTerms={highlightExampleTerms}
        className="mt-2 mb-1"
      />
    );
  }

  return (
    <div className="mt-1 ml-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-medium text-app-dim transition-colors hover:text-app-muted"
      >
        {expanded ? "Hide examples" : "Show examples"}
      </button>
      {expanded && (
        <ExampleList
          examples={examples}
          word={word}
          highlightExampleTerms={highlightExampleTerms}
          className="mt-1"
        />
      )}
    </div>
  );
}

function ExampleList({
  examples,
  word,
  highlightExampleTerms,
  className = "mt-1",
}: {
  examples: string[];
  word: string;
  highlightExampleTerms: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${className} ml-4 flex flex-col gap-1 border-l border-app-border pl-3`}
      data-testid="example-list"
    >
      {examples.map((example, index) => (
        <p
          key={index}
          className="text-[length:var(--vb-example-size)] italic text-app-muted"
        >
          {renderExampleText(example, word, highlightExampleTerms)}
        </p>
      ))}
    </div>
  );
}

// -- Helpers -------------------------------------------------------------

function getVisibleExamples(
  examples: string[],
  exampleDisplay: ExampleDisplay,
): string[] {
  if (exampleDisplay === "hidden") return [];
  if (exampleDisplay === "firstPerMeaning") return examples.slice(0, 1);
  return examples;
}

function renderExampleText(
  example: string,
  word: string,
  highlightExampleTerms: boolean,
): ReactNode {
  const term = word.trim();
  if (!highlightExampleTerms || !term) return example;

  const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
  const parts = example.split(pattern);

  return parts.map((part, index) => {
    if (part.toLowerCase() !== term.toLowerCase()) return part;

    return (
      <mark
        key={`${part}-${index}`}
        data-testid="example-term-highlight"
        className="rounded-[3px] bg-app-accent/20 px-0.5 text-app-text ring-1 ring-app-accent/25"
      >
        {part}
      </mark>
    );
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPreferredAudioUrl(
  entries: DictEntry[],
  preferredRegion: string
): string | null {
  // First pass: look for exact region match
  for (const entry of entries) {
    for (const p of entry.pronunciations) {
      if (
        p.audio_url &&
        p.region?.toLowerCase() === preferredRegion.toLowerCase()
      ) {
        return p.audio_url;
      }
    }
  }
  // Fallback: return the first available audio URL
  for (const entry of entries) {
    for (const p of entry.pronunciations) {
      if (p.audio_url) {
        return p.audio_url;
      }
    }
  }
  return null;
}

// Export helper so App.tsx can use it for keyboard shortcut audio playback
export { findPreferredAudioUrl };
