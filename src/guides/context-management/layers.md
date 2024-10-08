---
title: Managing Layers
description: Learn how to use Layers to control the construction of service dependencies and manage the "dependency graph" of your program more effectively.
order: 2
---

# Managing Layers

In the previous sections, you learned how to create effects which depend on some service to be provided in order to execute, as well as how to provide that service to an Effect.

However, what if we have a service within our effect program that has dependencies on other services in order to be built? We want to avoid leaking these implementation details into the service interface.

To represent the "dependency graph" of our program and manage these dependencies more effectively, we can utilize a powerful abstraction called **Layer**.

Layers act as **constructors** for creating services, allowing us to manage dependencies during construction rather than at the service level. This approach helps to keep our service interfaces clean and focused.

| **Concept** | **Description**                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Service** | A reusable component providing specific functionality, used across different parts of an application.                     |
| **Tag**     | A unique identifier representing a **service**, allowing Effect to locate and use it.                                     |
| **Context** | A collection storing services, functioning like a map with **tags** as keys and **services** as values.                   |
| **Layer**   | An abstraction for constructing **services**, managing dependencies during construction rather than at the service level. |

In this guide, we will cover the following topics:

- Using Layers to control the construction of services.
- Building a dependency graph with Layers.
- Providing a Layer to an effect.

## Designing the Dependency Graph

Let's imagine that we are building a web application! We could imagine that the dependency graph for an application where we need to manage configuration, logging, and database access might look something like this:

- The `Config` service provides application configuration.
- The `Logger` service depends on the `Config` service.
- The `Database` service depends on both the `Config` and `Logger` services.

Our goal is to build the `Database` service along with its direct and indirect dependencies. This means we need to ensure that the `Config` service is available for both `Logger` and `Database`, and then provide these dependencies to the `Database` service.

Now let's take our dependency graph and translate it into code.

## Creating Layers

We will use Layers to construct the `Database` service instead of providing a service implementation directly as we did in the [Managing Services](services) guide. Layers are a way of separating implementation details from the service itself.

> [!TIP]
> When a service has its own requirements, it's best to separate
> implementation details into layers. Layers act as **constructors** for
> creating the service, allowing us to handle dependencies at the construction
> level rather than the service level.

A `Layer<RequirementsOut, Error, RequirementsIn>` represents a blueprint for constructing a `RequirementsOut`.
It takes a value of type `RequirementsIn` as input and may potentially produce an error of type `Error` during the construction process.

In our case, the `RequirementsOut` type represents the service we want to construct, while `RequirementsIn` represents the dependencies required for construction.

> [!INFO]
> For simplicity, let's assume that we won't encounter any errors during the
> value construction (meaning `Error = never`).

Now, let's determine how many layers we need to implement our dependency graph:

| **Layer**      | **Dependencies**                                           | **Type**                                   |
| -------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `ConfigLive`   | The `Config` service does not depend on any other services | `Layer<Config>`                            |
| `LoggerLive`   | The `Logger` service depends on the `Config` service       | `Layer<Logger, never, Config>`             |
| `DatabaseLive` | The `Database` service depends on `Config` and `Logger`    | `Layer<Database, never, Config \| Logger>` |

> [!TIP]
> A common convention when naming the `Layer` for a particular service is to
> add a `Live` suffix for the "live" implementation and a `Test` suffix for
> the "test" implementation. For example, for a `Database` service, the
> `DatabaseLive` would be the layer you provide in your application and the
> `DatabaseTest` would be the layer you provide in your tests.

When a service has multiple dependencies, they are represented as a **union type**. In our case, the `Database` service depends on both the `Config` and `Logger` services. Therefore, the type for the `DatabaseLive` layer will be `Layer<Database, never, Config | Logger>`.

### Config

The `Config` service does not depend on any other services, so `ConfigLive` will be the simplest layer to implement. Just like in the [Managing Services](services) guide, we must create a `Tag` for the service. And because the service has no dependencies, we can create the layer directly using `Layer.succeed`:

```ts twoslash
import { Effect, Context, Layer } from "effect"

// Create a tag for the Config service
class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

const ConfigLive = Layer.succeed(
  Config,
  Config.of({
    getConfig: Effect.succeed({
      logLevel: "INFO",
      connection: "mysql://username:password@hostname:port/database_name"
    })
  })
)
```

Looking at the type of `ConfigLive` we can observe:

- `RequirementsOut` is `Config`, indicating that constructing the layer will produce a `Config` service
- `Error` is `never`, indicating that layer construction cannot fail
- `RequirementsIn` is `never`, indicating that the layer has no dependencies

Note that, to construct `ConfigLive`, we used the `Config.of`
constructor. However, this is merely a helper to ensure correct type inference
for the implementation. It's possible to skip this helper and construct the
implementation directly as a simple object:

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

// ---cut---
const ConfigLive = Layer.succeed(Config, {
  getConfig: Effect.succeed({
    logLevel: "INFO",
    connection: "mysql://username:password@hostname:port/database_name"
  })
})
```

### Logger

Now we can move on to the implementation of the `Logger` service, which depends on the `Config` service to retrieve some configuration.

Just like we did in the [Managing Services](services#using-the-service) guide, we can map over the `Config` tag to "extract" the service from the context.

Given that using the `Config` tag is an effectful operation, we use `Layer.effect` to create a `Layer` from the resulting `Effect`.

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

// ---cut---
class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig
          console.log(`[${logLevel}] ${message}`)
        })
    }
  })
)
```

Looking at the type of `LoggerLive` we can observe:

- `RequirementsOut` is `Logger`
- `Error` is `never`, indicating that layer construction cannot fail
- `RequirementsIn` is `Config`, indicating that the layer has a requirement

### Database

Finally, we can use our `Config` and `Logger` services to implement the `Database` service.

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

// ---cut---
class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown> }
>() {}

const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config
    const logger = yield* Logger
    return {
      query: (sql: string) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing query: ${sql}`)
          const { connection } = yield* config.getConfig
          return { result: `Results from ${connection}` }
        })
    }
  })
)
```

Looking at the type of `DatabaseLive` we can observe that the `RequirementsIn` type is `Config | Logger`, i.e., the `Database` service requires both `Config` and `Logger` services.

## Combining Layers

Layers can be combined in two primary ways: merging and composing.

### Merging Layers

Layers can be combined through merging using the `Layer.merge` combinator:

```ts
Layer.merge(layer1, layer2)
```

When we merge two layers, the resulting layer:

- requires all the services that both of them require.
- produces all services that both of them produce.

For example, in our web application above, we can merge our `ConfigLive` and `LoggerLive` layers into a single `AppConfigLive` layer, which retains the requirements of both layers (`never | Config = Config`) and the outputs of both layers (`Config | Logger`):

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

const ConfigLive = Layer.succeed(
  Config,
  Config.of({
    getConfig: Effect.succeed({
      logLevel: "INFO",
      connection: "mysql://username:password@hostname:port/database_name"
    })
  })
)

class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig
          console.log(`[${logLevel}] ${message}`)
        })
    }
  })
)

// ---cut---
const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)
```

### Composing Layers

Layers can be composed using the `Layer.provide` function:

```ts twoslash
import { Layer } from "effect"

declare const inner: Layer.Layer<"OutInner", never, "InInner">
declare const outer: Layer.Layer<"InInner", never, "InOuter">

const composition = inner.pipe(Layer.provide(outer))
```

Sequential composition of layers implies that the output of one layer (`outer`) is supplied as the input for the inner layer (`inner`),
resulting in a single layer with the requirements of the first layer and the output of the second.

Now we can compose the `AppConfigLive` layer with the `DatabaseLive` layer:

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

const ConfigLive = Layer.succeed(
  Config,
  Config.of({
    getConfig: Effect.succeed({
      logLevel: "INFO",
      connection: "mysql://username:password@hostname:port/database_name"
    })
  })
)

class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig
          console.log(`[${logLevel}] ${message}`)
        })
    }
  })
)

class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown> }
>() {}

const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config
    const logger = yield* Logger
    return {
      query: (sql: string) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing query: ${sql}`)
          const { connection } = yield* config.getConfig
          return { result: `Results from ${connection}` }
        })
    }
  })
)

// ---cut---
const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)

const MainLive = DatabaseLive.pipe(
  // provides the config and logger to the database
  Layer.provide(AppConfigLive),
  // provides the config to AppConfigLive
  Layer.provide(ConfigLive)
)
```

### Merging and Composing Layers

Let's say we want our `MainLive` layer to return both the `Config` and `Database` services. We can achieve this with `Layer.provideMerge`:

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

const ConfigLive = Layer.succeed(
  Config,
  Config.of({
    getConfig: Effect.succeed({
      logLevel: "INFO",
      connection: "mysql://username:password@hostname:port/database_name"
    })
  })
)

class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig
          console.log(`[${logLevel}] ${message}`)
        })
    }
  })
)

class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown> }
>() {}

const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config
    const logger = yield* Logger
    return {
      query: (sql: string) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing query: ${sql}`)
          const { connection } = yield* config.getConfig
          return { result: `Results from ${connection}` }
        })
    }
  })
)

// ---cut---
const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)

const MainLive = DatabaseLive.pipe(
  Layer.provide(AppConfigLive),
  Layer.provideMerge(ConfigLive)
)
```

## Providing a Layer to an Effect

Now that we have assembled the fully resolved `MainLive` for our application,
we can provide it to our program to satisfy the program's requirements using `Effect.provide`:

```ts twoslash
import { Effect, Context, Layer } from "effect"

class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

const ConfigLive = Layer.succeed(
  Config,
  Config.of({
    getConfig: Effect.succeed({
      logLevel: "INFO",
      connection: "mysql://username:password@hostname:port/database_name"
    })
  })
)

class Logger extends Context.Tag("Logger")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    const config = yield* Config
    return {
      log: (message) =>
        Effect.gen(function* () {
          const { logLevel } = yield* config.getConfig
          console.log(`[${logLevel}] ${message}`)
        })
    }
  })
)

class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown> }
>() {}

const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const config = yield* Config
    const logger = yield* Logger
    return {
      query: (sql: string) =>
        Effect.gen(function* () {
          yield* logger.log(`Executing query: ${sql}`)
          const { connection } = yield* config.getConfig
          return { result: `Results from ${connection}` }
        })
    }
  })
)

const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)

const MainLive = DatabaseLive.pipe(
  Layer.provide(AppConfigLive),
  Layer.provide(ConfigLive)
)

// ---cut---
const program = Effect.gen(function* () {
  const database = yield* Database
  const result = yield* database.query("SELECT * FROM users")
  return yield* Effect.succeed(result)
})

const runnable = Effect.provide(program, MainLive)

Effect.runPromise(runnable).then(console.log)
/*
Output:
[INFO] Executing query: SELECT * FROM users
{
  result: 'Results from mysql://username:password@hostname:port/database_name'
}
*/
```
