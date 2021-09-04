import { formatRef, refsEqual, toRef } from "../utils";
import { ResourceRef } from "../types";

/**
 * The point of this quiver is to detect internal inconsistencies from nodes
 * and arrows created by assertions. It is meant to be mutated, preferably
 * within a single function. It functions relatively transparently, with each
 * method having a corresponding value in the state, e.g.,
 * assertNode<->assertedNodes. The utility is in the validation.
 */

type NodeRef = ResourceRef;
type NodeProps = Record<string, unknown>;
type NodeRefString = string;

export interface Node extends NodeRef {
  properties: NodeProps;
}

interface NodeWithState extends Node {
  state: "asserted" | "related" | "retracted";
}

interface Arrow {
  source: NodeRef;
  target: NodeRef;
  label: string;
}

interface ArrowLike {
  source: NodeRef | undefined;
  target: NodeRef | undefined;
  label: string;
}

// type ArrowChanges = { hasChanges: false } | { hasChanges: true, present: NodeRef[] };

export interface Quiver {
  // useful when constructing
  assertNode: (node: Node) => void;
  retractNode: (nodeRef: NodeRef) => void;
  assertArrow: (arrow: Arrow) => void;
  retractArrow: (arrow: Arrow) => void;
  markArrow: (arrow: Arrow) => void;
  assertArrowGroup: (source: NodeRef, targets: NodeRef[], label: string) => void;

  // useful as the result
  getArrows: (ref: NodeRef) => Record<string, NodeRef[]>;
  getNodes: () => Map<NodeRef, (null | Node | NodeRef)>;
}

// ideally these can be replaced by Records/Tuples in upcoming ECMA scripts
const makeNodeKey = (node) => JSON.stringify([node.type, node.id]);
const makeArrowKey = (arrow) => JSON.stringify([
  arrow.source.type,
  arrow.source.id,
  arrow.target.type,
  arrow.target.id,
  arrow.label,
]);
const makeArrowGroupKey = (arrow) => JSON.stringify([
  arrow.source.type,
  arrow.source.id,
  arrow.label,
]);

const readNodeKey = (key: string): NodeRef => {
  const [type, id] = JSON.parse(key);
  return { type, id };
};

export function makeQuiver(): Quiver {
  // exported
  const assertedNodes: Record<string, Node> = {};
  const retractedNodes: Record<string, NodeRef> = {};
  const touchedNodes: Set<string> = new Set();
  const nodes: Record<string, NodeWithState>;
  const labelsByType: Record<string, Set<string>> = {};

  // internal -- some accessed by getters (plz let there be Records/Tuples soon...)
  const arrowGroups: Set<string> = new Set();
  const nodesWithExtantArrows: Set<string> = new Set();
  const assertedArrows: Record<string, Arrow> = {};
  const retractedArrows: Record<string, Arrow> = {};
  const extantArrows: Record<string, Record<string, Set<NodeRefString>>> = {}; // source -> label
  const setArrowsBySourceAndLabel: Record<string, NodeRef[]> = {};
  const assertedArrowsBySourceAndLabel: Record<string, NodeRef[]> = {};
  const retractedArrowsBySourceAndLabel: Record<string, NodeRef[]> = {};

  const relStr = (arrow: ArrowLike) => {
    const { source, target, label } = arrow;
    const sourceStr = source ? formatRef(source) : "X";
    const targetStr = target ? formatRef(target) : "X";

    return `${sourceStr}--(${label})-->${targetStr}`;
  };

  // checks
  const checkConflictingKeys = (node) => {
    const key = makeNodeKey(node);
    const existing = assertedNodes[key];

    if (existing) {
      const diff = Object.keys(node.properties)
        .filter((nodeKey) => (nodeKey in existing.properties)
          && node.properties[nodeKey] !== existing.properties[nodeKey])
        .map((k) => `${k}: ${node.properties[k]} ≠ ${existing.properties[k]})`);

      if (diff.length > 0) {
        throw new Error(`The properties of a node were set inconsistently. (${node.type}, ${node.id}):\n\n${diff.join("\n")}`);
      }
    }
  };

  const checkNodeNotAdded = (node) => {
    const key = makeNodeKey(node);
    if (key in assertedNodes) {
      throw new Error(`${formatRef(node)} is marked as both created and removed`);
    }
  };

  const checkNodeNotRemoved = (node) => {
    const key = makeNodeKey(node);
    if (key in retractedNodes) {
      throw new Error(`${formatRef(node)} is marked as both created and removed`);
    }
  };

  const checkArrowNotAdded = (arrow) => {
    const key = makeArrowKey(arrow);
    if (key in assertedArrows) {
      throw new Error(`${relStr(arrow)} is marked as both created and removed`);
    }
  };

  const checkArrowNotRemoved = (arrow) => {
    const key = makeArrowKey(arrow);
    if (key in retractedArrows) {
      throw new Error(`${relStr(arrow)} is marked as both created and removed`);
    }
  };

  const checkArrowGroupExclusions = (arrow) => {
    const key = makeArrowKey(arrow);
    const groupKey = makeArrowGroupKey(arrow);

    if (arrowGroups.has(groupKey) && !(key in assertedArrows)) {
      throw new Error(`${formatRef(arrow.source)} had a complete set of relationships set, but ${relStr(arrow)} was added as well`);
    }
  };

  const checkArrowGroupExistingExclusions = (source, targets, label) => {
    const groupKey = makeArrowGroupKey({ source, label });

    if (setArrowsBySourceAndLabel[groupKey]) {
      targets.forEach((target) => {
        const arrow = { source, target, label };
        const key = makeArrowKey(arrow);

        if (!(key in setArrowsBySourceAndLabel[groupKey])) {
          throw new Error(`${formatRef(arrow.source)} had a complete set of relationships set, but ${relStr(arrow)} was added as well`);
        }
      });
    }
  };

  const checkNoConnectingArrows = (node) => {
    const key = makeNodeKey(node);
    if (nodesWithExtantArrows.has(key)) {
      throw new Error(`The node ${formatRef(node)} is marked as removed, but has relationships defined from outside`);
    }
  };

  const touchNode = (ref: NodeRef) => {
    touchedNodes.add(makeNodeKey(ref));
  };

  const assertNode = (node: Node): void => {
    const key = makeNodeKey(node);
    const existing = assertedNodes[key];

    checkNodeNotRemoved(node);
    checkConflictingKeys(node);

    const existingProps = existing ? existing.properties : {};
    assertedNodes[key] = {
      ...node,
      properties: { ...node.properties, ...existingProps },
    };
    touchNode(node);
  };

  const retractNode = (nodeRef: NodeRef): void => {
    const key = makeNodeKey(nodeRef);

    checkNodeNotAdded(nodeRef);
    checkNoConnectingArrows(nodeRef);

    touchNode(nodeRef);
    retractedNodes[key] = nodeRef;
  };

  const touchArrow = (arrow: Arrow): void => {
    const { source, target, label } = arrow;
    const sourceKey = makeNodeKey(source);
    const targetRef = makeNodeKey(target);

    touchNode(source);
    touchNode(target);
    extantArrows[sourceKey] = extantArrows[sourceKey] || {};
    extantArrows[sourceKey][label] = extantArrows[sourceKey][label]
      ? extantArrows[sourceKey][label].add(targetRef)
      : new Set([targetRef]);
  };

  const assertArrow = (arrow: Arrow): void => {
    const key = makeArrowKey(arrow);
    const groupKey = makeArrowGroupKey(arrow);
    const sourceKey = makeNodeKey(arrow.source);
    const targetKey = makeNodeKey(arrow.target);

    checkArrowNotRemoved(arrow);
    checkArrowGroupExclusions(arrow);

    assertNode({ ...arrow.source, properties: {} }); // checks endpoint existence
    assertNode({ ...arrow.target, properties: {} }); // checks endpoint existence
    touchArrow(arrow);
    assertedArrows[key] = arrow;
    nodesWithExtantArrows.add(sourceKey);
    nodesWithExtantArrows.add(targetKey);
    labelsByType[arrow.source.type] = labelsByType[arrow.source.type]
      ? labelsByType[arrow.source.type].add(arrow.label)
      : new Set([arrow.label]);
    assertedArrowsBySourceAndLabel[groupKey] = assertedArrowsBySourceAndLabel[groupKey]
      ? [...assertedArrowsBySourceAndLabel[groupKey], toRef(arrow.target)]
      : [toRef(arrow.target)];
  };

  const retractArrow = (arrow: Arrow): void => {
    const key = makeArrowKey(arrow);
    const groupKey = makeArrowGroupKey(arrow);

    checkArrowNotAdded(arrow);

    touchArrow(arrow);
    retractedArrows[key] = arrow;
    retractedArrowsBySourceAndLabel[groupKey] = retractedArrowsBySourceAndLabel[groupKey]
      ? [...retractedArrowsBySourceAndLabel[groupKey], toRef(arrow.target)]
      : [toRef(arrow.target)];
  };

  const setArrowGroup = (source: NodeRef, targets: NodeRef[], label: string): void => {
    const groupKey = makeArrowGroupKey({ source, label });

    checkArrowGroupExistingExclusions(source, targets, label);
    setArrowsBySourceAndLabel[groupKey] = targets.map(toRef);
    targets.forEach((target) => assertArrow({ source, target, label }));

    arrowGroups.add(groupKey);
  };

  const isAdded = (ref: NodeRef) => makeNodeKey(ref) in retractedNodes;
  const isRemoved = (ref: NodeRef) => makeNodeKey(ref) in retractedNodes;

  // Return outgoing arrows on a per-label basis, but only for those that have changed
  const getChangedArrows = (source: NodeRef): Record<string, NodeRef[]> => {
    // Let A = Asserted, R = Retracted, S = Set, T = Touched, E = Extant
    // Let AS = (if (S = ∅) then A else S), then A ⊆ AS, S ⊆ AS, AS ∩ R = ∅
    // changes have been made if (T − AS) ∪ R ≠ ∅ or (AS ∩ T) ∪ R ≠ ∅
    // more succinctly, (A ∩ T) ∪ (S ∩ T) ∪ R ≠ ∅,
    // more plainly, changes have been made if (A ∩ T), (S ∩ T), or R is not empty
    // alternatively, (A − E) ∪ (S − E) ∪ R ≠ ∅, implying change to (A − E), (S − E) or R
    // further, A ⊆ T, so (S − T) ⊆ (A − T), so no need to check for (S − T)
    // |A| ≠ |T|, then changes must have been made
    // if |A| = |T|, then |R| = 0 or changes have been made

    // Added = AS
    // Removed = R ∪ (T − S)
    // Present = if S then S else
    //           if Rest then (T ∪ A) - R else (A ∪ (T − R))
    // TODO: Rest
    // Everything else is ignored or an error dealt with elsewhere
    const sourceKey = makeNodeKey(source);

    if (!extantArrows[sourceKey]) {
      return {};
    }

    const output = {} as Record<string, NodeRef[]>;
    Object.entries(extantArrows[sourceKey]).forEach(([label, rawTouched]) => {
      const groupKey = makeArrowGroupKey({ source, label });

      // TODO: affirm uniqueness -- I NEED RECORDS AND TUPLES DAMMIT!
      const touched = [...rawTouched].map(readNodeKey) as NodeRef[];
      const asserted = assertedArrowsBySourceAndLabel[groupKey] || [];
      const retracted = retractedArrowsBySourceAndLabel[groupKey] || [];
      const set = setArrowsBySourceAndLabel[groupKey] || [];
      console.log({
        source, touched, asserted, retracted, set,
      });
      if (retracted.length > 0 || asserted.length > touched.length) {
        // console.log("enh?", source, { asserted, set })
        if (set.length > 0) {
          output[label] = set;
        } else {
          const surviving = Array.from(touched)
            .filter((touchedRef) => !retracted.some((setRef) => refsEqual(touchedRef, setRef)));

          output[label] = [...asserted, ...surviving]; 4;
        }
      }
    });

    return output;
  };

  // These are any nodes referenced anywhere in the quiver
  const getNodes = (): Map<NodeRef, (null | Node | NodeRef)> => {
    const output = new Map();

    // eslint-disable-next-line no-restricted-syntax
    for (const touchedNodeKey of touchedNodes) {
      const nodeRef = readNodeKey(touchedNodeKey);
      const value = assertedNodes[touchedNodeKey]
        ? assertedNodes[touchedNodeKey]
        : retractedNodes[touchedNodeKey]
          ? null
          : nodeRef;

      output.set(nodeRef, value);
    }

    return output;
  };

  return {
    assertNode,
    retractNode,
    assertArrow,
    retractArrow,
    setArrowGroup,
    assertedNodes,
    retractedNodes,
    touchedNodes,
    isAdded,
    isRemoved,
    getChangedArrows,
    getNodes,
    touchArrow,
  };
}
