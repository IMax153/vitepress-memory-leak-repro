---
title: Runtime
description: Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs.
order: 6
---

# Introduction to Runtime

The `Runtime<R>` data type represents a Runtime System that can execute effects. To execute any effect, we need a `Runtime` that includes the necessary requirements for that effect.

A `Runtime<R>` consists of three main components:

- a value of type `Context<R>`
- a value of type `FiberRefs`
- a value of type `RuntimeFlags`

## The Default Runtime

When we use functions like `Effect.run*`, we are actually using the **default runtime** without explicitly mentioning it. These functions are designed as convenient shortcuts for executing our effects using the default runtime.

For instance, in the `Runtime` module, there is a corresponding `Runtime.run*(defaultRuntime)` function that is called internally by `Effect.run*`, e.g. `Effect.runSync` is simply an alias for `Runtime.runSync(defaultRuntime)`.

The default runtime includes:

- An empty `Context<never>`
- A set of `FiberRefs` that include the default services
- A default configuration for `RuntimeFlags` that enables `Interruption` and `CooperativeYielding`

In most cases, using the default runtime is sufficient. However, it can be useful to create a custom runtime to reuse a specific context or configuration. It is common to create a `Runtime<R>` by initializing a `Layer<R, Err, RIn>`. This allows for context reuse across execution boundaries, such as in a React App or when executing operations on a server in response to API requests.

## What is a Runtime System?

When we write an Effect program, we construct an `Effect` using constructors and combinators. Essentially, we are creating a blueprint of a program. An `Effect` is merely a data structure that describes the execution of a concurrent program. It represents a tree-like structure that combines various primitives to define what the `Effect` should do.

However, this data structure itself does not perform any actions; it is solely a description of a concurrent program.

Therefore, it is crucial to understand that when working with a functional effect system like Effect, our code for actions such as printing to the console, reading files, or querying databases is actually building a workflow or blueprint for an application. We are constructing a data structure.

So how does Effect actually run these workflows? This is where the Effect Runtime System comes into play. When we invoke a `Runtime.run*` function, the Runtime System takes over. First, it creates an empty root Fiber with:

- The initial context
- The initial fiberRefs
- The initial Effect

After the creation of the Fiber, it invokes the Fiber's runLoop, which follows the instructions described by the `Effect` and executes them step by step.

To simplify, we can envision the Runtime System as a black box that takes both the effect [Effect&lt;A, E, R&gt;](essentials/the-effect-type) and its associated context `Context<R>`. It runs the effect and returns the result as an [Exit&lt;A, E&gt;](../other/data-types/exit) value.

![Effect Runtime](./runtime.svg "A diagram outlining how an Effect Runtime processes input and produces output")

## Responsibilities of the Runtime System

Runtime Systems have a lot of responsibilities:

1. **Execute every step of the blueprint**. They have to execute every step of the blueprint in a while loop until it's done.

2. **Handle unexpected errors**. They have to handle unexpected errors, not just the expected ones but also the unexpected ones.

3. **Spawn concurrent fiber**. They are actually responsible for the concurrency that effect systems have. They have to spawn a fiber every time we call `fork` on an effect to spawn off a new fiber.

4. **Cooperatively yield to other fibers**. They have to cooperatively yield to other fibers so that fibers that are sort of hogging the spotlight, don't get to monopolize all the CPU resources.

5. **Ensure finalizers are run appropriately**. They have to ensure finalizers are run appropriately at the right point in all circumstances to make sure that resources are closed that clean-up logic is executed. This is the feature that powers [Scope](./resource-management/scope) and all the other resource-safe constructs in Effect.

6. **Handle asynchronous callback**. They have to handle this messy job of dealing with asynchronous callbacks. So we don't have to deal with async code. When we are using Effect, everything can be interpreted as async or sync out of the box.

## Default Runtime

Effect provides a default runtime named `Runtime.defaultRuntime` designed for mainstream usage.

The default runtime provides the minimum capabilities to bootstrap execution of Effect tasks.

Both of the following executions are equivalent:

```ts twoslash
import { Effect, Runtime } from "effect"

const program = Effect.log("Application started!")

Effect.runSync(program)
/*
Output:
... level=INFO fiber=#0 message="Application started!"
*/

Runtime.runSync(Runtime.defaultRuntime)(program)
/*
Output:
... level=INFO fiber=#0 message="Application started!"
*/
```

Under the hood, `Effect.runSync` (and the same principle applies to other `Effect.run*` functions) serves as a convenient shorthand for `Runtime.runSync(Runtime.defaultRuntime)`.

## Locally Scoped Runtime Configuration

In Effect, runtime configurations are typically inherited from their parent workflows. This means that when we access a runtime configuration or obtain a runtime inside a workflow, we are essentially using the configuration of the parent workflow. However, there are cases where we want to temporarily override the runtime configuration for a specific part of our code. This concept is known as locally scoped runtime configuration. Once the execution of that code region is completed, the runtime configuration reverts to its original settings.

To achieve this, we make use of `Effect.provide*` functions, which allow us to provide a new runtime configuration to a specific section of our code.

### Configuring Runtime by Providing Configuration Layers

By utilizing the `Effect.provide` function and providing runtime configuration layers to an Effect workflow, we can easily modify runtime configurations.

Here's an example:

```ts twoslash
import { Logger, Effect } from "effect"

// Define a configuration layer
const addSimpleLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

const program = Effect.gen(function* () {
  yield* Effect.log("Application started!")
  yield* Effect.log("Application is about to exit!")
})

Effect.runSync(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message="Application started!"
timestamp=... level=INFO fiber=#0 message="Application is about to exit!"
*/

// Overriding the default logger
Effect.runSync(program.pipe(Effect.provide(addSimpleLogger)))
/*
Output:
Application started!
Application is about to exit!
*/
```

In this example, we first create a configuration layer for a simple logger using `Logger.replace`.
Then, we use `Effect.provide` to provide this configuration to our program, effectively overriding the default logger with the simple logger.

To ensure that the runtime configuration is only applied to a specific part of an Effect application, we should provide the configuration layer exclusively to that particular section, as demonstrated in the following example:

```ts twoslash
import { Logger, Effect } from "effect"

// Define a configuration layer
const addSimpleLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

const program = Effect.gen(function* () {
  yield* Effect.log("Application started!")
  yield* Effect.gen(function* () {
    yield* Effect.log("I'm not going to be logged!")
    yield* Effect.log("I will be logged by the simple logger.").pipe(
      Effect.provide(addSimpleLogger)
    )
    yield* Effect.log(
      "Reset back to the previous configuration, so I won't be logged."
    )
  }).pipe(Effect.provide(Logger.remove(Logger.defaultLogger)))
  yield* Effect.log("Application is about to exit!")
})

Effect.runSync(program)
/*
Output:
timestamp=... level=INFO fiber=#0 message="Application started!"
I will be logged by the simple logger.
timestamp=... level=INFO fiber=#0 message="Application is about to exit!"
*/
```

## Top-level Runtime Configuration

When developing an Effect application and executing it using `Effect.run*` functions, the application is automatically run using the default runtime behind the scenes.
While we can adjust and customize specific aspects of our Effect application by providing locally scoped configuration layers using `Effect.provide` operations,
there are scenarios where we need to customize the runtime configuration for the entire application from the top level.

In such situations, we can create a top-level runtime by converting a configuration layer into a runtime using the `ManagedRuntime.make` constructor.

### ManagedRuntime

```ts twoslash
import { Effect, ManagedRuntime, Logger } from "effect"

// Define a configuration layer
const appLayer = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ message }) => console.log(message))
)

// Transform the configuration layer into a runtime
const runtime = ManagedRuntime.make(appLayer)

const program = Effect.log("Application started!")

// Execute the program using the custom runtime
runtime.runSync(program)

// Cleaning up any resources used by the configuration layer
Effect.runFork(runtime.disposeEffect)
/*
Output:
Application started!
*/
```

In this example, we first create a custom configuration layer called `appLayer`, which includes modifications to the logger configuration.
Next, we transform this configuration layer into a runtime using `ManagedRuntime.make`.
This results in a top-level runtime that encapsulates the desired configuration for the entire Effect application.

By customizing the top-level runtime configuration, we can tailor the behavior of our entire Effect application to meet our specific needs and requirements.

### Effect.Tag

When you utilize a runtime that you pass around, you can use `Effect.Tag` to define a new tag and simplify access to a service. This incorporates the service shape directly into the static side of the tag class.

You can define a new tag using `Effect.Tag` as shown below:

```ts twoslash
import { Effect } from "effect"

class Notifications extends Effect.Tag("Notifications")<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>() {}
```

In this setup, every field of the service shape is converted into a static property of the `Notifications` class.

This allows you to access the service shape directly:

```ts twoslash
import { Effect } from "effect"

class Notifications extends Effect.Tag("Notifications")<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>() {}

// ---cut---
const action = Notifications.notify("Hello, world!")
```

As you can see, `action` depends on `Notifications`, but this isn't a problem because you can later construct a `Layer` that provides `Notifications` and build a `ManagedRuntime` with it.

### Integrations

The `ManagedRuntime` simplifies the integration of services and layers with other frameworks or tools, particularly in environments where Effect is not the primary framework and access to the main entry point is restricted.

For instance, `ManagedRuntime` can be particularly useful in environments like React or other frameworks where control over the main application entry point is limited. Here's how you can use `ManagedRuntime` to manage service lifecycle within an external framework:

```ts twoslash
import { Effect, ManagedRuntime, Layer, Console } from "effect"

class Notifications extends Effect.Tag("Notifications")<
  Notifications,
  { readonly notify: (message: string) => Effect.Effect<void> }
>() {
  static Live = Layer.succeed(this, {
    notify: (message) => Console.log(message)
  })
}

// Example entry point for an external framework
async function main() {
  const runtime = ManagedRuntime.make(Notifications.Live)
  await runtime.runPromise(Notifications.notify("Hello, world!"))
  await runtime.dispose()
}
```
