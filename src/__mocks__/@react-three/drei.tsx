import { forwardRef } from "react";
import type { ReactNode } from "react";

export const OrbitControls = forwardRef(function OrbitControls() {
  return null;
});

export function GizmoHelper({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function GizmoViewcube() {
  return null;
}

export function Html({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function Edges() {
  return null;
}
