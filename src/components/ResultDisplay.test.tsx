import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResultDisplay from "./ResultDisplay";
import type { WordEntry } from "../lib/types";

vi.mock("../lib/commands", () => ({
  playAudio: vi.fn(),
}));

const resultWithExamples: WordEntry = {
  word: "bridge",
  source: "cambridge",
  entries: [
    {
      part_of_speech: "noun",
      pronunciations: [
        {
          ipa: "ˈbrɪdʒ",
          audio_url: null,
          region: "UK",
        },
      ],
      senses: [
        {
          definition: "a structure carrying a road over water",
          examples: [
            "The bridge crosses the river.",
            "We walked across the old stone bridge.",
          ],
        },
        {
          definition: "a connection between two things",
          examples: ["The program builds a bridge between systems."],
        },
      ],
    },
  ],
};

const multiEntryResult: WordEntry = {
  word: "set",
  source: "cambridge",
  entries: [
    {
      part_of_speech: "verb",
      pronunciations: [
        {
          ipa: "set",
          audio_url: null,
          region: "UK",
        },
      ],
      senses: [
        {
          definition: "to put something in a particular position",
          examples: [],
        },
      ],
    },
    {
      part_of_speech: "noun",
      pronunciations: [
        {
          ipa: "set",
          audio_url: null,
          region: "US",
        },
      ],
      senses: [
        {
          definition: "a group of similar things",
          examples: [],
        },
      ],
    },
  ],
};

describe("ResultDisplay", () => {
  it("renders the result word as the dominant text element", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="all"
        collapseExamples={false}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    expect(screen.getByRole("heading", { name: "bridge" }).className).toContain(
      "text-[length:var(--vb-headword-size)]",
    );
  });

  it("keeps the headword outside the scroll viewport and sticks entry metadata at the viewport top", () => {
    render(
      <ResultDisplay
        result={multiEntryResult}
        exampleDisplay="all"
        collapseExamples={false}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    expect(screen.getByTestId("result-display").className.split(" ")).toContain(
      "min-h-0",
    );

    const headword = screen.getByTestId("result-headword");
    const headwordClasses = headword.className.split(" ");
    expect(headwordClasses).toContain("shrink-0");
    expect(headwordClasses).toContain("bg-app-bg");
    expect(headwordClasses).toContain("pb-[var(--vb-headword-pb)]");
    expect(headwordClasses).not.toContain("sticky");
    expect(headwordClasses).not.toContain("border-b");
    expect(headwordClasses).not.toContain("backdrop-blur");

    const entriesViewport = screen.getByTestId("result-entries-scroll");
    const viewportClasses = entriesViewport.className.split(" ");
    expect(viewportClasses).toContain("min-h-0");
    expect(viewportClasses).toContain("flex-1");
    expect(viewportClasses).toContain("overflow-y-auto");

    const entriesList = screen.getByTestId("result-entries-list");
    const entriesListClasses = entriesList.className.split(" ");
    expect(entriesListClasses).toContain("flex");
    expect(entriesListClasses).toContain("flex-col");
    expect(entriesListClasses).toContain("gap-[var(--vb-entry-gap)]");

    const entryHeaders = screen.getAllByTestId("entry-header");
    expect(entryHeaders).toHaveLength(2);
    const firstHeaderClasses = entryHeaders[0].className.split(" ");
    const secondHeaderClasses = entryHeaders[1].className.split(" ");
    expect(firstHeaderClasses).toContain("sticky");
    expect(firstHeaderClasses).toContain("top-0");
    expect(firstHeaderClasses).toContain("bg-app-bg");
    expect(firstHeaderClasses).not.toContain("border-b");
    expect(firstHeaderClasses).not.toContain("backdrop-blur");
    expect(entryHeaders[0].textContent).toContain("verb");
    expect(secondHeaderClasses).toContain("sticky");
    expect(secondHeaderClasses).toContain("top-0");
    expect(entryHeaders[1].textContent).toContain("noun");
  });

  it("shows examples inline by default without collapse controls", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="all"
        collapseExamples={false}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    expect(
      screen.getByText("a structure carrying a road over water"),
    ).toBeTruthy();
    expect(screen.getByText("a connection between two things")).toBeTruthy();
    expect(screen.getByText("The bridge crosses the river.")).toBeTruthy();
    expect(
      screen.getByText("We walked across the old stone bridge."),
    ).toBeTruthy();
    expect(
      screen.getByText("The program builds a bridge between systems."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show examples" })).toBeNull();
  });

  it("uses the roomier expanded spacing when examples are shown inline", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="all"
        collapseExamples={false}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    const firstExampleList = screen.getAllByTestId("example-list")[0];
    const classes = firstExampleList.className.split(" ");

    expect(classes).toContain("mt-2");
    expect(classes).toContain("mb-1");
  });

  it("shows only the first example for each meaning when requested", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="firstPerMeaning"
        collapseExamples={false}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    expect(screen.getByText("The bridge crosses the river.")).toBeTruthy();
    expect(
      screen.queryByText("We walked across the old stone bridge."),
    ).toBeNull();
    expect(
      screen.getByText("The program builds a bridge between systems."),
    ).toBeTruthy();
  });

  it("can hide all examples without hiding definitions", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="hidden"
        collapseExamples={false}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    expect(
      screen.getByText("a structure carrying a road over water"),
    ).toBeTruthy();
    expect(screen.queryByText("The bridge crosses the river.")).toBeNull();
  });

  it("can collapse examples behind show and hide controls", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="all"
        collapseExamples={true}
        highlightExampleTerms={false}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    expect(screen.getAllByRole("button", { name: "Show examples" })).toHaveLength(
      2,
    );
    expect(screen.queryByText("The bridge crosses the river.")).toBeNull();
  });

  it("highlights the searched word inside example sentences when enabled", () => {
    render(
      <ResultDisplay
        result={resultWithExamples}
        exampleDisplay="all"
        collapseExamples={false}
        highlightExampleTerms={true}
        autoPlayAudio={false}
        preferredRegion="uk"
      />,
    );

    const highlights = screen.getAllByTestId("example-term-highlight");
    expect(highlights).toHaveLength(3);
    expect(highlights.map((node) => node.textContent)).toEqual([
      "bridge",
      "bridge",
      "bridge",
    ]);
  });
});
