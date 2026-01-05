# Project Principles

- **Language**: Use TypeScript as the primary language.
- **Framework**: Use Koa for the HTTP server.
- **Package Manager**: Use `pnpm`.
- **Runtime Management**: Use `mise`.
- **Formatting & Linting**: Use [Biome](https://biomejs.dev/). 2 space tabs, max width 120, semicolons only when needed.
- **Simplicity**: Prioritize concise and readable code. Avoid over-engineering; if a task can be accomplished in fewer lines without sacrificing clarity, do so.
- **Modularity and Readability**: Ensure that every variable, function, and file is focused and easy to understand. If a component becomes too complex to reason about, break it down.
- **Naming Conventions**: Use clear, descriptive, and concise names for all identifiers. Names should accurately reflect the purpose or content of the entity.
- **Error Handling**: Use robust error handling, ensuring errors are caught and logged or returned appropriately.
- **Testing**: Write unit tests for critical logic to ensure reliability and facilitate refactoring.
- **Execution**: Provide commands for the user to run instead of executing them directly.
