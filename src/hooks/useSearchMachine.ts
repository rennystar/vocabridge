import { useReducer } from "react";
import type { WordEntry } from "../lib/types";

// -- Status type ---------------------------------------------------------

export type SearchStatus =
  | "idle"
  | "typing"
  | "searching"
  | "displaying"
  | "error"
  | "cleared";

// -- State ---------------------------------------------------------------

export interface SearchState {
  status: SearchStatus;
  query: string;
  result: WordEntry | null;
  error: string | null;
  previousResult: WordEntry | null;
}

const initialState: SearchState = {
  status: "idle",
  query: "",
  result: null,
  error: null,
  previousResult: null,
};

// -- Actions -------------------------------------------------------------

export type SearchAction =
  | { type: "TYPE"; text: string }
  | { type: "SEARCH" }
  | { type: "RESULT"; entry: WordEntry }
  | { type: "ERROR"; message: string }
  | { type: "CLEAR" }
  | { type: "RESET" };

// -- Reducer -------------------------------------------------------------

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "TYPE":
      return {
        ...state,
        status: "typing",
        query: action.text,
        error: null,
      };
    case "SEARCH":
      return {
        ...state,
        status: "searching",
        error: null,
      };
    case "RESULT":
      return {
        ...state,
        status: "displaying",
        result: action.entry,
        previousResult: state.result,
        error: null,
      };
    case "ERROR":
      return {
        ...state,
        status: "error",
        error: action.message,
      };
    case "CLEAR":
      return {
        ...state,
        status: "cleared",
        query: "",
        previousResult: state.result ?? state.previousResult,
        result: null,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// -- Hook ----------------------------------------------------------------

export function useSearchMachine() {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  return { state, dispatch } as const;
}
