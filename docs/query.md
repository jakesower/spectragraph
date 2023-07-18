# Queries

Queries are responsible for describing a request to fetch data. It describes the shape of the data as well as modifiers to what is needed, such as filters, sorting, number of results to return, etc. Queries are represented by JSON.

## Example Query

```json
{
  "type": "bears",
  "id": "1",
  "properties": {
    "name": "name",
  },
}
```

This query means "get me the name of the bear with id '1'". `type` is required at the top level to tell the store where to start. `id` is optional and allows for the selection of a single resource. `properties` is also required and determines the properties that are desired. They are keyed by the keys of the desired result and are set to the names of the properties to be returned.

### Results

Results are returned to match the properties of the query.

```json
{ "name": "Tenderheart" }
```

### Referenced Relationship Example

```json
{
  "type": "bears",
  "properties": {
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
  "properties": {
    "id": "id",
    "bestFriend": {
      "properties": {
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
