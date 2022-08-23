import { difference } from "@blossom/utils/sets";
import { formatRef } from "../utils/utils.mjs";

/**
 * The point of this quiver is to detect internal inconsistencies from nodes
 * and arrows created by assertions. It is meant to be mutated, preferably
 * within a single function. It functions relatively transparently, with each
 * method having a corresponding value in the state, e.g.,
 * assertNode<->assertedNodes. The utility is in the validation.
 */

// ideally these can be replaced by Records/Tuples in upcoming ECMA scripts
const makeRefKey = ({ type, id }) => JSON.stringify({ type, id });
const makeArrowGroupKey = (arrow) => JSON.stringify([
  arrow.source.type,
  arrow.source.id,
  arrow.label,
]);

const readNodeKey = (key) => JSON.parse(key);

const setsEqual = (left, right) => (
  left.size === right.size && [...left].every((l) => right.has(l))
);

/* eslint-disable no-param-reassign */
const addToArrowSet = (setObj, arrow) => {
  const { label } = arrow;
  const sourceKey = makeRefKey(arrow.source);
  const targetKey = makeRefKey(arrow.target);

  if (!setObj[sourceKey]) {
    setObj[sourceKey] = { [label]: new Set([targetKey]) };
  } else if (!setObj[sourceKey][label]) {
    setObj[sourceKey][label] = new Set([targetKey]);
  } else {
    setObj[sourceKey][label].add(targetKey);
  }
};

export function makeQuiver() {
  const nodes = {};
  const assertedArrows = {};
  const retractedArrows = {};
  const assertedArrowGroups = new Set();

  const relStr = (arrow) => {
    const { source, target, label } = arrow;
    const sourceStr = source ? formatRef(source) : "X";
    const targetStr = target ? formatRef(target) : "X";

    return `${sourceStr}--(${label})-->${targetStr}`;
  };

  // checks
  const checkConflictingProps = (node) => {
    const key = makeRefKey(node);
    const existing = nodes[key];

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

  const checkNodeNotAsserted = (node) => {
    const key = makeRefKey(node);
    if (nodes[key]?.state === "asserted") {
      throw new Error(`${formatRef(node)} is marked as both asserted and retracted`);
    }
  };

  const checkNodeNotRetracted = (node) => {
    const key = makeRefKey(node);
    if (nodes[key]?.state === "retracted") {
      throw new Error(`${formatRef(node)} is marked as both asserted and retracted`);
    }
  };

  const checkArrowNotAsserted = (arrow) => {
    const sourceKey = makeRefKey(arrow.source);
    const targetKey = makeRefKey(arrow.target);

    if (assertedArrows[sourceKey]?.[arrow.label]?.has(targetKey)) {
      throw new Error(`${relStr(arrow)} is marked as both asserted and retracted`);
    }
  };

  const checkArrowNotRetracted = (arrow) => {
    const sourceKey = makeRefKey(arrow.source);
    const targetKey = makeRefKey(arrow.target);

    if (retractedArrows[sourceKey]?.[arrow.label]?.has(targetKey)) {
      throw new Error(`${relStr(arrow)} is marked as both asserted and retracted`);
    }
  };

  const checkArrowGroupExclusions = (arrow) => {
    const groupKey = makeArrowGroupKey(arrow);
    const sourceKey = makeRefKey(arrow.source);
    const targetKey = makeRefKey(arrow.target);
    const groupExists = assertedArrowGroups.has(groupKey);
    const arrowAsserted = assertedArrows[sourceKey]?.[arrow.label]?.has(targetKey);

    if (groupExists && !arrowAsserted) {
      throw new Error(`${formatRef(arrow.source)} has a complete set of relationships, but ${relStr(arrow)} was asserted as well`);
    }
  };

  const checkPreviouslyAssertedArrowGroup = (source, targets, label) => {
    const sourceKey = makeRefKey(source);
    const groupKey = makeArrowGroupKey({ source, label });

    if (!assertedArrowGroups.has(groupKey)) {
      return;
    }

    const existingSet = assertedArrows[sourceKey][label];
    const incomingSet = new Set(targets.map(makeRefKey));

    if (!setsEqual(existingSet ?? new Set(), incomingSet)) {
      // suss out an error message
      const mismatches = [
        ...difference(existingSet, incomingSet),
        ...difference(incomingSet, existingSet),
      ];

      const refStr = mismatches.map((m) => formatRef(readNodeKey(m))).join("\n");
      throw new Error(`${formatRef(source)} had a complete set of relationships, but different targets were asserted\n\n${refStr}`);
    }
  };

  const checkNoExtraAssertedArrowsInGroup = (source, targets, label) => {
    const sourceKey = makeRefKey(source);
    const existingAsserted = assertedArrows?.[sourceKey]?.[label] ?? new Set();

    if (existingAsserted.size > targets.length) {
      const mismatches = [...difference(existingAsserted, new Set(targets))];
      const refStr = mismatches.map((m) => formatRef(readNodeKey(m))).join("\n");
      throw new Error(`${formatRef(source)} had a complete set of relationships, but different targets were asserted:\n\n${refStr}`);
    }
  };

  const assertNode = (node) => {
    const nodeKey = makeRefKey(node);
    const existing = nodes[nodeKey];

    checkNodeNotRetracted(node);
    checkConflictingProps(node);

    const existingProps = existing ? existing.properties : {};
    nodes[nodeKey] = {
      ...node,
      properties: { ...node.properties, ...existingProps },
      state: "asserted",
    };
  };

  const retractNode = (nodeRef) => {
    const nodeKey = makeRefKey(nodeRef);
    checkNodeNotAsserted(nodeRef);
    nodes[nodeKey] = {
      ...nodeRef,
      state: "retracted",
    };
  };

  const seeNode = (nodeRef) => {
    const nodeKey = makeRefKey(nodeRef);
    const existing = nodes[nodeKey];

    if (!existing) {
      nodes[nodeKey] = {
        ...nodeRef,
        properties: {},
        state: "related",
      };
    }
  };

  const assertArrow = (arrow) => {
    const groupKey = makeArrowGroupKey(arrow);

    if (assertedArrowGroups.has(groupKey)) {
      checkArrowGroupExclusions(arrow);
    } else {
      const { source, target } = arrow;

      checkArrowNotRetracted(arrow);

      assertNode({ ...source, properties: {} });
      assertNode({ ...target, properties: {} });

      addToArrowSet(assertedArrows, arrow);
    }
  };

  const retractArrow = (arrow) => {
    checkArrowNotAsserted(arrow);
    addToArrowSet(retractedArrows, arrow);
    seeNode(arrow.source);
    seeNode(arrow.target);
  };

  const assertArrowGroup = (source, targets, label) => {
    const groupKey = makeArrowGroupKey({ source, label });

    if (assertedArrowGroups.has(groupKey)) {
      checkPreviouslyAssertedArrowGroup(source, targets, label);
    } else {
      targets.forEach((target) => assertArrow({ source, target, label }));
      checkNoExtraAssertedArrowsInGroup(source, targets, label);
      assertedArrowGroups.add(groupKey);
    }
  };

  const getArrowChanges = (source) => {
    const sourceKey = makeRefKey(source);

    const output = {};

    Object.entries(assertedArrows[sourceKey] ?? {}).forEach(([label, asserted]) => {
      const groupKey = makeArrowGroupKey({ source, label });
      if (assertedArrowGroups.has(groupKey)) {
        output[label] = { present: [...asserted].map(readNodeKey) };
        return;
      }

      output[label] = { asserted: [...asserted].map(readNodeKey) };
    });

    Object.entries(retractedArrows[sourceKey] ?? {}).forEach(([label, retracted]) => {
      const groupKey = makeArrowGroupKey({ source, label });
      if (!assertedArrowGroups.has(groupKey)) {
        if (output[label]) {
          (output[label]).retracted = [...retracted].map(readNodeKey);
        } else {
          output[label] = { retracted: [...retracted].map(readNodeKey) };
        }
      }
    });

    return output;
  };

  // These are all nodes referenced anywhere in the quiver
  const getNodes = () => {
    const output = new Map();

    Object.entries(nodes).forEach(([key, nodeWithState]) => {
      const { state, ...nodeWithoutState } = nodeWithState;
      output.set(
        readNodeKey(key),
        state === "retracted" ? null : nodeWithoutState,
      );
    });

    return output;
  };

  return {
    assertNode,
    retractNode,
    assertArrow,
    retractArrow,
    assertArrowGroup,
    getArrowChanges,
    getNodes,
  };
}
