import {useEffect,useState} from 'react';
import {Link,useWallet} from '../App';
import {useStore,val,openVote,type VaultLive} from '../store';
import {vaultBySlug} from '../vaults';
import {cashPoints,pricePoints,priceNum,usd,bps,statusOf,sharesFor,usdcFor} from '../derive';
import {decimal,nearblocksAccount,rawUnits,short,usdc,usdcId,view,when} from '../rpc';
import {Art,Copy,Empty,Icon,Num,Pulse,Skel,StepChart,TxLink,agoShort,useLive,useNow,valueOf} from '../ui';
import {Pair,Token} from '../tokens';
import {Feed} from './Activity';
import {TradeCheck} from './Governance';

/** Morpho's vault page anatomy: header, numbers, chart, then allocation, rules and activity, with a sticky deposit card. */
export default function VaultPage({slug}:{slug:string}){
  const store=useStore();
  const meta=vaultBySlug(slug);
  const v=store.vaults.find(x=>x.meta.slug===slug);
  if(!meta||!v)return <div className="page"><Empty art="empty" title="No such vault" action={<Link to="/vaults" className="btn btn-ink">See all vaults</Link>}>Kuroko has three vaults on testnet: Core, Wide and Stable.</Empty></div>;
  return <VaultBody v={v}/>;
}

function VaultBody({v}:{v:VaultLive}){
  const w=useWallet();const now=useNow(1000);
  const s=val(v.state),h=val(v.history),props=val(v.proposals);
  const vote=openVote(props);
  const st=statusOf(s,!!vote,v.state.state==='error');
  const [metric,setMetric]=useState<'cash'|'price'>('cash');
  const [mine,refreshMine]=useLive(async()=>w.account?view<string>(v.meta.id,'shares_of',{account_id:w.account}):null,8000,[w.account,s?.total_shares]);
  const myShares=valueOf(mine);
  const myValue=s&&myShares!=null?usd(usdcFor(BigInt(myShares),s)):null;
  const outflow=h?h.events.filter(e=>e.kind==='out').reduce((a,e)=>a+e.amount,0n):0n;
  const last=h?.events.at(-1);
  return <div className="page vault-page">
    <nav className="crumbs" aria-label="Breadcrumb"><Link to="/vaults">Vaults</Link><Icon name="chevron" size={14}/><span aria-current="page">{v.meta.name}</span></nav>
    <header className="vhead">
      <span className={`vicon vicon-lg vicon-${v.meta.tone}`}><Token name="USDC" size={52}/></span>
      <div className="vhead-t">
        <h1>{v.meta.name}</h1>
        <p className="vhead-meta">
          <span className={`status status-${st.tone}`}><Pulse tone={st.tone}/>{st.label}</span>
          <span className="nowrap"><a className="mono" href={nearblocksAccount(v.meta.id)} target="_blank" rel="noreferrer">{short(v.meta.id,14,8)}</a><Copy value={v.meta.id}/></span>
          <span className="nowrap muted">Circle testnet USDC</span>
        </p>
        <p className="vhead-blurb">{v.meta.blurb}</p>
      </div>
    </header>

    <div className="vault-grid">
      <div className="vault-main">
        <section className="kpis" aria-label="Vault numbers">
          <div className="kpi kpi-lead"><span className="label">Total deposits</span>{s?<Num value={usd(s.usdc_balance)} dp={2} unit="USDC" className="kpi-num"/>:<Skel h={40} w={160}/>}<span className="kpi-sub">{last?<>Last change {agoShort(last.at,now)}</>:'…'}</span></div>
          <div className="kpi"><span className="label">Share price, USDC</span>{s?<Num value={priceNum(s)} dp={6} strong={2} className="kpi-num"/>:<Skel h={40} w={160}/>}<span className="kpi-sub">Moves only with earned spread</span></div>
          <div className="kpi"><span className="label">APY</span><span className="kpi-num apy-none">—</span><span className="kpi-sub">No fills yet</span></div>
          <div className="kpi"><span className="label">Your position</span>{!w.account?<><span className="kpi-num num-empty">—</span><button type="button" className="kpi-sub linkish" onClick={()=>void w.connect()} disabled={!w.ready}>Connect wallet</button></>:myValue==null?<Skel h={40} w={110}/>:<><Num value={myValue} dp={2} unit="USDC" className="kpi-num"/><span className="kpi-sub">{decimal(myShares!,6,4)} shares</span></>}</div>
        </section>
        {v.state.state==='error'&&!s&&<Empty art="relay" tone="err" title="Vault state unavailable">{v.state.message}</Empty>}

        <section className="card chart-card">
          <div className="card-head">
            <div><span className="label">{metric==='cash'?'Deposits':'Share price'}</span>{s&&<div className="chart-now">{metric==='cash'?<Num value={usd(s.usdc_balance)} dp={2} unit="USDC"/>:<Num value={priceNum(s)} dp={6} strong={2} unit="USDC"/>}</div>}</div>
            <div className="seg" role="group" aria-label="Chart"><button type="button" aria-pressed={metric==='cash'} onClick={()=>setMetric('cash')}>Deposits</button><button type="button" aria-pressed={metric==='price'} onClick={()=>setMetric('price')}>Share price</button></div>
          </div>
          {h?<StepChart points={metric==='cash'?cashPoints(h):pricePoints(h)} dp={metric==='cash'?2:4} floor0={metric==='cash'} empty={<Empty art="empty" title="No deposits yet">The first deposit starts this chart.</Empty>}/>:v.history.state==='error'&&!h?<Empty art="relay" tone="err" title="History unavailable">{v.history.message}</Empty>:<Skel h={260} r={16}/>}
          <p className="fine">Rebuilt from {h?h.events.length:'…'} on-chain USDC transfers{metric==='price'?'. The share price stays at 1.00 until the vault earns from a fill.':'.'}</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Where the money is</h2><span className="muted">Live from the contract</span></div>
          <div className="alloc">
            <div className="alloc-bar" aria-hidden="true"><span className="alloc-idle" style={{width:'100%'}}/></div>
            <div className="alloc-row"><span className="dotk idle"/><span>Held in the vault</span><span className="r">{s?<><Num value={usd(s.usdc_balance)} dp={2}/> USDC</>:'…'}</span><span className="r muted">100%</span></div>
            <div className="alloc-row"><span className="dotk solver"/><span>Out with the solver<span className="tag tag-blocked">Blocked</span></span><span className="r">{usdc(outflow)} USDC</span><span className="r muted">0%</span></div>
          </div>
          <p className="fine">Funds stay in the contract until a solver can quote. That needs NEAR Intents relay access (<code>PARTNER_JWT</code>) and a signer the vault can restrict. See <Link to="/relay">relay status</Link>.</p>
        </section>

        <section className="card">
          <div className="card-head"><h2>Rules</h2><Link to="/governance" className="more">Vote on rules <Icon name="arrow" size={14}/></Link></div>
          {s?<dl className="rules">
            <div><dt>Pairs it may quote</dt><dd className="pairs">{s.constitution.allowed_pairs.map(p=><Pair key={p} pair={p}/>)}</dd></div>
            <div><dt>Largest single trade</dt><dd><Num value={usd(s.constitution.max_inventory_usdc)} dp={2} unit="USDC"/></dd></div>
            <div><dt>Smallest fee it may charge</dt><dd>{bps(s.constitution.min_spread_bps)}</dd></div>
            <div><dt>Pauses after a daily loss of</dt><dd><Num value={usd(s.constitution.daily_loss_limit_usdc)} dp={2} unit="USDC"/></dd></div>
          </dl>:<Skel h={120}/>}
          {vote&&<div className="vote-note"><Icon name="lock" size={16}/>A vote is open until {when(vote.closes_at_ms)}. Deposits and withdrawals wait until it closes.</div>}
          {s&&<TradeCheck vaultId={v.meta.id} pairs={s.constitution.allowed_pairs} minSpread={s.constitution.min_spread_bps}/>}
        </section>

        <section className="card">
          <div className="card-head"><h2>Activity</h2><span className="muted">{h?`${h.events.length} transfers · ${h.depositors.size} depositors`:'…'}</span></div>
          <Feed filter={e=>e.vault.slug===v.meta.slug}/>
        </section>
      </div>

      <aside className="vault-side"><DepositCard v={v} locked={!!vote} myShares={myShares??null} onDone={refreshMine}/></aside>
    </div>
    <a href="#deposit" className="mobile-cta btn btn-accent" onClick={e=>{e.preventDefault();document.getElementById('deposit')?.scrollIntoView({behavior:'smooth',block:'start'});}}>Deposit or withdraw</a>
  </div>;
}

type Phase={k:'idle'}|{k:'pending';since:number;mode:'deposit'|'withdraw';amount:string}|{k:'done';hash:string;mode:'deposit'|'withdraw';amount:string;got:string}|{k:'error';message:string};
function DepositCard({v,locked,myShares,onDone}:{v:VaultLive;locked:boolean;myShares:string|null;onDone:()=>void}){
  const w=useWallet();const store=useStore();const now=useNow(200);
  const s=val(v.state);
  const [mode,setMode]=useState<'deposit'|'withdraw'>('deposit');
  const [amount,setAmount]=useState('');
  const [phase,setPhase]=useState<Phase>({k:'idle'});
  const [bal,refreshBal]=useLive(async()=>w.account?view<string>(usdcId,'ft_balance_of',{account_id:w.account}):null,10000,[w.account]);
  const wal=valueOf(bal)??null;
  useEffect(()=>{setPhase({k:'idle'});},[v.meta.slug]);
  let preview='',inputErr='';
  try{if(amount&&s){const raw=BigInt(rawUnits(amount));preview=mode==='deposit'?`${decimal(sharesFor(raw,s),6,4)} shares`:`${usdc(usdcFor(raw,s))} USDC`;}}catch(e){inputErr=(e as Error).message;}
  const max=mode==='deposit'?wal:myShares;
  const over=(()=>{try{return !!amount&&max!==null&&BigInt(rawUnits(amount))>BigInt(max);}catch{return false;}})();
  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!s)return;
    try{
      const raw=rawUnits(amount);
      if(max!==null&&BigInt(raw)>BigInt(max))throw Error(mode==='deposit'?'That is more USDC than your wallet holds.':'That is more shares than you hold.');
      const got=mode==='deposit'?`${decimal(sharesFor(BigInt(raw),s),6,4)} shares`:`${usdc(usdcFor(BigInt(raw),s))} USDC`;
      setPhase({k:'pending',since:Date.now(),mode,amount});
      const hash=mode==='deposit'
        ?await w.call('ft_transfer_call',{receiver_id:v.meta.id,amount:raw,msg:''},{deposit:'1',receiver:usdcId})
        :await w.call('withdraw',{shares:raw},{receiver:v.meta.id});
      setPhase({k:'done',hash,mode,amount,got});setAmount('');store.refresh();refreshBal();onDone();
    }catch(err){setPhase({k:'error',message:(err as Error).message});}
  }
  const pick=(m:'deposit'|'withdraw')=>{setMode(m);setPhase({k:'idle'});setAmount('');};
  if(phase.k==='done')return <section className="dcard dcard-done" id="deposit" role="status" aria-live="polite">
    <Art name="coins" alt="" className="done-art"/>
    <span className="done-check"><Icon name="check" size={22}/></span>
    <h3>{phase.mode==='deposit'?'Deposit confirmed':'Withdrawal confirmed'}</h3>
    <p className="done-amt"><Num value={Number(phase.amount)} dp={2}/> <span className="unit">{phase.mode==='deposit'?'USDC in':'shares redeemed'}</span></p>
    <dl className="facts">
      <div><dt>{phase.mode==='deposit'?'You received':'You received'}</dt><dd>{phase.got}</dd></div>
      <div><dt>Vault deposits now</dt><dd>{s?<Num value={usd(s.usdc_balance)} dp={2} unit="USDC"/>:'…'}</dd></div>
      <div><dt>Transaction</dt><dd><TxLink hash={phase.hash}/></dd></div>
    </dl>
    <button type="button" className="btn btn-ink wide" onClick={()=>setPhase({k:'idle'})}>Done</button>
  </section>;
  const pending=phase.k==='pending';
  return <section className={`dcard ${pending?'is-pending':''}`} id="deposit" aria-label="Deposit or withdraw">
    <div className="tabs" role="tablist" aria-label="Action">
      <button type="button" role="tab" aria-selected={mode==='deposit'} onClick={()=>pick('deposit')} disabled={pending}>Deposit</button>
      <button type="button" role="tab" aria-selected={mode==='withdraw'} onClick={()=>pick('withdraw')} disabled={pending}>Withdraw</button>
    </div>
    <form onSubmit={submit}>
      <label className={`amount ${inputErr||over?'amount-err':''}`}>
        <span className="amount-top"><span>{mode==='deposit'?'You deposit':'Shares to redeem'}</span>
          {w.account&&<span className="amount-bal">{mode==='deposit'?'Wallet':'You hold'} {max!=null?(mode==='deposit'?usdc(max):decimal(max,6,4)):'…'}{max&&max!=='0'&&<button type="button" className="max" aria-label={mode==='deposit'?'Use full USDC balance':'Use all shares'} onClick={()=>setAmount(decimal(max).replace(/,/g,''))} disabled={pending}>Max</button>}</span>}
        </span>
        <span className="amount-box">
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={e=>{setAmount(e.target.value);if(phase.k==='error')setPhase({k:'idle'});}} aria-label={mode==='deposit'?'USDC amount':'Shares to redeem'} disabled={pending}/>
          <span className="amount-unit">{mode==='deposit'?<><Token name="USDC" size={22}/>USDC</>:<><span className="share-disc">K</span>Shares</>}</span>
        </span>
      </label>
      {(inputErr||over)&&amount&&<p className="field-err">{over?(mode==='deposit'?'More than your wallet holds.':'More shares than you hold.'):inputErr}</p>}
      <dl className="facts">
        <div><dt>{mode==='deposit'?'You get':'You receive'}</dt><dd>{preview||'—'}</dd></div>
        <div><dt>Share price</dt><dd>{s?`${decimal(BigInt(Math.round((priceNum(s)??1)*1e6)),6,6)} USDC`:'—'}</dd></div>
        <div><dt>Network</dt><dd>NEAR testnet</dd></div>
      </dl>
      {!w.account
        ?<button type="button" className="btn btn-accent wide" onClick={()=>void w.connect()} disabled={!w.ready}><Icon name="wallet" size={16}/>Connect wallet</button>
        :<button className="btn btn-accent wide" disabled={pending||locked||!amount||!!inputErr||over||!s||(mode==='deposit'&&!!s?.paused)}>
          {pending?<><span className="spin" aria-hidden="true"/>Confirming on NEAR · {((now-phase.since)/1000).toFixed(1)} s</>:locked?<><Icon name="lock" size={16}/>Locked for a vote</>:mode==='deposit'&&s?.paused?'Vault paused':mode==='deposit'?'Deposit USDC':'Withdraw USDC'}
        </button>}
      {pending&&<p className="pending-note" role="status">Approve in your wallet if it asks. Kuroko waits for the final block before confirming.</p>}
      {phase.k==='error'&&<p className="form-err" role="alert"><Icon name="info" size={16}/>{phase.message}</p>}
      <p className="fine">Circle testnet USDC on NEAR. <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">Get some from Circle’s faucet</a>. Withdraw any time no vote is open.</p>
    </form>
  </section>;
}
