# Helper Functions

Helper functions are useful for getting data from a variety of API formats into the normal format used by Data Prism. Some are focused on wrangling REST data, others are focused on helping to construct queries to be sent to APIs.

## Definitions

A `flatResource` is a resource that doesn't differentiate between attributes and relationships. For example:

```json
{
	"id": "an-id",
	"name": "Tenderheart Bear",
	"powers": ["some-id", "another-id"],
	"home": {
		"id": "home-id",
		"name": "Care-a-Lot"
	}
}
```

In this example we see the `name` attribute, references to `powers` and a nested `home` resource. If this is the type of data your APIs return, you've come to the right place.

## Data Wranglers

These functions are meant to handle API responses or data from trees or other formats.

### `normalizeResource`

```javascript
normalizeResource(resourceType, flatResource, schema, (resourceMappers = {}));
```

This function uses a schema to separate the attributes and relationships within a resource. It adds an optional `resourceMappers` object to handle attributes and relationships that somehow don't copy over directly. Let's have a look at some examples. These use the [Care Bear Schema]("./test/care-bear-schema.js"), so familiarize yourself with that or have it handy to reference.

```javascript
const bearAPIData = {
	id: "bear-abc-123",
	name: "Tenderheart Bear",
	yearIntroduced: 1982,
	bellyBadge: "red heart with pink outline",
	furColor: "tan",
	home: {
		id: "home-def-234",
		name: "Care-a-Lot",
		location: "Kingdom of Caring",
		caringMeter: 1,
		isInClouds: true,
	},
	powers: ["power-fgh-345", "power-ijk-456"],
};

const normalBear = normalizeResource("bears", bearAPIData, careBearSchema);
```

This would produce:

```javascript
{
  attributes: {
    id: "bear-abc-123",
    name: "Tenderheart Bear",
    yearIntroduced: 1982,
    bellyBadge: "red heart with pink outline",
    furColor: "tan",
  },
  relationships: {
    home: { type: "homes", id: "home-def-234" },
    powers: [
      { type: "powers", id: "power-fgh-345" },
      { type: "powers", id: "power-ijk-456" }
    ]
  }
}
```

This is the normal format for data prism and will allow us to use it for querying purposes. A few notable things that the function did:

- Separated attributes from relationships using the schema as a reference
- Normalized relationships to the ref format `{ type: "xxx", id: "yyy" }`, once again using the schema as a reference

The nested `home` data was lost as a part of the process, as we're formatting a single resource. The next function, however, will handle such cases.

### `createGraphFromTrees`

```javascript
createGraphFromTrees(resourceType, flatResources, schema, graphMappers = {});
```

This function is similar to the previous one, but will create an entire graph based on an array of flat resources. It attempts to capture as much data as possible, conforming to the provided schema.

Let's return to our example:

```javascript
const bearAPIData = {
	id: "bear-abc-123",
	name: "Tenderheart Bear",
	yearIntroduced: 1982,
	bellyBadge: "red heart with pink outline",
	furColor: "tan",
	home: {
		id: "home-def-234",
		name: "Care-a-Lot",
		location: "Kingdom of Caring",
		caringMeter: 1,
		isInClouds: true,
	},
	powers: ["power-fgh-345", "power-ijk-456"],
};

const normalBear = createGraphFromTrees("bears", [bearAPIData], careBearSchema);
```

Note that we made our API data into an array. This will return to us a graph:

```javascript
{
  bears: {
    "bear-abc-123": {
      attributes: {
        id: "bear-abc-123",
        name: "Tenderheart Bear",
        yearIntroduced: 1982,
        bellyBadge: "red heart with pink outline",
        furColor: "tan"
      },
      relationships: {
        home: { type: "homes", id: "home-def-234" },
        powers: [
          { type: "powers", id: "power-fgh-345" },
          { type: "powers", id: "power-ijk-456" }
        ]
      }
    }
  },
  homes: {
    "home-def-234": {
      attributes: {
        name: "Care-a-Lot",
        location: "Kingdom of Caring",
        caringMeter: 1,
        isInClouds: true
      },
      relationships: {
        residents: []
      }
    }
  },
  powers: {}
}
```

Here we have an entire graph that contains all of the information from the API data that was passed in.

You may notice that the graph is incomplete. That is, there are refs to resources not in the graph, e.g. at `bears.relationships.powers` as well as missing data, e.g. `homes.relationships.residents`. This is unavoidable given the API data. However, this may be sufficient to fulfill a query. Alternatively, there may be other graphs that come from elsewhere that can be merged into the current graph to complete the data.

#### Mappers

Let's say that the API data doesn't match up with our schema exactly. Let's change a couple of things and see how they can be dealt with:

```javascript
const bearAPIData = {
	id: "bear-abc-123",
	name: "Tenderheart Bear",
	date_introduced: "1982-02-04",
	belly_badge: "red heart with pink outline",
	fur_color: "tan",
	home: {
		uuid: "home-def-234",
		name: "Care-a-Lot",
		location: "Kingdom of Caring",
		caring_meter: 1,
		is_in_clouds: true,
	},
	powers: ["power-fgh-345", "power-ijk-456"],
};
```

Here we see that the API is delivering us data with snake_case attributes instead of camelCase. Additionally, the `yearIntroduced` field doesn't appear at all. Rather, we get `date_introduced` which contains the data, but in an unhelpful format.

To deal with these, we can use mappers. Recall that `normalizeResource` and `createGraphFromTrees` take in an optional mapper argument. These have the form:

```javascript
{
  resourceType: {
    attribute1: "some string",
    attribute2: (resource) => "some resource function",
  }
}
```

Let's have a look at what will work for our example above.

```javascript
const graphMappers = {
	bears: {
		bellyBadge: "belly_badge",
		furColor: "fur_color",
		yearIntroduced: (resource) => Number(resource.date_introduced.slice(0, 4)),
	},
	homes: {
		id: "uuid",
		caringMeter: "caring_meter",
		isInClouds: "is_in_clouds",
	},
};
```

Most of the values here are strings. These act as renamings for the fields. So `belly_badge` from the API data becomes `bellyBadge` in our normalized graph. More interestingly, `yearIntroduced` takes in a function. Each time a `bears` resource is being normalized, the raw API value will be passed to the function and its return value will be what populates the normalized resource.

Mappers work with relationships as well. Let's change up the API data again slightly:

```javascript
const bearAPIData = {
	id: "bear-abc-123",
	name: "Tenderheart Bear",
	date_introduced: "1982-02-04",
	belly_badge: "red heart with pink outline",
	fur_color: "tan",
	abode: {
		id: "home-def-234",
		name: "Care-a-Lot",
		location: "Kingdom of Caring",
		caring_meter: 1,
		is_in_clouds: true,
	},
	powers: ["power-fgh-345", "power-ijk-456"],
};
```

Here we see that `home` was changed to `abode`. We need only update our mappers to target the relationship and it will be similarly mapped.

```javascript
const bearsMapper = { home: "abode" };
```

Mappers allow for a great deal of flexibility and will hopefully streamline the process of normalizing resources by focusing on what needs to be changed to make things fit.

### `mergeGraphs`

```javascript
mergeGraphs(leftGraph, rightGraph);
```

This creates a new graph with all of the resources from both graphs combined. Note that it does not combine resources themselves, rather it treats resources of the same type and the same ID as being the same.

### `linkInverses`

```javascript
linkInverses(graph, schema);
```

As mentioned above, sometimes the data we get from an API makes for an incomplete graph. `linkInverses` comes into play here. Consider this graph (with some attributes cut out for brevity):

```javascript
{
  bears: {
    "bear-abc-123": {
      attributes: {
        id: "bear-abc-123",
        name: "Tenderheart Bear",
      },
      relationships: {
        powers: [
          { type: "powers", id: "power-fgh-345" }
        ]
      }
    },
    "bear-lmn-567": {
      attributes: {
        id: "bear-lmn-567",
        name: "Wish Bear",
      },
      relationships: {
        powers: [
          { type: "powers", id: "power-fgh-345" },
          { type: "powers", id: "power-ijk-456" }
        ]
      }
    }
  },
  homes: {
    "home-def-234": {
      attributes: {
        name: "Care-a-Lot",
      },
      relationships: {
        residents: [
          { type: "bears", id: "bear-abc-123" },
          { type: "bears", id: "bear-lmn-567" }
        ]
      }
    }
  },
  powers: {}
}
```

It looks like we ran a query on `homes` and got back a home and some nested `bears` data with it. The key thing to note is that the bears are missing a `home` relationship. Missing relationships can come up for a number of reasons, including merging graphs or simply the API data didn't have the information. However, looking at the graph we can also see that the information to link the bears to their home is present in the `residents` relationship on `homes`. The care bear schema specifies that the inverse of the `homes.residents` relationship is `home` (on the `bears` resource type).

We can call `linkInverses` to fill in that missing data. It will go through the graph, looking for undefined relationships and trying to construct them from their inverses. In this case, `bears.home` will be constructed from `homes.residents`. Note that `bears.relationships.powers` doesn't have anything to link to and will remain untouched.

Running `linkInverses` will give us a new graph that looks like this:

```javascript
{
  bears: {
    "bear-abc-123": {
      attributes: {
        id: "bear-abc-123",
        name: "Tenderheart Bear",
      },
      relationships: {
        home: { "type": "homes", id: "home-def-234" },
        powers: [
          { type: "powers", id: "power-fgh-345" }
        ]
      }
    },
    "bear-lmn-567": {
      attributes: {
        id: "bear-lmn-567",
        name: "Wish Bear",
      },
      relationships: {
        home: { "type": "homes", id: "home-def-234" },
        powers: [
          { type: "powers", id: "power-fgh-345" },
          { type: "powers", id: "power-ijk-456" }
        ]
      }
    }
  },
  homes: {
    "home-def-234": {
      attributes: {
        name: "Care-a-Lot",
      },
      relationships: {
        residents: [
          { type: "bears", id: "bear-abc-123" },
          { type: "bears", id: "bear-lmn-567" }
        ]
      }
    }
  },
  powers: {}
}
```

It's typically best to run this as a final step before using the graph for queries.

### `flattenResource`

```javascript
flattenResource(resourceId, resource, (idField = "id"));
```

This is an inverse function for `normalizeResource`.

```javascript
const resource = {
	attributes: {
		id: "bear-abc-123",
		name: "Tenderheart Bear",
		yearIntroduced: 1982,
		bellyBadge: "red heart with pink outline",
		furColor: "tan",
	},
	relationships: {
		home: { type: "homes", id: "home-def-234" },
		powers: [
			{ type: "powers", id: "power-fgh-345" },
			{ type: "powers", id: "power-ijk-456" },
		],
	},
};

const flat = flattenResource("bear-abc-123", resource, "id");
```

This would produce:

```javascript
{
  id: "bear-abc-123",
  name: "Tenderheart Bear",
  yearIntroduced: 1982,
  bellyBadge: "red heart with pink outline",
  furColor: "tan",
  home: "home-def-234",
  powers: ["power-fgh-345", "power-ijk-456"]
}
```

## Query Helpers

The data wranglers described above focus on taking raw API data and coercing it into data prism graph. Query helpers are tools for taking queries apart to help build API requests. As usual, an example should illustrate this best. We'll be covering `forEachQuery`, `mapQuery`, and `reduceQuery`.

Scenario: We're trying to create a URL to send to an API to get the data necessary for a query. Let's say that we're working with a [JSON:API](https://jsonapi.org/) that supports some of the features available within JSON:API, but not all. We'll say it supports sparse fields and pagination. Ideally we'd like to push as much work on the API as possible. Let's consider a query:

```javascript
const query = {
	type: "bears",
	select: ["name", "yearIntroduced"],
};
```

This case isn't so bad and we can whip up a URL without doing anything fancy:

```javascript
// a helper function we'll use in future examples as well
const makeFieldStr = (fields) =>
	Object.entries(fields)
		.map(
			([resourceType, resourceFields]) =>
				`fields[${resourceType}]=${resourceFields.join(",")}`,
		)
		.join("&");

const fields = { bears: query.select.join(",") };
const fieldStr = makeFieldStr(fields);

const url = `https://example.com/${query.type}?${fieldStr}`;
```

The URL produced would be `https://example.com/bears?fields[bears]=name,yearIntroduced`

There may be too much going on there, so let's focus on `const fields = { bears: query.select };`. This is not going to go the distance as we start using more complicated queries. Let's have a look at a query that's more interesting.

```javascript
const query = {
	type: "bears",
	select: [
		"name",
		"yearIntroduced",
		{
			home: {
				select: ["name"],
			},
		},
	],
};
```

The code we used above is completely unhelpful in this situation. Having a subquery in the `select` clause means that we can't join the arguments there. This has become a pretty annoying looking problem. We're going to have to traverse the query somehow to extract all the info we need. Ultimately what we want to end up with is a URL like `https://example.com/bears?fields[bears]=name,yearIntroduced&fields[homes]=name`.

This is where the query helpers come in. Their job is to take care of walking through subqueries in an organized manner, leaving us to focus on the parts relevant to our application. Let's start with `forEachQuery`

### `forEachQuery` and `reduceQuery`

```javascript
forEachQuery(schema, query, fn);
```

What this will do is call `fn` once for each subquery in our tree. We'll refer to the `query` up above. Namely:

```javascript
forEachQuery(careBearSchema, query, (subquery) => {
	console.log("hello from subquery", JSON.stringify(subquery, null, 2));
});
```

This will output:

```
hello from subquery {
  type: "bears",
  select: [
    "name",
    "yearIntroduced",
    {
      home: {
        select: ["name"],
      }
    }
  ],
}

hello from subquery {
  {
    select: ["name"],
  }
}
```

That means that our function was invoked twice. That's nice an all, but let's have a look at what else our function can receive:

```javascript
forEachQuery(careBearSchema, query, (subquery, info) => {
	console.log("hello", JSON.stringify(info, null, 2));
});
```

Output:

```
hello {
  path: [],
  parent: null,
  type: "bears",
  attributes: ["name", "yearIntroduced"],
  relationships: {
    home: {
      select: ["name"]
    }
  }
}

hello {
  path: ["home"],
  parent: {
    type: "bears",
    select: [
      "name",
      "yearIntroduced",
      {
        home: {
          select: ["name"]
        }
      }
    ],
  },
  type: "homes",
  attributes: ["name"],
  relationships: {}
}
```

There are some useful goodies in that `info` argument that comes in second argument to our provided function. This is enough information to help us construct our JSON API URL.

```javascript
const fields = {};

forEachQuery(careBearSchema, query, (subquery, info) => {
	const { type, attributes } = info;
	fields[type] = attributes;
});
```

We can construct our URL from the `fields` object that we constructed. `forEachQuery` has done the work of walking the subqueries and presenting info in a useful manner.

Another way of doing the same thing is using a reduce pattern. This is done in much the same way:

```javascript
const fields = reduceQuery(
  careBearSchema,
  query,
  (acc, subquery, info) => {
    const { type, attributes } = info;
    { ...acc, [type]: attributes }
  },
  {}
);
```

### `mapQuery`

In the above example, we mentioned that out JSON API also supported pagination. The implementation we'll assume is `page[number]`, which specifies how many pages in to the results are, and `page[size]` which indicates how many results will be returned per page. Let's consider a query:

```javascript
const query = {
	type: "bears",
	select: [
		"name",
		"yearIntroduced",
		{
			home: {
				select: ["name"],
			},
		},
	],
	limit: 10,
	offset: 20,
};
```

Examining this we can see that each page has 10 items (`limit` 10) we're on the third page (`offset` 20). We can construct the required URLs using the patterns discussed in the previous section. However, our query as-is will be wrong once that's factored in. That's because our query is telling us to skip 20 and take 10 in the results. But the results already have that baked in. We're going to have to modify the query on our end to make everything line up smoothly. Once again, there's the hassle of walking the queries that is addressed by the helper functions. In this case, we want to reach for `mapQuery`. Like it sounds, this function will modify each subquery by running it through a function. (We'll also employ the `omit` function from lodash.)

```javascript
mapQuery(careBearSchema, query, (subquery) =>
	omit(subquery, ["limit", "offset"]),
);
```

That will clear out the appropriate keys, leaving us with a new query that will work as we'd like it to.

### Schemaless Helpers

There are other helper functions, namely `forEachSchemalessQuery`, `mapSchemalessQuery`, and `reduceSchemalessQuery` that do not require a schema. This, however, means that there is much less available info. For these, the `info` argument for the passed in function only contains `path` and `parent`.
