use near_sdk::json_types::U128;
use near_sdk::{env,ext_contract,near,require,AccountId,Gas,NearToken,PanicOnDefault,PromiseOrValue};
use std::collections::BTreeMap;

#[ext_contract(ext_receiver)]
trait Receiver { fn ft_on_transfer(&mut self,sender_id:AccountId,amount:U128,msg:String)->PromiseOrValue<U128>; }
#[ext_contract(ext_self)]
trait Resolve { fn resolve(&mut self,sender_id:AccountId,receiver_id:AccountId,amount:U128)->U128; }
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct TestToken { owner:AccountId, balances:BTreeMap<AccountId,u128> }
#[near]
impl TestToken {
  #[init] pub fn new(owner:AccountId)->Self{Self{owner,balances:BTreeMap::new()}}
  pub fn mint(&mut self,receiver_id:AccountId,amount:U128){require!(env::predecessor_account_id()==self.owner,"owner only");*self.balances.entry(receiver_id).or_default()+=amount.0;}
  pub fn ft_balance_of(&self,account_id:AccountId)->U128{U128(*self.balances.get(&account_id).unwrap_or(&0))}
  #[payable] pub fn ft_transfer(&mut self,receiver_id:AccountId,amount:U128,memo:Option<String>){require!(env::attached_deposit()==NearToken::from_yoctonear(1),"1 yoctoNEAR required");let _=memo;self.transfer(&env::predecessor_account_id(),&receiver_id,amount.0);}
  #[payable] pub fn ft_transfer_call(&mut self,receiver_id:AccountId,amount:U128,_memo:Option<String>,msg:String)->PromiseOrValue<U128>{require!(env::attached_deposit()==NearToken::from_yoctonear(1),"1 yoctoNEAR required");let sender_id=env::predecessor_account_id();self.transfer(&sender_id,&receiver_id,amount.0);let p=ext_receiver::ext(receiver_id.clone()).with_static_gas(Gas::from_tgas(35)).ft_on_transfer(sender_id.clone(),amount,msg).then(ext_self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(20)).resolve(sender_id,receiver_id,amount));PromiseOrValue::Promise(p)}
  #[private] pub fn resolve(&mut self,sender_id:AccountId,receiver_id:AccountId,amount:U128)->U128{let unused=match env::promise_result_checked(0,10_000){Ok(bytes)=>near_sdk::serde_json::from_slice::<U128>(&bytes).map(|x|x.0).unwrap_or(amount.0),Err(_)=>amount.0};let refund=unused.min(amount.0).min(self.balances.get(&receiver_id).copied().unwrap_or(0));if refund>0{self.transfer(&receiver_id,&sender_id,refund);}U128(amount.0-refund)}
  fn transfer(&mut self,sender:&AccountId,receiver:&AccountId,amount:u128){require!(amount>0,"zero transfer");let balance=self.balances.get(sender).copied().unwrap_or(0);require!(balance>=amount,"insufficient token balance");self.balances.insert(sender.clone(),balance-amount);*self.balances.entry(receiver.clone()).or_default()+=amount;}
}
