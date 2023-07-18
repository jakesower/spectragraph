# Schemas

A schema is the first consideration for an application using Data Prism. They describe the entirety of the properties and relationships of the various resources that compose the application. They are loosely based on JSON Schema and can use many of its features, but are ultimately different things with slightly different purposes. However, JSON Schema document the validation of queries and results can be generated in a relatively straightforward manner.

## An Example Schema

```json
{
  "$schema": "https://raw.githubusercontent.com/jakesower/data-prism/main/schemas/data-prism-schema.1.0.schema.json",
  "resources": {
    "bears": {
      "idField": "id",
      "properties": {
        "name": {
          "type": "string"
        },
        "yearIntroduced": {
          "type": "number"
        },
        "bellyBadge": {
          "type": "string"
        },
        "furColor": {
          "type": "string"
        }
      },
      "relationships": {
        "home": {
          "cardinality": "one",
          "resource": "homes",
          "inverse": "residents"
        },
        "powers": {
          "cardinality": "many",
          "resource": "powers",
          "inverse": "wielders"
        },
        "bestFriend": {
          "cardinality": "one",
          "resource": "bears",
          "inverse": "bestFriend"
        }
      }
    },
    "homes": {
      "idField": "id",
      "properties": {
        "name": {
          "type": "string"
        },
        "location": {
          "type": "string"
        },
        "caringMeter": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "isInClouds": {
          "type": "boolean",
          "default": false
        }
      },
      "relationships": {
        "residents": {
          "cardinality": "many",
          "resource": "bears",
          "inverse": "home"
        }
      }
    },
    "powers": {
      "idField": "powerId",
      "properties": {
        "name": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "type": {
          "type": "string"
        }
      },
      "relationships": {
        "wielders": {
          "resource": "bears",
          "cardinality": "many",
          "inverse": "powers"
        }
      }
    }
  }
}
```

This schema describes a database of information about Care Bears. Namely the bears, their homes, and their powers. At the top level is some boilerplate that describes which schema version is being used, then goes into defining the resources.

Each resource is defined by its properties and its relationships. To use bears as an example, its properties are `name`. `yearIntroduced`, `bellyBadge`, and `furColor`. Its relationships are `home`, `powers`, and `bestFriend`.

Properties are defined with a `type` that describes the data type. The following types are always supported, but different data stores may support more:

- boolean
- date-time
- integer
- null
- number
- string

Properties can also include other information, for example the `caringMeter` in `homes` ranges from 0-100. These extra properties line up with what's in the JSON Schema spec. More may be added to them later.

Relationships are also described in the schema. For example the `home` relationship for `bears` can be read as "bears have one home, which is of type `homes`, and `homes` contains a relationship called `residents` that represents the other direction of the relationship.

It is important to note that the main purpose of a schema is to provide a description of the data. It is not meant to include implementation details. This is because there may be different systems that share a schema. Different stores will require different implementation details and should be described at the store level.
