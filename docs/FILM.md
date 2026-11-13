# Demo film (Nov 13, 2026)

`videos/kuroko-near/kuroko-near-film.mp4` (1080p, 2:18) and `kuroko-near-film-share.mp4` (720p, 5.4 MB), outside
this repo. One continuous take of the app in headless Chrome (CDP screencast), Kokoro bf_emma narration, no subtitles.
The app was the `--mode qa` build; the repo's QA signer signed with the demo account `kuroko-lp-346fc6f5.testnet`.

| Action in the film | Transaction (NEAR testnet) |
| --- | --- |
| Deposit 0.25 USDC into Kuroko Core | [6dnDxj4Ajw1C1nanvkdGfv6Db68WBwh9uKYpsBLQjitU](https://testnet.nearblocks.io/txns/6dnDxj4Ajw1C1nanvkdGfv6Db68WBwh9uKYpsBLQjitU) |
| Withdraw the 0.25 minted shares | [BDtxoJNeAVFLL4T22eQq7YXT3yqMQvzFEyt6JFoaBdXL](https://testnet.nearblocks.io/txns/BDtxoJNeAVFLL4T22eQq7YXT3yqMQvzFEyt6JFoaBdXL) |

Earlier takes that night are kept in the film ledger with their outcomes: v3's deposit
[CHHYJ5jb…](https://testnet.nearblocks.io/txns/CHHYJ5jbJkQnpt8ojHW4G6uMA4tPEbDGG5CXD2zKXb4c) and withdrawal
[5CNhPQRv…](https://testnet.nearblocks.io/txns/5CNhPQRvn6eYu8SynDoTXk2wvbKyDnUnTnGkWCHh7oqE); three takes that hit
RPC rate limits (one deposit sent but unconfirmed in the app, two withdrawals dropped because near-api-js reused a
cached nonce) were reconciled by script so the demo account ended where it started. Those failures led to the QA
signer fixes (fresh nonce, retry the same signed bytes, read fallbacks). Total film gas: 0.0089 test NEAR.
