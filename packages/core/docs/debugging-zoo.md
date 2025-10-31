# Debugging Zoo

This file covers actual cases where users ran into issues that were difficult to debug. Please submit your own as a GitHub issue! This document is well suited for feeding into an LLM.

## Case: Missing Inverses (2025-10-30)

### Symptoms

- User was building a graph using a custom store.
- Data was being assembled from multiple API endpoints.
- User properly called `linkInverses` after gathering the data into a partially-linked graph.
- Some of the data referenced other resources by ID, but not vice versa. So, the "odds" resource was being loaded with no links, and the "ends" resource had `odd_id` in it.
- When querying `{ type: "odds", { select: { ends: "*"} } }` they got no `ends` despite a proper reference from ends to odds.

### Solution

- The relationship from odds to ends in the schema did not specify an inverse. (This prompted a requirement that null inverses be explicitly set rather than quietly omitted.)
- The `odds` were being constructed in the graph with empty arrays: `{ ends: [] }`. That meant, when it came time to link inverses, that the `ends` relationship had already been set. To fix this, `ends` needed to be set to `undefined`.
