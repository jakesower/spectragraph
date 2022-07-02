// export function mapQueryToTree(rootQuery, fn) {
//   const go = (query, path) => 
// }

export function reduceQuery(rootQuery, init, fn) {
  const go = (acc, query, path) => {
    const withCur = fn(acc, query, path);
    return Object.entries(query.relationships).reduce(
      (nextAcc, [relName, subQuery]) => go(nextAcc, subQuery, [...path, relName]),
      withCur,
    );
  };

  return go(init, rootQuery, []);
}
