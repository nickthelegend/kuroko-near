import {useEffect,useState} from 'react';
import type {Data,Wallet} from './App';
import {netDeposited} from './activity';
import {decimal,exampleDepositor,navigate,nearblocksAccount,nearblocksTx,sharePrice,short,usdc,vaultId,view,when} from './rpc';
import {Icon,Stat,useLive,valueOf} from './ui';

const ACCOUNT_RE=/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

/** Your position: the connected wallet, or any account given as ?account= (read-only). */
export default function Position({data,wallet}:{data:Data;wallet:Wallet}){
  const [query,setQuery]=useState(()=>new URLSearchParams(location.search).get('account')||'');
  useEffect(()=>{const on=()=>setQuery(new URLSearchParams(location.search).get('account')||'');addEventListener('popstate',on);return()=>removeEventListener('popstate',on);},[]);
  const requested=wallet.account||query;
  const invalid=!!requested&&(!ACCOUNT_RE.test(requested)||requested.length<2||requested.length>64);
  const account=invalid?'':requested;
  const readOnly=!wallet.account&&!!query;
  const [shares]=useLive(async()=>account?view<string>(vaultId,'shares_of',{account_id:account}):null,15000,[account,valueOf(data.vault)?.total_shares]);
  const v=valueOf(data.vault);
  const h=valueOf(data.history);
  const s=valueOf(shares);
  const price=v?sharePrice(v.usdc_balance,v.total_shares):null;
  const value=s!=null&&price!=null?BigInt(s)*price/1_000_000n:null;
  const reconciled=h&&v&&h.cash===BigInt(v.usdc_balance)&&h.shares===BigInt(v.total_shares);
  const net=h&&account&&reconciled?netDeposited(h,account):null;
  const earned=value!=null&&net!=null?value-net:null;
  const pct=s!=null&&v&&BigInt(v.total_shares)>0n?Number(BigInt(s)*10000n/BigInt(v.total_shares))/100:null;
  const mine=h&&account?h.events.filter(e=>e.account===account).reverse():[];
  const [lookup,setLookup]=useState('');
  const [lookupErr,setLookupErr]=useState('');
  const look=(id:string)=>navigate(`/position?account=${encodeURIComponent(id)}`);

  if(!account)return <div className="wrap narrow">
    <header className="phead"><h1>Your position</h1><p className="vh-desc">Connect a NEAR testnet wallet to see your shares and what they are worth.</p></header>
    <button className="btn btn-ink" onClick={()=>void wallet.connect()} disabled={!wallet.ready}>Connect wallet</button>
    <form className="lookup" onSubmit={e=>{e.preventDefault();const id=lookup.trim().toLowerCase();if(!ACCOUNT_RE.test(id)||id.length<2||id.length>64){setLookupErr('Enter a NEAR account ID, like name.testnet');return;}setLookupErr('');look(id);}}>
      <label className="field"><span>Or look up any account, read-only</span>
        <span className="lookup-row"><input value={lookup} onChange={e=>setLookup(e.target.value)} placeholder="name.testnet" autoCapitalize="off" spellCheck={false}/><button className="btn btn-line">View</button></span>
      </label>
      {(lookupErr||invalid)&&<p className="err" role="alert">{lookupErr||'Enter a NEAR account ID, like name.testnet'}</p>}
      {exampleDepositor&&<p className="fine">For example, the depositor from the recorded testnet run: <a className="mono" href={`/position?account=${exampleDepositor}`} onClick={e=>{e.preventDefault();look(exampleDepositor);}}>{short(exampleDepositor,12,8)}</a></p>}
    </form>
  </div>;

  return <div className="wrap narrow">
    <header className="phead">
      <h1>{readOnly?'Position':'Your position'}</h1>
      <p className="vh-meta"><a className="mono" href={nearblocksAccount(account)} target="_blank" rel="noreferrer">{short(account,18,8)}</a>
        {readOnly&&<><span className="sep" aria-hidden="true">·</span>Read-only<span className="sep" aria-hidden="true">·</span><a href="/position" onClick={e=>{e.preventDefault();navigate('/position');}}>Clear</a></>}</p>
    </header>
    {data.vault.state==='error'&&<p className="err" role="alert">{data.vault.message}</p>}
    {shares.state==='error'&&<p className="err" role="alert">{shares.message}</p>}
    <section className="stats" aria-label="Position numbers">
      <Stat label="Value" value={value!=null?usdc(value):'—'} unit="USDC"/>
      <Stat label="Shares" value={s!=null?decimal(s,6,4):'—'}/>
      <Stat label="Share of vault" value={pct!=null?`${pct===100?'100':pct.toFixed(2)}%`:s==='0'?'0%':'—'}/>
      <Stat label="Earned" value={earned!=null?usdc(earned):'—'} unit="USDC" note="Stays 0 until Kuroko fills swaps"/>
    </section>
    <section className="block" aria-labelledby="pact-h">
      <div className="block-head"><h2 id="pact-h">Activity</h2>{net!=null&&<span className="muted">Net deposited {usdc(net)} USDC</span>}</div>
      {data.history.state==='error'&&h&&<p className="err" role="alert">History could not refresh: {data.history.message}</p>}
      {!h?(data.history.state==='error'?<p className="err" role="alert">{data.history.message}</p>:<div className="sk sk-rows" aria-busy="true"><span/><span/></div>)
        :mine.length===0?<p className="empty">No deposits from this account. <a href="/" onClick={e=>{e.preventDefault();navigate('/');}}>Deposit on the vault page</a>.</p>
        :<table className="table">
          <thead><tr><th>Date</th><th>Action</th><th className="r">Amount</th><th className="r">Shares</th><th className="r">Transaction</th></tr></thead>
          <tbody>{mine.map(e=><tr key={e.hash+e.kind}>
            <td data-label="Date">{when(e.at)}</td>
            <td data-label="Action">{e.kind==='deposit'?'Deposit':'Withdrawal'}</td>
            <td data-label="Amount" className="r num">{e.kind==='deposit'?'+':'−'}{usdc(e.amount)} USDC</td>
            <td data-label="Shares" className="r num">{e.kind==='deposit'?'+':'−'}{decimal(e.shares,6,4)}</td>
            <td data-label="Transaction" className="r"><a className="mono tx" href={nearblocksTx(e.hash)} target="_blank" rel="noreferrer">{short(e.hash,6,4)}<Icon name="external" size={13}/></a></td>
          </tr>)}</tbody>
        </table>}
    </section>
  </div>;
}
