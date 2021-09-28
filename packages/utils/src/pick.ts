type PickU<T, K extends keyof T> = T extends any ? {[P in K]: T[P]} : never;

export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const l = keys.length
  let out = {} as Pick<T, K>;

  for (let i = 0; i < l; i += 1) {
    if (keys[i] in obj) {
      out[keys[i]] = obj[keys[i]]
    }
  }

  return out as Pick<T, K>;
}
