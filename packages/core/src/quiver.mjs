import { makeQuiver } from "./quiver/quiver.mjs";

export { makeResourceQuiver } from "./quiver/resource-quiver.mjs";
export { makeQuiver };

export function quiverBuilder(builderFn) {
  const quiver = makeQuiver();
  builderFn(quiver);
  return quiver;
}
