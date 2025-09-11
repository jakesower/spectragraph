# Schema Definition Guide

Schemas define the structure of your data, including resource types, attributes, and relationships. They serve as the foundation for query validation, data normalization, and store operations. Data Prism schemas are JSON serializable, enabling powerful integration with backends and other systems.

## Table of Contents

- [Basic Schema Structure](#basic-schema-structure)
- [Resource Definitions](#resource-definitions)
- [Attribute Types](#attribute-types)
- [Relationships](#relationships)
- [Advanced Schema Features](#advanced-schema-features)
- [Schema Validation](#schema-validation)
- [Examples](#examples)

## Basic Schema Structure

A Data Prism schema is a JSON object that describes all resource types in your data model:

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
				author: { type: "users", cardinality: "belongsTo" },
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

  // Required attributes are specified at resource level
  requiredAttributes: ['name', 'email']  // These must be present
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

## Schema Validation

Data Prism validates schemas to catch errors early:

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
import { validateSchema } from "@data-prism/core";

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
				customer: { type: "customers", cardinality: "belongsTo" },
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
				category: { type: "categories", cardinality: "belongsTo" },
				orderItems: { type: "orderItems", cardinality: "many" },
			},
		},

		orderItems: {
			attributes: {
				quantity: { type: "integer", minimum: 1 },
				unitPrice: { type: "number", minimum: 0 },
			},
			relationships: {
				order: { type: "orders", cardinality: "belongsTo" },
				product: { type: "products", cardinality: "belongsTo" },
			},
		},

		categories: {
			attributes: {
				name: { type: "string" },
				slug: { type: "string" },
			},
			relationships: {
				products: { type: "products", cardinality: "many" },
				parent: { type: "categories", cardinality: "belongsTo" },
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
		articles: {
			attributes: {
				title: { type: "string" },
				slug: { type: "string" },
				content: { type: "string" },
				status: { type: "string", enum: ["draft", "published", "archived"] },
				publishedAt: { type: "string", format: "date-time" },
				createdAt: { type: "string", format: "date-time" },
				updatedAt: { type: "string", format: "date-time" },
			},
			requiredAttributes: ["title", "slug"],
			relationships: {
				author: { type: "users", cardinality: "belongsTo" },
				category: { type: "categories", cardinality: "belongsTo" },
				tags: { type: "tags", cardinality: "many" },
				comments: { type: "comments", cardinality: "many" },
			},
		},

		users: {
			attributes: {
				username: { type: "string" },
				email: { type: "string", format: "email" },
				role: { type: "string", enum: ["admin", "editor", "author"] },
				active: { type: "boolean", default: true },
			},
			relationships: {
				articles: {
					type: "articles",
					cardinality: "many",
					inverse: "author",
				},
				comments: {
					type: "comments",
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
				articles: {
					type: "articles",
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
				articles: { type: "articles", cardinality: "many" },
			},
		},

		comments: {
			attributes: {
				content: { type: "string" },
				approved: { type: "boolean", default: false },
				createdAt: { type: "string", format: "date-time" },
			},
			relationships: {
				article: {
					type: "articles",
					cardinality: "one",
					inverse: "comments",
				},
				author: {
					type: "users",
					cardinality: "one",
					inverse: "comments",
				},
				parent: { type: "comments", cardinality: "belongsTo" },
				replies: {
					type: "comments",
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
6. **Plan for growth** - Consider how your schema might evolve over time
7. **Document complex relationships** - Add comments for business logic via "$comment" keys anywhere you like

For query examples using these schemas, see [query.md](query.md).
For expression usage with schema data, see [expressions.md](expressions.md).
