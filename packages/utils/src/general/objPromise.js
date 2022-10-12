export async function objPromise(obj) {
  const output = {};

  await Promise.all(Object.entries(obj).map(async ([key, val]) => {
    output[key] = await val;
  }));

  return output;
}
