---
title: Branded Types
description: Explore the concept of branded types in TypeScript using the Brand module. Understand the "data-last" and "data-first" variants, and learn to create branded types with runtime validation (refined) and without checks (nominal). Discover how to use and combine branded types to enforce type safety in your code.
order: 1
---

# Branded Types

In this guide, we will explore the concept of **branded types** in TypeScript and learn how to create and work with them using the Brand module.
Branded types are TypeScript types with an added type tag that helps prevent accidental usage of a value in the wrong context.
They allow us to create distinct types based on an existing underlying type, enabling type safety and better code organization.

## The Problem with TypeScript's Structural Typing

TypeScript's type system is structurally typed, meaning that two types are considered compatible if their members are compatible.
This can lead to situations where values of the same underlying type are used interchangeably, even when they represent different concepts or have different meanings.

Consider the following types:

```ts twoslash
type UserId = number

type ProductId = number
```

Here, `UserId` and `ProductId` are structurally identical as they are both based on `number`.
TypeScript will treat these as interchangeable, potentially causing bugs if they are mixed up in your application.

For example:

```ts twoslash
type UserId = number

type ProductId = number

const getUserById = (id: UserId) => {
  // Logic to retrieve user
}

const getProductById = (id: ProductId) => {
  // Logic to retrieve product
}

const id: UserId = 1

getProductById(id) // No type error, but this is incorrect usage
```

In the example above, passing a `UserId` to `getProductById` should ideally throw a type error, but it doesn't due to structural compatibility.

## How Branded Types Help

Branded types allow you to create distinct types from the same underlying type by adding a unique type tag, enforcing proper usage at compile-time.

Branding is accomplished by adding a symbolic identifier that distinguishes one type from another at the type level.
This method ensures that types remain distinct without altering their runtime characteristics.

Let's start by introducing the `BrandTypeId` symbol:

```ts twoslash
const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

type ProductId = number & {
  readonly [BrandTypeId]: {
    readonly ProductId: "ProductId" // unique identifier for ProductId
  }
}
```

This approach assigns a unique identifier as a brand to the `number` type, effectively differentiating `ProductId` from other numerical types.
The use of a symbol ensures that the branding field does not conflict with any existing properties of the `number` type.

Attempting to use a `UserId` in place of a `ProductId` now results in an error:

```ts twoslash
// @errors: 2345
const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

type ProductId = number & {
  readonly [BrandTypeId]: {
    readonly ProductId: "ProductId"
  }
}
// ---cut---
const getProductById = (id: ProductId) => {
  // Logic to retrieve product
}

type UserId = number

const id: UserId = 1

getProductById(id)
```

The error message clearly states that a `number` cannot be used in place of a `ProductId`.

TypeScript won't let us pass an instance of `number` to the function accepting `ProductId` because it's missing the brand field.

What if `UserId` also had its own brand?

```ts twoslash
// @errors: 2345
const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

type ProductId = number & {
  readonly [BrandTypeId]: {
    readonly ProductId: "ProductId" // unique identifier for ProductId
  }
}

const getProductById = (id: ProductId) => {
  // Logic to retrieve product
}

type UserId = number & {
  readonly [BrandTypeId]: {
    readonly UserId: "UserId" // unique identifier for UserId
  }
}

declare const id: UserId

getProductById(id)
```

The error is saying that though both types utilize a branding strategy, the distinct values associated with their branding fields (`"ProductId"` and `"UserId"`) prevent them from being interchangeable.

## Generalizing Branded Types

To enhance the versatility and reusability of branded types, they can be generalized using a standardized approach:

```ts twoslash
const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

// Create a generic Brand interface using a unique identifier
interface Brand<in out ID extends string | symbol> {
  readonly [BrandTypeId]: {
    readonly [id in ID]: ID
  }
}

// Define a ProductId type branded with a unique identifier
type ProductId = number & Brand<"ProductId">

// Define a UserId type branded similarly
type UserId = number & Brand<"UserId">
```

This design allows any type to be branded using a unique identifier, either a string or symbol.

Here's how you can utilize the `Brand` interface, which is readily available from the Brand module, eliminating the need to craft your own implementation:

```ts
import { Brand } from "effect"

// Define a ProductId type branded with a unique identifier
type ProductId = number & Brand.Brand<"ProductId">

// Define a UserId type branded similarly
type UserId = number & Brand.Brand<"UserId">
```

However, creating instances of these types directly leads to an error because the type system expects the brand structure:

```ts twoslash
// @errors: 2322
const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

interface Brand<in out K extends string | symbol> {
  readonly [BrandTypeId]: {
    readonly [k in K]: K
  }
}

type ProductId = number & Brand<"ProductId">
// ---cut---
const id: ProductId = 1
```

We need a way to create a value of type `ProductId` without directly assigning a number to it. This is where the Brand module comes in.

## Constructing Branded Types

The Brand module offers two core functions for constructing branded types: `nominal` and `refined`.

### nominal

The `nominal` function is designed for defining branded types that do not require runtime validations.
It simply adds a type tag to the underlying type, allowing us to distinguish between values of the same type but with different meanings.
Nominal branded types are useful when we only want to create distinct types for clarity and code organization purposes.

```ts twoslash
import { Brand } from "effect"

type UserId = number & Brand.Brand<"UserId">

// Constructor for UserId
const UserId = Brand.nominal<UserId>()

const getUserById = (id: UserId) => {
  // Logic to retrieve user
}

type ProductId = number & Brand.Brand<"ProductId">

// Constructor for ProductId
const ProductId = Brand.nominal<ProductId>()

const getProductById = (id: ProductId) => {
  // Logic to retrieve product
}
```

Attempting to assign a non-`ProductId` value will result in a compile-time error:

```ts twoslash
// @errors: 2345
import { Brand } from "effect"

type UserId = number & Brand.Brand<"UserId">

const UserId = Brand.nominal<UserId>()

const getUserById = (id: UserId) => {
  // Logic to retrieve user
}

type ProductId = number & Brand.Brand<"ProductId">

const ProductId = Brand.nominal<ProductId>()

const getProductById = (id: ProductId) => {
  // Logic to retrieve product
}
// ---cut---
// Correct usage
getProductById(ProductId(1))

// Incorrect, will result in an error
getProductById(1)

// Also incorrect, will result in an error
getProductById(UserId(1))
```

### refined

The `refined` function enables the creation of branded types that include data validation. It requires a refinement predicate to check the validity of input data against specific criteria.

When the input data does not meet the criteria, the function uses `Brand.error` to generate a `BrandErrors` data type. This provides detailed information about why the validation failed.

```ts twoslash
import { Brand } from "effect"

// Define a branded type 'Int' to represent integer values
type Int = number & Brand.Brand<"Int">

// Define the constructor using 'refined' to enforce integer values
const Int = Brand.refined<Int>(
  // Validation to ensure the value is an integer
  (n) => Number.isInteger(n),
  // Provide an error if validation fails
  (n) => Brand.error(`Expected ${n} to be an integer`)
)
```

Usage example of the `Int` constructor:

```ts twoslash
import { Brand } from "effect"

type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n), // Check if the value is an integer
  (n) => Brand.error(`Expected ${n} to be an integer`) // Error message if the value is not an integer
)

// ---cut---
// Create a valid Int value
const x: Int = Int(3)
console.log(x) // Output: 3

// Attempt to create an Int with an invalid value
const y: Int = Int(3.14) // throws [ { message: 'Expected 3.14 to be an integer' } ]
```

Attempting to assign a non-`Int` value will result in a compile-time error:

```ts twoslash
// @errors: 2322
import { Brand } from "effect"

type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

// ---cut---
// Correct usage
const good: Int = Int(3)

// Incorrect, will result in an error
const bad1: Int = 3

// Also incorrect, will result in an error
const bad2: Int = 3.14
```

## Combining Branded Types

In some scenarios, you may need to combine multiple branded types together. The Brand module provides the `all` API to facilitate this:

```ts twoslash
import { Brand } from "effect"

type Int = number & Brand.Brand<"Int">

const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

type Positive = number & Brand.Brand<"Positive">

const Positive = Brand.refined<Positive>(
  (n) => n > 0,
  (n) => Brand.error(`Expected ${n} to be positive`)
)

// Combine the Int and Positive constructors into a new branded constructor PositiveInt
const PositiveInt = Brand.all(Int, Positive)

// Extract the branded type from the PositiveInt constructor
type PositiveInt = Brand.Brand.FromConstructor<typeof PositiveInt>

// Usage example

// Valid positive integer
const good: PositiveInt = PositiveInt(10)

// throws [ { message: 'Expected -5 to be positive' } ]
const bad1: PositiveInt = PositiveInt(-5)

// throws [ { message: 'Expected 3.14 to be an integer' } ]
const bad2: PositiveInt = PositiveInt(3.14)
```
