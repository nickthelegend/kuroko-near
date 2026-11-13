import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {actionCreators} from '@near-wallet-selector/core';
import {setupWalletLayer,type WalletLayer} from './wallet-layer';
import {confirmedHash} from './transactions';
import {navigate,short} from './rpc';
import {StoreProvider,useStore,val} from './store';
import {VAULTS} from './vaults';
import {Icon,Mark,Pulse,useNow} from './ui';
import Landing from './pages/Landing';
import VaultsPage from './pages/Vaults';
import VaultPage from './pages/Vault';
import Portfolio from './pages/Portfolio';
import ActivityPage from './pages/Activity';
import Relay from './pages/Relay';
import Governance from './pages/Governance';

const gas=100_000_000_000_000n;
/** Meteor Wallet (testnet) opens in a pop-up (or its browser extension) and posts the result back, so there is no
 * redirect route. MyNearWallet was dropped on 2026-11-10: its testnet pop-up now answers "MyNearWallet can't connect
 * to apps anymore" and sends people to Meteor. */
function plainWalletError(e:unknown,signingIn=false):Error{
  const message=String((e as Error)?.message??e);
  if(/User closed the window|didn't complete the action|User cancelled/i.test(message))return new Error(signingIn?'The wallet closed before you signed in.':'The wallet closed before you approved. Nothing was sent.');
  if(/open popup window|Popup window blocked/i.test(message))return new Error('Your browser blocked the wallet window. Allow pop-ups for this site, then try again.');
  if(/No Meteor (Wallet )?account found/i.test(message))return new Error('Meteor Wallet has no testnet account yet. Create one there, then connect again.');
  return e instanceof Error?e:new Error(message);
}

export type Wallet={
  account:string;ready:boolean;busy:boolean;error:string;
  connect:()=>Promise<void>;disconnect:()=>Promise<void>;
  /** Signs one function call on testnet and returns the final transaction hash. */
  call:(method:string,args:object,opts:{deposit?:string;receiver:string})=>Promise<string>;
};
const WalletCtx=createContext<Wallet|null>(null);
export function useWallet(){const w=useContext(WalletCtx);if(!w)throw Error('Wallet missing');return w;}

function WalletProvider({children}:{children:ReactNode}){
  const [selector,setSelector]=useState<WalletLayer|null>(null);
  const [account,setAccount]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{setupWalletLayer().then(async s=>{setSelector(s);const w=await s.wallet();setAccount(s.isSignedIn()?(await w.getAccounts())[0]?.accountId||'':'');}).catch(e=>setError(`Wallet unavailable: ${(e as Error).message}`));},[]);
  const connect=useCallback(async()=>{
    setError('');
    try{if(!selector)throw new Error('Wallet is still loading');const w=await selector.wallet();setAccount((await w.signIn({contractId:VAULTS[0].id,methodNames:[]}))[0]?.accountId||'');}
    catch(e){setError(plainWalletError(e,true).message);}
  },[selector]);
  const disconnect=useCallback(async()=>{if(!selector)return;const w=await selector.wallet();await w.signOut();setAccount('');},[selector]);
  const call=useCallback(async(method:string,args:object,opts:{deposit?:string;receiver:string})=>{
    if(!selector||!account)throw new Error('Connect a NEAR testnet wallet first');
    setBusy(true);
    try{
      const wallet=await selector.wallet();
      let result;
      try{result=await wallet.signAndSendTransaction({receiverId:opts.receiver,actions:[actionCreators.functionCall(method,args,gas,BigInt(opts.deposit??'0'))]});}
      catch(e){throw plainWalletError(e);}
      return confirmedHash(result||undefined,method==='ft_transfer_call'?String((args as {amount:string}).amount):undefined);
    }finally{setBusy(false);}
  },[selector,account]);
  return <WalletCtx.Provider value={{account,ready:!!selector,busy,error,connect,disconnect,call}}>{children}</WalletCtx.Provider>;
}

type Route={page:'landing'|'vaults'|'vault'|'portfolio'|'activity'|'relay'|'governance';slug?:string;key?:string};
function parse(path:string):Route{
  const p=path.replace(/\/+$/,'')||'/';
  if(p==='/')return {page:'landing'};
  if(p==='/vaults'||p==='/app')return {page:'vaults'};
  const m=p.match(/^\/vault(?:\/([a-z]+))?$/);if(m)return {page:'vault',slug:m[1]||'core'};
  if(p==='/portfolio'||p==='/position')return {page:'portfolio'};
  if(p==='/activity')return {page:'activity'};
  if(p==='/relay')return {page:'relay'};
  if(p==='/governance'||p==='/vote')return {page:'governance'};
  return {page:'landing'};
}
function useRoute(){
  const [path,setPath]=useState(location.pathname+location.search);
  useEffect(()=>{const on=()=>setPath(location.pathname+location.search);addEventListener('popstate',on);return()=>removeEventListener('popstate',on);},[]);
  return {...parse(path.split('?')[0]),key:path};
}
export const go=(path:string)=>(e:React.MouseEvent)=>{if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();navigate(path);};
export function Link({to,className,children,label}:{to:string;className?:string;children:ReactNode;label?:string}){
  return <a href={to} onClick={go(to)} className={className} aria-label={label}>{children}</a>;
}

const TITLES:Record<Route['page'],string>={landing:'Kuroko · USDC that works backstage',vaults:'Vaults · Kuroko',vault:'Vault · Kuroko',portfolio:'Portfolio · Kuroko',activity:'Activity · Kuroko',relay:'Relay · Kuroko',governance:'Governance · Kuroko'};
export default function App(){
  const route=useRoute();
  useEffect(()=>{document.title=TITLES[route.page];},[route.page]);
  return <WalletProvider><StoreProvider>
    {route.page==='landing'?<Landing/>:<AppShell route={route}/>}
  </StoreProvider></WalletProvider>;
}

const NAV:[Route['page'],string,string,Parameters<typeof Icon>[0]['name']][]=[
  ['vaults','/vaults','Vaults','vault'],['portfolio','/portfolio','Portfolio','user'],['activity','/activity','Activity','list'],['relay','/relay','Relay','pulse'],['governance','/governance','Governance','vote'],
];
export function Heartbeat(){
  const {head}=useStore();const now=useNow(1000);
  const h=val(head);const stale=!h||now-h.at>15000;
  return <span className="beat" title="NEAR testnet, latest final block">
    <Pulse tone={stale?'warn':'ok'}/>
    <span className="beat-net">Testnet</span>
    <span className="beat-h mono">{h?`#${h.height.toLocaleString('en-US')}`:'…'}</span>
  </span>;
}
export function WalletButton({dark=false}:{dark?:boolean}){
  const w=useWallet();
  return w.account
    ?<button className={`btn btn-sm ${dark?'btn-ghost-dark':'btn-line'} acct`} onClick={()=>void w.disconnect()} title="Disconnect wallet"><span className="acct-dot"/><span className="mono">{short(w.account,10,6)}</span></button>
    :<button className="btn btn-sm btn-ink" onClick={()=>void w.connect()} disabled={!w.ready}><Icon name="wallet" size={15}/><span>Connect<span className="hide-sm"> wallet</span></span></button>;
}

function AppShell({route}:{route:Route}){
  const w=useWallet();
  const active=route.page==='vault'?'vaults':route.page;
  return <div className="app">
    <header className="appbar">
      <div className="appbar-in">
        <Link to="/" className="brand" label="Kuroko home"><Mark/><span>Kuroko</span></Link>
        <nav className="appnav" aria-label="App">{NAV.map(([p,to,label])=><a key={p} href={to} onClick={go(to)} aria-current={active===p?'page':undefined}>{label}</a>)}</nav>
        <div className="appbar-end"><Heartbeat/><WalletButton/></div>
      </div>
    </header>
    {w.error&&<div className="banner" role="alert"><Icon name="info"/>{w.error}</div>}
    <main className="app-main" key={route.key}>
      {route.page==='vaults'&&<VaultsPage/>}
      {route.page==='vault'&&<VaultPage slug={route.slug!}/>}
      {route.page==='portfolio'&&<Portfolio/>}
      {route.page==='activity'&&<ActivityPage/>}
      {route.page==='relay'&&<Relay/>}
      {route.page==='governance'&&<Governance/>}
    </main>
    <AppFooter/>
    <nav className="tabbar" aria-label="App tabs">{NAV.map(([p,to,label,icon])=><a key={p} href={to} onClick={go(to)} aria-current={active===p?'page':undefined}><Icon name={icon} size={20}/><span>{label==='Governance'?'Vote':label}</span></a>)}</nav>
  </div>;
}
function AppFooter(){
  return <footer className="appfoot"><div className="appfoot-in">
    <span><Mark size={20}/> Kuroko · NEAR testnet</span>
    <a href="https://github.com/nickthelegend/kuroko-near" target="_blank" rel="noreferrer">Source</a>
    <a href="https://docs.near-intents.org/integration/market-makers/introduction" target="_blank" rel="noreferrer">NEAR Intents market makers</a>
    <span className="muted">MIT · © 2026 Nivesh Gajengi</span>
  </div></footer>;
}
