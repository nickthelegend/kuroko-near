import {setupWalletSelector,type InjectedWallet} from '@near-wallet-selector/core';
import {setupMeteorWallet} from '@near-wallet-selector/meteor-wallet';

export type AppWallet=Pick<InjectedWallet,'getAccounts'|'signIn'|'signOut'|'signAndSendTransaction'|'signAndSendTransactions'>;
export type WalletLayer={isSignedIn:()=>boolean;wallet:()=>Promise<AppWallet>};
let layer:Promise<WalletLayer>|undefined;

/** The QA module is eliminated from ordinary builds, including its dynamic import. */
export function setupWalletLayer():Promise<WalletLayer>{
  return layer??=createLayer();
}
async function createLayer():Promise<WalletLayer>{
  if(import.meta.env.VITE_QA_SIGNER==='1')return (await import('./qa-signer')).setupQaSigner();
  const selector=await setupWalletSelector({network:'testnet',modules:[setupMeteorWallet()]});
  return {isSignedIn:()=>selector.isSignedIn(),wallet:()=>selector.wallet<InjectedWallet>('meteor-wallet')};
}
