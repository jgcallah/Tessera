import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StartScreen } from "./StartScreen";
import { saveProject } from "../lib/project-storage";
import { createDefaultGridConfig } from "../lib/grid-config";
import { createDefaultSpaceConfig } from "../lib/space-config";
import { createDefaultBinConfig } from "../lib/bin-config";
import { createDefaultBaseplateConfig } from "../lib/baseplate-config";
import type { ProjectData } from "../lib/project";

function createTestData(): ProjectData {
  return {
    version: 1,
    gridConfig: createDefaultGridConfig(),
    spaceConfig: createDefaultSpaceConfig(),
    binConfig: createDefaultBinConfig(),
    baseplateConfig: createDefaultBaseplateConfig(),
    layout: { items: [], gridUnitsX: 9, gridUnitsY: 7 },
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("StartScreen — empty state", () => {
  it("renders the title", () => {
    render(<StartScreen onNewProject={() => {}} onOpenProject={() => {}} />);
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });

  it("renders New Project button", () => {
    render(<StartScreen onNewProject={() => {}} onOpenProject={() => {}} />);
    expect(screen.getByTestId("new-project")).toBeInTheDocument();
  });

  it("does not show project list when empty", () => {
    render(<StartScreen onNewProject={() => {}} onOpenProject={() => {}} />);
    expect(screen.queryByTestId("project-list")).not.toBeInTheDocument();
  });

  it("calls onNewProject when clicking New Project", () => {
    const onNew = vi.fn();
    render(<StartScreen onNewProject={onNew} onOpenProject={() => {}} />);
    fireEvent.click(screen.getByTestId("new-project"));
    expect(onNew).toHaveBeenCalledOnce();
  });
});

describe("StartScreen — with saved projects", () => {
  it("shows saved projects", () => {
    saveProject("Kitchen Drawer", createTestData());
    saveProject("Workshop Shelf", createTestData());
    render(<StartScreen onNewProject={() => {}} onOpenProject={() => {}} />);
    expect(screen.getByText("Kitchen Drawer")).toBeInTheDocument();
    expect(screen.getByText("Workshop Shelf")).toBeInTheDocument();
  });

  it("calls onOpenProject when clicking a project", () => {
    const id = saveProject("My Project", createTestData());
    const onOpen = vi.fn();
    render(<StartScreen onNewProject={() => {}} onOpenProject={onOpen} />);
    fireEvent.click(screen.getByTestId(`open-${id}`));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1 }),
      "My Project",
      id
    );
  });

  it("deletes a project when clicking delete and confirming", () => {
    const id = saveProject("To Delete", createTestData());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<StartScreen onNewProject={() => {}} onOpenProject={() => {}} />);
    fireEvent.click(screen.getByTestId(`delete-${id}`));
    expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
  });

  it("does not delete when confirm is cancelled", () => {
    const id = saveProject("Keep Me", createTestData());
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<StartScreen onNewProject={() => {}} onOpenProject={() => {}} />);
    fireEvent.click(screen.getByTestId(`delete-${id}`));
    expect(screen.getByText("Keep Me")).toBeInTheDocument();
  });
});
