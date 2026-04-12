import Module from "manifold-3d";

let manifoldInstance: Awaited<ReturnType<typeof Module>> | null = null;

export async function getManifold(): Promise<
  Awaited<ReturnType<typeof Module>>
> {
  if (manifoldInstance) return manifoldInstance;
  manifoldInstance = await Module();
  manifoldInstance.setup();
  return manifoldInstance;
}
