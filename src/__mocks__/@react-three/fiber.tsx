import type { ReactNode } from "react";

export function Canvas({ children }: { children: ReactNode }) {
  return <div data-testid="r3f-canvas">{children}</div>;
}

const noop = () => undefined;

export function useThree() {
  return {
    camera: {
      position: { set: noop },
      lookAt: noop,
    },
    scene: {},
    gl: {},
  };
}
