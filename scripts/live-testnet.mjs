// Real NEAR testnet run: a vault on Circle's testnet USDC, one depositor, one deposit and one withdrawal.
// Every step is a signed testnet transaction; nothing is simulated. Keys are written to the gitignored
// .near-credentials/ folder and are never printed.
//
//   node scripts/live-testnet.mjs            create accounts (helper), deploy, swap, deposit, withdraw
//   KUROKO_STEP=withdraw node scripts/...    only the steps not yet recorded in deployments/testnet-live.json
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {Account,KeyPair,KeyPairSigner,JsonRpcProvider,actions,teraToGas,nearToYocto} from 'near-api-js';

const rpcUrl='https://test.rpc.fastnear.com';
// Circle's native USDC on NEAR testnet (6 decimals). It trades on Ref Finance testnet pool 1845 against wNEAR.
const USDC='3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';
const WNEAR='wrap.testnet';
const REF='ref-finance-101.testnet';
const POOL=1845;
const recordFile=new URL('../deployments/testnet-live.json',import.meta.url);
const credDir=new URL('../.near-credentials/',import.meta.url);
const provider=new JsonRpcProvider({url:rpcUrl});
const record=existsSync(recordFile)?JSON.parse(readFileSync(recordFile,'utf8')):{network:'testnet',rpcUrl,usdc:USDC,pool:{ref:REF,id:POOL},steps:[]};
const save=()=>writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');
const tx=(label,hash,extra={})=>{record.steps.push({label,hash,explorer:`https://testnet.nearblocks.io/txns/${hash}`,at:new Date().toISOString(),...extra});save();console.log(`${label}: ${hash}`);};
const done=label=>record.steps.some(s=>s.label===label);

async function view(account,method,args={}){
  const r=await provider.query({request_type:'call_function',finality:'final',account_id:account,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});
  return JSON.parse(Buffer.from(r.result).toString());
}
async function exists(id){try{await provider.query({request_type:'view_account',finality:'final',account_id:id});return true}catch{return false}}

/** Creates a top-level testnet account through the public helper, or loads the one recorded earlier. */
async function ensureAccount(role){
  mkdirSync(credDir,{recursive:true,mode:0o700});
  let id=record[role];
  if(!id){
    id=`kuroko-${role==='vault'?'v':'lp'}-${randomBytes(4).toString('hex')}.testnet`;
    const key=KeyPair.fromRandom('ed25519');
    writeFileSync(new URL(`${id}.json`,credDir),JSON.stringify({account_id:id,secret_key:key.toString()}),{mode:0o600,flag:'wx'});
    const helper=await fetch('https://helper.nearprotocol.com/account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:id,newAccountPublicKey:key.getPublicKey().toString()})});
    if(!helper.ok)throw Error(`testnet account helper HTTP ${helper.status}: ${(await helper.text()).slice(0,160)}`);
    for(let i=0;i<30&&!(await exists(id));i++)await new Promise(r=>setTimeout(r,1000));
    if(!(await exists(id)))throw Error(`${id} not visible on testnet after 30 s`);
    record[role]=id;save();console.log(`created ${role} account ${id}`);
  }
  const {secret_key}=JSON.parse(readFileSync(new URL(`${id}.json`,credDir),'utf8'));
  return new Account(id,provider,new KeyPairSigner(KeyPair.fromString(secret_key)));
}
async function send(account,receiverId,acts,label,extra){
  const r=await account.signAndSendTransaction({receiverId,actions:acts,throwOnFailure:false,waitUntil:'FINAL'});
  if(typeof r.status==='object'&&'Failure' in r.status)throw Error(`${label} failed (${r.transaction.hash}): ${JSON.stringify(r.status.Failure).slice(0,300)}`);
  const failed=r.receipts_outcome.find(o=>typeof o.outcome.status==='object'&&'Failure' in o.outcome.status);
  if(failed)throw Error(`${label}: a receipt failed (${r.transaction.hash}): ${JSON.stringify(failed.outcome.status.Failure).slice(0,300)}`);
  tx(label,r.transaction.hash,extra);return r;
}
const call=(m,a,dep='0',tgas='100')=>actions.functionCall(m,a,teraToGas(tgas),BigInt(dep));

const vault=await ensureAccount('vault');
const lp=await ensureAccount('lp');

if(!done('deploy')){
  const wasm=readFileSync(new URL('../packages/contract/target/near/kuroko_vault.wasm',import.meta.url));
  const constitution={allowed_pairs:[`nep141:${USDC}/nep141:${WNEAR}`],max_inventory_usdc:'1000000',min_spread_bps:30,daily_loss_limit_usdc:'100000'};
  await send(vault,vault.accountId,[actions.deployContract(wasm),call('new',{usdc:USDC,operator:vault.accountId,constitution})],'deploy',{wasmSha256:createHash('sha256').update(wasm).digest('hex')});
}
const bounds=await view(USDC,'storage_balance_bounds');
if(!done('register vault with USDC'))await send(vault,USDC,[call('storage_deposit',{account_id:vault.accountId,registration_only:true},bounds.min,'30')],'register vault with USDC');
if(!done('register depositor with USDC'))await send(lp,USDC,[call('storage_deposit',{account_id:lp.accountId,registration_only:true},bounds.min,'30')],'register depositor with USDC');
if(!done('wrap NEAR'))await send(lp,WNEAR,[call('storage_deposit',{account_id:lp.accountId,registration_only:true},nearToYocto('0.00125').toString(),'30'),call('near_deposit',{},nearToYocto('2').toString(),'30')],'wrap NEAR',{amount:'2 NEAR'});
if(!done('register depositor with Ref'))await send(lp,REF,[call('storage_deposit',{account_id:lp.accountId,registration_only:false},nearToYocto('0.1').toString(),'30')],'register depositor with Ref');
if(!done('swap wNEAR for USDC on Ref')){
  const pool=await view(REF,'get_pool',{pool_id:POOL});
  const amountIn=nearToYocto('2').toString();
  const expected=await view(REF,'get_return',{pool_id:POOL,token_in:WNEAR,amount_in:amountIn,token_out:USDC});
  const min=(BigInt(expected)*95n/100n).toString();
  const msg=JSON.stringify({force:0,actions:[{pool_id:POOL,token_in:WNEAR,token_out:USDC,amount_in:amountIn,min_amount_out:min}]});
  await send(lp,WNEAR,[call('ft_transfer_call',{receiver_id:REF,amount:amountIn,msg},'1','200')],'swap wNEAR for USDC on Ref',{poolAmounts:pool.amounts,expectedUsdc:expected});
}
// If Ref kept the output as an internal deposit, withdraw it to the wallet.
const refUsdc=(await view(REF,'get_deposits',{account_id:lp.accountId}))[USDC];
if(refUsdc&&refUsdc!=='0')await send(lp,REF,[call('withdraw',{token_id:USDC,amount:refUsdc,unregister:false},'1','100')],'withdraw USDC from Ref',{amount:refUsdc});
const wallet=await view(USDC,'ft_balance_of',{account_id:lp.accountId});
console.log(`depositor holds ${wallet} raw USDC`);
const DEPOSIT='500000';// 0.5 USDC
if(!done('deposit')){
  if(BigInt(wallet)<BigInt(DEPOSIT))throw Error(`depositor has ${wallet} raw USDC, needs ${DEPOSIT}`);
  await send(lp,USDC,[call('ft_transfer_call',{receiver_id:vault.accountId,amount:DEPOSIT,msg:''},'1','100')],'deposit',{amount:DEPOSIT});
}
if(!done('withdraw')){
  await send(lp,vault.accountId,[call('withdraw',{shares:'200000'},'0','100')],'withdraw',{shares:'200000'});
}
record.state=await view(vault.accountId,'state');
record.depositorShares=await view(vault.accountId,'shares_of',{account_id:lp.accountId});
record.observedAt=new Date().toISOString();save();
console.log(JSON.stringify({vault:vault.accountId,lp:lp.accountId,state:record.state,depositorShares:record.depositorShares}));
