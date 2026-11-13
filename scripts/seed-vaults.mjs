// Real NEAR testnet run: two more Kuroko vaults (same wasm as the live one, different rules) and two depositors who
// buy Circle testnet USDC on Ref Finance and deposit into the vaults. Every step is a signed testnet transaction,
// recorded in deployments/testnet-vaults.json. Keys go to the gitignored .near-credentials/ folder and are never printed.
// The script is resumable: steps already in the record are skipped.
//
//   node scripts/seed-vaults.mjs
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {Account,KeyPair,KeyPairSigner,JsonRpcProvider,actions,teraToGas,nearToYocto} from 'near-api-js';

const rpcUrl='https://test.rpc.fastnear.com';
const USDC='3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';
const WNEAR='wrap.testnet';
const REF='ref-finance-101.testnet';
const POOL=1845;
const live=JSON.parse(readFileSync(new URL('../deployments/testnet-live.json',import.meta.url),'utf8'));
const recordFile=new URL('../deployments/testnet-vaults.json',import.meta.url);
const credDir=new URL('../.near-credentials/',import.meta.url);
const provider=new JsonRpcProvider({url:rpcUrl});
const record=existsSync(recordFile)?JSON.parse(readFileSync(recordFile,'utf8')):{network:'testnet',rpcUrl,usdc:USDC,accounts:{},steps:[]};
const save=()=>writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');
const done=label=>record.steps.some(s=>s.label===label);

const pair=t=>`nep141:${USDC}/nep141:${t}`;
/** Vault rules. Core is the vault deployed on Nov 10 (deployments/testnet-live.json); the other two are new. */
const VAULTS={
  wide:{constitution:{allowed_pairs:[pair(WNEAR),pair('eth.fakes.testnet'),pair('aurora.fakes.testnet')],max_inventory_usdc:'2000000',min_spread_bps:50,daily_loss_limit_usdc:'250000'}},
  stable:{constitution:{allowed_pairs:[pair('usdt.fakes.testnet'),pair('usdc.fakes.testnet')],max_inventory_usdc:'5000000',min_spread_bps:5,daily_loss_limit_usdc:'50000'}},
};

async function view(account,method,args={}){
  const r=await provider.query({request_type:'call_function',finality:'final',account_id:account,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});
  return JSON.parse(Buffer.from(r.result).toString());
}
async function exists(id){try{await provider.query({request_type:'view_account',finality:'final',account_id:id});return true}catch{return false}}

async function ensureAccount(role,prefix){
  mkdirSync(credDir,{recursive:true,mode:0o700});
  let id=record.accounts[role];
  if(!id){
    id=`${prefix}-${randomBytes(4).toString('hex')}.testnet`;
    const key=KeyPair.fromRandom('ed25519');
    writeFileSync(new URL(`${id}.json`,credDir),JSON.stringify({account_id:id,secret_key:key.toString()}),{mode:0o600,flag:'wx'});
    const helper=await fetch('https://helper.nearprotocol.com/account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:id,newAccountPublicKey:key.getPublicKey().toString()})});
    if(!helper.ok)throw Error(`testnet account helper HTTP ${helper.status}: ${(await helper.text()).slice(0,160)}`);
    for(let i=0;i<30&&!(await exists(id));i++)await new Promise(r=>setTimeout(r,1000));
    if(!(await exists(id)))throw Error(`${id} not visible on testnet after 30 s`);
    record.accounts[role]=id;save();console.log(`created ${role} account ${id}`);
  }
  const {secret_key}=JSON.parse(readFileSync(new URL(`${id}.json`,credDir),'utf8'));
  return new Account(id,provider,new KeyPairSigner(KeyPair.fromString(secret_key)));
}
async function send(account,receiverId,acts,label,extra={}){
  const r=await account.signAndSendTransaction({receiverId,actions:acts,throwOnFailure:false,waitUntil:'FINAL'});
  if(typeof r.status==='object'&&'Failure' in r.status)throw Error(`${label} failed (${r.transaction.hash}): ${JSON.stringify(r.status.Failure).slice(0,300)}`);
  const failed=r.receipts_outcome.find(o=>typeof o.outcome.status==='object'&&'Failure' in o.outcome.status);
  if(failed)throw Error(`${label}: a receipt failed (${r.transaction.hash}): ${JSON.stringify(failed.outcome.status.Failure).slice(0,300)}`);
  record.steps.push({label,hash:r.transaction.hash,explorer:`https://testnet.nearblocks.io/txns/${r.transaction.hash}`,at:new Date().toISOString(),...extra});save();
  console.log(`${label}: ${r.transaction.hash}`);return r;
}
const call=(m,a,dep='0',tgas='100')=>actions.functionCall(m,a,teraToGas(tgas),BigInt(dep));
const bounds=await view(USDC,'storage_balance_bounds');

// 1. Two more vaults with the same audited wasm as the live vault.
const wasm=readFileSync(new URL('../packages/contract/target/near/kuroko_vault.wasm',import.meta.url));
const sha=createHash('sha256').update(wasm).digest('hex');
const liveSha=live.steps.find(s=>s.label==='deploy')?.wasmSha256;
if(liveSha&&liveSha!==sha)throw Error('The local wasm differs from the live vault wasm; rebuild from the recorded commit first.');
const vaults={};
for(const [name,cfg] of Object.entries(VAULTS)){
  const v=vaults[name]=await ensureAccount(`vault-${name}`,`kuroko-${name}`);
  if(!done(`deploy ${name}`))await send(v,v.accountId,[actions.deployContract(wasm),call('new',{usdc:USDC,operator:v.accountId,constitution:cfg.constitution})],`deploy ${name}`,{wasmSha256:sha});
  if(!done(`register ${name} with USDC`))await send(v,USDC,[call('storage_deposit',{account_id:v.accountId,registration_only:true},bounds.min,'30')],`register ${name} with USDC`);
}

// 2. Two depositors buy testnet USDC with wNEAR on Ref Finance pool 1845.
async function fund(role,nearIn){
  const lp=await ensureAccount(role,`kuroko-${role}`);
  if(!done(`${role}: register with USDC`))await send(lp,USDC,[call('storage_deposit',{account_id:lp.accountId,registration_only:true},bounds.min,'30')],`${role}: register with USDC`);
  if(!done(`${role}: wrap NEAR`))await send(lp,WNEAR,[call('storage_deposit',{account_id:lp.accountId,registration_only:true},nearToYocto('0.00125').toString(),'30'),call('near_deposit',{},nearToYocto(nearIn).toString(),'30')],`${role}: wrap NEAR`,{amount:`${nearIn} NEAR`});
  if(!done(`${role}: register with Ref`))await send(lp,REF,[call('storage_deposit',{account_id:lp.accountId,registration_only:false},nearToYocto('0.1').toString(),'30')],`${role}: register with Ref`);
  if(!done(`${role}: swap wNEAR for USDC on Ref`)){
    const amountIn=nearToYocto(nearIn).toString();
    const expected=await view(REF,'get_return',{pool_id:POOL,token_in:WNEAR,amount_in:amountIn,token_out:USDC});
    const msg=JSON.stringify({force:0,actions:[{pool_id:POOL,token_in:WNEAR,token_out:USDC,amount_in:amountIn,min_amount_out:(BigInt(expected)*95n/100n).toString()}]});
    await send(lp,WNEAR,[call('ft_transfer_call',{receiver_id:REF,amount:amountIn,msg},'1','200')],`${role}: swap wNEAR for USDC on Ref`,{expectedUsdc:expected});
  }
  const refUsdc=(await view(REF,'get_deposits',{account_id:lp.accountId}))[USDC];
  if(refUsdc&&refUsdc!=='0')await send(lp,REF,[call('withdraw',{token_id:USDC,amount:refUsdc,unregister:false},'1','100')],`${role}: withdraw USDC from Ref`,{amount:refUsdc});
  return lp;
}
const lp2=await fund('lp2','6');
const lp3=await fund('lp3','6');

// 3. Deposits through the NEP-141 ft_transfer_call path, exactly as the web app sends them.
async function deposit(lp,role,vaultId,name,amount){
  const label=`${role}: deposit ${amount} raw USDC into ${name}`;
  if(done(label))return;
  const bal=await view(USDC,'ft_balance_of',{account_id:lp.accountId});
  if(BigInt(bal)<BigInt(amount))throw Error(`${role} has ${bal} raw USDC, needs ${amount}`);
  await send(lp,USDC,[call('ft_transfer_call',{receiver_id:vaultId,amount,msg:''},'1','100')],label,{vault:vaultId,amount});
}
await deposit(lp2,'lp2',vaults.wide.accountId,'wide','300000');
await deposit(lp3,'lp3',vaults.stable.accountId,'stable','250000');
await deposit(lp2,'lp2',live.vault,'core','150000');
await deposit(lp3,'lp3',vaults.wide.accountId,'wide','150000');

record.observedAt=new Date().toISOString();
record.state={};
for(const [name,id] of [['core',live.vault],['wide',vaults.wide.accountId],['stable',vaults.stable.accountId]])record.state[name]={account:id,...await view(id,'state')};
save();
console.log(JSON.stringify(Object.fromEntries(Object.entries(record.state).map(([k,v])=>[k,{account:v.account,usdc:v.usdc_balance,shares:v.total_shares}]))));
