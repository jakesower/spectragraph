# Data Prism

## Remix

### Operations

Operations are the core concept for remixing. They get used in two ways: collection and application. The collection aspect is when an operation is selected and gather its parameters. Application involves taking that information and applying it to a source.

### Operation Types

#### Combine

A `combine` operation is any operation involving two (or more?) sources. They include joins, set combinations, and appends.

### Derive

A `derive` operation produces one or more new columns based on information in the source. This can be per-row, such as adding two numbers; or calculated from the whole source, such as the percentile of a value across the source.

### Filter

A `filter` collects criteria for which rows should be included in the result source. All filters are per-row and always produce a boolean. (What about "top 10%" or the like? Depend on derived columns?)

*TODO: The following headings are not categories of operations, but are useful and familiar enough to make them worthy of their own sections. All could be replecated with the above types except for limiting columns in the result. Well, sorta. The key difference is producing a transformed result source (totally different columns), which using the above types of operations would be difficult, and would require an "embedded source" in some fashion. It's totally not worth it.*

### Sort

A `sort` takes a list of columns with a direction and produces a sorted list based on those columns in order, preferring columns earlier in the list.

### Limit & Offset

Not so much an operation, `limit` and `offset` describe how many rows should be in the result set and which index to start with, respectively.

### Group

The `group` operation takes a list of columns (parameter columns) and produces a result set with the following qualities:

- The result columns will the same as the parameter columns, with the addition of a special column for the original rows.
- Rows will be composed of each unique combination of the parameter columns with all rows having that combination in the special column.
- Alternatively, the cartesian product of the unique values of the paremeter columns can be used, with some special columns being empty in some rows.

The resulting source lends itself to particular `aggregate` operations, such as counting the number of result rows in the special column. These are ultimately identical to `derive` operations. However, it is useful to treat them differently because the central utility of `group` is to apply `aggregate` operations to it, though it is possible to simply preserve the special column if desired. The result source of a `group` is fundamentally different than any other operation type. (A `derive` operation could theoretically be capable of this, but it's impractical and distracting.)

### Column

### Order of Operations

- Join
- Compute
- Filter
- Sort
- Limit/Offset
- Group with Aggregates

Following this pattern will create a new source, which may be temporary. Keeping things ordered will promote simplicity instead of the hodge-podge operations in any order.
