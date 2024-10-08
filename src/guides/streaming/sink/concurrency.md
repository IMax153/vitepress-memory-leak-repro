---
title: Concurrency
excerpt: Explore concurrency with operations like `Sink.zip` for combining results and `Sink.race` for racing sinks. Learn how to run multiple sinks concurrently, combining or selecting the first to complete. Enhance task performance by executing operations simultaneously.
order: 3
---

# Stream Concurrency

In this section, we'll explore parallel operations that allow you to run multiple sinks concurrently. These operations can be quite useful when you need to perform tasks simultaneously.

## Combining Results - Zipping Concurrently

When you want to run two sinks concurrently and combine their results, you can use `Sink.zip`. This operation runs both sinks concurrently and combines their outcomes into a tuple:

```ts twoslash
import { Sink, Console, Stream, Schedule, Effect } from "effect"

const s1 = Sink.forEach((s: string) => Console.log(`sink 1: ${s}`)).pipe(
  Sink.as(1)
)

const s2 = Sink.forEach((s: string) => Console.log(`sink 2: ${s}`)).pipe(
  Sink.as(2)
)

const sink = s1.pipe(Sink.zip(s2, { concurrent: true }))

Effect.runPromise(
  Stream.make("1", "2", "3", "4", "5").pipe(
    Stream.schedule(Schedule.spaced("10 millis")),
    Stream.run(sink)
  )
).then(console.log)
/*
Output:
sink 1: 1
sink 2: 1
sink 1: 2
sink 2: 2
sink 1: 3
sink 2: 3
sink 1: 4
sink 2: 4
sink 1: 5
sink 2: 5
[ 1, 2 ]
*/
```

## Racing: First One Wins

Another useful operation is `Sink.race`, which lets you race multiple sinks concurrently. The sink that completes first will provide the result for your program:

```ts twoslash
import { Sink, Console, Stream, Schedule, Effect } from "effect"

const s1 = Sink.forEach((s: string) => Console.log(`sink 1: ${s}`)).pipe(
  Sink.as(1)
)

const s2 = Sink.forEach((s: string) => Console.log(`sink 2: ${s}`)).pipe(
  Sink.as(2)
)

const sink = s1.pipe(Sink.race(s2))

Effect.runPromise(
  Stream.make("1", "2", "3", "4", "5").pipe(
    Stream.schedule(Schedule.spaced("10 millis")),
    Stream.run(sink)
  )
).then(console.log)
/*
Output:
sink 1: 1
sink 2: 1
sink 1: 2
sink 2: 2
sink 1: 3
sink 2: 3
sink 1: 4
sink 2: 4
sink 1: 5
sink 2: 5
1
*/
```
