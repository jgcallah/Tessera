import { useState } from "react";

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
}

export function Tooltip({ text }: TooltipProps): React.JSX.Element {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200"
        onMouseEnter={() => {
          setShow(true);
        }}
        onMouseLeave={() => {
          setShow(false);
        }}
        onFocus={() => {
          setShow(true);
        }}
        onBlur={() => {
          setShow(false);
        }}
        aria-label="Help"
      >
        ?
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded bg-zinc-700 px-3 py-2 text-xs text-zinc-200 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
