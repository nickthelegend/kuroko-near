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
  const response=await fetch(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok)throw new Error(`NEAR testnet RPC HTTP ${response.status}`);
  const json=await response.json();
  if(json.error)throw new Error(`NEAR testnet RPC: ${json.error.message||JSON.stringify(json.error)}`);
  const result=new Uint8Array(json.result?.result||[]);
  return JSON.parse(new TextDecoder().decode(result)) as T;
}
export async function solverState():Promise<SolverState>{const response=await fetch(`${solverUrl}/stats`);if(!response.ok)throw new Error(`Solver HTTP ${response.status}`);return response.json() as Promise<SolverState>;}
export function decimal(raw:string,places=6){try{const n=BigInt(raw);const base=10n**BigInt(places);const whole=n/base;const frac=(n%base).toString().padStart(places,'0').replace(/0+$/,'');return `${whole}${frac?'.'+frac:''}`;}catch{return '—';}}
export function rawUnits(value:string,places=6){if(!/^(0|[1-9]\d*)(\.\d+)?$/.test(value))throw new Error('Enter a positive decimal amount');const [whole,frac='']=value.split('.');if(frac.length>places)throw new Error(`Use at most ${places} decimal places`);const units=BigInt(whole)*10n**BigInt(places)+BigInt(frac.padEnd(places,'0')||'0');if(units<=0n)throw new Error('Amount must be greater than zero');return units.toString();}
