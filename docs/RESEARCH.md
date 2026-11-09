# Kuroko protocol research — 2026-11-09

## Relay and settlement

- [Market-maker quickstart](https://docs.near-intents.org/integration/market-makers/quickstart): the mainnet Message Bus is `wss://solver-relay-v2.chaindefuser.com/ws`; it requires a Partner JWT obtained through [the partner portal](https://partners.near-intents.org/) after KYC/KYB. The WebSocket request carries `Authorization: Bearer <PARTNER_JWT>`. An anonymous connection on 2026-11-09 failed to open (WebSocket close 1006). The [HTTP relay API](https://docs.near-intents.org/integration/market-makers/message-bus/rpc) separately uses `X-API-Key`.
- [WebSocket reference](https://docs.near-intents.org/integration/market-makers/message-bus/websocket): JSON-RPC `subscribe` for `quote` with `tokens_in` and `tokens_out`, and `quote_status`. A quote event has `quote_id`, asset identifiers, one exact amount, and `min_deadline_ms`.
- [Example solver guide](https://docs.near-intents.org/integration/market-makers/example) and [official sample source](https://github.com/defuse-protocol/near-intents-amm-solver): constant-product pricing, inventory read from `intents.near`, and `quote_response` containing `quote_id`, `quote_output`, and `signed_data`. `signed_data` uses NEP-413: JSON `token_diff` intent, base64 32-byte nonce, `intents.near` recipient, Ed25519 signature over SHA-256 of NEP-413 prefix and Borsh payload. The relay matches intents; settlement is on `intents.near`.
- The sample repository's checked-out `websocket-connection.service.ts` opens a socket without its newer documented `Authorization` header. The current documentation takes precedence. The sample README calls `RELAY_AUTH_KEY` unused, which is also stale relative to the docs.
- [Rhea lending solver](https://github.com/rhea-finance/lending-near-intents-solver-golang): an alternative `NO_LIQUIDITY` escrow-solving path; it waits for `metadata.swap_hash`, borrows, deposits into `intents.near`, and only then sends the final signed quote. It explicitly requires a solver auth token. This is a useful pattern for delayed inventory but is not suitable for an unfunded demonstration.
- [NEAR Intents quickstart](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/introduction): no Intents testnet. Mainnet activity needs actual funded balances. 1Click `dry: true` can obtain quotes without executing swaps.

## Custody boundary

NEAR function-call keys authorize on-chain method calls; the Message Bus expects an *off-chain signature*. A function-call key alone cannot make an on-chain contract sign a NEP-413 quote. If a separate Ed25519 key is registered on `intents.near` for the solver account, that key can sign any intent for that account without invoking the vault, so the vault cannot enforce its constitution against that key. Kuroko must not put depositor funds into that signer account until a verified custody design (for example an audited constrained solver-pool/TEE integration) exists. The contract in this repository enforces its own ledger and governance, not arbitrary Intents settlement. No permissionless mainnet vault deployment is claimed.

## Status

The required Partner JWT and funded mainnet account are absent. Relay capture, signing against live captured messages, inventory rebalancing, and winning a fill are blocked. See [BLOCKED.md](../BLOCKED.md). No relay fixtures or revenue have been invented.
