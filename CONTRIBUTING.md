# Contributing

Small, test-backed changes are welcome.

## Development checks

```bash
corepack pnpm@10.15.1 install
corepack pnpm@10.15.1 test
corepack pnpm@10.15.1 typecheck
corepack pnpm@10.15.1 build
```

## Project rules

- Do not commit imported books, reading records, private screenshots, tokens, deployment IDs, or cloud object keys.
- Keep D1 metadata and private R2 source storage as separate layers unless a proposal explains the migration and privacy impact.
- Treat the MCP tool result, UI resource, host mount, and real-device interaction as separate acceptance layers.
- Browser success does not prove iPhone or iPad success.
- Preserve existing UI resource aliases when changing the active resource identity.
- Use original or public-domain text for tests and demos.

For UI changes, include desktop and mobile evidence. For MCP changes, include descriptor, tool result, and resource tests.
