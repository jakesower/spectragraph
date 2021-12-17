/* eslint-disable no-param-reassign */

type SubsetType = "intersection" | "difference";

interface SideObj<S, C> {
  items: S[];
  comparables: Set<C> | null;
  calculateComparable: (item: S) => C;
  name: "left" | "right";
  differenceKey: "leftOnly" | "rightOnly";
  intersectionKey: "leftIntersection" | "rightIntersection";
}

interface PairSubset<S> {
  forEach: (fn: (item: S, key: number, array: S[]) => void) => void;
  map: <T>(fn: (item: S, key: number, array: S[]) => T) => T[];
}

interface SetPair<L, R> {
  left: L[];
  right: R[];
  leftOnly: L[];
  rightOnly: R[];
  leftIntersection: R[];
  rightIntersection: R[];
}

export function makeSetPair<L, R, C>(
  left: L[],
  right: R[],
  calculateLeftComparable: (leftVal: L) => C,
  calculateRightComparable: (rightVal: R) => C,
): SetPair<L, R> {
  let leftComparables: Set<C>;
  let rightComparables: Set<C>;
  let pairOutput; // this gets mutated pretty aggressively as cache values are calculated

  const calculateComparables = <
    LocalItem,
    LocalSide extends SideObj<LocalItem, C>
  >(localSide: LocalSide): Set<C> => {
    const numItems = localSide.items.length;
    const comparables: Set<C> = new Set();

    for (let i = 0; i < numItems; i += 1) {
      const item = localSide.items[i];
      comparables.add(localSide.calculateComparable(item));
    }

    return comparables;
  };

  const makeSide = <
    LocalItem,
    LocalSide extends SideObj<LocalItem, C>
  >(localSide: LocalSide): PairSubset<LocalItem> => {
    const numItems = localSide.items.length;

    return {
      forEach(fn: (item: LocalItem, key: number, array: LocalItem[]) => void): void {
        if (!localSide.comparables) {
          const comparables: Set<C> = new Set();

          for (let i = 0; i < numItems; i += 1) {
            const item = localSide.items[i];
            comparables.add(localSide.calculateComparable(item));
            fn(item, i, localSide.items);
          }

          localSide.comparables = comparables;
        }

        pairOutput[localSide.name] = localSide.items;
      },
      map<T>(fn: (item: LocalItem, key: number, array: LocalItem[]) => T): T[] {
        if (!localSide.comparables) {
          const output: T[] = [];
          const comparables: Set<C> = new Set();

          for (let i = 0; i < numItems; i += 1) {
            const item = localSide.items[i];
            comparables.add(localSide.calculateComparable(item));
            output.push(fn(item, i, localSide.items));
          }

          localSide.comparables = comparables;
        }

        pairOutput[localSide.name] = localSide.items;
        return localSide.items.map(fn);
      },
    };
  };

  const makeSideProxy = <LocalItem, LocalSide extends SideObj<LocalItem, C>>(
    localSide: LocalSide,
  ) => {
    const side = makeSide(localSide);
    const handler = {
      get(target, property, receiver) {
        return (Object.hasOwnProperty.call(side, property))
          ? side[property]
          : Reflect.get(target, property, receiver);
      },
    };

    return new Proxy(localSide.items, handler);
  };

  const makeSideDiffOrIntersection = <
    LocalItem,
    LocalSide extends SideObj<LocalItem, C>,
    ForeignItem,
    ForeignSide extends SideObj<ForeignItem, C>,
  >(
      localSide: LocalSide, foreignSide: ForeignSide, subsetType: SubsetType,
    ): PairSubset<LocalItem> => {
    const numItems = localSide.items.length;

    return {
      forEach(fn: (item: LocalItem, key: number, array: LocalItem[]) => void): void {
        if (!foreignSide.comparables) {
          foreignSide.comparables = calculateComparables(foreignSide);
        }

        const foreignComparables = foreignSide.comparables;
        const localDifference = [];
        const localIntersection = [];
        const comparables: Set<C> = new Set();

        for (let i = 0; i < numItems; i += 1) {
          const item = localSide.items[i];
          const itemComparable = localSide.calculateComparable(item);

          if (!localSide.comparables) comparables.add(itemComparable);
          if (foreignComparables.has(itemComparable)) {
            localIntersection.push(item);
            if (subsetType === "intersection") fn(item, i, localSide.items);
          } else {
            localDifference.push(item);
            if (subsetType === "difference") fn(item, i, localSide.items);
          }
        }

        if (!localSide.comparables) localSide.comparables = comparables;

        pairOutput[localSide.name] = localSide.items;
        pairOutput[localSide.differenceKey] = localDifference;
        pairOutput[localSide.intersectionKey] = localIntersection;
      },
      map<T>(fn: (item: LocalItem, key: number, array: LocalItem[]) => T): T[] {
        if (!foreignSide.comparables) {
          console.log("calcking")
          foreignSide.comparables = calculateComparables(foreignSide);
        }

        const foreignComparables = foreignSide.comparables;
        const localDifference = [];
        const localIntersection = [];
        const comparables: Set<C> = new Set();
        const output = [];

        for (let i = 0; i < numItems; i += 1) {
          const item = localSide.items[i];
          const itemComparable = localSide.calculateComparable(item);

          if (!localSide.comparables) comparables.add(itemComparable);
          if (foreignComparables.has(itemComparable)) {
            localIntersection.push(item);
            if (subsetType === "intersection") output.push(fn(item, i, localSide.items));
          } else {
            localDifference.push(item);
            if (subsetType === "difference") output.push(fn(item, i, localSide.items));
          }
        }

        if (!localSide.comparables) localSide.comparables = comparables;

        pairOutput[localSide.name] = localSide.items;
        pairOutput[localSide.differenceKey] = localDifference;
        pairOutput[localSide.intersectionKey] = localIntersection;

        console.log("stimmt", pairOutput[localSide.differenceKey]);
        console.log("stimmt nicht", foreignComparables)

        return output;
      },
    };
  };

  const makeDiffOrIntersectionProxy = <
    LocalItem,
    LocalSide extends SideObj<LocalItem, C>,
    ForeignItem,
    ForeignSide extends SideObj<ForeignItem, C>,
  >(
      localSide: LocalSide, foreignSide: ForeignSide, subsetType: SubsetType,
    ): LocalSide[] => {
    const sideDiff = makeSideDiffOrIntersection(localSide, foreignSide, subsetType);

    const handler = {
      get(target, property) {
        if (property in sideDiff) {
          return sideDiff[property];
        }

        if (!foreignSide.comparables) {
          foreignSide.comparables = calculateComparables(foreignSide);
        }

        const localDifference = [];
        const localIntersection = [];
        const numItems = localSide.items.length;
        const hasLocalComparables = localSide.comparables;
        const foreignComparables = foreignSide.comparables;
        const comparables: Set<C> = new Set();

        for (let i = 0; i < numItems; i += 1) {
          const item = localSide.items[i];
          const itemComparable = localSide.calculateComparable(item);

          if (hasLocalComparables) comparables.add(localSide.calculateComparable(item));
          if (foreignComparables.has(itemComparable)) {
            localIntersection.push(item);
          } else {
            localDifference.push(item);
          }
        }

        if (hasLocalComparables) localSide.comparables = comparables;

        pairOutput[localSide.name] = localSide.items;
        pairOutput[localSide.differenceKey] = localDifference;
        pairOutput[localSide.intersectionKey] = localIntersection;

        console.log(">>", pairOutput[localSide.differenceKey]);

        return subsetType === "difference"
          ? localDifference[property]
          : localIntersection[property];
      },
    };

    return new Proxy([], handler);
  };

  const leftObjs: SideObj<L, C> = {
    items: left,
    differenceKey: "leftOnly",
    intersectionKey: "leftIntersection",
    comparables: leftComparables,
    calculateComparable: calculateLeftComparable,
    name: "left",
  };

  const rightObjs: SideObj<R, C> = {
    items: right,
    differenceKey: "rightOnly",
    intersectionKey: "rightIntersection",
    comparables: rightComparables,
    calculateComparable: calculateRightComparable,
    name: "right",
  };

  pairOutput = {
    left: makeSideProxy(leftObjs),
    right: makeSideProxy(rightObjs),
    leftOnly: makeDiffOrIntersectionProxy(leftObjs, rightObjs, "difference"),
    rightOnly: makeDiffOrIntersectionProxy(rightObjs, leftObjs, "difference"),
    leftIntersection: makeDiffOrIntersectionProxy(leftObjs, rightObjs, "intersection"),
    rightIntersection: makeDiffOrIntersectionProxy(rightObjs, leftObjs, "intersection"),
  };

  return pairOutput;
}
