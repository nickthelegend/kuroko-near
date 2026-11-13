// Real NEAR testnet governance run on the Stable vault: a second depositor joins, one depositor proposes new rules,
// both vote (one yes, one no). Every step is a signed testnet transaction, appended to deployments/testnet-vaults.json.
// The vote locks the Stable vault's deposits and withdrawals for 24 hours, as the contract specifies.
//
//   node scripts/open-vote.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import {Account,KeyPair,KeyPairSigner,JsonRpcProvider,actions,teraToGas} from 'near-api-js';

const recordFile=new URL('../deployments/testnet-vaults.json',import.meta.url);
const record=JSON.parse(readFileSync(recordFile,'utf8'));
const provider=new JsonRpcProvider({url:process.env.RPC||record.rpcUrl});
const save=()=>writeFileSync(recordFile,JSON.stringify(record,null,2)+'\n');
const done=label=>record.steps.some(s=>s.label===label);
const USDC=record.usdc,STABLE=record.accounts['vault-stable'];
const load=id=>{const {secret_key}=JSON.parse(readFileSync(new URL(`../.near-credentials/${id}.json`,import.meta.url),'utf8'));return new Account(id,provider,new KeyPairSigner(KeyPair.fromString(secret_key)));};
async function view(account,method,args={}){const r=await provider.query({request_type:'call_function',finality:'final',account_id:account,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});return JSON.parse(Buffer.from(r.result).toString());}
async function send(account,receiverId,acts,label,extra={}){
  const r=await account.signAndSendTransaction({receiverId,actions:acts,throwOnFailure:false,waitUntil:'FINAL'});
  const failed=[r.status,...r.receipts_outcome.map(o=>o.outcome.status)].find(s=>typeof s==='object'&&'Failure' in s);
  if(failed)throw Error(`${label} failed (${r.transaction.hash}): ${JSON.stringify(failed.Failure).slice(0,300)}`);
  record.steps.push({label,hash:r.transaction.hash,explorer:`https://testnet.nearblocks.io/txns/${r.transaction.hash}`,at:new Date().toISOString(),...extra});save();
  console.log(`${label}: ${r.transaction.hash}`);return r;
}
const call=(m,a,dep='0',tgas='100')=>actions.functionCall(m,a,teraToGas(tgas),BigInt(dep));
const lp2=load(record.accounts.lp2),lp3=load(record.accounts.lp3);

if(!done('lp2: deposit 80000 raw USDC into stable'))await send(lp2,USDC,[call('ft_transfer_call',{receiver_id:STABLE,amount:'80000',msg:''},'1')],'lp2: deposit 80000 raw USDC into stable',{vault:STABLE,amount:'80000'});
const current=(await view(STABLE,'state')).constitution;
// Proposal: a more cautious Stable vault (fee floor 0.05% -> 0.08%, largest trade 5 -> 3 USDC). Pairs and loss pause unchanged.
const constitution={...current,min_spread_bps:8,max_inventory_usdc:'3000000'};
let id;
if(!done('lp3: propose stable rules')){const r=await send(lp3,STABLE,[call('propose',{constitution})],'lp3: propose stable rules',{constitution});id=JSON.parse(Buffer.from(r.status.SuccessValue,'base64').toString());}
id??=record.steps.find(s=>s.label==='lp3: propose stable rules').proposalId??(await view(STABLE,'proposals')).at(-1).id;
record.steps.find(s=>s.label==='lp3: propose stable rules').proposalId=id;save();
if(!done('lp3: vote yes'))await send(lp3,STABLE,[call('vote',{id,yes:true})],'lp3: vote yes',{proposalId:id});
if(!done('lp2: vote no'))await send(lp2,STABLE,[call('vote',{id,yes:false})],'lp2: vote no',{proposalId:id});
console.log(JSON.stringify(await view(STABLE,'proposals')));
