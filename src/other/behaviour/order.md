---
title: Order
description: Explore the Order module in Effect, which provides a powerful interface for comparing and sorting values. Learn about built-in comparators for common data types, sorting arrays, deriving custom orders, combining orders, and additional useful functions for comparisons, finding minimum/maximum, clamping values, and checking value range.
order: 2
---

# Order

The Order module provides a way to compare values and determine their order.
It defines an interface `Order<A>` which represents a single function for comparing two values of type `A`.
The function returns `-1`, `0`, or `1`, indicating whether the first value is less than, equal to, or greater than the second value.

Here's the basic structure of an `Order`:

```ts
interface Order<A> {
  (first: A, second: A): -1 | 0 | 1
}
```

## Using the Built-in Orders

The Order module comes with several built-in comparators for common data types:

- `string`: Used for comparing strings.
- `number`: Used for comparing numbers.
- `bigint`: Used for comparing big integers.
- `Date`: Used for comparing `Date`s.

Here's how you can use these comparators:

```ts twoslash
// @target: ES2020
import { Order } from "effect"

console.log(Order.string("apple", "banana"))
// Output: -1, as "apple" < "banana"
console.log(Order.number(1, 1))
// Output: 0, as 1 = 1
console.log(Order.bigint(2n, 1n))
// Output: 1, as 2n > 1n
```

## Sorting Arrays

Once you have your comparators, you can sort arrays. The Array module provides a handy function called `sort` that allows you to sort arrays without modifying the original array. Here's an example:

```ts twoslash
import { Order, Array } from "effect"

const strings = ["b", "a", "d", "c"]

const result = Array.sort(strings, Order.string)

console.log(strings)
console.log(result)
/*
Output:
[ 'b', 'a', 'd', 'c' ]
[ 'a', 'b', 'c', 'd' ]
*/
```

You can even use an `Order` as a comparator in JavaScript's native `Array.sort` method:

```ts twoslash
import { Order } from "effect"

const strings = ["b", "a", "d", "c"]

strings.sort(Order.string)

console.log(strings)
// Output: [ 'a', 'b', 'c', 'd' ]
```

Please note that when using `Array#sort`, you modify the original array. So, be cautious if you want to keep the original order. If you don't want to alter the original array, consider using `Array.sort` as shown earlier.

## Deriving Orders

Sometimes, when working with more complex data structures, you may need to create custom sorting rules.
The `Order` module allows you to do this by deriving a new `Order` from an existing one using the `Order.mapInput` function.

Imagine you have a list of `Person` objects, and you want to sort them by their names in ascending order.
To achieve this, you can create a custom `Order`.

Here's how you can do it:

```ts twoslash
import { Order, Array } from "effect"

// Define the Person interface
interface Person {
  readonly name: string
  readonly age: number
}

// Create a custom sorting rule to sort Persons by their names in ascending order
const byName = Order.mapInput(Order.string, (person: Person) => person.name)
```

In this example, we first import the necessary modules and define the `Person` interface, representing our data structure.
Next, we create a custom sorting rule called `byName` using the `mapInput` function.

The `mapInput` function takes two arguments:

1. The existing sorting rule you want to use as a base (`Order.string` in this case, for comparing strings).
2. A function that extracts the value you want to use for sorting from your data structure (`person.name` in this case).

Once you have defined your custom sorting rule, you can apply it to sort a list of `Person` objects:

```ts twoslash
import { Order, Array } from "effect"

interface Person {
  readonly name: string
  readonly age: number
}

const byName = Order.mapInput(Order.string, (person: Person) => person.name)

// ---cut---
const persons: ReadonlyArray<Person> = [
  { name: "Charlie", age: 22 },
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 }
]

// Use your custom sorting rule to sort the persons array
const sortedPersons = Array.sort(persons, byName)

console.log(sortedPersons)
/*
Output:
[
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 22 }
]
*/
```

## Combining Orders

The Order module not only handles basic comparisons but also empowers you to create intricate sorting rules. This is especially valuable when you need to sort data based on multiple criteria or properties.

The `combine*` functions in the Order module enables you to merge two or more `Order` instances, resulting in a new `Order` that incorporates the combined sorting logic. Let's walk through an example to illustrate this concept.

Imagine you have a list of people, each represented by an object with a `name` and an `age`. You want to sort this list first by name and then, for individuals with the same name, by age.

Here's how you can achieve this using the Order module:

```ts twoslash
import { Order, Array } from "effect"

// Define the structure of a person
interface Person {
  readonly name: string
  readonly age: number
}

// Create an Order to sort people by their names
const byName = Order.mapInput(Order.string, (person: Person) => person.name)

// Create an Order to sort people by their ages
const byAge = Order.mapInput(Order.number, (person: Person) => person.age)

// Combine the two Orders to create a complex sorting logic
const byNameAge = Order.combine(byName, byAge)

const result = Array.sort(
  [
    { name: "Bob", age: 20 },
    { name: "Alice", age: 18 },
    { name: "Bob", age: 18 }
  ],
  byNameAge
)

console.log(result)
/*
Output:
[
  { name: 'Alice', age: 18 }, <-- by name
  { name: 'Bob', age: 18 },   <-- by age
  { name: 'Bob', age: 20 }    <-- by age
]
*/
```

In the code above, we first create two separate `Order` instances: `byName` and `byAge`. These orders individually sort people by their names and ages, respectively.

Next, we use the `combine` function to merge these two orders into a single `byNameAge` order. This combined order first sorts people by name and then, for those with the same name, by age.

Finally, we apply this combined order to the array of people using `Array.sort`. The result is an array of people sorted according to the specified criteria.

## Additional Useful Functions

The Order module extends its functionality by providing additional functions for common operations. These functions make it easier to work with ordered values and perform various comparisons. Let's explore each of them:

### Reversing Order

The `Order.reverse` function does exactly what its name suggests; it reverses the order of comparison. If you have an `Order` that sorts values in ascending order, applying `reverse` will sort them in descending order.

```ts twoslash
import { Order } from "effect"

const ascendingOrder = Order.number
const descendingOrder = Order.reverse(ascendingOrder)

console.log(ascendingOrder(1, 3))
// Output: -1 (1 < 3 in ascending order)
console.log(descendingOrder(1, 3))
// Output: 1 (1 > 3 in descending order)
```

### Comparing Values

These functions allow you to perform simple comparisons between values:

- `lessThan`: Checks if one value is strictly less than another.
- `greaterThan`: Checks if one value is strictly greater than another.
- `lessThanOrEqualTo`: Checks if one value is less than or equal to another.
- `greaterThanOrEqualTo`: Checks if one value is greater than or equal to another.

```ts twoslash
import { Order } from "effect"

console.log(Order.lessThan(Order.number)(1, 2))
// Output: true (1 < 2)
console.log(Order.greaterThan(Order.number)(5, 3))
// Output: true (5 > 3)
console.log(Order.lessThanOrEqualTo(Order.number)(2, 2))
// Output: true (2 <= 2)
console.log(Order.greaterThanOrEqualTo(Order.number)(4, 4))
// Output: true (4 >= 4)
```

### Finding Minimum and Maximum

The `min` and `max` functions return the minimum or maximum value between two values, considering the order. These functions are particularly useful when you want to determine the smallest or largest value among multiple options.

```ts twoslash
import { Order } from "effect"

console.log(Order.min(Order.number)(3, 1))
// Output: 1 (1 is the minimum)
console.log(Order.max(Order.number)(5, 8))
// Output: 8 (8 is the maximum)
```

### Clamping Values

The `clamp` function ensures that a value stays within a specified range. It takes three arguments: the value you want to clamp, the minimum bound, and the maximum bound. If the value falls outside the range, it's adjusted to the nearest bound.

```ts twoslash
import { Order } from "effect"

const clampedValue = Order.clamp(Order.number)(10, {
  minimum: 20,
  maximum: 30
})

console.log(clampedValue)
// Output: 20 (10 is clamped to the nearest bound, which is 20)
```

### Checking Value Range

The `between` function checks if a value falls within a specified range, inclusively. It takes three arguments: the value you want to check, the minimum bound, and the maximum bound.

```ts twoslash
import { Order } from "effect"

console.log(Order.between(Order.number)(15, { minimum: 10, maximum: 20 }))
// Output: true (15 is within the range [10, 20])
console.log(Order.between(Order.number)(5, { minimum: 10, maximum: 20 }))
// Output: false (5 is outside the range [10, 20])
```
