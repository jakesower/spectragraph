import { arraySetDifferenceBy, groupBy, omit } from "@polygraph/utils";
import { sha1 } from "object-hash";
import { refsEqual, formatRef } from "../utils";
import { ResourceRef } from "../types";

const DELETED = Symbol("deleted");
const EXISTS = Symbol("exists");
const stateStrs = {
  DELETED: "deleted",
  EXISTS: "existing",
};

/**
 * The point of this quiver is to detect internal inconsistencies from nodes
 * and arrows created by assertions. It is meant to be mutated, preferably
 * within a single function. It can be transformed into an immutable quiver
 * upon completion.
 */

type NodeRef = ResourceRef;
type NodeProps = Record<string, unknown>;

interface Node extends NodeRef {
  properties: NodeProps;
}

interface Arrow {
  source: NodeRef;
  target: NodeRef;
  label: string;
  // TODO?: mark inverses as such
}

type QuiverElementState = typeof DELETED | typeof EXISTS;

interface DeletedNode extends ResourceRef {
  state: typeof DELETED;
}

interface ExtantNode extends Node {
  state: typeof EXISTS;
}

type NodeWithState = DeletedNode | ExtantNode;

interface ArrowWithState extends Arrow {
  state: QuiverElementState;
}

interface ArrowLike {
  source: NodeRef | undefined;
  target: NodeRef | undefined;
  label: string;
}

interface ChangesObject {
  assertedNodes: Node[];
  deletedNodes: Node[];
  assertedArrows: Arrow[];
  deletedArrows: Arrow[];
}

export interface WorkingQuiverType {
  assertNode: (node: Node) => void;
  deleteNode: (node: Node, existingArrows: Arrow[]) => void;
  assertArrow: (arrow: Arrow) => void;
  deleteArrow: (arrow: Arrow) => void;
  setOutgoingArrows: (
    sourceNode: NodeRef,
    relType: string,
    targets: NodeRef[],
    existingTargets: NodeRef[]
  ) => void;
  toObject: () => ChangesObject;
}

// ideally these can be replaced by Records/Tuples in upcoming ECMA scripts
const makeNodeKey = (type, id) => JSON.stringify([type, id]);

const makeArrowKey = (arrow) => sha1(arrow);

const makeArrowGroupKey = (sourceNode: NodeRef, relType: string): string => (
  JSON.stringify([sourceNode.type, sourceNode.id, relType])
);

const relStr = (arrow: ArrowLike) => {
  const { source, target, label } = arrow;
  const sourceStr = source ? formatRef(source) : "X";
  const targetStr = target ? formatRef(target) : "X";

  return `${sourceStr}--(${label})-->${targetStr}`;
};

export class WorkingQuiver implements WorkingQuiverType {
  private nodes: { [k: string]: NodeWithState };

  private arrows: { [k: string]: ArrowWithState };

  private schema: SchemaType;

  private completeOutgoingArrows;

  constructor(schema: SchemaType) {
    this.schema = schema;
    this.arrows = {};
    this.completeOutgoingArrows = new Set();
  }

  assertNode(node: Node): void {
    const { type, id, properties } = node;
    const key = makeNodeKey(type, id);
    const existingNode = this.nodes[key];

    if (existingNode) {
      if (existingNode.state === DELETED) {
        throw new Error(
          `There is an inconsistency in the graph. ${formatRef(
            node,
          )} has been marked as both existing and deleted.`,
        );
      }

      const conflictingKey = Object.keys(existingNode).find(
        (nodeKey) => existingNode[nodeKey] !== properties[nodeKey],
      );

      if (conflictingKey) {
        const v1 = existingNode[conflictingKey];
        const v2 = properties[conflictingKey];
        throw new Error(
          `There is an inconsistency in the graph. (${type}, ${id}, ${conflictingKey}) is marked as both ${v1} and ${v2}.`,
        );
      }
      this.nodes[key] = {
        ...node,
        properties: { ...existingNode.properties, ...properties },
        state: EXISTS,
      };
    } else {
      this.nodes[key] = { ...node, state: EXISTS };
    }
  }

  deleteNode(node: NodeRef, existingArrows: Arrow[]): void {
    const { type, id } = node;
    const key = makeNodeKey(type, id);
    const existingNode = this.nodes[key];

    if (existingNode && existingNode.state !== DELETED) {
      throw new Error(
        `There is an inconsistency in the graph. ${formatRef(
          node,
        )} has been marked as both existing and deleted.`,
      );
    }

    Object.values(this.arrows).forEach((arrow) => {
      const { source, target, state } = arrow;

      if (
        state !== DELETED
        && (refsEqual(node, source) || refsEqual(node, target))
      ) {
        const problemArrow = refsEqual(node, source)
          ? arrow
          : { ...arrow, source: target, target: source };

        if (refsEqual(node, source)) {
          throw new Error(
            `There is an inconsistency in the graph. ${formatRef(
              node,
            )} is marked as being deleted, but a relationship ${relStr(
              problemArrow,
            )} exists.`,
          );
        }
      }
    });

    this.nodes[key] = { ...node, state: DELETED };

    const arrowsByLabel = groupBy(existingArrows, (arrow) => arrow.label);
    this.schema.resources[node.type].relationshipsArray.forEach((rel) => {
      const targets = rel.name in arrowsByLabel
        ? arrowsByLabel[rel.name].map((arrow) => arrow.target) : [];

      this.setOutgoingArrows(node, rel.type, [], targets);
    });
  }

  assertArrow(arrow: Arrow): void {
    const { source, target, label } = arrow;
    const key = makeArrowKey(arrow);
    const relDef = this.schema.resources[source.type].relationships[label];
    const invDef = this.schema.inverse(relDef);

    this.validateArrow(arrow, EXISTS);
    this.arrows[key] = { ...arrow, state: EXISTS };

    if (invDef) {
      const invArrow = { source: target, target: source, label: invDef.name };
      const invKey = makeArrowKey(invArrow);
      this.arrows[invKey] = { ...invArrow, state: EXISTS };
    }
  }

  deleteArrow(arrow: Arrow): void {
    const { source, target, label } = arrow;
    const key = makeArrowKey(arrow);
    const relDef = this.schema.resources[source.type].relationships[label];
    const invDef = this.schema.inverse(relDef);

    this.validateArrow(arrow, DELETED);
    this.arrows[key] = { ...arrow, state: DELETED };

    if (invDef) {
      const invArrow = { source: target, target: source, label: invDef.name };
      const invKey = makeArrowKey(invArrow);
      this.arrows[invKey] = { ...invArrow, state: DELETED };
    }
  }

  setOutgoingArrows(
    source: NodeRef,
    label: string,
    targets: NodeRef[],
    existingTargets: NodeRef[],
  ): void {
    const toDelete = arraySetDifferenceBy(existingTargets, targets, sha1);

    toDelete.forEach((target) => {
      const arrow = { source, label, target };
      const key = makeArrowKey(arrow);

      this.validateArrow(arrow, DELETED);
      this.arrows[key] = { ...arrow, state: DELETED };
    });

    targets.forEach((target) => {
      const arrow = { source, label, target };
      const key = makeArrowKey(arrow);

      this.validateArrow(arrow, EXISTS);
      this.arrows[key] = { ...arrow, state: EXISTS };
    });

    const key = makeArrowGroupKey(source, label);
    this.completeOutgoingArrows.add(key);
  }

  toObject(): ChangesObject {
    // this should be next-ish
    // pick a flavor: CUD with built in relationships ~or~ vertices/arrows separate
    // idea: fortune would make a good test db for this stuff--it gets cranky about non existant
    //   relationship targets

    const noState = (obj) => omit(obj, ["state"]);
    const output = {
      assertedNodes: [],
      deletedNodes: [],
      assertedArrows: [],
      deletedArrows: [],
    };

    Object.values(this.nodes).forEach((node) => {
      if (node.state === DELETED) {
        output.deletedNodes.push(noState(node));
      } else {
        output.assertedNodes.push(noState(node));
      }
    });

    Object.values(this.arrows).forEach((arrow) => {
      if (arrow.state === DELETED) {
        output.deletedArrows.push(noState(arrow));
      } else {
        output.assertedArrows.push(noState(arrow));
      }
    });

    return output;
  }

  private isPartOfCompleteArrowGroup(arrow: Arrow) {
    const key = makeArrowGroupKey(arrow.source, arrow.label);
    return this.completeOutgoingArrows.has(key);
  }

  // TODO: determine how to validate broken to-one rels outside of tree
  private validateArrow(arrow: Arrow, state: QuiverElementState): void {
    const { source, target, label } = arrow;
    const key = makeArrowKey(arrow);
    const relDef = this.schema.resources[source.type].relationships[label];
    const invDef = this.schema.inverse(relDef);
    const invArrow = invDef
      ? { source: target, target: source, label: invDef.name }
      : null;
    const existingArrow = this.arrows[key];

    if (existingArrow && existingArrow.state !== state) {
      throw new Error(
        `There is an inconsistency in the graph. The relationship ${relStr(
          arrow,
        )} has aready been marked as ${stateStrs[existingArrow.state]}.`,
      );
    } else if (!existingArrow && this.isPartOfCompleteArrowGroup(arrow)) {
      throw new Error(
        `There is an inconsistency in the graph. The relationship ${relStr(
          arrow,
        )} is not part of a completely defined set of relationships: ${relStr({
          ...arrow,
          target: undefined,
        })})`,
      );
    } else if (
      invDef
      && !existingArrow
      && this.isPartOfCompleteArrowGroup(invArrow)
    ) {
      throw new Error(
        `There is an inconsistency in the graph. The relationship ${relStr(
          invArrow,
        )}, which is the inverse relationship of ${relStr(
          arrow,
        )}, is not part of a completely defined set of relationships: ${relStr({
          ...invArrow,
          target: undefined,
        })}`,
      );
    }
  }
}
