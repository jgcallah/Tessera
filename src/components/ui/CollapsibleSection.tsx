import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between py-1 text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        {title}
        <span className="text-zinc-600">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  );
}
