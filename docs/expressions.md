# Data Prism Expression Reference

Expressions are something like well defined functions given JSON form. They must be implemented by an expressions engine within the language they run. Given a property implementation, they grant a way of representing the application of logic to values. **Detailed examples of usage are part of the test suite and should be referenced there.**

Expressions have three components: param (what is specified at definition), arg (what is given at evaluation time), and output (the result of the application).

## Aggregative Expressions

These expressions are used to take arrays of values and reduce them to a single value.

### `$count`

Param: -
Arg: any[]
Output: integer

Returns the number of elements in the arg.

### `$max`

Param: -
Arg: number[]
Output: number

Returns the maximum value within the arg.

### `$min`

Param: -
Arg: number[]
Output: number

Returns the maximum value within the arg.

### `$sum`

Param: -
Arg: number[]
Output: number

Sums the values of the arg.

## Comparative

These compare the param and the arg in some fashion. They always return boolean values.

### `$eq`

Param: any
Arg: any
Output: boolean

Returns `true` if the param and arg are equal to each other.

### `$ne`

Param: any
Arg: any
Output: boolean

Returns `true` if the param and arg are not equal to each other.

### `$gt`

Param: number
Arg: number
Output: boolean

Returns `true` if the arg is greater than the param.

### `$gte`

Param: number
Arg: number
Output: boolean

Returns `true` if the arg is greater than or equal to the param.

### `$lt`

Param: number
Arg: number
Output: boolean

Returns `true` if the arg is less than the param.

### `$lte`

Param: number
Arg: number
Output: boolean

Returns `true` if the arg is less than or equal to the param.

### `$in`

Param: any[]
Arg: any
Output: boolean

Returns `true` if the arg equal to any item in the param.

### `$nin`

Param: number
Arg: number
Output: boolean

Returns `true` if the arg is not equal to every item in the param.

## Core Expressions

These are mostly plumbing expressions that will seldom be needed by end users.

### `$isDefined`

Param: -
Arg: any
Output: boolean

Returns `false` if the argument is undefined, otherwise returns `true`.


### `$get`

Param: string
Arg: object
Output: any

Returns the value at the path of param within the arg, using dot notation to traverse. For example a param of `home.name` and an arg of `{ "home": { "name": "Care-a-Lot" } }` would return `"Care-a-Lot"`.

### `$literal`

Param: any
Arg: -
Output: any

Returns whatever input it was given without evaluation.

### `$compose`

Param: expression[]
Arg: any
Output: any

Takes an arg input and applies the expressions in the param in turn. That is, the original arg is given to the first pipe expression, then the result of that expression is given as the arg to the second expression, and so on.

### `$prop`

Param: string
Arg: object
Output: any

Returns the property of the arg specified as the param. For example a param of `name` and an arg of `{ "name": "Tenderheart Bear" }` would return `"Tenderheart Bear"`.

## Iterative Expressions

These expressions are responsible for iterating over arrays of things.

### `$filter`

Param: expression
Arg: any[]
Output: any[]

Returns elements of arg that return `true` when the param expression is applied to them.

### `$flatMap`

Param: expression
Arg: any[]
Output: any[]

Returns the arg after applying the expression to each member and flattening the result.

### `$map`

Param: expression
Arg: any[]
Output: any[]

Returns the arg after applying the expression to each member.

## Logical Expressions

### `$and`

Param: expression[]
Arg: any
Output: boolean

Returns `true` if every expression in param returns `true` when applied to the arg.

### `$or`

Param: expression[]
Arg: any
Output: boolean

Returns `true` if any expression in param returns `true` when applied to the arg.

## Math Expressions

### `$add`

**Apply form:**
Param: number
Arg: number
Output: number

Adds param to arg.

**Evaluate form:**
Param: [number, number]
Output: number

Adds the two numbers in the param array.

### `$subtract`

**Apply form:**
Param: number
Arg: number
Output: number

Subtracts param from arg.

**Evaluate form:**
Param: [number, number]
Output: number

Subtracts the second number from the first in the param array.

### `$multiply`

**Apply form:**
Param: number
Arg: number
Output: number

Multiplies arg by param.

**Evaluate form:**
Param: [number, number]
Output: number

Multiplies the two numbers in the param array.

### `$divide`

**Apply form:**
Param: number
Arg: number
Output: number

Divides arg by param. Throws error on division by zero.

**Evaluate form:**
Param: [number, number]
Output: number

Divides the first number by the second in the param array. Throws error on division by zero.

### `$modulo`

**Apply form:**
Param: number
Arg: number
Output: number

Computes arg modulo param. Throws error on modulo by zero.

**Evaluate form:**
Param: [number, number]
Output: number

Computes the first number modulo the second in the param array. Throws error on modulo by zero.
