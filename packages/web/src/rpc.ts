export const vaultId=import.meta.env.VITE_VAULT_ACCOUNT as string|undefined;
export const usdcId=import.meta.env.VITE_USDC_ACCOUNT as string|undefined;
export const solverUrl=(import.meta.env.VITE_SOLVER_API as string|undefined)||'http://127.0.0.1:3100';
const rpcUrl=(import.meta.env.VITE_TESTNET_RPC_URL as string|undefined)||'https://test.rpc.fastnear.com';
export type Constitution={allowed_pairs:string[];max_inventory_usdc:string;min_spread_bps:number;daily_loss_limit_usdc:string};
export type VaultState={total_shares:string;usdc_balance:string;paused:boolean;daily_loss_usdc:string;loss_day:number;constitution:Constitution};
export type Proposal={id:number;constitution:Constitution;yes:string;no:string;snapshot_shares:string;closes_at_ms:number;executed:boolean;voters:string[]};
export type TapeEntry={at:string;mode:'listen';request:{quote_id:string;defuse_asset_identifier_in:string;defuse_asset_identifier_out:string;exact_amount_in?:string;exact_amount_out?:string};result:Record<string,unknown>};
export type SolverState={mode:'listen';startedAt:string;requestsSeen:number;wouldQuote:number;quoted:number;won:number;spreadEarned:string;inventory:Record<string,string>;lastError:string|null;tape:TapeEntry[]};
export async function view<T>(account:string,method:string,args:object={}):Promise<T>{
  const bytes=new TextEncoder().encode(JSON.stringify(args));
  const binary=Array.from(bytes,b=>String.fromCharCode(b)).join('');
  const body={jsonrpc:'2.0',id:'kuroko-web',method:'query',params:{request_type:'call_function',finality:'final',account_id:account,method_name:method,args_base64:btoa(binary)}};
  const post=()=>fetch(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  let response:Response;
  try{response=await post();}
  catch{await new Promise(r=>setTimeout(r,900));try{response=await post();}catch(e){throw new Error(`NEAR testnet RPC unreachable at ${new URL(rpcUrl).host} (${(e as Error).message}). Retrying on the next refresh.`);}}
  if(!response.ok)throw new Error(`NEAR testnet RPC HTTP ${response.status}`);
  const json=await response.json();
  if(json.error)throw new Error(`NEAR testnet RPC: ${json.error.message||JSON.stringify(json.error)}`);
  const result=new Uint8Array(json.result?.result||[]);
  return JSON.parse(new TextDecoder().decode(result)) as T;
}
export async function solverState():Promise<SolverState>{const response=await fetch(`${solverUrl}/stats`);if(!response.ok)throw new Error(`Solver HTTP ${response.status}`);return response.json() as Promise<SolverState>;}
export function decimal(raw:string,places=6){try{const n=BigInt(raw);const base=10n**BigInt(places);const whole=n/base;const frac=(n%base).toString().padStart(places,'0').replace(/0+$/,'');return `${whole}${frac?'.'+frac:''}`;}catch{return '—';}}
export function rawUnits(value:string,places=6){if(!/^(0|[1-9]\d*)(\.\d+)?$/.test(value))throw new Error('Enter a positive decimal amount');const [whole,frac='']=value.split('.');if(frac.length>places)throw new Error(`Use at most ${places} decimal places`);const units=BigInt(whole)*10n**BigInt(places)+BigInt(frac.padEnd(places,'0')||'0');if(units<=0n)throw new Error('Amount must be greater than zero');return units.toString();}
export const nearblocksTx=(hash:string)=>`https://testnet.nearblocks.io/txns/${hash}`;
export const nearblocksAccount=(id:string)=>`https://testnet.nearblocks.io/address/${id}`;
export type ChainTx={hash:string;method:string;signer:string;ok:boolean;ns:number};
/** Recent transactions to the vault contract, read from the NearBlocks v3 public API (testnet). */
export async function recentVaultTxns(limit=6):Promise<ChainTx[]>{
  if(!vaultId)throw new Error('Setup required: VITE_VAULT_ACCOUNT');
  const response=await fetch(`https://api-testnet.nearblocks.io/v3/accounts/${vaultId}/txns?per_page=${limit}`);
  if(!response.ok)throw new Error(`NearBlocks HTTP ${response.status}`);
  const body=await response.json();
  if(!Array.isArray(body.data))throw new Error(body.errors?.[0]?.message||'NearBlocks returned no data');
  return body.data.slice(0,limit).map((t:{transaction_hash:string;signer_account_id:string;block_timestamp:string;outcomes?:{status?:boolean};actions?:{action:string;method:string|null}[]})=>{
    const call=t.actions?.find(a=>a.method);
    const label=call?.method||(t.actions||[]).map(a=>a.action.toLowerCase().replace(/_/g,' ')).join(' + ')||'transaction';
    return {hash:t.transaction_hash,method:label,signer:t.signer_account_id,ok:t.outcomes?.status!==false,ns:Number(t.block_timestamp)};
  });
}
export function ago(ns:number,now=Date.now()){const s=Math.max(0,Math.round((now-ns/1e6)/1000));if(s<60)return `${s}s ago`;const m=Math.round(s/60);if(m<60)return `${m}m ago`;const h=Math.round(m/60);if(h<48)return `${h}h ago`;return `${Math.round(h/24)}d ago`;}
export const short=(value:string,head=10,tail=6)=>value.length>head+tail+1?`${value.slice(0,head)}…${value.slice(-tail)}`:value;
export function navNumber(vault:VaultState|null){if(!vault)return null;const shares=BigInt(vault.total_shares);if(shares===0n)return {value:'1.000000',genesis:true};const scaled=BigInt(vault.usdc_balance)*1_000_000n/shares;const s=scaled.toString().padStart(7,'0');return {value:`${s.slice(0,-6)}.${s.slice(-6)}`,genesis:false};}
export function pairLabel(pair:string){return pair.split('/').map(side=>side.replace(/^nep141:/,'').replace(/\.testnet$|\.near$/,'').toUpperCase().replace(/^WRAP$/,'wNEAR')).join(' / ');}
export function navigate(path:string){if(location.pathname!==path){history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'));}scrollTo({top:0});}
