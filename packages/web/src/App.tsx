import {useCallback,useEffect,useState} from 'react';
import {setupWalletSelector,type BrowserWallet,type WalletSelector} from '@near-wallet-selector/core';
import {setupMyNearWallet} from '@near-wallet-selector/my-near-wallet';
import Landing from './Landing';
import VaultPage from './Vault';
import Position from './Position';
import {loadHistory,type History} from './activity';
import {loadVault,navigate,nearblocksAccount,short,vaultId,type VaultState} from './rpc';
import {Icon,Mark,useLive,type Live} from './ui';

const gas='100000000000000';

export type Wallet={
  account:string;ready:boolean;busy:boolean;
  connect:()=>Promise<void>;disconnect:()=>Promise<void>;
  /** Signs one function call on testnet through MyNearWallet and returns the transaction hash. */
  call:(method:string,args:object,opts?:{deposit?:string;receiver?:string})=>Promise<string>;
};
export type Data={vault:Live<VaultState>;history:Live<History>;refresh:()=>void};
type Route='home'|'vault'|'position';

function useRoute():Route{
  const [path,setPath]=useState(location.pathname);
  useEffect(()=>{const on=()=>setPath(location.pathname);addEventListener('popstate',on);return()=>removeEventListener('popstate',on);},[]);
  if(path.startsWith('/vault')||path.startsWith('/app'))return 'vault';
  if(path.startsWith('/position'))return 'position';
  return 'home';
}

export default function App(){
  const route=useRoute();
  const [selector,setSelector]=useState<WalletSelector|null>(null);
  const [account,setAccount]=useState('');
  const [busy,setBusy]=useState(false);
  const [walletError,setWalletError]=useState('');
  const [vault,refreshVault]=useLive(loadVault,15000);
  const [history,refreshHistory]=useLive(()=>loadHistory(),30000);
  const data:Data={vault,history,refresh:()=>{refreshVault();refreshHistory();}};

  useEffect(()=>{setupWalletSelector({network:'testnet',modules:[setupMyNearWallet()]}).then(async s=>{setSelector(s);const w=await s.wallet('my-near-wallet');setAccount((await w.getAccounts())[0]?.accountId||'');}).catch(e=>setWalletError(`Wallet unavailable: ${(e as Error).message}`));},[]);
  useEffect(()=>{document.title=route==='vault'?'Kuroko · USDC vault':route==='position'?'Kuroko · Your position':'Kuroko · Earn from filling other people’s swaps';},[route]);

  const connect=useCallback(async()=>{
    setWalletError('');
    try{if(!selector)throw new Error('Wallet is still loading');const w=await selector.wallet('my-near-wallet') as BrowserWallet;setAccount((await w.signIn({contractId:vaultId}))[0]?.accountId||'');}
    catch(e){setWalletError((e as Error).message);}
  },[selector]);
  const disconnect=useCallback(async()=>{if(!selector)return;const w=await selector.wallet('my-near-wallet');await w.signOut();setAccount('');},[selector]);
  const call=useCallback(async(method:string,args:object,opts:{deposit?:string;receiver?:string}={})=>{
    const receiver=opts.receiver??vaultId;
    if(!selector||!account)throw new Error('Connect a NEAR testnet wallet first');
    setBusy(true);
    try{
      const wallet=await selector.wallet('my-near-wallet');
      const result=await wallet.signAndSendTransaction({receiverId:receiver,actions:[{type:'FunctionCall',params:{methodName:method,args,gas,deposit:opts.deposit??'0'}}]});
      if(!result)throw new Error('The wallet returned no transaction result');
      if(typeof result.status==='object'&&result.status!==null&&'Failure' in result.status)throw new Error(`Transaction failed: ${JSON.stringify(result.status.Failure)}`);
      return result.transaction?.hash||'';
    }finally{setBusy(false);}
  },[selector,account]);
  const wallet:Wallet={account,ready:!!selector,busy,connect,disconnect,call};
  const go=(path:string)=>(e:React.MouseEvent)=>{e.preventDefault();navigate(path);};
  const link=(path:string,label:string,r:Route)=><a href={path} onClick={go(path)} aria-current={route===r?'page':undefined}>{label}</a>;

  return <div className={`shell route-${route}`}>
    <header className={`topbar${route==='home'?' on-dark':''}`}>
      <div className="topbar-in">
        <a className="brand" href="/" onClick={go('/')} aria-label="Kuroko home"><Mark/><span>Kuroko</span></a>
        <nav className="topnav" aria-label="Pages">{link('/vault','Vault','vault')}{link('/position','Your position','position')}</nav>
        <div className="topbar-end">
          <span className="net"><i/>Testnet</span>
          {account
            ?<button className="btn btn-quiet btn-sm acct" onClick={()=>void disconnect()} title="Disconnect wallet"><Icon name="wallet" size={16}/>{short(account,12,6)}</button>
            :<button className="btn btn-primary btn-sm" onClick={()=>void connect()} disabled={!selector}><Icon name="wallet" size={16}/><span className="hide-sm">Connect wallet</span><span className="show-sm">Connect</span></button>}
        </div>
      </div>
      <span className="curtain-rule" aria-hidden="true"><i/><i/><i/></span>
    </header>
    <nav className="tabbar" aria-label="Pages (mobile)">{link('/','Home','home')}{link('/vault','Vault','vault')}{link('/position','Position','position')}</nav>
    {walletError&&<p className="banner-error" role="alert"><Icon name="x" size={16}/>{walletError}</p>}
    <main>
      {route==='home'&&<Landing data={data}/>}
      {route==='vault'&&<VaultPage data={data} wallet={wallet}/>}
      {route==='position'&&<Position data={data} wallet={wallet}/>}
    </main>
    <footer className="foot">
      <div className="foot-in">
        <div className="foot-brand"><Mark size={26}/><p><b>Kuroko</b> · a shared USDC vault that would earn by filling NEAR Intents swaps. Testnet prototype: deposits are live, swap filling is not.</p></div>
        <div className="foot-links">
          <a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer">Vault contract <Icon name="external" size={14}/></a>
          <a href="https://docs.near-intents.org/integration/market-makers/introduction" target="_blank" rel="noreferrer">NEAR Intents market makers <Icon name="external" size={14}/></a>
          <span>MIT · © 2026 Nivesh Gajengi</span>
        </div>
      </div>
    </footer>
  </div>;
}
