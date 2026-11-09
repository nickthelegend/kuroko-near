import {useCallback,useEffect,useState} from 'react';
import {setupWalletSelector,type BrowserWallet,type WalletSelector} from '@near-wallet-selector/core';
import {setupMyNearWallet} from '@near-wallet-selector/my-near-wallet';
import Landing from './Landing';
import Terminal from './Terminal';
import {navigate,nearblocksAccount,short,vaultId} from './rpc';
import {Chip,Icon,Mark} from './ui';

const gas='100000000000000';

export type Wallet={
  account:string;ready:boolean;busy:boolean;
  connect:()=>Promise<void>;disconnect:()=>Promise<void>;
  /** Signs one function call on testnet through MyNearWallet and returns the transaction hash. */
  call:(method:string,args:object,opts?:{deposit?:string;receiver?:string})=>Promise<string>;
};

function useRoute(){
  const [path,setPath]=useState(location.pathname);
  useEffect(()=>{const on=()=>setPath(location.pathname);addEventListener('popstate',on);return()=>removeEventListener('popstate',on);},[]);
  return path.startsWith('/app')?'app':'home';
}

export default function App(){
  const route=useRoute();
  const [selector,setSelector]=useState<WalletSelector|null>(null);
  const [account,setAccount]=useState('');
  const [busy,setBusy]=useState(false);
  const [walletError,setWalletError]=useState('');

  useEffect(()=>{setupWalletSelector({network:'testnet',modules:[setupMyNearWallet()]}).then(async s=>{setSelector(s);const w=await s.wallet('my-near-wallet');setAccount((await w.getAccounts())[0]?.accountId||'');}).catch(e=>setWalletError((e as Error).message));},[]);
  useEffect(()=>{document.title=route==='app'?'Kuroko · Terminal':'Kuroko · The market maker behind the trade';},[route]);

  const connect=useCallback(async()=>{
    setWalletError('');
    try{if(!vaultId)throw new Error('Setup required: VITE_VAULT_ACCOUNT');if(!selector)throw new Error('Wallet is still loading');const w=await selector.wallet('my-near-wallet') as BrowserWallet;setAccount((await w.signIn({contractId:vaultId}))[0]?.accountId||'');}
    catch(e){setWalletError((e as Error).message);}
  },[selector]);
  const disconnect=useCallback(async()=>{if(!selector)return;const w=await selector.wallet('my-near-wallet');await w.signOut();setAccount('');},[selector]);
  const call=useCallback(async(method:string,args:object,opts:{deposit?:string;receiver?:string}={})=>{
    const receiver=opts.receiver??vaultId;
    if(!receiver)throw new Error('Setup required: VITE_VAULT_ACCOUNT');
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

  return <div className={`shell route-${route}`}>
    <header className="topbar">
      <a className="brand" href="/" onClick={go('/')} aria-label="Kuroko home"><Mark/><span className="brand-word">Kuroko<small>黒子 · the stagehand</small></span></a>
      {route==='home'
        ?<nav className="topnav" aria-label="Sections"><a href="#earn">How it earns</a><a href="#constitution">Constitution</a><a href="#proof">Live proof</a><a href="#tech">NEAR tech</a></nav>
        :<nav className="topnav" aria-label="Pages"><a href="/" onClick={go('/')}>Overview</a><a href="/app" aria-current="page" onClick={go('/app')}>Terminal</a></nav>}
      <div className="topbar-end">
        <span className="net"><i/>Testnet</span>
        {route==='home'
          ?<a className="btn btn-primary btn-sm" href="/app" onClick={go('/app')}>Open terminal <Icon name="arrow" size={16}/></a>
          :account
            ?<button className="btn btn-ghost btn-sm acct" onClick={()=>void disconnect()} title="Disconnect wallet"><Icon name="wallet" size={16}/>{short(account,12,6)}</button>
            :<button className="btn btn-primary btn-sm" onClick={()=>void connect()} disabled={!selector}><Icon name="wallet" size={16}/>Connect wallet</button>}
      </div>
    </header>
    {walletError&&<p className="banner-error" role="alert"><Icon name="x" size={16}/>{walletError}</p>}
    <main>{route==='app'?<Terminal wallet={wallet}/>:<Landing/>}</main>
    <footer className="foot">
      <div className="foot-brand"><Mark size="sm"/><div><b>Kuroko</b><span>A depositor-governed NEAR Intents solver vault. Testnet prototype; quoting is off.</span></div></div>
      <div className="foot-links">
        {vaultId?<a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer">Vault on NearBlocks <Icon name="external" size={14}/></a>:<Chip tone="warn">Setup required: VITE_VAULT_ACCOUNT</Chip>}
        <a href="https://docs.near-intents.org/integration/market-makers/introduction" target="_blank" rel="noreferrer">Market-maker docs <Icon name="external" size={14}/></a>
        <span>MIT · © 2026 Nivesh Gajengi</span>
      </div>
    </footer>
  </div>;
}
