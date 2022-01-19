import { Schema, Resource, NormalResource } from "../types";

export function denormalizeResource<
  S extends Schema,
  RT extends keyof S["resources"] & string
>(normalResource: NormalResource<S, RT>): Resource<S, RT> {
  return normalResource
  && {
    id: normalResource.id,
    ...normalResource.properties,
    ...normalResource.relationships,
  };
}
