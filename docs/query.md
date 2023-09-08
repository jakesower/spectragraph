# Queries

Queries are responsible for describing a request to fetch data. It describes the shape of the data as well as modifiers to what is needed, such as filters, sorting, number of results to return, etc. Queries are represented by JSON.

## Example Query

```json
{
  "type": "bears",
  "id": "1",
  "select": {
    "name": "name",
  },
}
```

This query means "get me the name of the bear with id '1'". `type` is required at the top level to tell the store where to start. `id` is optional and allows for the selection of a single resource. `select` is also required and determines the properties that are desired. They are keyed by the keys of the desired result and are set to the names of the properties to be returned.

### Results

Results are returned to match the select clause of the query.

```json
{ "name": "Tenderheart" }
```

### Referenced Relationship Example

```json
{
  "type": "bears",
  "select": {
    "id": "id",
    "bestFriend": "bestFriend",
  },
}
```

This query requests all bears (no `id` was provided). It wants their `id` and their `bestFriend`. Since `bestFriend` is a relationship, it will return a reference, or ref, to that resource.

```json
[
  {
    "id": "1",
    "bestFriend": { "type": "bears", "id": "2" }
  },
  {
    "id": "2",
    "bestFriend": { "type": "bears", "id": "1" }
  },
  {
    "id": "1",
    "bestFriend": null
  }
]
```

References state the `type` and `id` of the related resource.

### Nested Relationship Example

Query:

```json
{
  "type": "bears",
  "select": {
    "id": "id",
    "bestFriend": {
      "select": {
        "name": "name"
      }
    }
  },
}
```

Result:

```json
[
  {
    "id": "1",
    "bestFriend": {
      "name": "Cheer Bear"
    }
  },
  {
    "id": "2",
    "bestFriend": {
      "name": "Tenderheart"
    }
  },
  {
    "id": "1",
    "bestFriend": null
  }
]
```

A subquery to `bestFriend` was used in this example. A `type` isn't required because the schema defines what the `bestFriend` relationship on `bears` means. Subqueries can be nested arbitrarily deep.

## Specification

```
{
  type: <resource type>,
  id?: unique string/integer,
  select?: property names/paths/subqueries/expressions,
  where?: constraint clauses,
  order?: sorting clauses,
  limit?: integer of results to return,
  offset?: number of results to skip,
}
```

Subqueries match the structure of queries exactly, except they do not include a `type` key.

### type

This must be a valid resource type according to the schema. Results will be of this type.

### id

A single id of a resource. This will cause the query to return a single resource rather than an array of resources.

### select

These are the meat of the query in that the specify the things to return. This property is optional. If omitted the query will return a ref, such as `{ "type": "bears", "id": "abc123" }`. Otherwise, a property can be made of a resource property, a resource property path, a subquery, or an expression.

```json
{
  "select": {
    "name": "name",
    "year": "yearIntroduced",
    "homeName": "home.name",
    "bestFriend": {
      "properties": {
        "name": "name"
      }
    },
    "powersCount": { "$count": "powers" }
  }
}
```

The result of the query will have the property keys with the values associated with them. So for the above example, one might expect something like:

```json
{
  "name": "Tenderheart Bear",
  "year": 1982,
  "homeName": "Care-a-Lot",
  "bestFriend": {
    "name": "Cheer Bear"
  },
  "powersCount": 1
}
```

#### Resource Property

These are most straightforward and common property returns. In the above example `{ "name": "name" }` and `{ "year": "yearIntroduced" }` used property names. In this case, `name` and `yearIntroduced` are properties of the bear resource in the schema. The keys `name` and `year` correspond to the structure of the result object. Using `{ "year": "yearIntroduced" }` effectively renames the property without changing it.

#### Resource Path

Property paths can be used to selected related resource properties into the current query. They can be used across to-one relationships. In the example `{ "homeName": "home.name" }` uses a property path. What this means is "follow the to-one `home` relationship and select its `name` property. These cannot be used across to-many relationships. Consider using an expression for cases where some property of a to-many relationship is needed (see below).

#### Subquery

Subqueries are used to directly fetch relationships. This will make the result function as a tree, with subqueries producing subtrees. The cardinality determines if the subtree is a result object (to-one) or an array of result objects (to-many). A subquery is identical to a query except that its `type` is not specified. The type will be determined based on the relationship definition in the schema. Thus, subqueries can have subqueries of their own to arbitrary depth. Recursive queries, however, are not supported. (A recursive query is query that calls itself until no results are found. An use case of a recursive query might be to traverse a tree of parent-child relationships to whatever depth.)

#### Expression

Expressions are used for common functional use cases where some light logic is required. They are primarily used for aggregation purposes, such as counting the number of related resources, summing numbers up, finding maxima and minima, and similar operations. Anything more elaborite than such uses cases should likely be left to application code to handle.

Example Query:

```json
{
  "type": "homes",
  "select": {
    "name": "name",
    "residentCount": { "$count": "residents" },
    "oldestIntroductionYear": { "$min": "residents.$.yearIntroduced" }
  }
}
```

Expressions are objects with a single key that contains the name of an expression. Expression names begin with `$` by convention. They are meant to have the same meanings as analogous functions from such contexts as Mongo DB. A full list of expressions can be found at [TODO].

Aggregation expressions are what should be used for properties. In the case of `$count` specifying the relationship name will suffice. However, to find the `$min` of something requires a numeric value. This is designated as `residents.$.yearIntroduced`. The `$` operates roughly the same as a `flatMap` operation. That means that it can be nested for something more elaboarate such as `residents.$.powers.$.somePropertyOnPowers`. It's generally inadvisable to do this, though it's a useful enough feature to be supported. Note that the `$` is not required on to-one relationships. So, for example, `residents.$.bestFriend.yearIntroduced` is the appropriate form, not `residents.$.bestFriend.$.yearIntroduced`.

Finally, it's worth noting that aggregation expressions are implemented in a shorthand manner for properties. It's sufficient to say that as long as a single aggregative function is being used at the top level, it will work as is typically expected. (Specifically, it applies the aggregation expression to the param rather than the arg.)

### where

This clause is used to filter results according to a value or logical expression.

Example query:

```json
{
  "type": "bears",
  "where": {
    "name": "Tenderheart Bear",
    "yearIntroduced": { "$lt": 1985 },
  }
}
```

This translates to "give me bears with the `name` `"Tenderheart Bear"` (`$eq` is implied as the logical comparison) who have a `yearIntroduced` of less than `1985`. Note that the keys in the `where` clause correspond to properties on the schema, not the properties returned by the query.

The `where` clause also supports dot paths. So `{ "where": "home.name": "Care-a-Lot" }` would work as expected.

Similarly, logical expressions can be used, such as:

```json
{
  "where": {
    "$or": [
      { "name": "Tenderheart Bear" },
      { "yearIntroduced": { "$lt": 1985 } }
    ]
  }
}
```

### order

This clause sorts the results of the query. It has a few forms:

```json
{ "order": { "name": "asc" } }
```

```json
{
  "order": [
    { "yearIntroduced": "desc" },
    { "home.name": "asc" }
  ]
}
```

The array form will sort it by the first element, then move to the second element in case of a tie. These cannot be specified in order on a single object because the JSON specification requires object keys to be treated as unordered.

Note that dot form can be used and that things are ordered by the schema properties, not their result keys. The reason for this is that it allows some graph engines, such as a SQL database, to apply criteria more efficiently.

### limit

This reduces the results of the query to a limited number of items after `where`, `order`, and `offset` have been applied. It is nonsensical with a query containing an `id`.

`{ "limit": 2 }` would return the first two results of a query.

Note that `where` and `order` clauses are applied before `limit`.

### offset

This skips a number of results in the query after `where` and `order` have been applied. It is useful in conjunction with `limit` for things such as pagination.
