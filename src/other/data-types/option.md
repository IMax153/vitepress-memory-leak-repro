---
title: Option
description: Master the versatile `Option` data type for handling optional values. Learn to create, model optional properties, and utilize guards. Discover powerful functions like `Option.map`, `Option.flatMap`, and explore seamless interop with nullable types and the Effect module. Also, delve into fallback strategies, working with nullable types, combining options, and much more.
order: 6
---

# Option

The `Option` data type is used to represent optional values. An `Option` can be either `Some`, which contains a value, or `None`, which indicates the absence of a value.

The `Option` type is versatile and can be applied in various scenarios, including:

- Using it for initial values
- Returning values from functions that are not defined for all possible inputs (referred to as "partial functions")
- Managing optional fields in data structures
- Handling optional function arguments

## Creating Options

### some

The `Option.some` constructor takes a value of type `A` and returns an `Option<A>` that holds that value:

```ts twoslash
import { Option } from "effect"

const value = Option.some(1) // An Option holding the number 1
```

### none

On the other hand, the `Option.none` constructor returns an `Option<never>`, representing the absence of a value:

```ts twoslash
import { Option } from "effect"

const noValue = Option.none() // An Option holding no value
```

### liftPredicate

Sometimes you need to create an `Option` based on a predicate, such as checking if a value is positive.

Here's how you can do this explicitly using `Option.none` and `Option.some`

```ts twoslash
import { Option } from "effect"

const isPositive = (n: number) => n > 0

const parsePositive = (n: number): Option.Option<number> =>
  isPositive(n) ? Option.some(n) : Option.none()
```

The same result can be achieved more concisely using `Option.liftPredicate`

```ts twoslash
import { Option } from "effect"

const isPositive = (n: number) => n > 0

const parsePositive = Option.liftPredicate(isPositive)
```

## Modeling Optional Properties

Let's look at an example of a `User` model where the `"email"` property is optional and can have a value of type `string`.
To represent this, we can use the `Option<string>` type:

```ts {6} twoslash
import { Option } from "effect"

interface User {
  readonly id: number
  readonly username: string
  readonly email: Option.Option<string>
}
```

> [!WARNING]
> Optionality only applies to the value of the property. The key `"email"`
> will always be present in the object, regardless of whether it has a value
> or not.

Now, let's see how we can create instances of `User` with and without an email:

```ts twoslash
import { Option } from "effect"

interface User {
  readonly id: number
  readonly username: string
  readonly email: Option.Option<string>
}

// ---cut---
const withEmail: User = {
  id: 1,
  username: "john_doe",
  email: Option.some("john.doe@example.com")
}

const withoutEmail: User = {
  id: 2,
  username: "jane_doe",
  email: Option.none()
}
```

## Guards

You can determine whether an `Option` is a `Some` or a `None` by using the `isSome` and `isNone` guards:

```ts twoslash
import { Option } from "effect"

const foo = Option.some(1)

console.log(Option.isSome(foo)) // Output: true

if (Option.isNone(foo)) {
  console.log("Option is empty")
} else {
  console.log(`Option has a value: ${foo.value}`)
}
// Output: "Option has a value: 1"
```

## Matching

The `Option.match` function allows you to handle different cases of an `Option` value by providing separate actions for each case:

```ts twoslash
import { Option } from "effect"

const foo = Option.some(1)

const result = Option.match(foo, {
  onNone: () => "Option is empty",
  onSome: (value) => `Option has a value: ${value}`
})

console.log(result) // Output: "Option has a value: 1"
```

<Idea>
  Using `match` instead of `isSome` or `isNone` can be more expressive and
  provide a clear way to handle both cases of an `Option`.
</Idea>

## Working with Option

### map

The `Option.map` function allows you to transform the value inside an `Option` without having to unwrap and wrap the underlying value. Let's see an example:

```ts twoslash
import { Option } from "effect"

const maybeIncremented = Option.map(Option.some(1), (n) => n + 1) // some(2)
```

The convenient aspect of using `Option` is how it handles the absence of a value, represented by `None`:

```ts twoslash
import { Option } from "effect"

const maybeIncremented = Option.map(Option.none(), (n) => n + 1) // none()
```

Despite having `None` as the input, we can still operate on the `Option` without encountering errors. The mapping function `(n) => n + 1` is not executed when the `Option` is `None`, and the result remains `none` representing the absence of a value.

### flatMap

The `Option.flatMap` function works similarly to `Option.map`, but with an additional feature. It allows us to sequence computations that depend on the absence or presence of a value in an `Option`.

Let's explore an example that involves a **nested** optional property. We have a `User` model with an optional `address` field of type `Option<Address>`:

```ts {7} twoslash
interface Address {
  readonly city: string
  readonly street: Option.Option<string>
}

// ---cut---
import { Option } from "effect"

interface User {
  readonly id: number
  readonly username: string
  readonly email: Option.Option<string>
  readonly address: Option.Option<Address>
}
```

The `address` field itself contains a nested optional property called `street` of type `Option<string>`:

```ts {3} twoslash
import { Option } from "effect"

// ---cut---
interface Address {
  readonly city: string
  readonly street: Option.Option<string>
}
```

We can use `Option.flatMap` to extract the `street` property from the `address` field.

```ts twoslash
import { Option } from "effect"

interface Address {
  readonly city: string
  readonly street: Option.Option<string>
}

interface User {
  readonly id: number
  readonly username: string
  readonly email: Option.Option<string>
  readonly address: Option.Option<Address>
}

// ---cut---
const user: User = {
  id: 1,
  username: "john_doe",
  email: Option.some("john.doe@example.com"),
  address: Option.some({
    city: "New York",
    street: Option.some("123 Main St")
  })
}

const street = user.address.pipe(Option.flatMap((address) => address.street))
```

Here's how it works: if the `address` is `Some`, meaning it has a value, the mapping function `(addr) => addr.street` is applied to retrieve the `street` value. On the other hand, if the `address` is `None`, indicating the absence of a value, the mapping function is not executed, and the result is also `None`.

### filter

The `Option.filter` function is used to filter an `Option` using a predicate. If the predicate is not satisfied or the `Option` is `None`, it returns `None`.

Let's see an example where we refactor some code to a more idiomatic version:

Original Code

```ts twoslash
import { Option } from "effect"

const removeEmptyString = (input: Option.Option<string>) => {
  if (Option.isSome(input) && input.value === "") {
    return Option.none()
  }
  return input
}

console.log(removeEmptyString(Option.none())) // { _id: 'Option', _tag: 'None' }
console.log(removeEmptyString(Option.some(""))) // { _id: 'Option', _tag: 'None' }
console.log(removeEmptyString(Option.some("a"))) // { _id: 'Option', _tag: 'Some', value: 'a' }
```

Idiomatic Code

```ts twoslash
import { Option } from "effect"

const removeEmptyString = (input: Option.Option<string>) =>
  Option.filter(input, (value) => value !== "")
```

## Getting the Value from an Option

To retrieve the value stored within an `Option`, you can use various functions provided by the `Option` module. Let's explore these functions:

- `getOrThrow`: It retrieves the wrapped value from an `Option`, or throws an error if the `Option` is a `None`. Here's an example:

  ```ts twoslash
  import { Option } from "effect"

  Option.getOrThrow(Option.some(10)) // 10
  Option.getOrThrow(Option.none()) // throws getOrThrow called on a None
  ```

- `getOrNull` and `getOrUndefined`: These functions are useful when you want to work with code that doesn't use `Option`. They allow you to retrieve the value of an `Option` as `null` or `undefined`, respectively. Examples:

  ```ts twoslash
  import { Option } from "effect"

  Option.getOrNull(Option.some(5)) // 5
  Option.getOrNull(Option.none()) // null

  Option.getOrUndefined(Option.some(5)) // 5
  Option.getOrUndefined(Option.none()) // undefined
  ```

- `getOrElse`: This function lets you provide a default value that will be returned if the `Option` is a `None`. Here's an example:

  ```ts twoslash
  import { Option } from "effect"

  Option.getOrElse(Option.some(5), () => 0) // 5
  Option.getOrElse(Option.none(), () => 0) // 0
  ```

## Fallback

In certain situations, when a computation returns `None`, you may want to try an alternative computation that returns an `Option`. This is where the `Option.orElse` function comes in handy. It allows you to chain multiple computations together and continue with the next one if the previous one resulted in `None`. This can be useful for implementing retry logic, where you want to attempt a computation multiple times until you either succeed or exhaust all possible attempts.

```ts twoslash
import { Option } from "effect"

// Simulating a computation that may or may not produce a result
const performComputation = (): Option.Option<number> =>
  Math.random() < 0.5 ? Option.some(10) : Option.none()

const performAlternativeComputation = (): Option.Option<number> =>
  Math.random() < 0.5 ? Option.some(20) : Option.none()

const result = performComputation().pipe(
  Option.orElse(() => performAlternativeComputation())
)

Option.match(result, {
  onNone: () => console.log("Both computations resulted in None"),
  onSome: (value) => console.log("Computed value:", value) // At least one computation succeeded
})
```

Additionally, the `Option.firstSomeOf` function can be used to retrieve the first value that is `Some` within an iterable of `Option` values:

```ts twoslash
import { Option } from "effect"

const first = Option.firstSomeOf([
  Option.none(),
  Option.some(2),
  Option.none(),
  Option.some(3)
]) // some(2)
```

## Interop with Nullable Types

When working with the `Option` data type, you may come across code that uses `undefined` or `null` to represent optional values. The `Option` data type provides several APIs to facilitate the interaction between `Option` and nullable types.

You can create an `Option` from a nullable value using the `fromNullable` API.

```ts twoslash
import { Option } from "effect"

Option.fromNullable(null) // none()
Option.fromNullable(undefined) // none()
Option.fromNullable(1) // some(1)
```

Conversely, if you have a value of type `Option` and want to convert it to a nullable value, you have two options:

- Convert `None` to `null` using the `getOrNull` API.
- Convert `None` to `undefined` using the `getOrUndefined` API.

```ts twoslash
import { Option } from "effect"

Option.getOrNull(Option.some(5)) // 5
Option.getOrNull(Option.none()) // null

Option.getOrUndefined(Option.some(5)) // 5
Option.getOrUndefined(Option.none()) // undefined
```

## Interop with Effect

The `Option` type is a subtype of the `Effect` type, which means that it can be seamlessly used with functions from the `Effect` module. These functions are primarily designed to work with `Effect` values, but they can also handle `Option` values and process them correctly.

In the context of `Effect`, the two members of the `Option` type are treated as follows:

- `None` is equivalent to `Effect<never, NoSuchElementException>`
- `Some<A>` is equivalent to `Effect<A>`

To illustrate this interoperability, let's consider the following example:

```ts twoslash
import { Effect, Option } from "effect"

const head = <A>(as: ReadonlyArray<A>): Option.Option<A> =>
  as.length > 0 ? Option.some(as[0]) : Option.none()

console.log(
  Effect.runSync(Effect.succeed([1, 2, 3]).pipe(Effect.andThen(head)))
) // Output: 1

Effect.runSync(Effect.succeed([]).pipe(Effect.andThen(head))) // throws NoSuchElementException: undefined
```

## Combining Two or More Options

The `Option.zipWith` function allows you to combine two `Option` values using a provided function. It creates a new `Option` that holds the combined value of both original `Option` values.

```ts twoslash
import { Option } from "effect"

const maybeName: Option.Option<string> = Option.some("John")
const maybeAge: Option.Option<number> = Option.some(25)

const person = Option.zipWith(maybeName, maybeAge, (name, age) => ({
  name: name.toUpperCase(),
  age
}))

console.log(person)
/*
Output:
{ _id: 'Option', _tag: 'Some', value: { name: 'JOHN', age: 25 } }
*/
```

The `Option.zipWith` function takes three arguments:

- The first `Option` you want to combine
- The second `Option` you want to combine
- A function that takes two arguments, which are the values held by the two `Options`, and returns the combined value

It's important to note that if either of the two `Option` values is `None`, the resulting `Option` will also be `None`:

```ts {4} twoslash
import { Option } from "effect"

const maybeName: Option.Option<string> = Option.some("John")
const maybeAge: Option.Option<number> = Option.none()

const person = Option.zipWith(maybeName, maybeAge, (name, age) => ({
  name: name.toUpperCase(),
  age
}))

console.log(person)
/*
Output:
{ _id: 'Option', _tag: 'None' }
*/
```

If you need to combine two or more `Option`s without transforming the values they hold, you can use `Option.all`, which takes a collection of `Option`s and returns an `Option` with the same structure.

- If a tuple is provided, the returned `Option` will contain a tuple with the same length.
- If a struct is provided, the returned `Option` will contain a struct with the same keys.
- If an iterable is provided, the returned `Option` will contain an array.

```ts twoslash
import { Option } from "effect"

const maybeName: Option.Option<string> = Option.some("John")
const maybeAge: Option.Option<number> = Option.some(25)

const tuple = Option.all([maybeName, maybeAge])

const struct = Option.all({ name: maybeName, age: maybeAge })
```

## gen

Similar to [Effect.gen](../../guides/essentials/using-generators), there's also `Option.gen`, which provides a convenient syntax, akin to async/await, for writing code involving `Option` and using generators.

Let's revisit the previous example, this time using `Option.gen` instead of `Option.zipWith`:

```ts twoslash
import { Option } from "effect"

const maybeName: Option.Option<string> = Option.some("John")
const maybeAge: Option.Option<number> = Option.some(25)

const person = Option.gen(function* () {
  const name = (yield* maybeName).toUpperCase()
  const age = yield* maybeAge
  return { name, age }
})

console.log(person)
/*
Output:
{ _id: 'Option', _tag: 'Some', value: { name: 'JOHN', age: 25 } }
*/
```

Once again, if either of the two `Option` values is `None`, the resulting `Option` will also be `None`:

```ts twoslash
import { Option } from "effect"

const maybeName: Option.Option<string> = Option.some("John")
const maybeAge: Option.Option<number> = Option.none()

const person = Option.gen(function* () {
  const name = (yield* maybeName).toUpperCase()
  const age = yield* maybeAge
  return { name, age }
})

console.log(person)
/*
Output:
{ _id: 'Option', _tag: 'None' }
*/
```

## Comparing Option Values with Equivalence

You can compare `Option` values using the `Option.getEquivalence` function.
This function lets you define rules for comparing the contents of `Option` types by providing an `Equivalence` for the type of value they might contain.

**Example: Checking Equivalence of Optional Numbers**

Imagine you have optional numbers and you want to check if they are equivalent. Here’s how you can do it:

```ts twoslash
import { Option, Equivalence } from "effect"

const myEquivalence = Option.getEquivalence(Equivalence.number)

console.log(myEquivalence(Option.some(1), Option.some(1))) // Output: true, because both options contain the number 1
console.log(myEquivalence(Option.some(1), Option.some(2))) // Output: false, because the numbers are different
console.log(myEquivalence(Option.some(1), Option.none()))  // Output: false, because one is a number and the other is empty
```

## Sorting Option Values with Order

Sorting a collection of `Option` values can be done using the `Option.getOrder` function.
This function helps you sort `Option` values by providing a custom sorting rule for the type of value they might contain.

**Example: Sorting Optional Numbers**

Suppose you have a list of optional numbers and you want to sort them in ascending order, considering empty values as the lowest:

```ts twoslash
import { Option, Array, Order } from "effect"

const items = [
  Option.some(1),
  Option.none(),
  Option.some(2)
]

const myOrder = Option.getOrder(Order.number)

console.log(Array.sort(myOrder)(items))
/*
Output:
[
  { _id: 'Option', _tag: 'None' },           // None appears first because it's considered the lowest
  { _id: 'Option', _tag: 'Some', value: 1 }, // Sorted in ascending order
  { _id: 'Option', _tag: 'Some', value: 2 }
]
*/
```

In this example, `Option.none()` is treated as the lowest value, allowing `Option.some(1)` and `Option.some(2)` to be sorted in ascending order based on their numerical value. This method ensures that all `Option` values are sorted logically according to their content, with empty values (`Option.none()`) being placed before non-empty values (`Option.some()`).

**Advanced Example: Sorting Optional Dates in Reverse Order**

Now, let's consider a more complex scenario where you have a list of objects containing optional dates, and you want to sort them in descending order, with any empty optional values placed at the end:

```ts
import { Option, Array, Order } from "effect"

const items = [
  { data: Option.some(new Date(10)) },
  { data: Option.some(new Date(20)) },
  { data: Option.none() }
]

// Define the order to sort dates within Option values in reverse
const sorted = Array.sortWith(
  items,
  item => item.data,
  Order.reverse(Option.getOrder(Order.Date))
)

console.log(sorted)
/*
Output:
[
  { data: { _id: 'Option', _tag: 'Some', value: '1970-01-01T00:00:00.020Z' } },
  { data: { _id: 'Option', _tag: 'Some', value: '1970-01-01T00:00:00.010Z' } },
  { data: { _id: 'Option', _tag: 'None' } } // None placed last
]
*/
```
