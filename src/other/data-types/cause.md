---
title: Cause
description: Explore the `Cause` data type in the `Effect` type, which stores comprehensive information about failures, including unexpected errors, stack traces, and fiber interruption causes. Learn how `Cause` ensures no failure information is lost, providing a complete story for precise error analysis and handling in your codebase. Discover various causes such as Empty, Fail, Die, Interrupt, Sequential, and Parallel, each representing different error scenarios within the `Effect` workflow.
order: 0
---

# Cause

The [Effect&lt;A, E, R&gt;](../../guides/essentials/the-effect-type) type is polymorphic in values of type `E`, which means we can work with any error type we want. However, there is additional information related to failures that is not captured by the `E` value alone.

To preserve and provide comprehensive information about failures, Effect uses the `Cause<E>` data type. `Cause` is responsible for storing various details, such as:

- Unexpected errors or defects
- Stack and execution traces
- Causes of fiber interruptions

Effect is designed to be strict in preserving all the information related to a failure. It captures and stores the complete story of failure in the `Cause` data type. This ensures that no information about the failure is lost, allowing us to precisely determine what happened during the execution of our effects.

Although we don't typically work directly with `Cause` values, it is an underlying data type that represents errors occurring within an Effect workflow. It provides us with total access to all concurrent and sequential errors within our codebase. This gives us the ability to analyze and handle failures in a comprehensive manner whenever needed.

## Creating Causes

We can intentionally create effects with specific causes using the `Effect.failCause` constructor:

```ts twoslash
import { Effect, Cause } from "effect"

// Create an effect that intentionally fails with an empty cause
const effect = Effect.failCause(Cause.empty)
```

To uncover the underlying cause of an effect, we can use the `Effect.cause` function:

```ts
Effect.cause(effect).pipe(
  Effect.andThen((cause) => ...)
)
```

## Cause Variations

There are several causes for various errors, in this section, we will describe each of these causes.

### Empty

The `Empty` cause represents a lack of errors.

### Fail

The `Fail` cause represents a `Cause` which failed with an expected error of type `E`.

### Die

The `Die` cause represents a `Cause` which failed as a result of a defect, or in other words, an unexpected error.

### Interrupt

The `Interrupt` cause represents failure due to `Fiber` interruption, which contains the `FiberId` of the interrupted `Fiber`.

### Sequential

The `Sequential` cause represents the composition of two causes which occurred
sequentially.

For example, if we perform Effect's analog of `try-finally` (i.e.
`Effect.ensuring`), and both the `try` and `finally` blocks fail, we have two
errors which occurred sequentially. In these cases, the errors can be
represented by the `Sequential` cause.

### Parallel

The `Parallel` cause represents the composition of two causes which occurred in parallel.

In Effect programs, it is possible that two operations may be performed in
parallel. In these cases, the `Effect` workflow can fail for more than one
reason. If both computations fail, then there are actually two errors which
occurred in parallel. In these cases, the errors can be represented by the
`Parallel` cause.

## Guards

To identify the type of a `Cause`, you can use specific guards provided by the `Cause` module:

- `Cause.isEmpty`
- `Cause.isFailType`
- `Cause.isDie`
- `Cause.isInterruptType`
- `Cause.isSequentialType`
- `Cause.isParallelType`

Let's see an example of how you can utilize these guards:

```ts twoslash
import { Cause } from "effect"

const cause = Cause.fail(new Error("my message"))

if (Cause.isFailType(cause)) {
  console.log(cause.error.message) // Output: my message
}
```

By using these guards, you can effectively determine the nature of a `Cause`, enabling you to handle different error scenarios appropriately in your code. Whether it's an empty cause, failure, defect, interruption, sequential composition, or parallel composition, these guards provide a clear way to identify and manage various types of errors.

## Pattern Matching

In addition to using guards, you can handle different cases of a `Cause` using the `Cause.match` function. This function allows you to define separate callbacks for each possible case of a `Cause`.

Let's explore how you can use `Cause.match`:

```ts twoslash
import { Cause } from "effect"

const cause = Cause.parallel(
  Cause.fail(new Error("my fail message")),
  Cause.die("my die message")
)

console.log(
  Cause.match(cause, {
    onEmpty: "(empty)",
    onFail: (error) => `(error: ${error.message})`,
    onDie: (defect) => `(defect: ${defect})`,
    onInterrupt: (fiberId) => `(fiberId: ${fiberId})`,
    onSequential: (left, right) =>
      `(onSequential (left: ${left}) (right: ${right}))`,
    onParallel: (left, right) =>
      `(onParallel (left: ${left}) (right: ${right})`
  })
)
/*
Output:
(onParallel (left: (error: my fail message)) (right: (defect: my die message))
*/
```

## Pretty Printing

When working with errors in your code, it's crucial to have clear and readable error messages for effective debugging. The `Cause.pretty` function provides a convenient way to achieve this by generating nicely formatted error messages as strings.

Let's take a look at how you can use `Cause.pretty`:

```ts twoslash
import { Cause, FiberId } from "effect"

console.log(Cause.pretty(Cause.empty)) // All fibers interrupted without errors.
console.log(Cause.pretty(Cause.fail(new Error("my fail message")))) // Error: my fail message
console.log(Cause.pretty(Cause.die("my die message"))) // Error: my die message
console.log(Cause.pretty(Cause.interrupt(FiberId.make(1, 0)))) // All fibers interrupted without errors.
console.log(
  Cause.pretty(Cause.sequential(Cause.fail("fail1"), Cause.fail("fail2")))
)
/*
Output:
Error: fail1
Error: fail2
*/
```

## Retrieval of Failures and Defects

If you're specifically interested in obtaining a collection of failures or defects from a `Cause`, you can use the `Cause.failures` and `Cause.defects` functions respectively.

Let's see how you can utilize these functions:

```ts twoslash
import { Cause } from "effect"

const cause = Cause.parallel(
  Cause.fail(new Error("my fail message 1")),
  Cause.sequential(
    Cause.die("my die message"),
    Cause.fail(new Error("my fail message 2"))
  )
)

console.log(Cause.failures(cause))
/*
Output:
{
  _id: 'Chunk',
  values: [
    Error: my fail message 1 ...,
    Error: my fail message 2 ...
  ]
}
*/

console.log(Cause.defects(cause))
/*
Output:
{ _id: 'Chunk', values: [ 'my die message' ] }
*/
```
