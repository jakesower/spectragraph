import * as fillIns from "./fillIns";
import { query as makeQueryFn } from "./query";
import {
  CrudStore,
  NormalizedResources,
  Resource,
  ResourceRef,
  Store,
} from "../types";
import { SchemaType } from "../data-structures/schema";

interface BaseOverload {
  addRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<unknown>;
  deleteRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<unknown>;
  setRelationship: (source: ResourceRef, target: ResourceRef, type: string) => Promise<unknown>;
  delete: (resourceRef: ResourceRef) => Promise<any>;
  find: (type: string, criteria?: { [k:string]: unknown }) => Promise<Resource[]>;
  [k: string]: unknown;
}

interface CrudDivided extends BaseOverload {
  createProperties: (properties: { [k: string]: unknown }) => Promise<unknown>;
  createRelationship: (relationship: { [k: string]: unknown }) => Promise<unknown>;
  updateProperties: (properties: { [k: string]: unknown }) => Promise<unknown>;
  updateRelationship: (source: ResourceRef, type: string, target: ResourceRef) => Promise<unknown>;
}

interface CrudUnified extends BaseOverload {
  create: (resource: Resource) => Promise<unknown>;
  update: (resource: Resource) => Promise<unknown>;
}

interface UpsertDivided extends BaseOverload {
  upsertProperties: (properties: { [k: string]: any }) => Promise<any>;
  upsertRelationship: (relationships: { [k: string]: any }) => Promise<any>;
}

interface UpsertUnified extends BaseOverload {
  upsert: (resource: Resource) => Promise<any>;
}

type OverloadsType = CrudDivided | CrudUnified | UpsertDivided | UpsertUnified;

export function BaseStore(schema: SchemaType, overloads: OverloadsType): Store {
  const definitionError = () => {
    throw new Error("The received overrides were insufficient.");
  };

  // Given overloads come from the extending store
  // - Incorporate overloads as appropriate
  // - Require overloads to be a function that receives the schema and initial data??
  // - Allow fill-in functions the ability to access the override or other fill-in function
  // - But how to let the overrides access the fill-ins? Is `this` necessary?
  // - Imagine an upsert override that wanted to call `create` within the base?

  // crud
  const deleteFn = overloads.delete || definitionError;
  const find = overloads.find || definitionError;

  const findOne = overloads.findOne || fillIns.findOne;

  const create = "create" in overloads ? overloads.create
    : "upsert" in overloads ? overloads.upsert
    : "createProperties" in overloads ? fillIns.dividedCreate
    : definitionError;

  const update = overloads.update ? overloads.create
    : "upsert" in overloads ? overloads.upsert
    : "updateProperties" in overloads ? fillIns.dividedUpdate
    : definitionError;

  const upsert = "upsert" in overloads ? overloads.upsert
    : "create" in overloads ? fillIns.upsert
    : "createProperties" in overloads ? fillIns.dividedUpsert
    : definitionError;

  const crudStore: CrudStore = {
    create,
    delete: deleteFn,
    find,
    findOne,
    update,
    upsert,
  };

  const query = makeQueryFn(schema, crudStore);

  return {
    ...crudStore,
    query,
  };
}
