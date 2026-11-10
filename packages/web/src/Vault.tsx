import {useEffect,useState} from 'react';
import type {Data,Wallet} from './App';
import {ago,decimal,navigate,nearblocksAccount,nearblocksTx,pairLabel,rawUnits,sharePrice,short,solverState,solverUrl,usdcId,usdNumber,vaultId,view,type Constitution,type Proposal,type SolverState} from './rpc';
import {Art,Chip,Copy,CountUp,Empty,Icon,ValueChart,useLive,useNow,valueOf} from './ui';

export default function VaultPage({data,wallet}:{data:Data;wallet:Wallet}){
  const now=useNow();
  const v=valueOf(data.vault);
  const h=valueOf(data.history);
  const [proposals,refreshProposals]=useLive(()=>view<Proposal[]>(vaultId,'proposals'),30000);
  const openVote=valueOf(proposals)?.find(p=>!p.executed&&Date.now()<p.closes_at_ms);
  const [metric,setMetric]=useState<'cash'|'price'>('cash');
  const readAt=data.vault.state==='ok'?data.vault.at:null;
  const mismatch=h&&v&&(h.cash!==BigInt(v.usdc_balance)||h.shares!==BigInt(v.total_shares));

  return <div className="page wrap">
    <nav className="crumbs" aria-label="Breadcrumb"><a href="/" onClick={e=>{e.preventDefault();navigate('/');}}>Kuroko</a><Icon name="arrow" size={14}/><span>USDC vault</span></nav>
    <header className="vault-head">
      <div className="vh-title">
        <span className="vh-token" aria-hidden="true">$</span>
        <div>
          <h1>Kuroko USDC vault</h1>
          <p className="vh-sub"><a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer"><code>{short(vaultId,18,8)}</code><Icon name="external" size={13}/></a><Copy value={vaultId}/></p>
        </div>
      </div>
      <div className="vh-status">
        <Chip tone={v?.paused?'bad':v?'live':'idle'}>{v?(v.paused?'Paused':openVote?'Vote open · locked':'Open for deposits'):'Loading'}</Chip>
        <span className="muted small">{readAt?`Read ${ago(readAt,now)}`:'Reading chain…'}</span>
      </div>
    </header>

    <div className="vault-grid">
      <div className="vault-main">
        <div className="kpis">
          <div className="kpi"><span>Vault USDC</span><CountUp value={v?usdNumber(v.usdc_balance):null} decimals={2}/><small>total value locked</small></div>
          <div className="kpi"><span>Share price</span><CountUp value={v?usdNumber(sharePrice(v.usdc_balance,v.total_shares)):null} decimals={4}/><small>USDC per share</small></div>
          <div className="kpi"><span>Earned from fills</span><CountUp value={0} decimals={2}/><small>no swaps filled yet</small></div>
          <div className="kpi"><span>APY</span><span className="num num-empty">—</span><small>needs real fills to measure</small></div>
        </div>
        {data.vault.state==='error'&&<p className="inline-error" role="alert"><Icon name="x" size={16}/>{data.vault.message}</p>}

        <section className="card">
          <header className="card-head">
            <div><h2>Vault value</h2><p className="muted small">Replayed from every USDC transfer into and out of the vault</p></div>
            <div className="seg" role="group" aria-label="Chart metric">
              <button type="button" aria-pressed={metric==='cash'} onClick={()=>setMetric('cash')}>USDC</button>
              <button type="button" aria-pressed={metric==='price'} onClick={()=>setMetric('price')}>Share price</button>
            </div>
          </header>
          {h?<ValueChart points={h.points} metric={metric}/>:data.history.state==='error'?<p className="inline-error" role="alert"><Icon name="x" size={16}/>History unavailable: {data.history.message}</p>:<div className="chart-sk" aria-busy="true"/>}
          {mismatch&&<p className="note"><Icon name="flag" size={14}/>The replayed history ({decimal(h.cash)} USDC) differs from the live contract ({decimal(v.usdc_balance)} USDC); the index may be a few blocks behind.</p>}
        </section>

        <Fills/>

        <section className="card">
          <header className="card-head"><div><h2>Deposits and withdrawals</h2><p className="muted small">{h?`${h.events.length} transfer${h.events.length===1?'':'s'} · ${h.depositors.size} depositor${h.depositors.size===1?'':'s'}`:'Reading the transaction index…'}</p></div></header>
          <Activity data={data} now={now}/>
        </section>

        <Rules data={data} wallet={wallet} proposals={valueOf(proposals)??null} locked={!!openVote} refresh={()=>{data.refresh();refreshProposals();}}/>
      </div>

      <aside className="vault-side">
        <TradeCard data={data} wallet={wallet} locked={!!openVote}/>
      </aside>
    </div>
  </div>;
}

function TradeCard({data,wallet,locked}:{data:Data;wallet:Wallet;locked:boolean}){
  const v=valueOf(data.vault);
  const [mode,setMode]=useState<'deposit'|'withdraw'>('deposit');
  const [amount,setAmount]=useState('');
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const [bal,refreshBal]=useLive(async()=>{if(!wallet.account)return null;const [usdc,shares]=await Promise.all([view<string>(usdcId,'ft_balance_of',{account_id:wallet.account}),view<string>(vaultId,'shares_of',{account_id:wallet.account})]);return {usdc,shares};},20000,[wallet.account]);
  const b=valueOf(bal)??null;
  const price=v?sharePrice(v.usdc_balance,v.total_shares):1_000_000n;
  let preview='';
  try{const raw=BigInt(rawUnits(amount));preview=mode==='deposit'?`≈ ${decimal(raw*1_000_000n/price,6,4)} shares`:`≈ ${decimal(raw*price/1_000_000n,6,4)} USDC back`;}catch{preview='';}
  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg(null);
    try{
      const raw=rawUnits(amount);let hash='';
      if(mode==='deposit')hash=await wallet.call('ft_transfer_call',{receiver_id:vaultId,amount:raw,msg:''},{deposit:'1',receiver:usdcId});
      else hash=await wallet.call('withdraw',{shares:raw});
      setMsg({ok:true,text:mode==='deposit'?'Deposit confirmed':'Withdrawal confirmed',hash});setAmount('');data.refresh();refreshBal();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  const max=mode==='deposit'?b?.usdc:b?.shares;
  return <section className="trade-card" aria-label="Deposit or withdraw">
    <div className="tabs" role="tablist" aria-label="Vault action">
      <button type="button" role="tab" aria-selected={mode==='deposit'} onClick={()=>{setMode('deposit');setMsg(null);}}>Deposit</button>
      <button type="button" role="tab" aria-selected={mode==='withdraw'} onClick={()=>{setMode('withdraw');setMsg(null);}}>Withdraw</button>
    </div>
    <form onSubmit={submit}>
      <label className="amount">
        <span className="amount-top"><span>{mode==='deposit'?'You deposit':'Shares to redeem'}</span>{wallet.account&&<span className="muted">{mode==='deposit'?'Wallet':'You hold'}: {b?decimal(mode==='deposit'?b.usdc:b.shares,6,4):'…'}</span>}</span>
        <span className="amount-box">
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={e=>{setAmount(e.target.value);setMsg(null);}} aria-label={mode==='deposit'?'USDC amount':'Shares'}/>
          {max&&max!=='0'&&<button type="button" className="max" onClick={()=>setAmount(decimal(max).replace(/,/g,''))}>Max</button>}
          <em className="unit">{mode==='deposit'?'USDC':'Shares'}</em>
        </span>
        <span className="preview">{preview||' '}</span>
      </label>
      <dl className="tc-facts">
        <div><dt>Share price</dt><dd>{decimal(price,6,4)} USDC</dd></div>
        <div><dt>Withdraw</dt><dd>any time, except during a vote</dd></div>
        <div><dt>Network</dt><dd>NEAR testnet</dd></div>
      </dl>
      {!wallet.account
        ?<button type="button" className="btn btn-dark btn-lg wide" onClick={()=>void wallet.connect()} disabled={!wallet.ready}><Icon name="wallet" size={18}/>Connect a testnet wallet</button>
        :<button className="btn btn-dark btn-lg wide" disabled={wallet.busy||locked||!amount||!!v?.paused}>{locked?'Locked while a vote is open':v?.paused?'Vault paused':wallet.busy?'Waiting for wallet…':mode==='deposit'?'Deposit USDC':'Withdraw USDC'}</button>}
      {msg&&<p className={msg.ok?'pass':'fail'} role={msg.ok?'status':'alert'}><Icon name={msg.ok?'check':'x'} size={15}/>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)} <Icon name="external" size={12}/></a></>}</p>}
      <p className="tc-note">Uses Circle’s testnet USDC on NEAR. Need some? <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">Circle faucet <Icon name="external" size={12}/></a> (pick NEAR testnet). Your wallet asks before every transaction.</p>
    </form>
  </section>;
}

function Activity({data,now}:{data:Data;now:number}){
  const h=valueOf(data.history);
  if(!h&&data.history.state==='loading')return <div className="table-sk" aria-busy="true"><span/><span/><span/></div>;
  if(!h)return <p className="inline-error" role="alert"><Icon name="x" size={16}/>{data.history.state==='error'?data.history.message:''}</p>;
  if(!h.events.length)return <Empty title="No deposits yet">The first deposit appears here with its transaction.</Empty>;
  return <div className="table" role="table" aria-label="Deposits and withdrawals">
    <div className="tr th" role="row"><span role="columnheader">Type</span><span role="columnheader">Account</span><span role="columnheader">Amount</span><span role="columnheader">When</span><span role="columnheader">Transaction</span></div>
    {h.events.slice().reverse().map(e=><div className="tr" role="row" key={e.hash+e.kind}>
      <span role="cell"><span className={`pill p-${e.kind}`}>{e.kind==='deposit'?'Deposit':e.kind==='withdrawal'?'Withdrawal':'Sent out'}</span></span>
      <span role="cell" className="mono">{short(e.account,14,8)}</span>
      <span role="cell" className="amt">{e.kind==='deposit'?'+':'−'}{decimal(e.amount,6,2)} <em>USDC</em></span>
      <span role="cell" className="muted">{ago(e.at,now)}</span>
      <span role="cell"><a href={nearblocksTx(e.hash)} target="_blank" rel="noreferrer" className="txlink">{short(e.hash,6,4)}<Icon name="external" size={13}/></a></span>
    </div>)}
  </div>;
}

/** Fills only come from the listen-only solver once a PARTNER_JWT exists; until then this says so plainly. */
function Fills(){
  const [s,setS]=useState<{state:'off'}|{state:'ok';v:SolverState}|{state:'error';message:string}>({state:'off'});
  useEffect(()=>{if(!solverUrl)return;let on=true;const run=()=>solverState().then(v=>on&&setS({state:'ok',v})).catch(e=>on&&setS({state:'error',message:(e as Error).message}));run();const t=setInterval(run,5000);return()=>{on=false;clearInterval(t);};},[]);
  const st=s.state==='ok'?s.v:null;
  return <section className="card fills">
    <header className="card-head"><div><h2>Recent fills</h2><p className="muted small">Swaps Kuroko filled, with their settlement transaction</p></div><Chip tone={st?'live':'warn'}>{st?'Listening · not quoting':'Setup required'}</Chip></header>
    {st
      ?<>
        <div className="mini-stats"><div><span>Requests seen</span><b>{st.requestsSeen}</b></div><div><span>Would quote</span><b>{st.wouldQuote}</b></div><div><span>Quotes sent</span><b>{st.quoted}</b></div><div><span>Filled</span><b>{st.won}</b></div></div>
        {st.tape.length?<ul className="tape">{st.tape.slice(-6).reverse().map(r=><li key={r.request.quote_id}><span className="mono">{new Date(r.at).toLocaleTimeString()}</span><span>{pairLabel(`${r.request.defuse_asset_identifier_in}/${r.request.defuse_asset_identifier_out}`)}</span><span className="muted">{typeof r.result.amount_out==='string'?'would quote':'would skip'}</span></li>)}</ul>
          :<Empty title="Listening. No swap requests yet.">Requests appear as the relay sends them. Listen mode never answers them.</Empty>}
      </>
      :<div className="fills-setup">
        <Art name="kuroko-empty" className="fills-art"/>
        <div>
          <h3>No fills yet, and none are faked.</h3>
          <p>NEAR Intents only sends swap requests to approved market makers. Until Kuroko has that access it fills nothing, so it has earned nothing.</p>
          <p className="setup-k">Setup required: PARTNER_JWT{s.state==='error'?` · ${s.message}`:''}</p>
          <ol>
            <li>Apply at the <a href="https://partners.near-intents.org/" target="_blank" rel="noreferrer">NEAR Intents Partner Portal <Icon name="external" size={12}/></a></li>
            <li>Put the token in a gitignored <code>.env</code> as <code>PARTNER_JWT</code>, run <code>pnpm listen</code></li>
            <li>Build the web with <code>VITE_SOLVER_API=http://127.0.0.1:3100</code> to show the live tape here</li>
          </ol>
        </div>
      </div>}
  </section>;
}

function Rules({data,wallet,proposals,locked,refresh}:{data:Data;wallet:Wallet;proposals:Proposal[]|null;locked:boolean;refresh:()=>void}){
  const c=valueOf(data.vault)?.constitution;
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  async function act(method:string,args:object,label:string){setMsg(null);try{const hash=await wallet.call(method,args);setMsg({ok:true,text:label,hash});refresh();}catch(e){setMsg({ok:false,text:(e as Error).message});}}
  const [shares]=useLive(async()=>wallet.account?view<string>(vaultId,'shares_of',{account_id:wallet.account}):'0',30000,[wallet.account]);
  const isHolder=(valueOf(shares)??'0')!=='0';
  return <section className="card" id="rules">
    <header className="card-head"><div><h2>Rules</h2><p className="muted small">Set by depositors, read live from the contract</p></div></header>
    <ul className="rule-rows">
      <li><Icon name="layers"/><span>Only trades</span><b>{c?c.allowed_pairs.map(pairLabel).join(', ')||'None':'…'}</b></li>
      <li><Icon name="lock"/><span>Largest trade</span><b>{c?`${decimal(c.max_inventory_usdc)} USDC`:'…'}</b></li>
      <li><Icon name="scale"/><span>Smallest fee kept</span><b>{c?`${(c.min_spread_bps/100).toFixed(2)}% (${c.min_spread_bps} bps)`:'…'}</b></li>
      <li><Icon name="shield"/><span>Pauses after a daily loss of</span><b>{c?`${decimal(c.daily_loss_limit_usdc)} USDC`:'…'}</b></li>
    </ul>
    <TradeCheck pairs={c?.allowed_pairs??[]} minSpread={c?.min_spread_bps}/>
    <h3 className="sub">Votes</h3>
    {!proposals?<div className="table-sk" aria-busy="true"><span/></div>:proposals.length===0
      ?<p className="muted small">No proposals yet. Any depositor can propose new rules; a change needs a 24-hour vote with more than half of all shares.</p>
      :<div className="votes">{proposals.slice().reverse().map(p=>{
        const open=!p.executed&&Date.now()<p.closes_at_ms;const voted=p.voters.includes(wallet.account);
        const t=BigInt(p.snapshot_shares||'0');const pct=(x:string)=>t>0n?Number(BigInt(x)*10000n/t)/100:0;
        return <article className="vote" key={p.id}>
          <header><b>Proposal #{p.id}</b><Chip tone={open?'live':p.executed?'idle':'warn'}>{p.executed?'Executed':open?`Open until ${new Date(p.closes_at_ms).toLocaleString()}`:'Ready to execute'}</Chip></header>
          <p className="muted small">{p.constitution.allowed_pairs.map(pairLabel).join(', ')} · max {decimal(p.constitution.max_inventory_usdc)} USDC · {p.constitution.min_spread_bps} bps · loss {decimal(p.constitution.daily_loss_limit_usdc)} USDC</p>
          <div className="vbar" aria-label={`Yes ${pct(p.yes)}%, no ${pct(p.no)}%`}><span className="vy" style={{width:`${pct(p.yes)}%`}}/><span className="vn" style={{width:`${pct(p.no)}%`}}/></div>
          <div className="vote-actions">
            {open&&<><button className="btn btn-quiet btn-sm" disabled={wallet.busy||!isHolder||voted} onClick={()=>void act('vote',{id:p.id,yes:true},'Vote recorded')}>Vote yes</button><button className="btn btn-quiet btn-sm" disabled={wallet.busy||!isHolder||voted} onClick={()=>void act('vote',{id:p.id,yes:false},'Vote recorded')}>Vote no</button></>}
            {!open&&!p.executed&&<button className="btn btn-dark btn-sm" disabled={wallet.busy||!wallet.account} onClick={()=>void act('execute',{id:p.id},'Proposal executed')}>Execute</button>}
          </div>
        </article>;})}</div>}
    {msg&&<p className={msg.ok?'pass':'fail'} role={msg.ok?'status':'alert'}><Icon name={msg.ok?'check':'x'} size={14}/>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)} <Icon name="external" size={12}/></a></>}</p>}
    {c&&<Propose c={c} wallet={wallet} isHolder={isHolder} locked={locked} refresh={refresh}/>}
    <p className="fine">Voting is by shares on the vault contract itself; Sputnik DAO is not integrated.</p>
  </section>;
}

const OFF_LIST=`nep141:${usdcId}/nep141:eth.testnet`;
/** Calls the vault's check_trade view on testnet with the visitor's inputs. */
function TradeCheck({pairs,minSpread}:{pairs:string[];minSpread?:number}){
  const [pair,setPair]=useState('');
  const [inv,setInv]=useState('0.5');
  const [fee,setFee]=useState('');
  const [res,setRes]=useState<{state:'idle'|'busy'}|{state:'ok';pass:boolean;for:string}|{state:'error';message:string}>({state:'idle'});
  useEffect(()=>{if(!pair&&pairs[0])setPair(pairs[0]);},[pairs,pair]);
  useEffect(()=>{if(!fee&&minSpread!==undefined)setFee((minSpread/100).toFixed(2));},[minSpread,fee]);
  async function ask(e:React.FormEvent){
    e.preventDefault();
    try{
      const pct=Number(fee);if(!Number.isFinite(pct)||pct<0||pct>=100)throw new Error('Fee must be a percentage from 0 to 99.99');
      const bps=Math.round(pct*100);
      setRes({state:'busy'});
      const pass=await view<boolean>(vaultId,'check_trade',{pair,inventory_usdc:rawUnits(inv),spread_bps:bps});
      setRes({state:'ok',pass,for:`${pairLabel(pair)} · ${inv} USDC · ${pct}% fee`});
    }catch(err){setRes({state:'error',message:(err as Error).message});}
  }
  const reset=()=>setRes({state:'idle'});
  return <form className="check" onSubmit={ask}>
    <div className="check-head"><h3>Would the rules allow this trade?</h3><p className="muted small">Asks the contract’s <code>check_trade</code> on testnet</p></div>
    <div className="check-row">
      <label className="field"><span>Pair</span><select value={pair} onChange={e=>{setPair(e.target.value);reset();}}>{pairs.map(p=><option key={p} value={p}>{pairLabel(p)}</option>)}<option value={OFF_LIST}>USDC ↔ ETH (not allowed)</option></select></label>
      <label className="field"><span>Size · USDC</span><input inputMode="decimal" value={inv} onChange={e=>{setInv(e.target.value);reset();}}/></label>
      <label className="field"><span>Fee · %</span><input inputMode="decimal" value={fee} onChange={e=>{setFee(e.target.value);reset();}}/></label>
      <button className="btn btn-kaki" disabled={res.state==='busy'||!pairs.length}>{res.state==='busy'?'Asking…':'Check'}</button>
    </div>
    <div className="check-out" aria-live="polite">
      {res.state==='ok'&&<p className={res.pass?'pass':'fail'}><Icon name={res.pass?'check':'x'} size={16}/><b>{res.pass?'Allowed':'Refused'}</b> · {res.for}</p>}
      {res.state==='error'&&<p className="fail" role="alert"><Icon name="x" size={16}/>{res.message}</p>}
    </div>
  </form>;
}

function Propose({c,wallet,isHolder,locked,refresh}:{c:Constitution;wallet:Wallet;isHolder:boolean;locked:boolean;refresh:()=>void}){
  const [draft,setDraft]=useState({pairs:c.allowed_pairs.join('\n'),cap:decimal(c.max_inventory_usdc).replace(/,/g,''),spread:String(c.min_spread_bps),loss:decimal(c.daily_loss_limit_usdc).replace(/,/g,'')});
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const set=(k:keyof typeof draft)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setDraft(d=>({...d,[k]:e.target.value}));
  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg(null);
    try{
      const bps=Number(draft.spread);if(!Number.isInteger(bps)||bps<0||bps>9999)throw new Error('Fee must be a whole number of bps from 0 to 9999');
      const pairs=draft.pairs.split('\n').map(x=>x.trim()).filter(Boolean);if(!pairs.length)throw new Error('List at least one pair');
      const constitution:Constitution={allowed_pairs:pairs,max_inventory_usdc:rawUnits(draft.cap),min_spread_bps:bps,daily_loss_limit_usdc:rawUnits(draft.loss)};
      const hash=await wallet.call('propose',{constitution});setMsg({ok:true,text:'Proposal opened for 24 hours',hash});refresh();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  const reason=!wallet.account?'Connect a testnet wallet to propose.':!isHolder?'Only depositors can propose. Deposit first.':locked?'A vote is already open.':'';
  return <details className="propose">
    <summary><Icon name="vote" size={16}/>Propose new rules</summary>
    <form onSubmit={submit}>
      <label className="field"><span>Allowed pairs · one per line</span><textarea rows={2} value={draft.pairs} onChange={set('pairs')} spellCheck={false}/></label>
      <div className="check-row three">
        <label className="field"><span>Largest trade · USDC</span><input inputMode="decimal" value={draft.cap} onChange={set('cap')}/></label>
        <label className="field"><span>Smallest fee · bps</span><input inputMode="numeric" value={draft.spread} onChange={set('spread')}/></label>
        <label className="field"><span>Daily loss · USDC</span><input inputMode="decimal" value={draft.loss} onChange={set('loss')}/></label>
      </div>
      <button className="btn btn-dark" disabled={!!reason||wallet.busy}>{wallet.busy?'Waiting for wallet…':'Open a 24-hour vote'}</button>
      {reason&&<p className="muted small">{reason}</p>}
      {msg&&<p className={msg.ok?'pass':'fail'} role={msg.ok?'status':'alert'}><Icon name={msg.ok?'check':'x'} size={14}/>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)} <Icon name="external" size={12}/></a></>}</p>}
    </form>
  </details>;
}
