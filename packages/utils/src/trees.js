export function entries(tree) {
  const go = (path, subTree) => { 
    console.log(path, subTree)
    return []
    return [
    [path, subTree],
    ...Object.entries(subTree).flatMap(([key, val]) => [
      go([...path, key], val),
    ]),
  ]};

  return go([], tree);
}
