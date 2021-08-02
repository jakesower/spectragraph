import {
  DataTree, PolygraphStore, Query, QueryParams,
} from "../types";

export function MemoryStore(
  schema: SchemaType,
  { initialData = {} }: { initialData: NormalizedResources },
): PolygraphStore {
  const storeData = initialData;

  const match = (query: Query, params: QueryParams = {}): Promise<DataTree> => {
    throw new Error("not yet implemented");
  };

  const mergeOne = (query: Query, dataTree: DataTree, params: QueryParams = {}): Promise<any> => {
    throw new Error("not yet implemented");
  };

  const mergeMany = (
    query: Query,
    dataTrees: DataTree[],
    params: QueryParams = {},
  ): Promise<any> => {
    throw new Error("not yet implemented");
  };

  const replaceOne = (query: Query, tree: DataTree, params: QueryParams = {}): Promise<any> => {
    throw new Error("not yet implemented");
  };

  const replaceMany = (query: Query, trees: DataTree[], params: QueryParams = {}): Promise<any> => {
    throw new Error("not yet implemented");
  };

  return {
    match,
    mergeOne,
    mergeMany,
    replaceOne,
    replaceMany,
  };
}
