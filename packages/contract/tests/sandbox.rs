//! Every assertion here runs as a signed transaction on a real local nearcore sandbox.
//! Build the WASM with `cargo near build non-reproducible-wasm --no-abi` first.
use near_workspaces::{network::Sandbox, Account, Contract, Worker};
use serde_json::{json, Value};

const WASM: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/target/near/kuroko_vault.wasm");

async fn setup() -> Result<(Worker<Sandbox>, Contract, Account, Account), Box<dyn std::error::Error>> {
    let worker = near_workspaces::sandbox().await?;
    let deployer = worker.dev_create_account().await?;
    let usdc = worker.dev_create_account().await?;
    let operator = worker.dev_create_account().await?;
    let wasm = std::fs::read(WASM)?;
    let vault = deployer.deploy(&wasm).await?.into_result()?;
    deployer.call(vault.id(), "new").args_json(json!({
        "usdc":usdc.id(), "operator":operator.id(),
        "constitution":{"allowed_pairs":["nep141:usdc/nep141:wnear"],"max_inventory_usdc":"1000","min_spread_bps":30,"daily_loss_limit_usdc":"100"}
    })).transact().await?.into_result()?;
    Ok((worker,vault,usdc,operator))
}

#[tokio::test]
async fn rejects_foreign_token_and_unauthorized_loss() -> Result<(), Box<dyn std::error::Error>> {
    let (worker,vault,_usdc,_operator)=setup().await?;
    let attacker=worker.dev_create_account().await?;
    let deposit=attacker.call(vault.id(),"ft_on_transfer").args_json(json!({"sender_id":attacker.id(),"amount":"100","msg":""})).transact().await?;
    assert!(deposit.is_failure(),"foreign NEP-141 caller must be rejected on-chain");
    let loss=attacker.call(vault.id(),"record_loss").args_json(json!({"amount_usdc":"100"})).transact().await?;
    assert!(loss.is_failure(),"untrusted caller cannot report loss");
    let withdrawal=attacker.call(vault.id(),"withdraw").args_json(json!({"shares":"1"})).transact().await?;
    assert!(withdrawal.is_failure(),"non-shareholder cannot withdraw");
    Ok(())
}

#[tokio::test]
async fn constitution_checks_and_loss_pause_on_chain() -> Result<(), Box<dyn std::error::Error>> {
    let (_worker,vault,_usdc,operator)=setup().await?;
    async fn allowed(v:&Contract,pair:&str,amount:&str,spread:u16)->Result<bool,Box<dyn std::error::Error>>{
        Ok(v.view("check_trade").args_json(json!({"pair":pair,"inventory_usdc":amount,"spread_bps":spread})).await?.json()?)
    }
    assert!(allowed(&vault,"nep141:usdc/nep141:wnear","1000",30).await?);
    assert!(!allowed(&vault,"nep141:wnear/nep141:usdc","1000",30).await?);
    assert!(!allowed(&vault,"nep141:usdc/nep141:wnear","1001",30).await?);
    assert!(!allowed(&vault,"nep141:usdc/nep141:wnear","1000",29).await?);
    operator.call(vault.id(),"record_loss").args_json(json!({"amount_usdc":"100"})).transact().await?.into_result()?;
    let state:Value=vault.view("state").await?.json()?;
    assert_eq!(state["paused"],true);
    assert!(!allowed(&vault,"nep141:usdc/nep141:wnear","100",30).await?);
    Ok(())
}
