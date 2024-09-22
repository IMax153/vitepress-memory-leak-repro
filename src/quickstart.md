---
title: Quickstart
description: Learn how to set up a new Effect project from scratch in TypeScript, covering Node.js, Deno, Bun, and Vite + React environments. Follow step-by-step instructions for each platform to create a basic program using the Effect library.
order: 2
---

In this tutorial, we will guide you through the process of setting up a new Effect project from scratch using plain **TypeScript 5.4 or newer**.

::: tabs

== Node.js

Follow these steps to create a new Effect project for **Node.js**:

1. As a first step, create a project directory and navigate into it:

   ```bash
   mkdir hello-effect
   cd hello-effect
   ```

2. Next, initialize a TypeScript project using npm (make sure you have TypeScript 5.0 or newer):

   ```bash
   npm init -y
   npm install typescript --save-dev
   ```

   This creates a `package.json` file with an initial setup for your TypeScript project.

3. Now, initialize TypeScript:

   ```bash
   npx tsc --init
   ```

   When running this command, it will generate a `tsconfig.json` file that contains configuration options for TypeScript. One of the most important options to consider is the `strict` flag.

   Make sure to open the `tsconfig.json` file and verify that the value of the `strict` option is set to `true`.

   ```json
   {
     "compilerOptions": {
       "strict": true
     }
   }
   ```

4. Then, install the necessary package as dependency:

   ```bash
   npm install effect
   ```

   This package will provide the foundational functionality for your Effect project.

Let's write and run a simple program to ensure that everything is set up correctly.

In your terminal, execute the following commands:

```bash
mkdir src
touch src/index.ts
```

Open the `index.ts` file and add the following code:

```ts
import { Effect, Console } from "effect"

const program = Console.log("Hello, World!")

Effect.runSync(program)
```

Run the `index.ts` file. Here we are using [tsx](https://github.com/privatenumber/tsx) to run the `index.ts` file in the terminal:

```bash
npx tsx src/index.ts
```

You should see the message `"Hello, World!"` printed. This confirms that the program is working correctly.

== Deno

Follow these steps to create a new Effect project for **Deno**:

1. As a first step, create a project directory and navigate into it:

   ```bash
   mkdir hello-effect
   cd hello-effect
   ```

2. Next, initialize Deno:

   ```bash
   deno init
   ```

Let's write and run a simple program to ensure that everything is set up correctly.

Open the `main.ts` file and replace the content with the following code:

```ts
import { Effect, Console } from "npm:effect"

const program = Console.log("Hello, World!")

Effect.runSync(program)
```

Run the `main.ts` file:

```bash
deno run main.ts
```

You should see the message `"Hello, World!"` printed. This confirms that the program is working correctly.

== Bun

Follow these steps to create a new Effect project for **Bun**:

1. As a first step, create a project directory and navigate into it:

   ```bash
   mkdir hello-effect
   cd hello-effect
   ```

2. Next, initialize Bun:

   ```bash
   bun init
   ```

   When running this command, it will generate a `tsconfig.json` file that contains configuration options for TypeScript. One of the most important options to consider is the `strict` flag.

   Make sure to open the `tsconfig.json` file and verify that the value of the `strict` option is set to `true`.

   ```json
   {
     "compilerOptions": {
       "strict": true
     }
   }
   ```

3. Then, install the necessary package as dependency:

   ```bash
   bun add effect
   ```

   This package will provide the foundational functionality for your Effect project.

Let's write and run a simple program to ensure that everything is set up correctly.

Open the `index.ts` file and replace the content with the following code:

```ts
import { Effect, Console } from "effect"

const program = Console.log("Hello, World!")

Effect.runSync(program)
```

Run the `index.ts` file:

```bash
bun index.ts
```

You should see the message `"Hello, World!"` printed. This confirms that the program is working correctly.

== Vite + React

Follow these steps to create a new Effect project for **Vite + React**:

1. Scaffold your Vite project, open your terminal and run the following command:

   ```bash
   # npm 6.x // [!=npm npm]
   npm create vite@latest hello-effect --template react-ts // [!=npm npm]
   # npm 7+, extra double-dash is needed: // [!=npm npm]
   npm create vite@latest hello-effect -- --template react-ts // [!=npm npm]
   yarn create vite@latest hello-effect -- --template react-ts // [!=npm yarn]
   pnpm create vite@latest hello-effect -- --template react-ts // [!=npm pnpm]
   bun create vite@latest hello-effect -- --template react-ts // [!=npm bun]
   ```

   This command will create a new Vite project with React and TypeScript template.

2. Navigate into the newly created project directory and install the required packages:

   ```bash
   cd hello-effect
   npm install // [!=npm auto]
   ```

   Once the packages are installed, open the `tsconfig.json` file and ensure that the value of the `strict` option is set to true.

   ```json
   {
     "compilerOptions": {
       "strict": true
     }
   }
   ```

3. Then, install the necessary `effect` package as a dependency:

   ```bash
   npm install effect // [!=npm npm]
   yarn add effect // [!=npm yarn]
   pnpm add effect // [!=npm pnpm]
   bun add effect // [!=npm bun]
   ```

   The `effect` package will provide the foundational functionality for your Effect project.

Now, let's write and run a simple program to ensure that everything is set up correctly.

Open the `src/App.tsx` file and replace its content with the following code:

```tsx {1,5,10-16,30}
import { useState, useMemo, useCallback } from "react"
import reactLogo from "./assets/react.svg"
import viteLogo from "/vite.svg"
import "./App.css"
import { Effect } from "effect"

function App() {
  const [count, setCount] = useState(0)

  // Effect<void>
  const task = useMemo(
    () => Effect.sync(() => setCount((current) => current + 1)),
    [setCount]
  )

  const increment = useCallback(() => Effect.runSync(task), [task])

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={increment}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
```

After making these changes, start the development server by running the following command:

```bash
npm run dev // [!=npm npm]
yarn add dev // [!=npm yarn]
pnpm run dev // [!=npm pnpm]
bun run dev // [!=npm bun]
```

Then, press **o** to open the application in your browser.

When you click the button, you should see the counter increment. This confirms that the program is working correctly.

:::
