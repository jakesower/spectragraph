# Expression Reference Guide

Data Prism expressions provide powerful data transformation, computation, and aggregation capabilities within queries. Expressions are JSON objects that start with `$` and can be used in `select` fields, `where` clauses, and `order` specifications.

## Table of Contents

- [Expression Basics](#expression-basics)
- [Aggregation Functions](#aggregation-functions)
- [Mathematical Operations](#mathematical-operations)
- [String Functions](#string-functions)
- [Conditional Logic](#conditional-logic)
- [Comparison Operators](#comparison-operators)
- [Logical Operators](#logical-operators)
- [Pattern Matching](#pattern-matching)
- [Array Operations](#array-operations)
- [Date/Time Functions](#datetime-functions)
- [Utility Functions](#utility-functions)
- [Path Expressions](#path-expressions)
- [Store-Specific Behavior](#store-specific-behavior)

## Expression Basics

### Syntax

All expressions are JSON objects with keys starting with `$`:

```javascript
{
  type: "users",
  select: {
    name: "name",
    uppercaseName: { $upper: "name" },    // Expression
    postCount: { $count: "posts" }        // Another expression
  }
}
```

### Expression Context

Expressions evaluate within the context of the current resource:

- Field references like `"name"` refer to attributes of the current resource
- Relationship paths like `"posts.$.title"` traverse to related resources
- Dot notation like `"address.city"` accesses nested object properties

## Aggregation Functions

### $count

Count the number of items in a collection or relationship:

```javascript
{
  type: "users",
  select: {
    name: "name",
    postCount: { $count: "posts" },                    // Count related posts
    totalComments: { $count: "posts.$.comments" }      // Count nested relationships
  }
}
```

### $sum

Sum numeric values across a collection:

```javascript
{
  type: "orders",
  select: {
    orderNumber: "orderNumber",
    totalAmount: { $sum: "items.$.price" },           // Sum item prices
    totalQuantity: { $sum: "items.$.quantity" }       // Sum quantities
  }
}
```

### $avg

Calculate the average of numeric values:

```javascript
{
  type: "users",
  select: {
    name: "name",
    avgPostRating: { $avg: "posts.$.rating" },        // Average post rating
    avgCommentsPerPost: { $avg: "posts.$.commentCount" }
  }
}
```

### $min / $max

Find minimum or maximum values:

```javascript
{
  type: "products",
  select: {
    name: "name",
    lowestPrice: { $min: "variants.$.price" },
    highestPrice: { $max: "variants.$.price" },
    oldestReview: { $min: "reviews.$.createdAt" },
    newestReview: { $max: "reviews.$.createdAt" }
  }
}
```

### $first / $last

Get the first or last item from a collection:

```javascript
{
  type: "users",
  select: {
    name: "name",
    latestPost: { $first: { $orderBy: ["posts", { createdAt: "desc" }] } },
    oldestPost: { $first: { $orderBy: ["posts", { createdAt: "asc" }] } }
  }
}
```

## Mathematical Operations

### Basic Arithmetic

```javascript
{
  type: "products",
  select: {
    name: "name",
    price: "price",
    tax: { $multiply: ["price", 0.08] },              // 8% tax
    discountedPrice: { $subtract: ["price", 10] },    // $10 off
    total: { $add: ["price", { $multiply: ["price", 0.08] }] }, // Price + tax
    pricePerUnit: { $divide: ["price", "quantity"] }   // Unit price
  }
}
```

### Advanced Math

```javascript
{
  type: "analytics",
  select: {
    name: "name",
    absoluteChange: { $abs: "change" },               // Absolute value
    roundedValue: { $round: "averageScore" },         // Round to nearest integer
    floorValue: { $floor: "price" },                  // Round down
    ceilValue: { $ceil: "price" },                    // Round up
    powerValue: { $pow: ["base", "exponent"] },       // Exponentiation
    sqrtValue: { $sqrt: "value" }                     // Square root
  }
}
```

## String Functions

### String Manipulation

```javascript
{
  type: "users",
  select: {
    fullName: { $concat: ["firstName", " ", "lastName"] },
    initials: { $concat: [
      { $substring: ["firstName", 0, 1] },
      { $substring: ["lastName", 0, 1] }
    ]},
    upperName: { $upper: "name" },
    lowerEmail: { $lower: "email" },
    nameLength: { $length: "name" }
  }
}
```

### String Extraction

```javascript
{
  type: "users",
  select: {
    emailDomain: { $split: ["email", "@", 1] },       // Get part after @
    firstTwoChars: { $substring: ["name", 0, 2] },    // First 2 characters
    lastThreeChars: { $substring: ["name", -3] },     // Last 3 characters
    nameWords: { $split: ["fullName", " "] }          // Split into array
  }
}
```

### String Testing

```javascript
{
  type: "posts",
  select: {
    title: "title",
    hasLongTitle: { $gte: [{ $length: "title" }, 50] },
    isUppercase: { $eq: ["title", { $upper: "title" }] },
    containsWord: { $matchesRegex: ["content", "important"] }
  }
}
```

## Conditional Logic

### $if Expression

Simple if-then-else logic:

```javascript
{
  type: "users",
  select: {
    name: "name",
    status: {
      $if: {
        if: { active: true },
        then: "Active User",
        else: "Inactive User"
      }
    },
    tier: {
      $if: {
        if: { $gte: ["points", 1000] },
        then: "Premium",
        else: "Standard"
      }
    }
  }
}
```

### $case Expression

Multi-condition switch statements:

```javascript
{
  type: "orders",
  select: {
    orderNumber: "orderNumber",
    statusLabel: {
      $case: {
        value: "status",
        cases: [
          { when: "pending", then: "⏳ Pending Payment" },
          { when: "processing", then: "🔄 Processing" },
          { when: "shipped", then: "🚚 Shipped" },
          { when: "delivered", then: "✅ Delivered" }
        ],
        default: "❓ Unknown Status"
      }
    },
    priorityLevel: {
      $case: {
        value: "total",
        cases: [
          { when: { $gte: 500 }, then: "High Priority" },
          { when: { $gte: 100 }, then: "Medium Priority" }
        ],
        default: "Standard Priority"
      }
    }
  }
}
```

## Comparison Operators

Use these in `where` clauses and conditional expressions:

### Equality and Inequality

```javascript
{
  type: "products",
  select: ["name", "price"],
  where: {
    category: { $eq: "electronics" },       // Equal to
    price: { $ne: 0 },                      // Not equal to
    inStock: { $eq: true }                  // Boolean equality
  }
}
```

### Numeric Comparisons

```javascript
{
  type: "users",
  select: ["name", "age"],
  where: {
    age: { $gt: 18 },                       // Greater than
    points: { $gte: 100 },                  // Greater than or equal
    loginCount: { $lt: 5 },                 // Less than
    score: { $lte: 100 }                    // Less than or equal
  }
}
```

### List Membership

```javascript
{
  type: "posts",
  select: ["title", "status"],
  where: {
    status: { $in: ["published", "featured"] },      // In list
    category: { $nin: ["spam", "deleted"] }          // Not in list
  }
}
```

## Logical Operators

### $and, $or, $not

Combine multiple conditions:

```javascript
{
  type: "products",
  select: ["name", "price"],
  where: {
    $and: [
      { inStock: true },
      { $or: [
        { category: "electronics" },
        { featured: true }
      ]}
    ]
  }
}

// Negation
{
  type: "users",
  select: ["name"],
  where: {
    $not: {
      $and: [
        { suspended: true },
        { verified: false }
      ]
    }
  }
}
```

## Pattern Matching

### Regular Expression Matching

```javascript
{
  type: "users",
  select: ["name", "email"],
  where: {
    email: { $matchesRegex: ".*@gmail\\.com$" },     // Gmail addresses
    name: { $matchesRegex: "^[A-Z][a-z]+ [A-Z][a-z]+$" } // First Last format
  }
}
```

### Wildcard Patterns (Store-Dependent)

```javascript
// SQLite/PostgreSQL LIKE patterns
{
  type: "products",
  select: ["name"],
  where: {
    name: { $matchesLike: "%phone%" },        // Contains "phone"
    sku: { $matchesLike: "APP-%" }            // Starts with "APP-"
  }
}

// SQLite GLOB patterns
{
  type: "files",
  select: ["filename"],
  where: {
    filename: { $matchesGlob: "*.jpg" }       // JPG files
  }
}
```

## Array Operations

### $filter

Filter array elements based on conditions:

```javascript
{
  type: "users",
  select: {
    name: "name",
    publishedPosts: {
      $filter: ["posts", { status: "published" }]
    },
    recentPosts: {
      $filter: ["posts", {
        createdAt: { $gte: "2024-01-01" }
      }]
    }
  }
}
```

### $orderBy

Sort arrays by specific criteria:

```javascript
{
  type: "users",
  select: {
    name: "name",
    postsByDate: {
      $orderBy: ["posts", { createdAt: "desc" }]
    },
    topRatedPosts: {
      $orderBy: ["posts", { rating: "desc" }]
    }
  }
}
```

### $groupBy

Group array elements and compute aggregations:

```javascript
{
  type: "companies",
  select: {
    name: "name",
    departmentStats: {
      $groupBy: [
        "employees",
        "department",
        {
          count: { $count: {} },
          avgSalary: { $avg: "salary" },
          totalSalary: { $sum: "salary" }
        }
      ]
    }
  }
}
```

## Date/Time Functions

### Date Arithmetic

```javascript
{
  type: "posts",
  select: {
    title: "title",
    daysOld: { $dateDiff: ["now", "createdAt", "days"] },
    publishedYear: { $year: "publishedAt" },
    publishedMonth: { $month: "publishedAt" },
    publishedDay: { $dayOfMonth: "publishedAt" }
  }
}
```

### Date Formatting

```javascript
{
  type: "events",
  select: {
    name: "name",
    formattedDate: { $dateFormat: ["startDate", "YYYY-MM-DD"] },
    monthYear: { $dateFormat: ["startDate", "MMMM YYYY"] }
  }
}
```

## Utility Functions

### $literal

Return a literal value:

```javascript
{
  type: "users",
  select: {
    name: "name",
    type: { $literal: "user" },              // Always returns "user"
    version: { $literal: "1.0" }            // Static version number
  }
}
```

### $get / $prop

Access nested properties:

```javascript
{
  type: "users",
  select: {
    name: "name",
    city: { $get: "address.city" },          // Nested object access
    firstHobby: { $get: "hobbies.0" },       // Array index access
    metadata: { $prop: ["settings", "theme"] } // Dynamic property access
  }
}
```

### $coalesce

Return the first non-null value:

```javascript
{
  type: "users",
  select: {
    displayName: { $coalesce: ["nickname", "firstName", "username"] },
    phone: { $coalesce: ["mobilePhone", "homePhone", "workPhone"] }
  }
}
```

## Path Expressions

### Dot Path Syntax

Use `.$` to traverse relationships and access nested data:

```javascript
{
  type: "users",
  select: {
    name: "name",
    // One level: posts of this user
    postTitles: { $map: ["posts", "title"] },

    // Two levels: comments on posts by this user
    commentCount: { $count: "posts.$.comments" },

    // Three levels: authors of comments on posts by this user
    commentAuthors: { $map: ["posts.$.comments", "author.name"] },

    // Complex path: ratings of comments on posts by this user
    avgCommentRating: { $avg: "posts.$.comments.$.rating" }
  }
}
```

### Path Components

- `posts` - Direct relationship field
- `posts.$` - Array traversal (processes each post individually)
- `posts.$.comments` - Nested relationship traversal
- `posts.$.comments.$.rating` - Deep nested traversal

## Store-Specific Behavior

### Expression Evaluation Location

Different stores evaluate expressions in different contexts:

**Memory Store (JavaScript)**

```javascript
// All expressions evaluated in JavaScript
{
  type: "users",
  select: {
    complexCalc: {
      $add: [
        { $multiply: ["score", 1.5] },
        { $avg: "posts.$.rating" }
      ]
    }
  }
}
```

**SQL Stores (PostgreSQL/SQLite)**

```javascript
// Simple expressions translated to SQL
{
  type: "products",
  select: {
    totalPrice: { $multiply: ["price", "quantity"] }  // Becomes: price * quantity
  }
}

// Complex expressions may require JavaScript evaluation
{
  type: "users",
  select: {
    postStats: { $groupBy: ["posts", "category", {...}] } // May use JS
  }
}
```

**API Stores**

```javascript
// Expressions evaluated after data fetching
{
  type: "users",
  select: {
    fullName: { $concat: ["firstName", " ", "lastName"] }  // JS evaluation
  }
}
```

### Performance Considerations

1. **SQL Optimization**: Simple math/string operations translate to SQL for better performance
2. **Relationship Traversal**: Deep path expressions (`posts.$.comments.$.rating`) can be expensive
3. **Memory Usage**: Complex aggregations on large datasets may use significant memory
4. **API Efficiency**: Expressions on API data require fetching full objects first

### Store Capability Differences

**All Stores Support:**

- Basic math operations (`$add`, `$multiply`, etc.)
- String functions (`$concat`, `$upper`, `$substring`)
- Comparison operators (`$eq`, `$gt`, `$in`, etc.)
- Simple aggregations (`$count`, `$sum`, `$avg`, `$min`, `$max`)
- Conditional logic (`$if`, `$case`)

**SQL Stores Additional:**

- `$matchesLike` for LIKE pattern matching
- `$matchesGlob` (SQLite only) for glob patterns
- Optimized evaluation for many expressions

**Limited in Some Stores:**

- Regular expressions may have different syntax/features
- Date functions vary by underlying database
- Complex nested aggregations may fall back to JavaScript

## Expression Examples by Use Case

### E-commerce Analytics

```javascript
{
  type: "products",
  select: {
    name: "name",
    revenue: { $sum: "orders.$.items.$.totalPrice" },
    avgOrderValue: { $avg: "orders.$.total" },
    conversionRate: {
      $divide: [
        { $count: "orders" },
        { $count: "pageViews" }
      ]
    },
    topBuyingCustomer: {
      $first: {
        $orderBy: [
          "orders.$.customer",
          { $desc: { $sum: "orders.$.total" } }
        ]
      }
    }
  }
}
```

### User Engagement Metrics

```javascript
{
  type: "users",
  select: {
    username: "username",
    engagementScore: {
      $add: [
        { $multiply: [{ $count: "posts" }, 10] },      // 10 points per post
        { $multiply: [{ $count: "comments" }, 5] },    // 5 points per comment
        { $count: "likes" }                            // 1 point per like
      ]
    },
    isActiveUser: {
      $gte: [{ $count: "posts" }, 5]                  // 5+ posts = active
    },
    lastActivityDays: {
      $dateDiff: ["now", "lastLoginAt", "days"]
    }
  }
}
```

### Content Classification

```javascript
{
  type: "articles",
  select: {
    title: "title",
    readingTime: {
      $divide: [{ $length: "content" }, 200]          // ~200 chars per minute
    },
    difficulty: {
      $case: {
        value: { $avg: "sentences.$.wordCount" },
        cases: [
          { when: { $lte: 10 }, then: "Easy" },
          { when: { $lte: 20 }, then: "Medium" }
        ],
        default: "Hard"
      }
    },
    sentiment: {
      $case: {
        value: "content",
        cases: [
          { when: { $matchesRegex: ".*(great|amazing|excellent).*" }, then: "Positive" },
          { when: { $matchesRegex: ".*(bad|awful|terrible).*" }, then: "Negative" }
        ],
        default: "Neutral"
      }
    }
  }
}
```

For complete query syntax including these expressions, see [query.md](query.md).
For schema definitions that support these expressions, see [schema.md](schema.md).
