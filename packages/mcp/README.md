# Kuroko MCP

Read-only tools for agents. `get_vault_state` reads `state` from the configured NEAR testnet contract through live RPC. `get_listen_stats` reads the running local solver's live `/stats` response. Both return explicit errors when setup is absent.

Run from the repository root:

```sh
VAULT_ACCOUNT=<deployed-testnet-vault> pnpm --filter @kuroko/mcp start
```

Set `SOLVER_API` only when the local solver listens at a different URL. No key is passed to the MCP server. It cannot submit quotes, sign transactions, deposit, or withdraw.
