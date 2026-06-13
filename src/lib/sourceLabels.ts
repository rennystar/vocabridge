import type { DictSource } from "./types";

export const SOURCE_LABELS: Record<
  DictSource,
  { compact: string; full: string }
> = {
  cambridge: {
    compact: "Cambridge",
    full: "Cambridge Dictionary",
  },
  free_dictionary: {
    compact: "Free Dictionary",
    full: "Free Dictionary",
  },
};
