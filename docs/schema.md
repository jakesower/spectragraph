# Schema Definition Guide

Schemas define the structure of your data, including resource types, attributes, and relationships. They serve as the foundation for query validation, data normalization, and store operations. SpectraGraph schemas are JSON serializable, enabling powerful integration with backends and other systems.

## Table of Contents

- [Basic Schema Structure](#basic-schema-structure)
- [Resource Definitions](#resource-definitions)
- [Attribute Types](#attribute-types)
- [Relationships](#relationships)
- [Advanced Schema Features](#advanced-schema-features)
  - [Cross-Field Validation](#cross-field-validation)
- [Schema Validation](#schema-validation)
- [Examples](#examples)

## Basic Schema Structure

A SpectraGraph schema is a JSON object that describes all resource types in your data model:

```javascript
const schema = {
  resources: {
    users: {
      attributes: {
        name: { type: "string" },
        email: { type: "string" },
      },
      relationships: {
        posts: { type: "posts", cardinality: "many" },
      },
    },
    posts: {
      attributes: {
        title: { type: "string" },
        content: { type: "string" },
        words: { type: "integer", minimum: 1 },
      },
      relationships: {
        author: { type: "users", cardinality: "one" },
      },
    },
  },
};
```

## Resource Definitions

Each resource type in your schema defines:

### Basic Resource Structure

```javascript
{
  resources: {
    "resourceName": {
      idAttribute: "id",        // Optional: custom ID field (defaults to "id")
      attributes: {
        // Define all data fields
      },
      relationships: {
        // Define connections to other resources
      }
    }
  }
}
```

### Custom ID Attributes

By default, resources use `"id"` as their identifier. You can customize this:

```javascript
{
  resources: {
    users: {
      idAttribute: "userId",    // Use "userId" instead of "id"
      attributes: {
        userId: { type: 'string' },
        name: { type: 'string' }
      }
    },
    posts: {
      idAttribute: "slug",      // Use "slug" as identifier
      attributes: {
        slug: { type: 'string' },
        title: { type: 'string' }
      }
    }
  }
}
```

## Attribute Types

Attribute definitions use JSON Schema format. Any valid JSON Schema document can be used for attribute definitions, providing extensive flexibility:

### Basic Types

```javascript
{
  attributes: {
    // String fields
    name: { type: 'string' },
    email: { type: 'string' },

    // Numeric fields
    age: { type: 'number' },
    score: { type: 'integer', title: 'Score', description: 'The number of points scored.' },

    // Boolean fields
    active: { type: 'boolean' },
    verified: { type: 'boolean' },

    // Date/time fields (string with format)
    createdAt: { type: 'string', format: 'date-time' },
    birthDate: { type: 'string', format: 'date' },
  }
}
```

### Complex Types

```javascript
{
  attributes: {
    // JSON objects/arrays
    metadata: { type: 'object' },
    tags: { type: 'array' },

    // Advanced JSON Schema features
    address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        zipCode: { type: 'string', pattern: '^[0-9]{5}$' }
      },
      required: ['city']
    }
  }
}
```

### Type Constraints

Use JSON Schema features for validation:

```javascript
{
  attributes: {
    // String constraints
    email: {
      type: 'string',
      format: 'email'           // Email validation
    },
    status: {
      type: 'string',
      enum: ['active', 'inactive', 'pending']  // Limited values
    },

    // Number constraints
    age: {
      type: 'integer',
      minimum: 0,
      maximum: 150
    },
    rating: {
      type: 'number',
      minimum: 0,
      maximum: 5
    }
  },

  // Required attributes can be specified at resource level (legacy approach)
  requiredAttributes: ['name', 'email']  // These must be present

  // Or use schema.required (recommended)
  schema: {
    required: ['name', 'email']
  }
}
```

## Relationships

Relationships define how resources connect to each other:

### Relationship Types

```javascript
{
  relationships: {
    // One-to-many: User has many posts
    posts: {
      type: 'posts',           // Target resource type
      cardinality: 'many'      // One user -> many posts
    },

    // Many-to-one: Post belongs to user
    author: {
      type: 'users',
      cardinality: 'one'       // Many posts -> one user
    },

    // One-to-one: User has one profile
    profile: {
      type: 'profiles',
      cardinality: 'one'       // One user -> one profile
    },

    // Many-to-many: Post has many tags, tag has many posts
    tags: {
      type: 'tags',
      cardinality: 'many'      // Implemented via junction data
    }
  }
}
```

### Inverse Relationships

Define both sides of relationships for automatic linking:

```javascript
{
  resources: {
    users: {
      attributes: { name: { type: 'string' } },
      relationships: {
        posts: {
          type: 'posts',
          cardinality: 'many',
          inverse: 'author'       // Points to posts.relationships.author
        }
      }
    },
    posts: {
      attributes: { title: { type: 'string' } },
      relationships: {
        author: {
          type: 'users',
          cardinality: 'one',
          inverse: 'posts'        // Points to users.relationships.posts
        }
      }
    }
  }
}
```

#### One-Way Relationships

Inverse relationships can be set to `null` when you only need to traverse a relationship in one direction:

```javascript
{
  resources: {
    teams: {
      attributes: { title: { type: 'string' } },
      relationships: {
        rival: {
          type: 'teams',
          cardinality: 'one',
          inverse: null           // One-way relationship - no automatic back-reference
        }
      }
    }
  }
}
```

**When to use one-way relationships:**

- **Asymmetric relationships**: When the relationship doesn't naturally flow both ways
- **Performance optimization**: When you only query in one direction and want to avoid maintaining reverse links
- **Simplifying data models**: When the inverse relationship would add unnecessary complexity

**Caveats:**

- **Manual data management**: You're responsible for maintaining relationship integrity. SpectraGraph won't automatically update related resources when you modify a one-way relationship.
- **Query limitations**: You can only traverse the relationship in the defined direction. To query from the other side, you'll need to use filtering or other query mechanisms.
- **Data consistency**: Without automatic inverse updates, it's possible to create orphaned or inconsistent relationships if not managed carefully.
- **Harder to reason about**: Bidirectional relationships make data dependencies more explicit. One-way relationships can hide important connections in your data model.

### Self-Referencing Relationships

Resources can reference themselves:

```javascript
{
  resources: {
    users: {
      attributes: { name: { type: 'string' } },
      relationships: {
        manager: {
          type: 'users',          // Self-reference
          cardinality: 'one'
        },
        directReports: {
          type: 'users',          // Self-reference
          cardinality: 'many',
          inverse: 'manager'
        }
      }
    }
  }
}
```

## Advanced Schema Features

### Cross-Field Validation

For complex business rules that involve multiple fields, use the `schema` property on resources. This property accepts any JSON Schema keywords except `properties` (use `attributes` for field definitions instead).

#### Conditional Requirements

Require fields based on the value of other fields using `if`/`then`:

```javascript
{
  resources: {
    fires: {
      attributes: {
        id: { type: 'string' },
        type: { type: 'string', enum: ['wildfire', 'complex'] },
        containedFires: { type: 'array', items: { type: 'string' } }
      },
      relationships: {},
      schema: {
        // If type is "complex", require containedFires
        if: {
          properties: { type: { const: 'complex' } }
        },
        then: {
          required: ['containedFires']
        }
      }
    }
  }
}
```

#### Mutually Exclusive Fields

Require one of several fields using `oneOf`:

```javascript
{
  resources: {
    fires: {
      attributes: {
        id: { type: 'string' },
        name: { type: 'string' },
        origin: { type: 'object' },      // Point location
        perimeter: { type: 'object' }    // Polygon boundary
      },
      relationships: {},
      schema: {
        required: ['name'],
        // Fire must have EITHER origin OR perimeter (but not both, not neither)
        oneOf: [
          { required: ['origin'] },
          { required: ['perimeter'] }
        ]
      }
    }
  }
}
```

#### At Least One Required

Require at least one field from a set using `anyOf`:

```javascript
{
  resources: {
    assignments: {
      attributes: {
        id: { type: 'string' },
        damageReported: { type: 'boolean' },
        destroyedTotal: { type: 'integer', minimum: 0 },
        protectiveActionsTotal: { type: 'integer', minimum: 0 }
      },
      relationships: {},
      schema: {
        // If damage was reported, at least one counter must be > 0
        if: {
          properties: { damageReported: { const: true } }
        },
        then: {
          anyOf: [
            { properties: { destroyedTotal: { minimum: 1 } } },
            { properties: { protectiveActionsTotal: { minimum: 1 } } }
          ]
        }
      }
    }
  }
}
```

#### Multiple Constraints

Combine multiple requirements using `allOf`:

```javascript
{
  resources: {
    fires: {
      attributes: {
        id: { type: 'string' },
        name: { type: 'string' },
        acreage: { type: 'number', minimum: 0 },
        origin: { type: 'object' },
        incidentCommander: { type: 'string' }
      },
      relationships: {},
      schema: {
        required: ['name'],
        allOf: [
          // Must have location data
          { required: ['origin'] },
          // Large fires require incident commander
          {
            if: {
              properties: { acreage: { minimum: 1000 } }
            },
            then: {
              required: ['incidentCommander']
            }
          }
        ]
      }
    }
  }
}
```

#### Schema vs requiredAttributes

The `schema` property is the recommended approach for defining required fields and complex validation. The legacy `requiredAttributes` array is still supported for backward compatibility:

```javascript
{
  resources: {
    users: {
      attributes: {
        name: { type: 'string' },
        email: { type: 'string' }
      },
      relationships: {},

      // Legacy approach (still supported)
      requiredAttributes: ['name', 'email'],

      // Modern approach (recommended)
      schema: {
        required: ['name', 'email']
      }
    }
  }
}
```

When both are present, `schema.required` takes precedence over `requiredAttributes`.

**Note:** The `schema` property cannot contain a `properties` field. Use the `attributes` object for field definitions to maintain separation of concerns.

## Schema Validation

SpectraGraph validates schemas to catch errors early:

### Common Validation Errors

```javascript
// Missing required fields
{
  resources: {
    users: {
      // Missing 'attributes' - will cause validation error
      relationships: {
        posts: { type: 'posts', cardinality: 'many' }
      }
    }
  }
}

// Correct - include required fields
{
  resources: {
    users: {
      attributes: {
        name: { type: 'string' }
      },
      relationships: {
        posts: { type: 'posts', cardinality: 'many' }
      }
    }
  }
}

// Invalid relationship reference
{
  resources: {
    users: {
      attributes: { name: { type: 'string' } },
      relationships: {
        posts: {
          type: 'blogPosts',      // 'blogPosts' resource doesn't exist
          cardinality: 'many'
        }
      }
    }
  }
}

// Correct - reference existing resources
{
  resources: {
    users: {
      attributes: { name: { type: 'string' } },
      relationships: {
        posts: {
          type: 'posts',          // 'posts' resource exists
          cardinality: 'many'
        }
      }
    },
    posts: {
      attributes: { title: { type: 'string' } }
    }
  }
}
```

### Schema Validation in Code

```javascript
import { validateSchema } from "@spectragraph/core";

const schema = {
  resources: {
    users: {
      attributes: { name: { type: "string" } },
    },
  },
};

// Validate schema
try {
  validateSchema(schema);
  console.log("Schema is valid");
} catch (error) {
  console.error("Schema validation failed:", error.message);
}
```

## Examples

### E-commerce Schema

```javascript
const ecommerceSchema = {
  resources: {
    customers: {
      attributes: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string", format: "email" },
        createdAt: { type: "string", format: "date-time" },
      },
      requiredAttributes: ["firstName", "lastName", "email"],
      relationships: {
        orders: { type: "orders", cardinality: "many" },
        profile: { type: "customerProfiles", cardinality: "one" },
      },
    },

    orders: {
      attributes: {
        orderNumber: { type: "string" },
        status: {
          type: "string",
          enum: ["pending", "processing", "shipped", "delivered"],
        },
        total: { type: "number", minimum: 0 },
        createdAt: { type: "string", format: "date-time" },
      },
      requiredAttributes: ["orderNumber"],
      relationships: {
        customer: { type: "customers", cardinality: "one" },
        items: { type: "orderItems", cardinality: "many" },
      },
    },

    products: {
      attributes: {
        name: { type: "string" },
        description: { type: "string" },
        price: { type: "number", minimum: 0 },
        inStock: { type: "boolean", default: true },
      },
      requiredAttributes: ["name"],
      relationships: {
        category: { type: "categories", cardinality: "one" },
        orderItems: { type: "orderItems", cardinality: "many" },
      },
    },

    orderItems: {
      attributes: {
        quantity: { type: "integer", minimum: 1 },
        unitPrice: { type: "number", minimum: 0 },
      },
      relationships: {
        order: { type: "orders", cardinality: "one" },
        product: { type: "products", cardinality: "one" },
      },
    },

    categories: {
      attributes: {
        name: { type: "string" },
        slug: { type: "string" },
      },
      relationships: {
        products: { type: "products", cardinality: "many" },
        parent: { type: "categories", cardinality: "one" },
        children: {
          type: "categories",
          cardinality: "many",
          inverse: "parent",
        },
      },
    },

    customerProfiles: {
      attributes: {
        phoneNumber: { type: "string" },
        dateOfBirth: { type: "string", format: "date" },
        preferences: { type: "object" },
      },
      relationships: {
        customer: {
          type: "customers",
          cardinality: "one",
          inverse: "profile",
        },
      },
    },
  },
};
```

### Content Management Schema

```javascript
const cmsSchema = {
  resources: {
    books: {
      attributes: {
        title: { type: "string" },
        isbn: { type: "string" },
        content: { type: "string" },
        status: {
          type: "string",
          enum: ["available", "checked-out", "archived"],
        },
        publishedAt: { type: "string", format: "date-time" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      requiredAttributes: ["title", "isbn"],
      relationships: {
        author: { type: "authors", cardinality: "one" },
        category: { type: "categories", cardinality: "one" },
        tags: { type: "tags", cardinality: "many" },
        reviews: { type: "reviews", cardinality: "many" },
      },
    },

    authors: {
      attributes: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["primary", "contributor", "editor"] },
        active: { type: "boolean", default: true },
      },
      relationships: {
        books: {
          type: "books",
          cardinality: "many",
          inverse: "author",
        },
        reviews: {
          type: "reviews",
          cardinality: "many",
          inverse: "author",
        },
      },
    },

    categories: {
      attributes: {
        name: { type: "string" },
        description: { type: "string" },
      },
      relationships: {
        books: {
          type: "books",
          cardinality: "many",
          inverse: "category",
        },
      },
    },

    tags: {
      attributes: {
        name: { type: "string" },
        color: { type: "string" },
      },
      relationships: {
        books: { type: "books", cardinality: "many" },
      },
    },

    reviews: {
      attributes: {
        content: { type: "string" },
        approved: { type: "boolean", default: false },
        createdAt: { type: "string", format: "date-time" },
      },
      relationships: {
        book: {
          type: "books",
          cardinality: "one",
          inverse: "reviews",
        },
        author: {
          type: "authors",
          cardinality: "one",
          inverse: "reviews",
        },
        parent: { type: "reviews", cardinality: "one" },
        replies: {
          type: "reviews",
          cardinality: "many",
          inverse: "parent",
        },
      },
    },
  },
};
```

### Schema Best Practices

1. **Use descriptive names** - Resource and attribute names should be clear and consistent
2. **Use title and description on attributes** - Titles and descriptions makes the schema more self documenting
3. **Define relationships carefully** - Always specify inverse relationships when possible
4. **Choose appropriate types** - Use the most specific type that fits your data
5. **Add constraints** - Use enums, minimums, maximums to validate data
6. **Use schema for complex validation** - Leverage cross-field validation for business rules
7. **Prefer schema.required over requiredAttributes** - The `schema` property is more powerful and flexible
8. **Plan for growth** - Consider how your schema might evolve over time
9. **Document complex relationships** - Add comments for business logic via "$comment" keys anywhere you like

For query examples using these schemas, see [query.md](query.md).
For expression usage with schema data, see the [json-expressions documentation](https://github.com/jakesower/json-expressions/blob/main/docs/expressions.md).
