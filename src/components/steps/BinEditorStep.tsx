import { useLayout } from "../LayoutContext";

export function BinEditorStep(): React.JSX.Element {
  const { layout } = useLayout();

  return (
    <div className="mx-auto h-full max-w-4xl">
      <h2 className="mb-4 text-lg font-semibold">Bin Editor</h2>
      {layout.items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No bins placed yet. Go back to the Layout step to place bins.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            {layout.items.length} bin{layout.items.length !== 1 ? "s" : ""}{" "}
            placed. Select a bin to configure its properties.
          </p>
          <div className="rounded border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-xs text-zinc-500">
              Bin editor coming in next update — height, lip, magnets, screws,
              compartment dividers, scoops, and label tabs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
