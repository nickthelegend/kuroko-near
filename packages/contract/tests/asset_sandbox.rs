//! NEP-141 transfers and share accounting on a real local nearcore sandbox.
//! Build both WASM contracts before this test.
use near_workspaces::types::{Gas,NearToken};
use serde_json::{json,Value};

const VAULT_WASM:&str=concat!(env!("CARGO_MANIFEST_DIR"),"/target/near/kuroko_vault.wasm");
const TOKEN_WASM:&str=concat!(env!("CARGO_MANIFEST_DIR"),"/fixture-token/target/near/kuroko_test_token.wasm");
fn wasm(path:&str)->Vec<u8>{std::fs::read(path).unwrap_or_else(|e|panic!("build {path} before sandbox tests: {e}"))}

#[tokio::test]
async fn deposits_mint_shares_and_withdrawals_return_real_tokens()->Result<(),Box<dyn std::error::Error>>{
 let worker=near_workspaces::sandbox().await?;
 let operator=worker.dev_create_account().await?;
 let alice=worker.dev_create_account().await?;
 let bob=worker.dev_create_account().await?;
 let vault=worker.dev_create_account().await?.deploy(&wasm(VAULT_WASM)).await?.into_result()?;
 let token=worker.dev_create_account().await?.deploy(&wasm(TOKEN_WASM)).await?.into_result()?;
 token.as_account().call(token.id(),"new").args_json(json!({"owner":operator.id()})).transact().await?.into_result()?;
 vault.as_account().call(vault.id(),"new").args_json(json!({"usdc":token.id(),"operator":operator.id(),"constitution":{"allowed_pairs":["usdc/wnear"],"max_inventory_usdc":"10000000","min_spread_bps":30,"daily_loss_limit_usdc":"1000000"}})).transact().await?.into_result()?;
 for owner in [&alice,&bob]{operator.call(token.id(),"mint").args_json(json!({"receiver_id":owner.id(),"amount":"10000000"})).transact().await?.into_result()?;}
 let forged=alice.call(vault.id(),"ft_on_transfer").args_json(json!({"sender_id":alice.id(),"amount":"1000000","msg":""})).transact().await?;
 assert!(forged.is_failure(),"direct forged deposit must fail on chain");
 for owner in [&alice,&bob]{let tx=owner.call(token.id(),"ft_transfer_call").args_json(json!({"receiver_id":vault.id(),"amount":"2000000","memo":null,"msg":""})).deposit(NearToken::from_yoctonear(1)).gas(Gas::from_tgas(100)).transact().await?;tx.into_result()?;}
 let state:Value=vault.view("state").await?.json()?;
 assert_eq!(state["usdc_balance"],"4000000");assert_eq!(state["total_shares"],"4000000");
 let shares:Value=vault.view("shares_of").args_json(json!({"account_id":alice.id()})).await?.json()?;assert_eq!(shares,"2000000");
 alice.call(vault.id(),"withdraw").args_json(json!({"shares":"1000000"})).gas(Gas::from_tgas(100)).transact().await?.into_result()?;
 let state:Value=vault.view("state").await?.json()?;assert_eq!(state["usdc_balance"],"3000000");assert_eq!(state["total_shares"],"3000000");
 let alice_balance:Value=token.view("ft_balance_of").args_json(json!({"account_id":alice.id()})).await?.json()?;assert_eq!(alice_balance,"9000000");
 let vault_balance:Value=token.view("ft_balance_of").args_json(json!({"account_id":vault.id()})).await?.json()?;assert_eq!(vault_balance,"3000000");
 Ok(())
}
