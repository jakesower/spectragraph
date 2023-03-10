What are realistic work flows ( ✨ User Stories ✨ )

## Play with the Data

1. Import a single CSV file
1. Do some sorting, filtering, etc. for whatever purpose
1. Possibly export a CSV with said data

## Try to Find Patterns

1. Import a single data source
1. Run some statistical analyses on some of the fields
1. View correlations or whatever

## Augment a Data Source

1. Import some data
1. Search for other data that might be joined with it
1. Join the data, then export the result

# Cross-Cutting Concerns

- Importing data from CSV or IRI
	- This isn't going to be something users will care about much once they have their data locked in
	- A modal might do for "advanced" source management (except sharing)
- Seeing the data in a table

# Misc

1. Does making a chart really deserve a tab?
1. Tabs seem to be geared toward high level tasks. Charts might be for exploration OR for sharing.

# 2023-03-04

Consider `{ $gt: 5 }`
One meaning for it might be `(_) => _ > 5`
Contrast this with `{ $gt: [x, 5] }`
In the first `_` is entirely implicit. In the second, it must be named.

Consider the filter `{ age: { $gt: 5 } }`
The most clear meaning seems to be `age > 5`
Alternatively, `((_) => _ > 5)(age)`

Consider the records `[{ age: 4 }, { age: 5 }, { age: 6 }]`,
in conjunction with `{ age: { $gt: 5 } }`

Two things are at play:
1. Extract `age` from each record
2. Apply the compiled `_ => _ > 5` to the extracted age

So...

Wouldn't it be better to separate the two concerns?
The whole point of expressions is that they translate JSON into functions.
The application of these functions is another matter.
? The presence of `$var` and `$literal` aren't technically necessary for expressions to work.

Ultimately, `{ $gt: 5 }` and `{ $gt: [x, 5] }` are equivalent.
However, the act of needing to name `x` in the above is... worse than not naming it.

`{ $and: [{ $gt: 5 }, { $lt: 8 }] }` is quite terse
`(x) => [y => y > 5, y => y < 8].every(fn => fn(x))`

`{ age: { $gt: 5 }, grade: { $eq: 1 } }`
can be broken down to
1. The outermost dictionary acts as an `$and`
2. The keys in that dictionary act as `$prop`
3. The values inside act as boolean functions

(1) and (2) are contextual. The could be made less contextual by creating a new expression
or similar, say, `{ $filter: { age: { $gt: 5 }, grade: { $eq: 1 } } }`

How useful is `$filter`?
1. It makes it clear that the object should be treated with (1) and (2).

# 2023-03-05

Does there need to be an `$apply` expressions? `{ $eq: [5, 5] }` is cool and all, but is there a need for it?
