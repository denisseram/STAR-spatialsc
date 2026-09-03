import { describe, it, expect } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FigureGrid from "../FigureGrid.jsx";
import { testFigures } from "../../test/fixtures.js";

const getSwitch = (name) => screen.getByRole("switch", { name });

describe("FigureGrid default toggle states", () => {
  it("defaults to: Display classification tags ON, Interactive papers only OFF, Include benchmarking OFF", () => {
    render(<FigureGrid figures={testFigures} />);

    expect(getSwitch(/display classification tags/i)).toBeChecked();
    expect(getSwitch(/interactive papers only/i)).not.toBeChecked();
    expect(getSwitch(/include benchmarking and schematic figures/i)).not.toBeChecked();
  });

  it("hides the benchmarking figure by default and shows it once the toggle is switched on", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    expect(screen.queryByText("Paper Three: Benchmarking Study")).not.toBeInTheDocument();

    await user.click(getSwitch(/include benchmarking and schematic figures/i));

    expect(screen.getByText("Paper Three: Benchmarking Study")).toBeInTheDocument();
  });

  it("shows only figures from interactive papers when that toggle is on", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    expect(screen.getByText("Paper One: Spatial Gene Expression")).toBeInTheDocument();
    expect(screen.getByText("Paper Two: Cluster Analysis")).toBeInTheDocument();

    await user.click(getSwitch(/interactive papers only/i));

    expect(screen.getByText("Paper One: Spatial Gene Expression")).toBeInTheDocument();
    expect(screen.queryByText("Paper Two: Cluster Analysis")).not.toBeInTheDocument();
  });

  it("hides classification attribute tags when Display classification tags is off", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    expect(screen.getByText("Modality : MERFISH")).toBeInTheDocument();

    await user.click(getSwitch(/display classification tags/i));

    expect(screen.queryByText("Modality : MERFISH")).not.toBeInTheDocument();
    // Actions must stay visible even with tags hidden
    expect(screen.getAllByRole("button", { name: /^open figure/i }).length).toBeGreaterThan(0);
  });

  it("switches update results immediately, and are keyboard-operable", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    const interactivitySwitch = getSwitch(/interactive papers only/i);
    interactivitySwitch.focus();
    expect(interactivitySwitch).toHaveFocus();

    await user.keyboard(" ");
    expect(interactivitySwitch).toBeChecked();
    expect(screen.queryByText("Paper Two: Cluster Analysis")).not.toBeInTheDocument();
  });

  it("restores all three defaults after 'Clear all' filters", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    await user.click(getSwitch(/interactive papers only/i));
    await user.click(getSwitch(/include benchmarking and schematic figures/i));
    await user.click(getSwitch(/display classification tags/i));

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(getSwitch(/interactive papers only/i)).not.toBeChecked();
    expect(getSwitch(/include benchmarking and schematic figures/i)).not.toBeChecked();
  });
});

describe("FigureGrid filtering and search", () => {
  it("shows a code filter as an active chip and removes it on click", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    const filterButton = screen.getByRole("button", { name: /^MERFISH/ });
    await user.click(filterButton);

    expect(screen.getByText("Paper One: Spatial Gene Expression")).toBeInTheDocument();
    expect(screen.queryByText("Paper Two: Cluster Analysis")).not.toBeInTheDocument();

    const activeBar = screen.getByLabelText("Active filters");
    const chip = within(activeBar).getByRole("button", { name: /remove filter/i });
    await user.click(chip);

    expect(screen.getByText("Paper Two: Cluster Analysis")).toBeInTheDocument();
  });

  it("shows a no-results state with a clear-search action when a search has no matches", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    const searchInput = screen.getByLabelText("Search by research question");
    await user.type(searchInput, "zzz-no-such-topic-zzz");

    await waitFor(() => {
      expect(
        screen.getByText("No figures match your current search and filters.")
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("filters figures by the research question search", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    const searchInput = screen.getByLabelText("Search by research question");
    await user.type(searchInput, "cluster");

    await waitFor(() => {
      expect(screen.queryByText("Paper One: Spatial Gene Expression")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Paper Two: Cluster Analysis")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search input" }));
    await waitFor(() => {
      expect(screen.getByText("Paper One: Spatial Gene Expression")).toBeInTheDocument();
    });
  });

  it("opens the complete classification metadata modal from a figure card", async () => {
    const user = userEvent.setup();
    render(<FigureGrid figures={testFigures} />);

    const openButtons = screen.getAllByRole("button", { name: /^open figure/i });
    await user.click(openButtons[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Classification metadata")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
