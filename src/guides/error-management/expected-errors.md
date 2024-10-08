---
title: Expected Errors
description: Explore how Effect represents and manages expected errors. Learn about creating error instances, tracking errors at the type level, and the short-circuiting behavior of Effect programs. Discover techniques to catch and recover from errors, and gain insights into error handling strategies using Effect's powerful combinators.
order: 1
---

# Expected Errors

In this guide you will learn:

- How Effect represents expected errors
- The tools Effect provides for robust and comprehensive error management

As we saw in the guide [Creating Effects](../essentials/creating-effects), we can use the `fail` constructor to create an Effect
that represents an error:

```ts twoslash
import { Effect } from "effect"

class HttpError {
  readonly _tag = "HttpError"
}

const program = Effect.fail(new HttpError())
```

> [!TIP]
> We use a class to represent the `HttpError` type above simply to gain access
> to both the error type and a free constructor. However, you can use whatever
> you like to model your error types.

It's worth noting that we added a readonly `_tag` field as discriminant to our error in the example:

```ts {2}
class HttpError {
  readonly _tag = "HttpError"
}
```

> [!NOTE]
> Adding a discriminant field, such as `_tag`, can be beneficial for
> distinguishing between different types of errors during error handling. It
> also prevents TypeScript from unifying types, ensuring that each error is
> treated uniquely based on its discriminant value.

Expected errors **are tracked at the type level** by the `Effect` data type in the "Error" channel.

It is evident from the type of `program` that it can fail with an error of type `HttpError`:

```ts
Effect<never, HttpError, never>
```

## Error Tracking

The following program serves as an illustration of how errors are automatically tracked for you:

<div style="display: none;">

```ts twoslash include error-tracking
import { Effect, Random } from "effect"

export class HttpError {
  readonly _tag = "HttpError"
}

export class ValidationError {
  readonly _tag = "ValidationError"
}

export const program = Effect.gen(function* () {
  const n1 = yield* Random.next
  const n2 = yield* Random.next

  const httpResult =
    n1 > 0.5 ? "yay!" : yield* Effect.fail(new HttpError())
  const validationResult =
    n2 > 0.5 ? "yay!" : yield* Effect.fail(new ValidationError())

  return httpResult + validationResult
})
```

</div>

::: tabs key:pipe-vs-gen

== Using Effect.gen

```ts twoslash
// @include: error-tracking

Effect.runPromise(program).then(console.log, console.error)
```

In the above program, we compute two values: `httpResult` and `validationResult`, each representing a potential source of error.

== Using pipe

```ts filename="error-tracking.ts" twoslash
import { Effect, Random } from "effect"

export class HttpError {
  readonly _tag = "HttpError"
}

export class ValidationError {
  readonly _tag = "ValidationError"
}

const httpResult = Random.next.pipe(
  Effect.andThen((n1) =>
    n1 > 0.5 ? Effect.succeed("yay!") : Effect.fail(new HttpError())
  )
)

const validationResult = Random.next.pipe(
  Effect.andThen((n2) =>
    n2 > 0.5 ? Effect.succeed("yay!") : Effect.fail(new ValidationError())
  )
)

export const program = Effect.all([httpResult, validationResult]).pipe(
  Effect.andThen(([http, validation]) => http + validation)
)
```

In the above program, we have two operations: `httpResult` and `validationResult`, each representing a potential source of error.
These operations are combined using the `Effect.all(effects)` function from the Effect library, which allows us to sequence them together.

:::

Effect automatically keeps track of the possible errors that can occur during the execution of the program.
In this case, we have `HttpError` and `ValidationError` as the possible error types.
The error channel of the `program` is specified as

```ts
Effect<string, HttpError | ValidationError, never>
```

indicating that it can potentially fail with either a `HttpError` or a `ValidationError`.

## Short-Circuiting

When working with APIs like `Effect.gen`, `Effect.map`, `Effect.flatMap`, `Effect.andThen` and `Effect.all`, it's important to understand how they handle errors.
These APIs are designed to **short-circuit the execution** upon encountering the **first error**.

What does this mean for you as a developer? Well, let's say you have a chain of operations or a collection of effects to be executed in sequence. If any error occurs during the execution of one of these effects, the remaining computations will be skipped, and the error will be propagated to the final result.

In simpler terms, the short-circuiting behavior ensures that if something goes wrong at any step of your program, it won't waste time executing unnecessary computations. Instead, it will immediately stop and return the error to let you know that something went wrong.

:::tabs key:pipe-vs-gen

== Using Effect.gen

```ts twoslash
import { Effect, Console } from "effect"

// Define three effects representing different tasks.
const task1 = Console.log("Executing task1...")
const task2 = Effect.fail("Something went wrong!")
const task3 = Console.log("Executing task3...")

// Compose the three tasks to run them in sequence.
// If one of the tasks fails, the subsequent tasks won't be executed.
const program = Effect.gen(function* () {
  yield* task1
  yield* task2 // After task1, task2 is executed, but it fails with an error
  yield* task3 // This computation won't be executed because the previous one fails
})

Effect.runPromiseExit(program).then(console.log)
/*
Output:
Executing task1...
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: { _id: 'Cause', _tag: 'Fail', failure: 'Something went wrong!' }
}
*/
```

== Using pipe

```ts twoslash
import { Effect, Console } from "effect"

// Define three effects representing different tasks.
const task1 = Console.log("Executing task1...")
const task2 = Effect.fail("Something went wrong!")
const task3 = Console.log("Executing task3...")

// Compose the three tasks using `Effect.andThen` to run them in sequence.
// The `Effect.andThen` function allows us to chain effects together.
// If one of the tasks fails, the subsequent tasks won't be executed.
const program = task1.pipe(
  Effect.andThen(task2), // After task1, task2 is executed, but it fails with an error
  Effect.andThen(task3) // This computation won't be executed because the previous one fails
)

Effect.runPromiseExit(program).then(console.log)
/*
Output:
Executing task1...
{
  _id: 'Exit',
  _tag: 'Failure',
  cause: { _id: 'Cause', _tag: 'Fail', failure: 'Something went wrong!' }
}
*/
```

:::

This code snippet demonstrates the short-circuiting behavior when an error occurs.
Each operation depends on the successful execution of the previous one.
If any error occurs, the execution is short-circuited, and the error is propagated.
In this specific example, `task3` is never executed because an error occurs in `task2`.

## Catching All Errors

### either

The `Effect.either` function transforms an `Effect<A, E, R>` into an effect that encapsulates both potential failure and success within an [Either](../../other/data-types/either) data type:

```ts
Effect<A, E, R> -> Effect<Either<A, E>, never, R>
```

The resulting effect cannot fail because the potential failure is now represented within the `Either`'s `Left` type.
The error type of the returned `Effect` is specified as `never`, confirming that the effect is structured to not fail.

By yielding an `Either`, we gain the ability to "pattern match" on this type to handle both failure and success cases within the generator function.

```ts twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect, Either } from "effect"
import { program } from "./error-tracking"

const recovered = Effect.gen(function* () {
  const failureOrSuccess = yield* Effect.either(program)
  if (Either.isLeft(failureOrSuccess)) {
    // failure case: you can extract the error from the `left` property
    const error = failureOrSuccess.left
    return `Recovering from ${error._tag}`
  } else {
    // success case: you can extract the value from the `right` property
    return failureOrSuccess.right
  }
})
```

We can make the code less verbose by using the `Either.match` function, which directly accepts the two callback functions for handling errors and successful values:

```ts twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect, Either } from "effect"
import { program } from "./error-tracking"

const recovered = Effect.gen(function* () {
  const failureOrSuccess = yield* Effect.either(program)
  return Either.match(failureOrSuccess, {
    onLeft: (error) => `Recovering from ${error._tag}`,
    onRight: (value) => value // do nothing in case of success
  })
})
```

### catchAll

The `Effect.catchAll` function allows you to catch any error that occurs in the program and provide a fallback.

```ts {5} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import { program } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchAll((error) => Effect.succeed(`Recovering from ${error._tag}`))
)
```

We can observe that the type in the error channel of our program has changed to `never`,
indicating that all errors have been handled.

## Catching Some Errors

Suppose we want to handle a specific error, such as `HttpError`.

```ts {8-10} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect, Either } from "effect"
import { program } from "./error-tracking"

const recovered = Effect.gen(function* () {
  const failureOrSuccess = yield* Effect.either(program)
  if (Either.isLeft(failureOrSuccess)) {
    const error = failureOrSuccess.left
    if (error._tag === "HttpError") {
      return "Recovering from HttpError"
    }
    return yield* Effect.fail(error)
  } else {
    return failureOrSuccess.right
  }
})
```

We can observe that the type in the error channel of our program has changed to only show `ValidationError`,
indicating that `HttpError` has been handled.

If we also want to handle `ValidationError`, we can easily add another case to our code:

```ts {11} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect, Either } from "effect"
import { program } from "./error-tracking"

const recovered = Effect.gen(function* () {
  const failureOrSuccess = yield* Effect.either(program)
  if (Either.isLeft(failureOrSuccess)) {
    const error = failureOrSuccess.left
    if (error._tag === "HttpError") {
      return "Recovering from HttpError"
    } else {
      return "Recovering from ValidationError"
    }
  } else {
    return failureOrSuccess.right
  }
})
```

We can observe that the type in the error channel of our program has changed to `never`,
indicating that all errors have been handled.

### catchSome

If we want to catch and recover from only some types of errors and effectfully attempt recovery, we can use the `Effect.catchSome` function:

```ts twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect, Option } from "effect"
import { program } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchSome((error) => {
    if (error._tag === "HttpError") {
      return Option.some(Effect.succeed("Recovering from HttpError"))
    }
    return Option.none()
  })
)
```

In the code above, `Effect.catchSome` takes a function that examines the error (`error`) and decides whether to attempt recovery or not. If the error matches a specific condition, recovery can be attempted by returning `Option.some(effect)`. If no recovery is possible, you can simply return `Option.none()`.

It's important to note that while `Effect.catchSome` lets you catch specific errors, it **doesn't alter the error type** itself. Therefore, the resulting effect (`recovered` in this case) will still have the same error type (`HttpError | ValidationError`) as the original effect.

### catchIf

Similar to `Effect.catchSome`, the function `Effect.catchIf` allows you to recover from specific errors based on a predicate:

```ts twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import { program } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchIf(
    (error) => error._tag === "HttpError",
    () => Effect.succeed("Recovering from HttpError")
  )
)
```

It's important to note that for TypeScript versions < 5.5, while `Effect.catchIf` lets you catch specific errors, it **doesn't alter the error type** itself. Therefore, the resulting effect (`recovered` in this case) will still have the same error type (`HttpError | ValidationError`) as the original effect. In TypeScript versions >= 5.5, improved type narrowing causes the resulting error type to be inferred as `ValidationError`.

For TypeScript versions < 5.5, if you provide a [user-defined type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) instead of a predicate, the resulting error type will be pruned, returning an `Effect<string, ValidationError, never>`:

```ts {6} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import { program, HttpError } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchIf(
    (error): error is HttpError => error._tag === "HttpError",
    () => Effect.succeed("Recovering from HttpError")
  )
)
```

### catchTag

If your program's errors are all tagged with a `_tag` field that acts as a discriminator you can use the `Effect.catchTag` function to catch and handle specific errors with precision.

```ts {5-7} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import { program } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchTag("HttpError", (_HttpError) =>
    Effect.succeed("Recovering from HttpError")
  )
)
```

In the example above, the `Effect.catchTag` function allows us to handle `HttpError` specifically.
If a `HttpError` occurs during the execution of the program, the provided error handler function will be invoked,
and the program will proceed with the recovery logic specified within the handler.

We can observe that the type in the error channel of our program has changed to only show `ValidationError`,
indicating that `HttpError` has been handled.

If we also wanted to handle `ValidationError`, we can simply add another `catchTag`:

```ts {8-10} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import { program } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchTag("HttpError", (_HttpError) =>
    Effect.succeed("Recovering from HttpError")
  ),
  Effect.catchTag("ValidationError", (_ValidationError) =>
    Effect.succeed("Recovering from ValidationError")
  )
)
```

We can observe that the type in the error channel of our program has changed to `never`,
indicating that all errors have been handled.

> [!WARNING]
> It is important to ensure that the error type used with `catchTag` has a
> `readonly _tag` discriminant field. This field is required for the matching
> and handling of specific error tags.

### catchTags

Instead of using the `Effect.catchTag` function multiple times to handle individual error types, we have a more convenient option called `Effect.catchTags`. With `Effect.catchTags`, we can handle multiple errors in a single block of code.

```ts {5-8} twoslash
// @filename: error-tracking.ts
// @include: error-tracking

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import { program } from "./error-tracking"

const recovered = program.pipe(
  Effect.catchTags({
    HttpError: (_HttpError) => Effect.succeed(`Recovering from HttpError`),
    ValidationError: (_ValidationError) =>
      Effect.succeed(`Recovering from ValidationError`)
  })
)
```

In the above example, instead of using `Effect.catchTag` multiple times to handle individual errors, we utilize the `Effect.catchTags` combinator.
This combinator takes an object where each property represents a specific error `_tag` (`"HttpError"` and `"ValidationError"` in this case),
and the corresponding value is the error handler function to be executed when that particular error occurs.

> [!WARNING]
> It is important to ensure that all the error types used with
> `Effect.catchTags` have a `readonly _tag` discriminant field. This field is
> required for the matching and handling of specific error tags.
