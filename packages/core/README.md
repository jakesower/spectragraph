## Query Breakdown

Query breakdowns are a useful way of viewing nested queries. They present the root query and each subquery in a single array that can be manipulated for such things as query building. It's helpful to not have to navigate a tree structure in every situation.

They have the following fields:

- **isRefQuery**: The subquery should return a resource ref.
- **parent**: The parent query to the subquery. `null` for the root query.
- **parentRelationship**: The name of the relationship traversed on the parent to this subquery. `null` for the root query.
- **path**: An array of traversed relationships to the current subquery, e.g. `["relationship_a", "relationship_b"]`. An empty array for the root query.
- **properties**: The non-relationship properties to be selected.
- **query**: The subquery.
- **relationships**: The relationships subqueries to be selected.
- **type**: The type of the resource for this subquery.
