import {useEffect,useState} from 'react';
import type {Data,Wallet} from './App';
import {netDeposited} from './activity';
import {ago,decimal,exampleDepositor,navigate,nearblocksAccount,nearblocksTx,sharePrice,short,usdNumber,vaultId,view} from './rpc';
import {Chip,CountUp,Empty,Icon,useLive,useNow,valueOf} from './ui';

const ACCOUNT_RE=/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/** Your position: the connected wallet, or any account given as ?account= (read-only). */
export default function Position({data,wallet}:{data:Data;wallet:Wallet}){
  const now=useNow();
  const [query,setQuery]=useState(()=>new URLSearchParams(location.search).get('account')||'');
  useEffect(()=>{const on=()=>setQuery(new URLSearchParams(location.search).get('account')||'');addEventListener('popstate',on);return()=>removeEventListener('popstate',on);},[]);
  const account=wallet.account||query;
  const readOnly=!wallet.account&&!!query;
  const [shares]=useLive(async()=>account?view<string>(vaultId,'shares_of',{account_id:account}):null,15000,[account]);
  const v=valueOf(data.vault);
  const h=valueOf(data.history);
  const s=valueOf(shares);
  const price=v?sharePrice(v.usdc_balance,v.total_shares):null;
  const value=s!=null&&price!=null?BigInt(s)*price/1_000_000n:null;
  const net=h&&account?netDeposited(h,account):null;
  const earned=value!=null&&net!=null?value-net:null;
  const pct=s!=null&&v&&BigInt(v.total_shares)>0n?Number(BigInt(s)*10000n/BigInt(v.total_shares))/100:null;
  const mine=h&&account?h.events.filter(e=>e.account===account).reverse():[];
  const [lookup,setLookup]=useState('');
  const [lookupErr,setLookupErr]=useState('');
  const look=(id:string)=>{navigate(`/position?account=${encodeURIComponent(id)}`);};

  if(!account)return <div className="page wrap narrow">
    <header className="pos-head"><h1>Your position</h1><p className="muted">Connect a NEAR testnet wallet to see your shares, their value and what you have earned.</p></header>
    <div className="card connect-card">
      <Empty icon="wallet" title="No wallet connected" action={<button className="btn btn-dark btn-lg" onClick={()=>void wallet.connect()} disabled={!wallet.ready}><Icon name="wallet" size={18}/>Connect a testnet wallet</button>}>Kuroko never holds your keys; your wallet signs each deposit and withdrawal.</Empty>
      <div className="or"><span>or look up any account, read-only</span></div>
      <form className="lookup" onSubmit={e=>{e.preventDefault();const id=lookup.trim().toLowerCase();if(!ACCOUNT_RE.test(id)||id.length<2||id.length>64){setLookupErr('Enter a NEAR account ID, like name.testnet');return;}setLookupErr('');look(id);}}>
        <label className="field"><span>NEAR testnet account</span><input value={lookup} onChange={e=>setLookup(e.target.value)} placeholder="name.testnet" autoCapitalize="off" spellCheck={false}/></label>
        <button className="btn btn-quiet">View</button>
      </form>
      {lookupErr&&<p className="fail" role="alert"><Icon name="x" size={14}/>{lookupErr}</p>}
      {exampleDepositor&&<p className="muted small">Example: the depositor from our recorded testnet run, <a href={`/position?account=${exampleDepositor}`} onClick={e=>{e.preventDefault();look(exampleDepositor);}}>{exampleDepositor}</a></p>}
    </div>
  </div>;

  return <div className="page wrap narrow">
    <header className="pos-head">
      <div><h1>{readOnly?'Position':'Your position'}</h1>
        <p className="vh-sub"><a href={nearblocksAccount(account)} target="_blank" rel="noreferrer"><code>{short(account,22,8)}</code><Icon name="external" size={13}/></a>{readOnly&&<Chip>Read-only</Chip>}</p></div>
      {readOnly&&<button className="btn btn-quiet btn-sm" onClick={()=>navigate('/position')}>Clear</button>}
    </header>
    {shares.state==='error'&&<p className="inline-error" role="alert"><Icon name="x" size={16}/>{shares.message}</p>}
    <section className="pos-hero">
      <div className="ph-main"><span>Position value</span><CountUp value={value!=null?usdNumber(value):null} decimals={4} suffix=" USDC"/><small>{s!=null?`${decimal(s,6,4)} shares × ${price!=null?decimal(price,6,4):'…'} USDC`:'reading shares…'}</small></div>
      <div className="ph-grid">
        <div><span>Share of vault</span><b>{pct!=null?`${pct.toFixed(2)}%`:s==='0'?'0%':'—'}</b></div>
        <div><span>Net deposited</span><b>{net!=null?`${decimal(net,6,4)} USDC`:'…'}</b></div>
        <div><span>Earned</span><b className={earned!=null&&earned>0n?'gain':''}>{earned!=null?`${decimal(earned,6,4)} USDC`:'…'}</b></div>
      </div>
      <p className="ph-note"><Icon name="flag" size={14}/>Earned stays at 0 until Kuroko fills real swaps; it does not today.</p>
    </section>
    <section className="card">
      <header className="card-head"><div><h2>{readOnly?'Activity':'Your activity'}</h2><p className="muted small">Deposits and withdrawals by this account</p></div></header>
      {!h?(data.history.state==='error'?<p className="inline-error" role="alert"><Icon name="x" size={16}/>{data.history.message}</p>:<div className="table-sk" aria-busy="true"><span/><span/></div>)
        :mine.length===0?<Empty title="No deposits from this account" action={<a className="btn btn-dark" href="/vault" onClick={e=>{e.preventDefault();navigate('/vault');}}>Go to the vault <Icon name="arrow"/></a>}>Deposit USDC on the vault page to get shares.</Empty>
        :<ul className="feed">{mine.map(e=><li key={e.hash+e.kind} className="feed-row">
          <span className={`badge b-${e.kind}`}><Icon name={e.kind==='deposit'?'plus':'minus'} size={14}/></span>
          <span className="fr-main"><b>{e.kind==='deposit'?'Deposited':'Withdrew'} {decimal(e.amount,6,2)} USDC</b><small>{e.kind==='deposit'?`got ${decimal(e.shares,6,4)} shares`:`redeemed ${decimal(e.shares,6,4)} shares`} · {ago(e.at,now)}</small></span>
          <a className="fr-link" href={nearblocksTx(e.hash)} target="_blank" rel="noreferrer" aria-label={`Open transaction ${e.hash} on NearBlocks`}>{short(e.hash,5,4)}<Icon name="external" size={13}/></a>
        </li>)}</ul>}
    </section>
  </div>;
}
