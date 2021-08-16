import { formatRef } from "../utils";
import { ResourceRef } from "../types";

/**
 * The point of this quiver is to detect internal inconsistencies from nodes
 * and arrows created by assertions. It is meant to be mutated, preferably
 * within a single function. It functions relatively transparently, with each
 * method having a corresponding value in the state, e.g.,
 * addNode<->addedNodes. The utility is in the validation.
 */

type NodeRef = ResourceRef;
type NodeProps = Record<string, unknown>;

export interface Node extends NodeRef {
  properties: NodeProps;
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

export interface Quiver {
  // useful when constructing
  addNode: (node: Node) => void;
  removeNode: (nodeRef: NodeRef) => void;
  addArrow: (arrow: Arrow) => void;
  removeArrow: (arrow: Arrow) => void;
  setArrowGroup: (source: NodeRef, targets: NodeRef[], label: string) => void;

  // useful as the result
  addedNodes: Record<string, Node>;
  removedNodes: Record<string, NodeRef>;
  touchedNodes: Record<string, NodeRef>;
  // addedArrows: Record<string, Arrow>;
  // removedArrows: Record<string, Arrow>;
  // arrowsBySourceAndLabel: Record<string, Set<string>>;
  getSetArrowsBySourceAndLabel: (source: ResourceRef, label: string) => NodeRef[] | undefined;
  getAddedArrowsBySourceAndLabel: (source: ResourceRef, label: string) => NodeRef[];
  getRemovedArrowsBySourceAndLabel: (source: ResourceRef, label: string) => NodeRef[];
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

export function makeQuiver(): Quiver {
  // exported
  const addedNodes: Record<string, Node> = {};
  const removedNodes: Record<string, NodeRef> = {};
  const touchedNodes: Record<string, NodeRef> = {};

  // internal -- some accessed by getters (plz let there be Records/Tuples soon...)
  const arrowGroups: Set<string> = new Set();
  const nodesWithExtantArrows: Set<string> = new Set();
  const addedArrows: Record<string, Arrow> = {};
  const removedArrows: Record<string, Arrow> = {};
  const setArrowsBySourceAndLabel: Record<string, NodeRef[]> = {};
  const addedArrowsBySourceAndLabel: Record<string, NodeRef[]> = {};
  const removedArrowsBySourceAndLabel: Record<string, NodeRef[]> = {};

  const relStr = (arrow: ArrowLike) => {
    const { source, target, label } = arrow;
    const sourceStr = source ? formatRef(source) : "X";
    const targetStr = target ? formatRef(target) : "X";

    return `${sourceStr}--(${label})-->${targetStr}`;
  };

  // checks
  const checkConflictingKeys = (node) => {
    const key = makeNodeKey(node);
    const existing = addedNodes[key];

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
    if (key in addedNodes) {
      throw new Error(`${formatRef(node)} is marked as both created and removed`);
    }
  };

  const checkNodeNotRemoved = (node) => {
    const key = makeNodeKey(node);
    if (key in removedNodes) {
      throw new Error(`${formatRef(node)} is marked as both created and removed`);
    }
  };

  const checkArrowNotAdded = (arrow) => {
    const key = makeArrowKey(arrow);
    if (key in addedArrows) {
      throw new Error(`${relStr(arrow)} is marked as both created and removed`);
    }
  };

  const checkArrowNotRemoved = (arrow) => {
    const key = makeArrowKey(arrow);
    if (key in removedArrows) {
      throw new Error(`${relStr(arrow)} is marked as both created and removed`);
    }
  };

  const checkArrowGroupExclusions = (arrow) => {
    const key = makeArrowKey(arrow);
    const groupKey = makeArrowGroupKey(arrow);

    if (arrowGroups.has(groupKey) && !(key in addedArrows)) {
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

  const touchNode = (ref: ResourceRef) => {
    touchedNodes[makeNodeKey(ref)] = ref;
  };

  const addNode = (node: Node): void => {
    const key = makeNodeKey(node);
    const existing = addedNodes[key];

    checkNodeNotRemoved(node);
    checkConflictingKeys(node);

    const existingProps = existing ? existing.properties : {};
    addedNodes[key] = {
      ...node,
      properties: { ...node.properties, ...existingProps },
    };
    touchNode(node);
  };

  const removeNode = (nodeRef: NodeRef): void => {
    const key = makeNodeKey(nodeRef);

    checkNodeNotAdded(nodeRef);
    checkNoConnectingArrows(nodeRef);

    touchNode(nodeRef);
    removedNodes[key] = nodeRef;
  };

  const addArrow = (arrow: Arrow): void => {
    const key = makeArrowKey(arrow);
    const groupKey = makeArrowGroupKey(arrow);
    const sourceKey = makeNodeKey(arrow.source);
    const targetKey = makeNodeKey(arrow.target);

    checkArrowNotRemoved(arrow);
    checkArrowGroupExclusions(arrow);

    addNode({ ...arrow.source, properties: {} }); // checks endpoint existence
    addNode({ ...arrow.target, properties: {} }); // checks endpoint existence
    touchNode(arrow.source);
    touchNode(arrow.target);
    addedArrows[key] = arrow;
    nodesWithExtantArrows.add(sourceKey);
    nodesWithExtantArrows.add(targetKey);
    addedArrowsBySourceAndLabel[groupKey] = addedArrowsBySourceAndLabel[groupKey]
      ? [...addedArrowsBySourceAndLabel[groupKey], arrow.target]
      : [arrow.target];
  };

  const removeArrow = (arrow: Arrow): void => {
    const key = makeArrowKey(arrow);
    const groupKey = makeArrowGroupKey(arrow);

    checkArrowNotAdded(arrow);

    touchNode(arrow.source);
    removedArrows[key] = arrow;
    removedArrowsBySourceAndLabel[groupKey] = removedArrowsBySourceAndLabel[groupKey]
      ? [...removedArrowsBySourceAndLabel[groupKey], arrow.target]
      : [arrow.target];
  };

  const setArrowGroup = (source: NodeRef, targets: NodeRef[], label: string): void => {
    const groupKey = makeArrowGroupKey({ source, label });

    checkArrowGroupExistingExclusions(source, targets, label);
    setArrowsBySourceAndLabel[groupKey] = targets;
    targets.forEach((target) => addArrow({ source, target, label }));

    arrowGroups.add(groupKey);
  };

  const getAddedArrowsBySourceAndLabel = (source: NodeRef, label: string): NodeRef[] => {
    const groupKey = makeArrowGroupKey({ source, label });
    return addedArrowsBySourceAndLabel[groupKey] || [];
  };

  const getRemovedArrowsBySourceAndLabel = (source: NodeRef, label: string): NodeRef[] => {
    const groupKey = makeArrowGroupKey({ source, label });
    return removedArrowsBySourceAndLabel[groupKey] || [];
  };

  const getSetArrowsBySourceAndLabel = (source: NodeRef, label: string): NodeRef[] => {
    const groupKey = makeArrowGroupKey({ source, label });
    return setArrowsBySourceAndLabel[groupKey];
  };

  return {
    addNode,
    removeNode,
    addArrow,
    removeArrow,
    setArrowGroup,
    addedNodes,
    removedNodes,
    touchedNodes,
    getAddedArrowsBySourceAndLabel,
    getRemovedArrowsBySourceAndLabel,
    getSetArrowsBySourceAndLabel,
  };
}
