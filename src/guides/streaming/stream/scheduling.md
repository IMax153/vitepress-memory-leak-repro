---
title: Scheduling
description: Introduce specific time intervals between stream element emissions with `Stream.schedule`. Learn to create structured pauses using scheduling combinators for precise control over stream timing.
order: 6
---

# Scheduling Streams

## schedule

When working with streams, you might need to introduce specific time intervals between each emission of stream elements. This can be achieved using the `Stream.schedule` combinator.

```ts twoslash
import { Stream, Schedule, Console, Effect } from "effect"

const stream = Stream.make(1, 2, 3, 4, 5).pipe(
  Stream.schedule(Schedule.spaced("1 second")),
  Stream.tap(Console.log)
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
/*
Output:
1
2
3
4
5
{
  _id: "Chunk",
  values: [ 1, 2, 3, 4, 5 ]
}
*/
```

In this example, we've used the `Schedule.spaced("1 second")` schedule to introduce a one-second gap between each emission in the stream.
