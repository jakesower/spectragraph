import { Operation, ResourceRef } from "../types";
import { SchemaType } from "./schema";
import { sha1 } from "object-hash";
import { arraySetDifferenceBy } from "@polygraph/utils";
import { refsEqual, refStr } from "../utils";

const DELETED = Symbol("deleted");
const EXISTS = Symbol("exists");
const stateStrs = {
  DELETED: "deleted",
  EXISTS: "existing",
};

/**
 * The point of this quiver is to detect internal inconsistencies from nodes
 * and arrows created by assertions. It can also generate operations.
 */

type NodeRef = ResourceRef;
type NodeProps = { [k: string]: any };

interface Node extends NodeRef {
  properties: NodeProps;
}

interface Arrow {
  source: ResourceRef;
  target: ResourceRef;
  label: string;
}

type ArrowState = typeof DELETED | typeof EXISTS;

interface ArrowWithState extends Arrow {
  state: ArrowState;
}

interface ArrowLike {
  source: ResourceRef | undefined;
  target: ResourceRef | undefined;
  label: string;
}

export interface QuiverType {
  addNode: (node: Node) => void;
  deleteNode: (node: Node) => void;
  addArrow: (arrow: Arrow) => void;
  deleteArrow: (arrow: Arrow) => void;
  setCompleteArrowGroup: (
    sourceNode: NodeRef,
    relType: string,
    arrows: Arrow[],
    existingArrows: Arrow[]
  ) => void;
  getOperations: () => Operation[];
}

const relStr = (arrow: ArrowLike) => {
  const { source, target, label } = arrow;
  const sourceStr = source ? refStr(source) : "X";
  const targetStr = target ? refStr(target) : "X";

  return `${sourceStr}--(${label})-->${targetStr}`;
};

export class ScopedQuiver implements QuiverType {
  private nodes: { [k: string]: NodeProps | typeof DELETED };
  private arrows: { [k: string]: ArrowWithState };
  private schema: SchemaType;
  private completeArrowGroups;

  constructor(schema: SchemaType) {
    this.schema = schema;
    this.arrows = {};
    this.completeArrowGroups = new Set();
  }

  addNode(node: Node) {
    const { type, id, properties } = node;
    const key = this.makeNodeKey(type, id);
    const existingNode = this.nodes[key];

    if (existingNode) {
      if (existingNode === DELETED) {
        throw new Error(
          `There is an inconsistency in the graph. ${refStr(
            node
          )} has been marked as both existing and deleted.`
        );
      }

      const conflictingKey = Object.keys(existingNode).find(
        (key) => existingNode[key] !== properties[key]
      );

      if (conflictingKey) {
        const v1 = existingNode[conflictingKey];
        const v2 = properties[conflictingKey];
        throw new Error(
          `There is an inconsistency in the graph. (${type}, ${id}, ${conflictingKey}) is marked as both ${v1} and ${v2}.`
        );
      }
      this.nodes[key] = { ...existingNode.properties, ...properties };
    } else {
      this.nodes[key] = properties;
    }
  }

  deleteNode(node: NodeRef) {
    const { type, id } = node;
    const key = this.makeNodeKey(type, id);
    const existingNode = this.nodes[key];

    if (existingNode && existingNode !== DELETED) {
      throw new Error(
        `There is an inconsistency in the graph. ${refStr(
          node
        )} has been marked as both existing and deleted.`
      );
    }

    Object.values(this.arrows).forEach((arrow) => {
      const { source, target, state } = arrow;

      if (
        state !== DELETED &&
        (refsEqual(node, source) || refsEqual(node, target))
      ) {
        const problemArrow = refsEqual(node, source)
          ? arrow
          : { ...arrow, source: target, target: source };

        if (refsEqual(node, source)) {
          throw new Error(
            `There is an inconsistency in the graph. ${refStr(
              node
            )} is marked as being deleted, but a relationship ${relStr(
              problemArrow
            )} exists.`
          );
        }
      }
    });

    this.nodes[key] = DELETED;
  }

  addArrow(arrow: Arrow) {
    const { source, target, label } = arrow;
    const key = this.makeArrowKey(arrow);
    const relDef = this.schema.resources[source.type].relationships[label];
    const invDef = this.schema.inverse(relDef);

    this.validateArrow(arrow, EXISTS);
    this.arrows[key] = { ...arrow, state: EXISTS };

    if (invDef) {
      const invArrow = { source: target, target: source, label: invDef.name };
      const invKey = this.makeArrowKey(invArrow);
      this.arrows[invKey] = { ...invArrow, state: EXISTS };
    }
  }

  deleteArrow(arrow: Arrow) {
    const { source, target, label } = arrow;
    const key = this.makeArrowKey(arrow);
    const relDef = this.schema.resources[source.type].relationships[label];
    const invDef = this.schema.inverse(relDef);

    this.validateArrow(arrow, DELETED);
    this.arrows[key] = { ...arrow, state: DELETED };

    if (invDef) {
      const invArrow = { source: target, target: source, label: invDef.name };
      const invKey = this.makeArrowKey(invArrow);
      this.arrows[invKey] = { ...invArrow, state: DELETED };
    }
  }

  setCompleteArrowGroup(
    sourceNode: ResourceRef,
    relType: string,
    arrows: Arrow[],
    existingArrows: Arrow[]
  ) {
    const toDelete = arraySetDifferenceBy(existingArrows, arrows, sha1);

    toDelete.forEach((arrow) => {
      const key = this.makeArrowKey(arrow);
      this.validateArrow(arrow, DELETED);
      this.arrows[key] = { ...arrow, state: DELETED };
    });

    arrows.forEach((arrow) => {
      const key = this.makeArrowKey(arrow);
      this.validateArrow(arrow, EXISTS);
      this.arrows[key] = { ...arrow, state: EXISTS };
    });

    const key = this.makeArrowGroupKey(sourceNode, relType);
    this.completeArrowGroups.add(key);
  }

  getOperations(): Operation[] {
    return [];
  }

  // ideally these can be replaced by Records/Tuples in upcoming ECMA scripts
  private makeNodeKey(type, id) {
    return JSON.stringify([type, id]);
  }

  private makeArrowKey(arrow) {
    return sha1(arrow);
  }

  private makeArrowGroupKey(sourceNode: NodeRef, relType: string): string {
    return JSON.stringify([sourceNode.type, sourceNode.id, relType]);
  }

  private isPartOfCompleteArrowGroup(arrow: Arrow) {
    const key = this.makeArrowGroupKey(arrow.source, arrow.label);
    return this.completeArrowGroups.has(key);
  }

  private validateArrow(arrow: Arrow, state: ArrowState): void {
    const { source, target, label } = arrow;
    const key = this.makeArrowKey(arrow);
    const relDef = this.schema.resources[source.type].relationships[label];
    const invDef = this.schema.inverse(relDef);
    const invArrow = invDef
      ? { source: target, target: source, label: invDef.name }
      : null;
    const existingArrow = this.arrows[key];

    if (existingArrow && existingArrow.state !== state) {
      throw new Error(
        `There is an inconsistency in the graph. The relationship ${relStr(
          arrow
        )} has aready been marked as ${stateStrs[existingArrow.state]}.`
      );
    } else if (!existingArrow && this.isPartOfCompleteArrowGroup(arrow)) {
      throw new Error(
        `There is an inconsistency in the graph. The relationship ${relStr(
          arrow
        )} is not part of a completely defined set of relationships: ${relStr({
          ...arrow,
          target: undefined,
        })})`
      );
    } else if (
      invDef &&
      !existingArrow &&
      this.isPartOfCompleteArrowGroup(invArrow)
    ) {
      throw new Error(
        `There is an inconsistency in the graph. The relationship ${relStr(
          invArrow
        )}, which is the inverse relationship of ${relStr(
          arrow
        )}, is not part of a completely defined set of relationships: ${relStr({
          ...invArrow,
          target: undefined,
        })}`
      );
    }
  }
}
