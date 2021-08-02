/**
 * These functions are automatically created to minimize the number of
 * functions that need to be put into the Base Store.
 */

import { Resource, ResourceRef } from "../types";
import { divideAttributes } from "../utils";

export async function dividedCreate(resource: Resource): Promise<unknown> {
  const { type } = resource;
  const dividedResource = divideAttributes(this.schema, resource);

  await this.createProperties(dividedResource);

  // resource is already created, so future operations are updates
  return Promise.all(
    Object.entries(dividedResource.relationships).map(([relType, relOrRels]) => {
      const resDef = this.schema.resources[type].relationships[relType];
      const invDef = this.schema.inverse(resDef);

      const outgoingUpdate = this.updateRelationship(resource, relType, relOrRels);

      if (invDef) {
        const updateInv = (rel) => this.updateRelationship(rel, invDef.name, resource);
        const incomingUpdates = Array.isArray(relOrRels)
          ? relOrRels.map(updateInv)
          : [updateInv(relOrRels)];

        return [outgoingUpdate, ...incomingUpdates];
      }

      return [outgoingUpdate];
    }),
  );
}

export async function dividedUpdate(resource: Resource): Promise<unknown> {
  const { type, id } = resource;
  const existing = await this.read(resource);
  const nextResource = { id, type, attributes: { ...existing, ...resource.attributes } };
  const dividedResource = divideAttributes(this.schema, nextResource);

  const propsUpdate = this.updateProperties(dividedResource);
  const relsUpdate = Promise.all(
    Object.entries(dividedResource.relationships).map(([relType, relOrRels]) => {
      const resDef = this.schema.resources[type].relationships[relType];
      const invDef = this.schema.inverse(resDef);

      const outgoingUpdate = this.updateRelationship(resource, relType, relOrRels);

      if (invDef) {
        const updateInv = (rel) => this.updateRelationship(rel, invDef.name, resource);
        const incomingUpdates = Array.isArray(relOrRels)
          ? relOrRels.map(updateInv)
          : [updateInv(relOrRels)];

        return [outgoingUpdate, ...incomingUpdates];
      }

      return [outgoingUpdate];
    }),
  );

  return Promise.all([propsUpdate, relsUpdate]);
}

export async function findOne(ref: ResourceRef): Promise<Resource> {
  return this.find(ref.type).find((res) => res.id === ref.id);
}

export async function upsert(resource: Resource): Promise<unknown> {
  const existing = await this.read(resource);
  return existing ? this.create(resource) : this.update(resource);
}
