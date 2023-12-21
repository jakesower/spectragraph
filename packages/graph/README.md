# Querable Graphs

This library exposes the ability to query graphs to receive result trees using a robust query language. It requires two components.

## Resource Data

Resource data is a representation of the graph of data to be queried on. It should be presented in _canonical form_, which looks like this:

```javascript
{
  [resourceType]: {
    [resourceId]: {
      attributes: {
        attr1: "value1",
        attr2: "value2"
      },
      relationships: {
        [relationshipName1]: { type: "other resource", id: "1234" },
        [relationshipName2]: [
          { type: "bar resource", id: 1 },
          { type: "bar resource", id: 2 }
        ]
      }
    }
  }
}
```

Some effort may be required to get resources into this form, but it is designed to be as straightforward as possible. Having structure like this allows the query engine to make good assumptions about the data and allows it to execute many of the more powerful query features.

## Queries

Queries are what make the library useful. They aim to match the format of data you want as the output for your tree as best as they can. There are many types of things you can do within a query. Here's a small example first:

```json
{
  "type": "resource type",
  "select": ["attribute1", "attribute2"]
}
```

Here's the overall structure. Notice that it can be represented in JSON. Also, try not to get overwhelmed with the number of things going on.

```json
{
  "type": "[resource type]",
  "id": "[resource id]",
  "select": [
    "attribute1",
    "relationship ref1",
    {
      "relationship 2": {
        "subquery": "goes here"
      },
      "some sum": { "$sum": "numeric field" }
    }
  ],
  "where": {
    "some": "criterion"
  },
  "order": [
    { "some field": "asc" }
  ],
  "limit": 5,
  "offset": 3
}
```

There's are a lot of options and power in there. Let's try to break it down across the top level keys first:

- **type** indicates the type of the query. It's required at the root, but not in subqueries.
- **id** gets a single resource with an ID. It's optional, and can't be used in subqueries.
- **select** is a required field that instructs the engine what fields it is to return. There are a few types of things it can do, but we'll return to those in a moment.
- **where** adds filters to the data that comes back. It's optional.
- **order** sorts the resources, using one or more fields. It's also optional.
- **limit** and **offset** take a subset of results. They can be useful for pagination and such. These are also optional.

The guts and focus of most queries are going to be on what gets selected. We'll start there with the different types of things.

### `type`

The `type` of an attribute determines which type of resource is being queried at the root level. It's required.

### `id`

An `id` attribute targets the query to a specific resource. With it, you'll get a single resource; without it, you'll get a collection of resources. If the ID isn't found in the graph, you'll get a result of `null`.

### `select`

`select` can be either an array or an object.

If it's an array, its members should be strings of attributes (or relationship refs) to get, or an object that adds additional fields select fields.

If it's an object, the object can be of one of three types:

- A string, in which case that attribute or relationship ref will be returned (and possibly be renamed).
- A subquery, where a relationship will be traversed.
- An expression, which processes the resource's data in some way (we'll come back to these much later as they can safely be ignored).

A couple of examples:

#### Select an Attribute

```json
{ "type": "teams", "select": ["name"] }
```

Might return:

```json
[
  { "name": "Arizona Bay FC" },
  { "name": "Scottsdale Surf" }
]
```

In this example we select the name from each team in our resources.

#### Rename an Attribute

```json
{ "type": "teams", "select": { "nombre": "name" } }
```

Might return:

```json
[
  { "nombre": "Arizona Bay FC" },
  { "nombre": "Scottsdale Surf" }
]
```

Here we rename the "name" attribute to "nombre". You may have noticed that `{ "select": ["name"] }` is equivalent to `{ "select": { "name": "name" } }`.

#### Run a Subquery

```json
{
  "type": "teams",
  "id": 1,
  "select": [
    "name",
    "matches": {
      "select": "field"
    }
  ]
}
```

Might return:

```json
{
  "name": "Arizona Bay FC",
  "matches": [
    { "field": "Phoenix Park 1" },
    { "field": "Mesa Elementary B" }
  ]
}
```

Here we add an `id` key, meaning that we'll get a single resource back. Additionally, we've reached into one of its relationships and run a query there. The `type` of the subquery can be inferred from what's in the parent resource's relationships. Presumably we'd see something like this for the Arizona Bay resource:

```json
{
  "attribute": {
    "name": "Arizona Bay FC"
  },
  "relationships": {
    "matches": [
      { "type": "matches", "id": 1 },
      { "type": "matches", "id": 2 }
    ]
  }
}
```

This is one reason why the canonical form for resources is important: we can traverse the resource to elsewhere in the graph.

#### Conclusion

We've seen the basics of querying. Expressions will be discussed later, but any data can be fetched without them. Hopefully you've noticed that the results of the queries closely line up with what's in the `select` field, including the nested subqueries. For more examples, you can check out the test suite.

### `where`

The `where` property allows you to filter the result based on either properties, expressions, or property expressions. We'll leave the full expressions for later, but touch on the property expressions a little bit here because they're an integral part of some results and hopefully don't introduce too much complexity.

#### Equality

```json
{
  "type": "matches",
  "select": ["field", "ageGroup"],
  "where": {
    "field": "Phoenix Park 1"
  }
}
```

Might give us:

```json
[
  { "field": "Phoenix Park 1", "ageGroup": 11 },
  { "field": "Phoenix Park 1", "ageGroup": 14 }
]
```

The `where` clause has whittled the results down to just the matches with the correct field name.

#### Numeric Comparison

```json
{
  "type": "matches",
  "select": ["field", "ageGroup"],
  "where": {
    "ageGroup": { "$gt": 11 }
  }
}
```

Might give us:

```json
[
  { "field": "Mesa HS", "ageGroup": 17 }
  { "field": "Phoenix Park 1", "ageGroup": 14 }
]
```

`{ "$gt": 11 }` is an expression that does a "greater than" comparison for its filtering. I'll document these at some point.

### `order`

The `order` clause sorts results. It takes an array of field/direction pairs and sorts by them in order. If the first sorting is equal the second is applied, etc.

```json
{
  "order": [
    { "ageGroup": "desc" },
    { "field": "asc" }
  ]
}
```

### `limit` and `offset`

These two properties work in tandem to reduce a list of results to a particular size. `[1, 2, 3, 4]` with limit 2, offset 1 would be `[2, 3]` for example. This pattern is well documented within the SQL world.
