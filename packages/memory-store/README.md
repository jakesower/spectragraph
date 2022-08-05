# blossom Core

blossom is a set of loosely coupled abstractions and interfaces that allow various data sources to be accessed and operated on uniformly. It is suitable for any data store that can be represented as a graph, including native graph databases, relational data stores, and many APIs.

This repository is the source of the glue that attempts to hold all of the adapters and other abstractions together into something coherent. This also serves as the heart of documentation of said abstractions.

## Core Abstractions

- Schema
- Store
- Query
- Tree
- Graph

### Stores

Stores connect other blossom data to actual data stores. They are the workhorses of the project and can be used to wrap well defined APIs, such as JSON:API. It is also intended to be extensible in that it can wrap a variety of data stores well. It is particularly well suited to wrapping whatever custom API may need to be tamed.

It is only suited for graph read/write operations. More RPC-style calls, such as `/api/user/3/sendReminderEmail` are not supported.

### Schemata

All blossom stores require a schema to describe the shape and type of the data the stores will operate on. Use of a schema enables users of a store to be able to reason about the data more readily. It is meant to be both human and machine readable, making it suitable for automatic documentation generation and similar. Additionally, it operates as a powerful source of truth since stores are programatically dependent on it.

Schemata are defined fully in JSON.

### Queries

Queries are declarative JSON objects that correspond to a question that the store can answer. There are adapters that allow for a diversity of expression forms, but these are ultimately made uniform before being given to a store. Query capabilities:

- Search for one or all of a type
- Walk relationships within the graph

Desired capabilities:

- Sort based on one or more criteria
- Pagination options
- Sparse attributes
- Node matching (e.g. `WHERE` and `HAVING` style clauses) via defined operations

### Mutation

Mutations are JSON objects that represent changes to be made in the store.

- `create` a new node, possibly with relationships
- `update` an existing node's attributes (TODO: combine replaceRelationship(s) with this?)
- `delete` an existing node along with its relationships
- `replaceRelationship` for a to-one relationship
- `deleteRelationship` for a to-one relationship
- `appendRelationship` to a node with a to-many relationship
- `replaceRelationships` for a to-many relationship
- `deleteRelationships` for a to-many relationship

Additionally, `merge` incorporates a number of the other operations in its function.

(Should the CUD operations only function on nodes?)

### Graph

Data within blossom is modeled on graphs. In particular, graphs that result from queries have one or more roots. From those roots, other nodes may be traversed to, depending on what was returned.

There are three types of nodes within a tree:

|-Node Type-|-Compatible With-|-Description-|-Must Specify Id-|
| **Root Node:** | Leaf Node | Nodes corresponding to the top level of the query. | Yes, unless `id` specified in query |
| **Leaf Node:** | Root Node | Nodes that have no nested relationships, and thus represent terminal nodes. Root nodes may be leaf nodes. | Yes, unless a root node and `id` specified in query |
| **Branch Node:** | | Nodes that are neither root nodes nor leaf nodes. | Yes |

## Philosophy

### What blossom Does

blossom is suitable for data graphs with very little logic around them. It is designed to be particularly good at reading well-defined data connected to other well-defined data via well-defined relationships.

The schema has knack for finding its way to the heart of any data layer that uses it. The fact that it is written in JSON makes it highly portable and suitable for use by any number of programs.

### What blossom Does Not Do

blossom is not suited for some things too:

- RPC style systems. blossom reads and writes graphs to stores.
- Loosely related data. The schema is the centerpiece for the data layer and does not allow for this.
- An ORM. blossom works in pure data, with no functionality attached to the data itself.

## Outstanding Questions

- What should be the default for relationships on resources? When unspecified? When others are specified? Explicitly identified in props? Explicitly identified in rels with `referencesOnly`?
