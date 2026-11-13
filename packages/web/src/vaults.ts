import live from '../../../deployments/testnet-live.json';
import seeded from '../../../deployments/testnet-vaults.json';

/**
 * The three Kuroko vaults on NEAR testnet. All run the same wasm (sha256 recorded in the deployment files) and differ
 * only in the rules their depositors hold. Names and one-line descriptions are ours; every number is read from chain.
 */
export type VaultMeta={slug:string;id:string;name:string;short:string;blurb:string;deployTx:string;tone:'core'|'wide'|'stable'};

const deployOf=(label:string)=>seeded.steps.find(s=>s.label===label)?.hash??'';
export const VAULTS:VaultMeta[]=[
  {slug:'core',id:(import.meta.env.VITE_VAULT_ACCOUNT as string|undefined)||live.vault,name:'Kuroko Core USDC',short:'Core',tone:'core',
    blurb:'Quotes USDC ↔ wNEAR, the busiest pair on NEAR Intents, with a tight trade cap.',
    deployTx:live.steps.find(s=>s.label==='deploy')?.hash??''},
  {slug:'wide',id:seeded.accounts['vault-wide'],name:'Kuroko Wide USDC',short:'Wide',tone:'wide',
    blurb:'Quotes USDC against wNEAR, ETH and AURORA, with a wider fee floor for the extra risk.',
    deployTx:deployOf('deploy wide')},
  {slug:'stable',id:seeded.accounts['vault-stable'],name:'Kuroko Stable USDC',short:'Stable',tone:'stable',
    blurb:'Quotes only dollar-for-dollar swaps (USDT, bridged USDC) at a very small fee.',
    deployTx:deployOf('deploy stable')},
];
export const vaultBySlug=(slug:string)=>VAULTS.find(v=>v.slug===slug);
export const vaultById=(id:string)=>VAULTS.find(v=>v.id===id);
/** Team test accounts that seeded the vaults (labelled in the activity feed so nobody mistakes them for outside users). */
export const TEST_ACCOUNTS=new Set<string>([live.lp,seeded.accounts.lp2,seeded.accounts.lp3]);
