---
title: Batching
description: Effect is a powerful TypeScript library designed to help developers easily create complex, synchronous, and asynchronous programs.
order: 9
---

# Batching

## Classic Approach to API Integration

In typical application development, when interacting with external APIs, databases, or other data sources, we often define functions that perform requests and handle their results or failures accordingly.

### Simple Model Setup

Here's a basic model that outlines the structure of our data and possible errors:

::: code-group

```ts [Model.ts] twoslash include Model
export interface User {
  readonly _tag: "User"
  readonly id: number
  readonly name: string
  readonly email: string
}

export class GetUserError {
  readonly _tag = "GetUserError"
}

export interface Todo {
  readonly _tag: "Todo"
  readonly id: number
  readonly message: string
  readonly ownerId: number
}

export class GetTodosError {
  readonly _tag = "GetTodosError"
}

export class SendEmailError {
  readonly _tag = "SendEmailError"
}
```

:::

> [!INFO] Precision
> In a real world scenario we may want to use a more precise types instead of
> directly using primitives for identifiers (see [Branded
> Types](style/branded-types)). Additionally, you may want to include more
> detailed information in the errors.

### Defining API Functions

Let's define functions that interact with an external API, handling common operations such as fetching todos, retrieving user details, and sending emails.

::: code-group

```ts [API.ts] twoslash include API
// @filename: Model.ts
// @include: Model

// @filename: API.ts
// ---cut---
import { Effect } from "effect"
import * as Model from "./Model"

// Fetches a list of todos from an external API
export const getTodos = Effect.tryPromise({
  try: () =>
    fetch("https://api.example.demo/todos").then(
      (res) => res.json() as Promise<Array<Model.Todo>>
    ),
  catch: () => new Model.GetTodosError()
})

// Retrieves a user by their ID from an external API
export const getUserById = (id: number) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://api.example.demo/getUserById?id=${id}`).then(
        (res) => res.json() as Promise<Model.User>
      ),
    catch: () => new Model.GetUserError()
  })

// Sends an email via an external API
export const sendEmail = (address: string, text: string) =>
  Effect.tryPromise({
    try: () =>
      fetch("https://api.example.demo/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ address, text })
      }).then((res) => res.json() as Promise<void>),
    catch: () => new Model.SendEmailError()
  })

// Sends an email to a user by fetching their details first
export const sendEmailToUser = (id: number, message: string) =>
  getUserById(id).pipe(
    Effect.andThen((user) => sendEmail(user.email, message))
  )

// Notifies the owner of a todo by sending them an email
export const notifyOwner = (todo: Model.Todo) =>
  getUserById(todo.ownerId).pipe(
    Effect.andThen((user) =>
      sendEmailToUser(user.id, `hey ${user.name} you got a todo!`)
    )
  )
```

:::

> [!INFO]
> In a real-world scenario, you might not want to trust your APIs to always
> return the expected data - for this, you can use `@effect/schema` or similar
> alternatives such as `zod`.

While this approach is straightforward and readable, it may not be the most efficient. Repeated API calls, especially when many todos share the same owner, can significantly increase network overhead and slow down your application.

### Using the API Functions

While these functions are clear and easy to understand, their use may not be the most efficient. For example, notifying todo owners involves repeated API calls which can be optimized.

::: code-group

```ts [index.ts] twoslash
// @filename: Model.ts
// @include: Model

// @filename: API.ts
// @include: API

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import * as API from "./API"

// Orchestrates operations on todos, notifying their owners
const program = Effect.gen(function* () {
  const todos = yield* API.getTodos
  yield* Effect.forEach(todos, (todo) => API.notifyOwner(todo), {
    concurrency: "unbounded"
  })
})
```

:::

This implementation performs an API call for each todo to fetch the owner's details and send an email. If multiple todos have the same owner, this results in redundant API calls.

### Improving Efficiency with Batch Calls

To optimize, consider implementing batch API calls if your backend supports them. This reduces the number of HTTP requests by grouping multiple operations into a single request, thereby enhancing performance and reducing load.

**Next Steps:**

Refactor your API interactions to use batch processing where possible. This not only reduces server load but also streamlines the handling of data, keeping your code both efficient and clean.

## Batching

Batching API calls can drastically improve the performance of your application by reducing the number of HTTP requests.

Let's assume that `getUserById` and `sendEmail` can be batched. This means that we can send multiple requests in a single HTTP call, reducing the number of API requests and improving performance.

**Step-by-Step Guide to Batching**

1. **Structuring Requests:** We'll start by transforming our requests into structured data models. This involves detailing input parameters, expected outputs, and possible errors. Structuring requests this way not only helps in efficiently managing data but also in comparing different requests to understand if they refer to the same input parameters.

2. **Defining Resolvers:** Resolvers are designed to handle multiple requests simultaneously. By leveraging the ability to compare requests (ensuring they refer to the same input parameters), resolvers can execute several requests in one go, maximizing the utility of batching.

3. **Creating Queries:** Finally, we'll define queries that utilize these batch-resolvers to perform operations. This step ties together the structured requests and their corresponding resolvers into functional components of the application.

**Important Considerations**

It's crucial for the requests to be modeled in a way that allows them to be comparable. This means implementing comparability (using methods like [Equals.equals](../other/trait/equal)) to identify and batch identical requests effectively.

### Declaring Requests

Let's start by defining a structured model for the types of requests our data sources can handle. We'll design a model using the concept of a `Request` that a data source might support.

A `Request<Value, Error>` is a construct representing a request for a value of type `Value`, which might fail with an error of type `Error`.

::: code-group

```ts [Requests.ts] twoslash include Requests
// @filename: Model.ts
// @include: Model

// @filename: Requests.ts
// ---cut---
import { Request } from "effect"
import * as Model from "./Model"

// Define a request to get multiple Todo items which might fail with a GetTodosError
export interface GetTodos
  extends Request.Request<Array<Model.Todo>, Model.GetTodosError> {
  readonly _tag: "GetTodos"
}

// Create a tagged constructor for GetTodos requests
export const GetTodos = Request.tagged<GetTodos>("GetTodos")

// Define a request to fetch a User by ID which might fail with a GetUserError
export interface GetUserById
  extends Request.Request<Model.User, Model.GetUserError> {
  readonly _tag: "GetUserById"
  readonly id: number
}

// Create a tagged constructor for GetUserById requests
export const GetUserById = Request.tagged<GetUserById>("GetUserById")

// Define a request to send an email which might fail with a SendEmailError
export interface SendEmail
  extends Request.Request<void, Model.SendEmailError> {
  readonly _tag: "SendEmail"
  readonly address: string
  readonly text: string
}

// Create a tagged constructor for SendEmail requests
export const SendEmail = Request.tagged<SendEmail>("SendEmail")

// Combine all requests into a union type for easier management
export type ApiRequest = GetTodos | GetUserById | SendEmail
```

:::

Each request is defined with a specific data structure that extends from a generic `Request` type, ensuring that each request carries its unique data requirements along with a specific error type.

By using tagged constructors like `Request.tagged`, we can easily instantiate request objects that are recognizable and manageable throughout the application.

### Declaring Resolvers

After defining our requests, the next step is configuring how Effect resolves these requests using `RequestResolver`. A `RequestResolver<A, R>` requires an environment `R` and is capable of executing requests of type `A`.

In this section, we'll create individual resolvers for each type of request. The granularity of your resolvers can vary, but typically, they are divided based on the batching capabilities of the corresponding API calls.

::: code-group

```ts [Resolvers.ts] twoslash include Resolvers
// @filename: API.ts
// @include: API

// @filename: Model.ts
// @include: Model

// @filename: Requests.ts
// @include: Requests

// @filename: Resolvers.ts
// ---cut---
import { Effect, RequestResolver, Request } from "effect"
import * as API from "./API"
import * as Model from "./Model"
import * as Requests from "./Requests"

// Assuming GetTodos cannot be batched, we create a standard resolver
export const GetTodosResolver = RequestResolver.fromEffect(
  (request: Requests.GetTodos) => API.getTodos
)

// Assuming GetUserById can be batched, we create a batched resolver
export const GetUserByIdResolver = RequestResolver.makeBatched(
  (requests: ReadonlyArray<Requests.GetUserById>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/getUserByIdBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            users: requests.map(({ id }) => ({ id }))
          })
        }).then((res) => res.json()) as Promise<Array<Model.User>>,
      catch: () => new Model.GetUserError()
    }).pipe(
      Effect.andThen((users) =>
        Effect.forEach(requests, (request, index) =>
          Request.completeEffect(request, Effect.succeed(users[index]))
        )
      ),
      Effect.catchAll((error) =>
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.fail(error))
        )
      )
    )
)

// Assuming SendEmail can be batched, we create a batched resolver
export const SendEmailResolver = RequestResolver.makeBatched(
  (requests: ReadonlyArray<Requests.SendEmail>) =>
    Effect.tryPromise({
      try: () =>
        fetch("https://api.example.demo/sendEmailBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emails: requests.map(({ address, text }) => ({ address, text }))
          })
        }).then((res) => res.json() as Promise<void>),
      catch: () => new Model.SendEmailError()
    }).pipe(
      Effect.andThen(
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.void)
        )
      ),
      Effect.catchAll((error) =>
        Effect.forEach(requests, (request) =>
          Request.completeEffect(request, Effect.fail(error))
        )
      )
    )
)
```

:::

> [!INFO]
>  Resolvers can also access the context like any other `Effect`, and there are
> many different ways to create resolvers. For further details, consider
> exploring the reference documentation for the
> [RequestResolver](https://effect-ts.github.io/effect/effect/RequestResolver.ts.html)
> module.

In this configuration:

- **GetTodosResolver** handles the fetching of multiple Todo items. It's set up as a standard resolver since we assume it cannot be batched.
- **GetUserByIdResolver** and **SendEmailResolver** are configured as batched resolvers. This setup is based on the assumption that these requests can be processed in batches, enhancing performance and reducing the number of API calls.

### Defining Queries

Now that we've set up our resolvers, we're ready to tie all the pieces together to define our queries. This step will enable us to perform data operations effectively within our application.

::: code-group

```ts [Queries.ts] twoslash include Queries
// @filename: Model.ts
// @include: Model

// @filename: Requests.ts
// @include: Requests

// @filename: Resolvers.ts
// @include: Resolvers

// @filename: Queries.ts
// ---cut---
import { Effect } from "effect"
import * as Model from "./Model"
import * as Requests from "./Requests"
import * as Resolvers from "./Resolvers"

// Defines a query to fetch all Todo items
export const getTodos: Effect.Effect<
  Array<Model.Todo>,
  Model.GetTodosError
> = Effect.request(Requests.GetTodos({}), Resolvers.GetTodosResolver)

// Defines a query to fetch a user by their ID
export const getUserById = (id: number) =>
  Effect.request(
    Requests.GetUserById({ id }),
    Resolvers.GetUserByIdResolver
  )

// Defines a query to send an email to a specific address
export const sendEmail = (address: string, text: string) =>
  Effect.request(
    Requests.SendEmail({ address, text }),
    Resolvers.SendEmailResolver
  )

// Composes getUserById and sendEmail to send an email to a specific user
export const sendEmailToUser = (id: number, message: string) =>
  getUserById(id).pipe(
    Effect.andThen((user) => sendEmail(user.email, message))
  )

// Uses getUserById to fetch the owner of a Todo and then sends them an email notification
export const notifyOwner = (todo: Model.Todo) =>
  getUserById(todo.ownerId).pipe(
    Effect.andThen((user) =>
      sendEmailToUser(user.id, `hey ${user.name} you got a todo!`)
    )
  )
```

:::

By using the `Effect.request` function, we integrate the resolvers with the request model effectively. This approach ensures that each query is optimally resolved using the appropriate resolver.

Although the code structure looks similar to earlier examples, employing resolvers significantly enhances efficiency by optimizing how requests are handled and reducing unnecessary API calls.

::: code-group

```ts [index.ts] {7} twoslash
// @filename: Queries.ts
// @include: Queries

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import * as Queries from "./Queries"

const program = Effect.gen(function* () {
  const todos = yield* Queries.getTodos
  yield* Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
    batching: true
  })
})
```

:::

In the final setup, this program will execute only **3** queries to the APIs, regardless of the number of todos. This contrasts sharply with the traditional approach, which would potentially execute **1 + 2n** queries, where **n** is the number of todos. This represents a significant improvement in efficiency, especially for applications with a high volume of data interactions.

### Disabling Batching

Batching can be locally disabled using the `Effect.withRequestBatching` utility in the following way:

::: code-group

```ts [index.ts] {9} twoslash
// @filename: Queries.ts
// @include: Queries

// @filename: index.ts
// ---cut---
import { Effect } from "effect"
import * as Queries from "./Queries"

const program = Effect.gen(function* () {
  const todos = yield* Queries.getTodos
  yield* Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
    concurrency: "unbounded"
  })
}).pipe(Effect.withRequestBatching(false))
```

:::

### Resolvers with Context

In complex applications, resolvers often need access to shared services or configurations to handle requests effectively. However, maintaining the ability to batch requests while providing the necessary context can be challenging. Here, we'll explore how to manage context in resolvers to ensure that batching capabilities are not compromised.

When creating request resolvers, it's crucial to manage the context carefully. Providing too much context or providing varying services to resolvers can make them incompatible for batching. To prevent such issues, the context for the resolver used in `Effect.request` is explicitly set to `never`. This forces developers to clearly define how the context is accessed and used within resolvers.

Consider the following example where we set up an HTTP service that the resolvers can use to execute API calls:

::: code-group

```ts [ResolversWithContext.ts] twoslash include ResolversWithContext
// @filename: Model.ts
// @include: Model

// @filename: API.ts
// @include: API

// @filename: Requests.ts
// @include: Requests

// @filename: ResolversWithContext.ts
// ---cut---
import { Effect, Context, RequestResolver } from "effect"
import * as Model from "./Model"
import * as Requests from "./Requests"

export class HttpService extends Context.Tag("HttpService")<
  HttpService,
  { fetch: typeof fetch }
>() {}

export const GetTodosResolver =
  // we create a normal resolver like we did before
  RequestResolver.fromEffect((request: Requests.GetTodos) =>
    Effect.andThen(HttpService, (http) =>
      Effect.tryPromise({
        try: () =>
          http
            .fetch("https://api.example.demo/todos")
            .then((res) => res.json() as Promise<Array<Model.Todo>>),
        catch: () => new Model.GetTodosError()
      })
    )
  ).pipe(
    // we list the tags that the resolver can access
    RequestResolver.contextFromServices(HttpService)
  )
```

:::

We can see now that the type of `GetTodosResolver` is no longer a `RequestResolver` but instead it is:

```ts
Effect<RequestResolver<GetTodos, never>, never, HttpService>
```

which is an `Effect` that access the `HttpService` and returns a composed resolver that has the minimal context ready to use.

Once we have such `Effect` we can directly use it in our query definition:

::: code-group

```ts [QueriesWithContext.ts] twoslash
// @filename: Model.ts
// @include: Model

// @filename: Requests.ts
// @include: Requests

// @filename: ResolversWithContext.ts
// @include: ResolversWithContext

// @filename: QueriesWithContext.ts
// ---cut---
import { Effect } from "effect"
import * as Model from "./Model"
import * as Requests from "./Requests"
import * as ResolversWithContext from "./ResolversWithContext"

export const getTodos = Effect.request(
  Requests.GetTodos({}),
  ResolversWithContext.GetTodosResolver
)
```

:::

We can see that the Effect correctly requires `HttpService` to be provided.

Alternatively you can create `RequestResolver`s as part of layers direcly accessing or closing over context from construction.

For example:

::: code-group

```ts [QueriesFromLayers.ts] twoslash
// @filename: API.ts
// @include: API

// @filename: Model.ts
// @include: Model

// @filename: Requests.ts
// @include: Requests

// @filename: ResolversWithContext.ts
// @include: ResolversWithContext

// @filename: QueriesFromLayers.ts
// ---cut---
import { Effect, Context, Layer, RequestResolver } from "effect"
import * as API from "./API"
import * as Model from "./Model"
import * as Requests from "./Requests"
import * as ResolversWithContext from "./ResolversWithContext"

export class TodosService extends Context.Tag("TodosService")<
  TodosService,
  {
    getTodos: Effect.Effect<Array<Model.Todo>, Model.GetTodosError>
  }
>() {}

export const TodosServiceLive = Layer.effect(
  TodosService,
  Effect.gen(function* () {
    const http = yield* ResolversWithContext.HttpService
    const resolver = RequestResolver.fromEffect(
      (request: Requests.GetTodos) =>
        Effect.tryPromise<Array<Model.Todo>, Model.GetTodosError>({
          try: () =>
            http
              .fetch("https://api.example.demo/todos")
              .then((res) => res.json()),
          catch: () => new Model.GetTodosError()
        })
    )
    return {
      getTodos: Effect.request(Requests.GetTodos({}), resolver)
    }
  })
)

export const getTodos: Effect.Effect<
  Array<Model.Todo>,
  Model.GetTodosError,
  TodosService
> = Effect.andThen(TodosService, (service) => service.getTodos)
```

:::

This way is probably the best for most of the cases given that layers are the natural primitive where to wire services together.

## Caching

While we have significantly optimized request batching, there's another area that can enhance our application's efficiency: caching. Without caching, even with optimized batch processing, the same requests could be executed multiple times, leading to unnecessary data fetching.

In the Effect library, caching is handled through built-in utilities that allow requests to be stored temporarily, preventing the need to re-fetch data that hasn't changed. This feature is crucial for reducing the load on both the server and the network, especially in applications that make frequent similar requests.

Here's how you can implement caching for the `getUserById` query:

::: code-group

```ts [Queries.ts] {9} twoslash
// @filename: Requests.ts
// @include: Requests

// @filename: Resolvers.ts
// @include: Resolvers

// @filename: Queries.ts
// ---cut---
import { Effect } from "effect"
import * as Requests from "./Requests"
import * as Resolvers from "./Resolvers"

export const getUserById = (id: number) =>
  Effect.request(
    Requests.GetUserById({ id }),
    Resolvers.GetUserByIdResolver
  ).pipe(Effect.withRequestCaching(true))
```

:::

## Final Program

Assuming you've wired everything up correctly:

::: code-group

```ts [index.ts] twoslash
// @filename: Queries.ts
// @include: Queries

// @filename: index.ts
// ---cut---
import { Effect, Schedule } from "effect"
import * as Queries from "./Queries"

const program = Effect.gen(function* () {
  const todos = yield* Queries.getTodos
  yield* Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
    concurrency: "unbounded"
  })
}).pipe(Effect.repeat(Schedule.fixed("10 seconds")))
```

:::

With this program, the `getTodos` operation retrieves the todos for each user. Then, the `Effect.forEach` function is used to notify the owner of each todo concurrently, without waiting for the notifications to complete.

The `repeat` function is applied to the entire chain of operations, and it ensures that the program repeats every 10 seconds using a fixed schedule. This means that the entire process, including fetching todos and sending notifications, will be executed repeatedly with a 10-second interval.

The program incorporates a caching mechanism, which prevents the same `GetUserById` operation from being executed more than once within a span of 1 minute. This default caching behavior helps optimize the program's execution and reduces unnecessary requests to fetch user data.

Furthermore, the program is designed to send emails in batches, allowing for efficient processing and better utilization of resources.

## Customizing Request Caching

In real-world applications, effective caching strategies can significantly improve performance by reducing redundant data fetching. The Effect library provides flexible caching mechanisms that can be tailored for specific parts of your application or applied globally.

There may be scenarios where different parts of your application have unique caching requirements—some might benefit from a localized cache, while others might need a global cache setup. Let’s explore how you can configure a custom cache to meet these varied needs.

### Creating a Custom Cache

Here's how you can create a custom cache and apply it to part of your application. This example demonstrates setting up a cache that repeats a task every 10 seconds, caching requests with specific parameters like capacity and TTL (time-to-live).

::: code-group

```ts [index.ts] twoslash
// @filename: Queries.ts
// @include: Queries

// @filename: index.ts
// ---cut---
import { Effect, Schedule, Layer, Request } from "effect"
import * as Queries from "./Queries"

const program = Effect.gen(function* () {
  const todos = yield* Queries.getTodos
  yield* Effect.forEach(todos, (todo) => Queries.notifyOwner(todo), {
    concurrency: "unbounded"
  })
}).pipe(
  Effect.repeat(Schedule.fixed("10 seconds")),
  Effect.provide(
    Layer.setRequestCache(
      Request.makeCache({ capacity: 256, timeToLive: "60 minutes" })
    )
  )
)
```

:::

### Direct Cache Application

You can also construct a cache using `Request.makeCache` and apply it directly to a specific program using `Effect.withRequestCache`. This method ensures that all requests originating from the specified program are managed through the custom cache, provided that caching is enabled.
