import type { ReactNode } from "react";

export function Canvas({ children }: { children: ReactNode }) {
  return <div data-testid="r3f-canvas">{children}</div>;
}
