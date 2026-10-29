This is a private Discord bot used exclusively in the Vencord Discord server

## Tooling

- Always use pnpm, not npm
- Verify changes by running `pnpm build` and `pnpm test`, or more specific package.json scripts. Never start the bot

## Style

- Write clean, simple code:
  - Only add abstractions when they provide clear value. Don't future-proof prematurely
  - Only handle cases that are relevant. Don't over-engineer for hypothetical edge-cases
- Before adding common logic, search the codebase (especially the util folder) for existing implementations that can be reused. If one exists but isn't exported, extract it into a util.
- Don't add comments unless they provide valuable context or explanation that isn't immediately clear. This includes jsdoc. Use single line style comments.
- Always prefer functions or plain objects over classes
