import {usdcId,vaultId} from './rpc';

/**
 * Vault history rebuilt from the chain: FastNEAR's public testnet transaction index lists every transaction that
 * touched the vault, and the NEP-141 `ft_transfer` events the USDC contract emitted in those transactions give each
 * deposit and withdrawal with its amount and block time. Nothing here is stored or typed by hand.
 */
const INDEX='https://tx.test.fastnear.com/v0';

export type VaultEvent={hash:string;at:number;kind:'deposit'|'withdrawal'|'out';account:string;amount:bigint;shares:bigint};
export type Point={at:number;cash:bigint;shares:bigint;price:bigint};
export type History={events:VaultEvent[];points:Point[];cash:bigint;shares:bigint;depositors:Set<string>;txCount:number};

type Receipt={receipt:{receiver_id:string;block_timestamp:number};execution_outcome:{outcome:{logs:string[];status:unknown}}};
type FullTx={transaction:{hash:string;signer_id:string;receiver_id:string;actions:({FunctionCall?:{method_name:string;args:string}}|string)[]};receipts:Receipt[]};

async function post<T>(path:string,body:object):Promise<T>{
  let r:Response;
  try{r=await fetch(`${INDEX}/${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});}
  catch{throw new Error('Testnet transaction history is unreachable. It will retry automatically.');}
  if(!r.ok)throw new Error(`Testnet transaction history is unavailable (HTTP ${r.status}). It will retry automatically.`);
  try{return await r.json() as T;}catch{throw new Error('The testnet transaction index returned unreadable data. Please retry.');}
}

function withdrawShares(tx:FullTx):bigint{
  for(const a of tx.transaction.actions){
    if(typeof a==='string'||!a.FunctionCall||a.FunctionCall.method_name!=='withdraw')continue;
    try{return BigInt(JSON.parse(atob(a.FunctionCall.args)).shares);}catch{return 0n;}
  }
  return 0n;
}

export async function loadHistory(vault=vaultId,usdc=usdcId):Promise<History>{
  const list=await post<{account_txs:{transaction_hash:string;tx_block_height:number}[]}>('account',{account_id:vault});
  if(!Array.isArray(list.account_txs))throw new Error('The testnet transaction index returned no transaction list. Please retry.');
  const hashes=[...new Set(list.account_txs.map(t=>t.transaction_hash))];
  const txs:FullTx[]=[];
  for(let i=0;i<hashes.length;i+=20){
    const chunk=await post<{transactions:(FullTx|null)[]}>('transactions',{tx_hashes:hashes.slice(i,i+20)});
    if(!Array.isArray(chunk.transactions))throw new Error('The testnet transaction index returned no transaction details. Please retry.');
    txs.push(...chunk.transactions.filter((t):t is FullTx=>!!t));
  }
  const events:VaultEvent[]=[];
  for(const tx of txs){
    for(const r of tx.receipts){
      if(r.receipt.receiver_id!==usdc)continue;
      for(const log of r.execution_outcome.outcome.logs){
        if(!log.startsWith('EVENT_JSON:'))continue;
        let ev:{standard?:string;event?:string;data?:{old_owner_id:string;new_owner_id:string;amount:string;memo?:string}[]};
        try{ev=JSON.parse(log.slice(11));}catch{continue;}
        if(ev.standard!=='nep141'||ev.event!=='ft_transfer')continue;
        for(const d of ev.data||[]){
          const at=Math.round(r.receipt.block_timestamp/1e6);
          if(d.new_owner_id===vault)events.push({hash:tx.transaction.hash,at,kind:'deposit',account:d.old_owner_id,amount:BigInt(d.amount),shares:0n});
          else if(d.old_owner_id===vault){
            const isWithdrawal=d.memo==='Kuroko withdrawal';
            events.push({hash:tx.transaction.hash,at,kind:isWithdrawal?'withdrawal':'out',account:d.new_owner_id,amount:BigInt(d.amount),shares:isWithdrawal?withdrawShares(tx):0n});
          }
        }
      }
    }
  }
  events.sort((a,b)=>a.at-b.at);
  // Replay the contract's share math: deposits mint at cash NAV, withdrawals burn the shares the caller named.
  let cash=0n,shares=0n;const depositors=new Set<string>();
  const points:Point[]=[];
  for(const e of events){
    if(e.kind==='deposit'){const minted=shares===0n?e.amount:e.amount*shares/(cash||1n);e.shares=minted;shares+=minted;cash+=e.amount;depositors.add(e.account);}
    else{cash-=e.amount;shares-=e.shares;}
    points.push({at:e.at,cash,shares,price:shares>0n?cash*1_000_000n/shares:1_000_000n});
  }
  return {events,points,cash,shares,depositors,txCount:hashes.length};
}

/** Net USDC an account put in (deposits minus withdrawals), from the same events. */
export function netDeposited(history:History,account:string){
  let net=0n;for(const e of history.events){if(e.account!==account)continue;net+=e.kind==='deposit'?e.amount:-e.amount;}return net;
}
