import {useEffect,useState} from 'react';
import {Link,useWallet} from '../App';
import {useStore,val} from '../store';
import {usdcFor,usd} from '../derive';
import {netDeposited} from '../activity';
import {decimal,navigate,usdcId,view} from '../rpc';
import {TEST_ACCOUNTS} from '../vaults';
import {Art,Empty,Icon,Num,Skel,useLive,valueOf} from '../ui';
import {Token} from '../tokens';
import {Feed} from './Activity';

const VALID=/^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
/** Yearn's Portfolio: one total, then a row per vault you hold, then your own transactions. Read-only lookup works without a wallet. */
export default function Portfolio(){
  const w=useWallet();const {vaults}=useStore();
  const q=new URLSearchParams(location.search).get('account')??'';
  const account=q||w.account;
  const [input,setInput]=useState(q);
  useEffect(()=>{setInput(q);},[q]);
  const [rows]=useLive(async()=>account?Promise.all(vaults.map(v=>view<string>(v.meta.id,'shares_of',{account_id:account}))):null,8000,[account,...vaults.map(v=>val(v.state)?.total_shares)]);
  const [bal]=useLive(async()=>account?view<string>(usdcId,'ft_balance_of',{account_id:account}).catch(()=>'0'):null,15000,[account]);
  const shares=valueOf(rows);
  const positions=shares?vaults.map((v,i)=>{const s=val(v.state);const sh=BigInt(shares[i]);return {v,sh,value:s?usdcFor(sh,s):0n,pct:s&&BigInt(s.total_shares)>0n?Number(sh*10000n/BigInt(s.total_shares))/100:0,net:val(v.history)?netDeposited(val(v.history)!,account):null};}).filter(p=>p.sh>0n):null;
  const total=positions?.reduce((a,p)=>a+p.value,0n)??null;
  const lookup=(e:React.FormEvent)=>{e.preventDefault();const id=input.trim().toLowerCase();if(!id||!VALID.test(id))return;navigate(`/portfolio?account=${encodeURIComponent(id)}`);};
  return <div className="page">
    <header className="page-head">
      <div><h1>Portfolio</h1><p className="lede">{account?<>Positions for <span className="mono">{account}</span>{TEST_ACCOUNTS.has(account)&&<span className="tag">test</span>}</>:'Connect a wallet, or look up any NEAR testnet account read-only.'}</p></div>
      <form className="lookup" onSubmit={lookup} role="search">
        <Icon name="search" size={16}/><input value={input} onChange={e=>setInput(e.target.value)} placeholder="name.testnet" aria-label="NEAR testnet account" spellCheck={false} autoCapitalize="off"/>
        <button className="btn btn-sm btn-ink">Look up</button>
      </form>
    </header>
    {!account?<div className="card"><Empty art="vault" title="Nothing to show yet" action={<div className="row-actions"><button className="btn btn-accent" onClick={()=>void w.connect()} disabled={!w.ready}><Icon name="wallet" size={16}/>Connect wallet</button><Link to="/portfolio?account=kuroko-lp2-222541d6.testnet" className="btn btn-line">See an example depositor</Link></div>}>Your vault shares, their value and your history appear here.</Empty></div>
    :<>
      <section className="kpis kpis-3">
        <div className="kpi kpi-lead"><span className="label">Value in vaults</span>{total==null?<Skel h={44} w={160}/>:<Num value={usd(total)} dp={2} unit="USDC" className="kpi-num"/>}<span className="kpi-sub">{positions?`${positions.length} vault${positions.length===1?'':'s'}`:'…'}</span></div>
        <div className="kpi"><span className="label">Earned</span><span className="kpi-num"><Num value={0} dp={2} unit="USDC"/></span><span className="kpi-sub">No fills have earned anything yet</span></div>
        <div className="kpi"><span className="label">Wallet USDC</span>{valueOf(bal)==null?<Skel h={44} w={110}/>:<Num value={usd(valueOf(bal)!)} dp={2} unit="USDC" className="kpi-num"/>}<span className="kpi-sub">Circle testnet USDC</span></div>
      </section>
      <section className="block">
        <div className="block-head"><h2>Positions</h2></div>
        {rows.state==='error'&&!positions?<Empty art="relay" tone="err" title="Positions could not load">{rows.state==='error'?rows.message:''}</Empty>
        :!positions?<Skel h={120} r={16}/>
        :!positions.length?<div className="card"><Empty art="empty" title="No vault shares" action={<Link to="/vaults" className="btn btn-accent">Browse vaults</Link>}>This account holds no Kuroko shares right now.</Empty></div>
        :<div className="ptable">
          <div className="prow prow-head"><span>Vault</span><span className="r">Value</span><span className="r hide-sm">Shares</span><span className="r hide-sm">Share of vault</span><span className="r">Net deposited</span></div>
          {positions.map(p=><Link key={p.v.meta.slug} to={`/vault/${p.v.meta.slug}`} className="prow">
            <span className="vname"><span className={`vicon vicon-${p.v.meta.tone}`}><Token name="USDC" size={28}/></span><b>{p.v.meta.name}</b></span>
            <span className="r"><Num value={usd(p.value)} dp={2}/> USDC</span>
            <span className="r hide-sm">{decimal(p.sh,6,4)}</span>
            <span className="r hide-sm"><span className="share-bar"><i style={{width:`${p.pct}%`}}/></span>{p.pct.toFixed(1)}%</span>
            <span className="r">{p.net==null?'…':<Num value={usd(p.net)} dp={2}/>}</span>
          </Link>)}
        </div>}
      </section>
      <section className="block">
        <div className="block-head"><h2>History</h2></div>
        <Feed filter={e=>e.account===account}/>
      </section>
    </>}
    {!account&&<div className="port-art"><Art name="coins" alt="A stack of matte black coins under an orange spotlight"/></div>}
  </div>;
}
