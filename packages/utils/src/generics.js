export { default as deepEqual } from "deep-equal";

export function deepClone(obj) {
  if (!obj) {
    return obj;
  }

  let out = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const val = obj[key];
    out[key] = typeof val === "object" ? deepClone(val) : val;
  }

  return out;
}
