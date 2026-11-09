use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, ext_contract, near, require, AccountId, Gas, NearToken, PanicOnDefault, PromiseOrValue};
use std::collections::BTreeMap;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Constitution {
    pub allowed_pairs: Vec<String>,
    pub max_inventory_usdc: U128,
    pub min_spread_bps: u16,
    pub daily_loss_limit_usdc: U128,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Proposal {
    pub id: u64,
    pub constitution: Constitution,
    pub yes: U128,
    pub no: U128,
    pub snapshot_shares: U128,
    pub closes_at_ms: u64,
    pub executed: bool,
    pub voters: Vec<AccountId>,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct VaultState {
    pub total_shares: U128,
    pub usdc_balance: U128,
    pub paused: bool,
    pub daily_loss_usdc: U128,
    pub loss_day: u64,
    pub constitution: Constitution,
}

#[ext_contract(ext_ft)]
trait FungibleToken { fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>); }
#[ext_contract(ext_self)]
trait SelfCallbacks { fn on_withdraw(&mut self, account_id: AccountId, shares: U128, amount: U128); }

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct KurokoVault {
    usdc: AccountId,
    operator: AccountId,
    shares: BTreeMap<AccountId, u128>,
    total_shares: u128,
    cash: u128,
    constitution: Constitution,
    proposals: Vec<Proposal>,
    paused: bool,
    daily_loss: u128,
    loss_day: u64,
}

#[near]
impl KurokoVault {
    #[init]
    pub fn new(usdc: AccountId, operator: AccountId, constitution: Constitution) -> Self {
        require!(constitution.min_spread_bps < 10_000, "invalid spread");
        require!(constitution.daily_loss_limit_usdc.0 > 0, "invalid daily limit");
        Self { usdc, operator, shares: BTreeMap::new(), total_shares: 0, cash: 0, constitution, proposals: vec![], paused: false, daily_loss: 0, loss_day: 0 }
    }

    pub fn state(&self) -> VaultState {
        VaultState { total_shares: U128(self.total_shares), usdc_balance: U128(self.cash), paused: self.paused, daily_loss_usdc: U128(self.daily_loss), loss_day: self.loss_day, constitution: self.constitution.clone() }
    }
    pub fn shares_of(&self, account_id: AccountId) -> U128 { U128(*self.shares.get(&account_id).unwrap_or(&0)) }
    pub fn proposals(&self) -> Vec<Proposal> { self.proposals.clone() }

    // NEP-141 receiver. The caller must be the configured token contract.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128> {
        let _ = msg;
        require!(env::predecessor_account_id() == self.usdc, "USDC token only");
        require!(!self.paused, "vault paused");
        require!(!self.has_open_vote(), "deposit locked during vote");
        require!(amount.0 > 0, "zero deposit");
        let minted = if self.total_shares == 0 { amount.0 } else { amount.0.checked_mul(self.total_shares).expect("share overflow") / self.cash };
        require!(minted > 0, "deposit too small");
        self.cash = self.cash.checked_add(amount.0).expect("cash overflow");
        self.total_shares = self.total_shares.checked_add(minted).expect("shares overflow");
        *self.shares.entry(sender_id).or_default() += minted;
        PromiseOrValue::Value(U128(0))
    }

    pub fn withdraw(&mut self, shares: U128) -> PromiseOrValue<U128> {
        require!(shares.0 > 0, "zero shares");
        require!(!self.has_open_vote(), "withdrawal locked during vote");
        let owner = env::predecessor_account_id();
        let owned = self.shares.get(&owner).copied().unwrap_or(0);
        require!(owned >= shares.0, "insufficient shares");
        let amount = shares.0.checked_mul(self.cash).expect("withdraw overflow") / self.total_shares;
        require!(amount > 0, "withdrawal too small");
        self.shares.insert(owner.clone(), owned - shares.0);
        self.total_shares -= shares.0;
        self.cash -= amount;
        let promise = ext_ft::ext(self.usdc.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(Gas::from_tgas(20))
            .ft_transfer(owner.clone(), U128(amount), Some("Kuroko withdrawal".to_string()))
            .then(ext_self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(20)).on_withdraw(owner, shares, U128(amount)));
        PromiseOrValue::Promise(promise)
    }

    #[private]
    pub fn on_withdraw(&mut self, account_id: AccountId, shares: U128, amount: U128) {
        if env::promise_result_checked(0, 10_000).is_err() {
            *self.shares.entry(account_id).or_default() += shares.0;
            self.total_shares += shares.0;
            self.cash += amount.0;
        }
    }

    pub fn propose(&mut self, constitution: Constitution) -> u64 {
        let voter = env::predecessor_account_id();
        require!(self.shares.get(&voter).copied().unwrap_or(0) > 0, "shareholder only");
        require!(!self.has_open_vote(), "vote already open");
        require!(constitution.min_spread_bps < 10_000 && constitution.daily_loss_limit_usdc.0 > 0, "invalid constitution");
        let id = self.proposals.len() as u64;
        self.proposals.push(Proposal { id, constitution, yes: U128(0), no: U128(0), snapshot_shares: U128(self.total_shares), closes_at_ms: env::block_timestamp_ms() + 86_400_000, executed: false, voters: vec![] });
        id
    }
    pub fn vote(&mut self, id: u64, yes: bool) {
        let voter = env::predecessor_account_id();
        let weight = self.shares.get(&voter).copied().unwrap_or(0);
        require!(weight > 0, "shareholder only");
        let p = self.proposals.get_mut(id as usize).expect("unknown proposal");
        require!(!p.executed && env::block_timestamp_ms() < p.closes_at_ms, "vote closed");
        require!(!p.voters.contains(&voter), "already voted");
        p.voters.push(voter);
        if yes { p.yes.0 += weight; } else { p.no.0 += weight; }
    }
    pub fn execute(&mut self, id: u64) {
        let p = self.proposals.get_mut(id as usize).expect("unknown proposal");
        require!(!p.executed && env::block_timestamp_ms() >= p.closes_at_ms, "vote open or executed");
        p.executed = true;
        if p.yes.0 > p.no.0 && p.yes.0 > p.snapshot_shares.0 / 2 { self.constitution = p.constitution.clone(); }
    }

    // This checks a proposed trade but does not grant an off-chain signing capability.
    pub fn check_trade(&self, pair: String, inventory_usdc: U128, spread_bps: u16) -> bool {
        !self.paused && self.constitution.allowed_pairs.contains(&pair) && inventory_usdc.0 <= self.constitution.max_inventory_usdc.0 && spread_bps >= self.constitution.min_spread_bps
    }
    // Operator observations are advisory until an authenticated settlement proof is integrated.
    pub fn record_loss(&mut self, amount_usdc: U128) {
        require!(env::predecessor_account_id() == self.operator, "operator only");
        let day = env::block_timestamp_ms() / 86_400_000;
        if day != self.loss_day { self.loss_day = day; self.daily_loss = 0; }
        self.daily_loss = self.daily_loss.checked_add(amount_usdc.0).expect("loss overflow");
        if self.daily_loss >= self.constitution.daily_loss_limit_usdc.0 { self.paused = true; }
    }
    fn has_open_vote(&self) -> bool {
        self.proposals.iter().any(|p| !p.executed && env::block_timestamp_ms() < p.closes_at_ms)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;
    fn id(s: &str) -> AccountId { s.parse().unwrap() }
    fn context(caller: &str) { let mut b=VMContextBuilder::new(); b.predecessor_account_id(id(caller)); b.current_account_id(id("vault.testnet")); testing_env!(b.build()); }
    fn vault() -> KurokoVault {
        context("owner.testnet");
        KurokoVault::new(id("usdc.testnet"),id("operator.testnet"),Constitution { allowed_pairs:vec!["a/b".into()],max_inventory_usdc:U128(1000),min_spread_bps:30,daily_loss_limit_usdc:U128(100) })
    }
    #[test]
    fn shares_mint_at_cash_nav() {
        let mut v=vault(); context("usdc.testnet");
        v.ft_on_transfer(id("alice.testnet"),U128(100),String::new());
        v.ft_on_transfer(id("bob.testnet"),U128(50),String::new());
        assert_eq!(v.shares_of(id("alice.testnet")).0,100);
        assert_eq!(v.shares_of(id("bob.testnet")).0,50);
        assert_eq!(v.state().usdc_balance.0,150);
    }
    #[test]
    fn withdrawal_burns_proportionate_shares() {
        let mut v=vault(); context("usdc.testnet");
        v.ft_on_transfer(id("alice.testnet"),U128(100),String::new());
        context("alice.testnet"); v.withdraw(U128(40));
        assert_eq!(v.shares_of(id("alice.testnet")).0,60);
        assert_eq!(v.state().usdc_balance.0,60);
    }
    #[test]
    fn voting_weight_cannot_be_reused() {
        let mut v=vault(); context("usdc.testnet");
        v.ft_on_transfer(id("alice.testnet"),U128(100),String::new());
        context("alice.testnet");
        let p=v.propose(v.constitution.clone());
        v.vote(p,true);
        assert_eq!(v.proposals()[0].yes.0,100);
    }
}
