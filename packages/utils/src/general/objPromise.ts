type Unpack<T> = T extends Promise<infer U> ? U : T;

export async function objPromise<T, K extends keyof T>(obj: Record<K, T[K]>): Promise<Record<K, Unpack<T[K]>>> {
  const output = {} as Record<K, Unpack<T[K]>>;

  await Promise.all(Object.entries(obj).map(async ([key, val]) => {
    output[key] = await val;
  }));

  return output;
}
