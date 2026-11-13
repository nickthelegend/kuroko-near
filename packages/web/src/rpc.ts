import live from '../../../deployments/testnet-live.json';

/** The vault and token default to the recorded live testnet run (deployments/testnet-live.json); env overrides them. */
export const vaultId=(import.meta.env.VITE_VAULT_ACCOUNT as string|undefined)||live.vault;
export const usdcId=(import.meta.env.VITE_USDC_ACCOUNT as string|undefined)||live.usdc;
/** The listen-only solver runs locally and only with a PARTNER_JWT, so the UI calls it only when this is set. */
export const solverUrl=import.meta.env.VITE_SOLVER_API as string|undefined;
export const liveRecord=live;
export const exampleDepositor=live.lp;
const rpcUrl=(import.meta.env.VITE_TESTNET_RPC_URL as string|undefined)||'https://test.rpc.fastnear.com';

export type Constitution={allowed_pairs:string[];max_inventory_usdc:string;min_spread_bps:number;daily_loss_limit_usdc:string};
export type VaultState={total_shares:string;usdc_balance:string;paused:boolean;daily_loss_usdc:string;loss_day:number;constitution:Constitution};
export type Proposal={id:number;constitution:Constitution;yes:string;no:string;snapshot_shares:string;closes_at_ms:number;executed:boolean;voters:string[]};
export type TapeEntry={at:string;mode:'listen';request:{quote_id:string;defuse_asset_identifier_in:string;defuse_asset_identifier_out:string;exact_amount_in?:string;exact_amount_out?:string};result:Record<string,unknown>};
export type SolverState={mode:'listen';startedAt:string;requestsSeen:number;wouldQuote:number;quoted:number;won:number;spreadEarned:string;inventory:Record<string,string>;lastError:string|null;tape:TapeEntry[]};

/**
 * Reads go to public NEAR testnet RPCs in turn (FastNEAR, its archival node, then dRPC), failing over on a network error or a rate limit,
 * so live polling from many tabs does not stall on one provider's per-IP limit. Both serve the same chain.
 */
const RPCS=[...new Set([rpcUrl,'https://test.rpc.fastnear.com','https://archival-rpc.testnet.fastnear.com','https://near-testnet.drpc.org'])];
let rr=0;
export async function rpcPost<T>(body:object):Promise<T>{
  let last='';
  for(let i=0;i<RPCS.length*2;i++){
    const url=RPCS[(rr+i)%RPCS.length];
    try{
      const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
      if(r.status===429||r.status>=500){last=`HTTP ${r.status}`;continue;}
      if(!r.ok)throw new Error(`NEAR testnet RPC HTTP ${r.status}`);
      rr=(rr+1)%RPCS.length;
      return await r.json() as T;
    }catch(e){last=(e as Error).message;if(i>=RPCS.length)await new Promise(r=>setTimeout(r,400));}
  }
  throw new Error(`NEAR testnet RPC is unreachable (${last||'no answer'}). Retrying on the next refresh.`);
}
export async function view<T>(account:string,method:string,args:object={}):Promise<T>{
  const bytes=new TextEncoder().encode(JSON.stringify(args));
  const binary=Array.from(bytes,b=>String.fromCharCode(b)).join('');
  const json=await rpcPost<{error?:unknown;result?:{result?:number[]}}>({jsonrpc:'2.0',id:'kuroko-web',method:'query',params:{request_type:'call_function',finality:'final',account_id:account,method_name:method,args_base64:btoa(binary)}});
  try{
    if(json.error||!Array.isArray(json.result?.result))throw new Error('unavailable');
    return JSON.parse(new TextDecoder().decode(new Uint8Array(json.result!.result!))) as T;
  }catch{throw new Error('NEAR testnet could not read this contract. Please retry; the page also refreshes automatically.');}
}
export const loadVault=()=>view<VaultState>(vaultId,'state');
export async function solverState():Promise<SolverState>{
  if(!solverUrl)throw new Error('Setup required: PARTNER_JWT');
  const response=await fetch(`${solverUrl}/stats`);if(!response.ok)throw new Error(`Solver HTTP ${response.status}`);return response.json() as Promise<SolverState>;
}

/** Formats raw 6-decimal units. `fixed` pads to that many places. */
export function decimal(raw:string|bigint,places=6,fixed?:number){
  try{const n=BigInt(raw);const neg=n<0n;const a=neg?-n:n;const base=10n**BigInt(places);const whole=a/base;let frac=(a%base).toString().padStart(places,'0');
    frac=fixed===undefined?frac.replace(/0+$/,''):frac.slice(0,fixed);return `${neg?'-':''}${whole.toLocaleString('en-US')}${frac?'.'+frac:''}`;}catch{return '—';}
}
export const usdNumber=(raw:string|bigint)=>Number(BigInt(raw))/1e6;
export function rawUnits(value:string,places=6){if(!/^(0|[1-9]\d*)(\.\d+)?$/.test(value))throw new Error('Enter a positive amount, like 0.25');const [whole,frac='']=value.split('.');if(frac.length>places)throw new Error(`Use at most ${places} decimal places`);const units=BigInt(whole)*10n**BigInt(places)+BigInt(frac.padEnd(places,'0')||'0');if(units<=0n)throw new Error('Amount must be greater than zero');return units.toString();}
export const nearblocksTx=(hash:string)=>`https://testnet.nearblocks.io/txns/${hash}`;
export const nearblocksAccount=(id:string)=>`https://testnet.nearblocks.io/address/${id}`;
export function ago(ms:number,now=Date.now()){const s=Math.max(0,Math.round((now-ms)/1000));if(s<60)return `${s}s ago`;const m=Math.round(s/60);if(m<60)return `${m} min ago`;const h=Math.round(m/60);if(h<48)return `${h} h ago`;return `${Math.round(h/24)} d ago`;}
/** USDC from raw 6-decimal units at fintech precision: 2 places, or up to 6 significant places below one cent. */
export function usdc(raw:string|bigint,places=2){try{const n=BigInt(raw);const a=n<0n?-n:n;if(a>0n&&a<10_000n)return decimal(n,6).replace(/^(-?\d+\.\d*?[1-9]\d?).*$/,'$1');return decimal(n,6,places);}catch{return '—';}}
/** "Nov 10, 9:14 AM" (adds the year when it is not this year). */
export function when(ms:number){const d=new Date(ms);const sameYear=d.getFullYear()===new Date().getFullYear();return d.toLocaleString('en-US',{month:'short',day:'numeric',...(sameYear?{}:{year:'numeric'}),hour:'numeric',minute:'2-digit'});}
export const short=(value:string,head=10,tail=6)=>value.length>head+tail+1?`${value.slice(0,head)}…${value.slice(-tail)}`:value;
/** Share price in USDC, 6 places, or the 1.000000 genesis price when nothing is deposited. */
export function sharePrice(cash:string|bigint,shares:string|bigint){const s=BigInt(shares);if(s===0n)return 1_000_000n;return BigInt(cash)*1_000_000n/s;}
const TOKEN_NAMES:Record<string,string>={[live.usdc]:'USDC','usdc.testnet':'USDC','wrap.testnet':'wNEAR','wrap.near':'wNEAR','eth.fakes.testnet':'ETH','aurora.fakes.testnet':'AURORA','usdt.fakes.testnet':'USDT','usdc.fakes.testnet':'USDC.e'};
export const tokenName=(id:string)=>{const bare=id.replace(/^nep141:/,'');return TOKEN_NAMES[bare]||bare.replace(/\.testnet$|\.near$/,'').toUpperCase();};
export const pairLabel=(pair:string)=>pair.split('/').map(tokenName).join(' ↔ ');
export function navigate(path:string){if(location.pathname+location.search!==path){history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'));}scrollTo({top:0});}

/** A readable account name: drops .testnet and trims long names. */
export const acctName=(id:string)=>{const n=id.replace(/\.testnet$/,'');return n.length>18?`${n.slice(0,16)}…`:n;};
