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
normalizeResource(schema, resourceType, flatResource);
```

This function uses a schema to separate the attributes and relationships within a resource. Let's have a look at some examples. These use the [Care Bear Schema]("./test/care-bear-schema.js"), so familiarize yourself with that or have it handy to reference.

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

const normalBear = normalizeResource(careBearSchema, "bears", bearAPIData);
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
createGraphFromTrees(schema, resourceType, flatResources);
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

const normalBear = createGraphFromTrees(careBearSchema, "bears", [bearAPIData]);
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

### `mergeGraphs`

```javascript
mergeGraphs(leftGraph, rightGraph);
```

This creates a new graph with all of the resources from both graphs combined. Note that it does not combine resources themselves, rather it treats resources of the same type and the same ID as being the same.

### `linkInverses`

```javascript
linkInverses(schema, graph);
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
flattenResource(resourceId, resource, (idAttribute = "id"));
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
