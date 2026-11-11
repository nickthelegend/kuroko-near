import {useEffect,useState} from 'react';
import type {Data,Wallet} from './App';
import type {History} from './activity';
import {ago,decimal,nearblocksAccount,nearblocksTx,pairLabel,rawUnits,sharePrice,short,solverState,solverUrl,usdc,usdcId,vaultId,view,when,type Constitution,type Proposal,type SolverState} from './rpc';
import {Copy,Icon,Stat,ValueChart,useLive,useNow,valueOf} from './ui';

/** The vault page, which is also the home page: header, four numbers, chart, one deposit panel, then plain tables. */
export default function VaultPage({data,wallet}:{data:Data;wallet:Wallet}){
  const now=useNow();
  const v=valueOf(data.vault);
  const h=valueOf(data.history);
  const [proposals,refreshProposals]=useLive(()=>view<Proposal[]>(vaultId,'proposals'),30000);
  const openVote=valueOf(proposals)?.find(p=>!p.executed&&Date.now()<p.closes_at_ms);
  const [metric,setMetric]=useState<'cash'|'price'>('cash');
  const readAt=data.vault.state==='ok'?data.vault.at:null;
  const mismatch=h&&v&&(h.cash!==BigInt(v.usdc_balance)||h.shares!==BigInt(v.total_shares));
  const price=v?sharePrice(v.usdc_balance,v.total_shares):null;
  const [mine]=useLive(async()=>wallet.account?view<string>(vaultId,'shares_of',{account_id:wallet.account}):null,20000,[wallet.account]);
  const myShares=valueOf(mine);
  const unavailable=data.vault.state==='error'||proposals.state==='error'?'Vault unavailable':data.vault.state==='loading'||proposals.state==='loading'?'Loading vault…':undefined;
  const status=!v?(data.vault.state==='error'?'Unavailable':'Loading'):proposals.state==='error'?'Rules unavailable':v.paused?'Paused':openVote?'Locked during a vote':'Open for deposits';

  return <div className="wrap vault">
    <header className="vhead">
      <div className="vh-row">
        <span className="vh-icon" aria-hidden="true">$</span>
        <h1>Kuroko USDC</h1>
      </div>
      <p className="vh-desc">Deposit USDC; Kuroko fills other people’s swaps on NEAR Intents and shares the fees with you.</p>
      <p className="vh-meta">
        <span className="nowrap"><span className={`dot ${v?.paused?'dot-bad':v?'dot-ok':''}`}/>{status}</span>
        <span className="sep" aria-hidden="true">·</span>
        <span className="nowrap"><a className="mono" href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer">{short(vaultId,10,8)}</a><Copy value={vaultId}/></span>
        <span className="sep" aria-hidden="true">·</span>
        <span className="nowrap">NEAR testnet</span>
      </p>
    </header>

    <section className="stats" aria-label="Vault numbers">
      <Stat label="Total deposits" value={v?usdc(v.usdc_balance):'—'} unit="USDC"/>
      <Stat label="Share price" value={price!=null?decimal(price,6,4):'—'} unit="USDC"/>
      <Stat label="Your position" value={!wallet.account?'—':myShares!=null&&price!=null?usdc(BigInt(myShares)*price/1_000_000n):'…'} unit={wallet.account?'USDC':undefined}
        note={!wallet.account?<button type="button" className="linkish" onClick={()=>void wallet.connect()} disabled={!wallet.ready}>Connect wallet</button>:undefined}/>
      <Stat label="APY" value="—" note="Needs fills to measure"/>
    </section>
    {data.vault.state==='error'&&<p className="err" role="alert">{data.vault.message}</p>}

    <aside className="side"><TradeCard data={data} wallet={wallet} locked={!!openVote} myShares={myShares??null} unavailable={unavailable}/></aside>

    <section className="block chart-block" aria-labelledby="chart-h">
      <div className="block-head">
        <h2 id="chart-h">{metric==='cash'?'Vault value':'Share price'}</h2>
        <div className="seg" role="group" aria-label="Chart">
          <button type="button" aria-pressed={metric==='cash'} onClick={()=>setMetric('cash')}>USDC</button>
          <button type="button" aria-pressed={metric==='price'} onClick={()=>setMetric('price')}>Share price</button>
        </div>
      </div>
      {data.history.state==='error'&&h&&<p className="err" role="alert">History could not refresh: {data.history.message}</p>}
      {h?<ValueChart points={h.points} metric={metric}/>:data.history.state==='error'?<p className="err" role="alert">History unavailable: {data.history.message}</p>:<div className="sk sk-chart" aria-busy="true"/>}
      <p className="fine">Rebuilt from every USDC transfer in and out of the vault.{readAt&&` Contract read ${ago(readAt,now)}.`}</p>
      {mismatch&&<p className="fine">The transfer index shows {usdc(h.cash)} USDC; the contract shows {usdc(v.usdc_balance)} USDC. The index can lag a few blocks.</p>}
    </section>

    <div className="rest">
      <section className="block" aria-labelledby="act-h">
        <div className="block-head"><h2 id="act-h">Activity</h2>{h&&<span className="muted">{h.events.length} transfers · {h.depositors.size} depositor{h.depositors.size===1?'':'s'}</span>}</div>
        <ActivityTable history={h} live={data.history}/>
        <Fills/>
      </section>

      <Rules proposalError={proposals.state==='error'?proposals.message:undefined} data={data} wallet={wallet} proposals={valueOf(proposals)??null} locked={!!openVote} refresh={()=>{data.refresh();refreshProposals();}}/>

      <details className="how" id="how">
        <summary><h2>How Kuroko earns</h2><Icon name="chevron"/></summary>
        <div className="how-body">
          <p>Every swap on NEAR Intents is filled by a market maker who quotes a price and keeps a small fee. Kuroko pools depositors’ USDC to be that market maker, only within the rules above.</p>
          <p>Fees stay in the vault, so each share is worth more USDC over time. You can withdraw whenever no vote is open.</p>
          <p>Today on testnet the vault, deposits, withdrawals, rules and votes are live. Filling swaps waits on NEAR Intents relay access, and there is no mainnet version. Kuroko has not filled a swap or earned a fee.</p>
        </div>
      </details>
    </div>
  </div>;
}

function TradeCard({data,wallet,locked,myShares,unavailable}:{data:Data;wallet:Wallet;locked:boolean;myShares:string|null;unavailable?:string}){
  const v=valueOf(data.vault);
  const [mode,setMode]=useState<'deposit'|'withdraw'>('deposit');
  const [amount,setAmount]=useState('');
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const [bal,refreshBal]=useLive(async()=>wallet.account?view<string>(usdcId,'ft_balance_of',{account_id:wallet.account}):null,20000,[wallet.account]);
  const wal=valueOf(bal)??null;
  const price=v?sharePrice(v.usdc_balance,v.total_shares):null;
  let preview='';
  try{if(price===null||price<=0n)throw Error('Vault unavailable');const raw=BigInt(rawUnits(amount));preview=mode==='deposit'?`${decimal(raw*1_000_000n/price,6,4)} shares`:`${usdc(raw*price/1_000_000n)} USDC`;}catch{preview='';}
  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg(null);
    try{
      if(unavailable)throw Error(unavailable);
      const raw=rawUnits(amount);let hash='';
      if(mode==='deposit')hash=await wallet.call('ft_transfer_call',{receiver_id:vaultId,amount:raw,msg:''},{deposit:'1',receiver:usdcId});
      else hash=await wallet.call('withdraw',{shares:raw});
      setMsg({ok:true,text:mode==='deposit'?'Deposit confirmed':'Withdrawal confirmed',hash});setAmount('');data.refresh();refreshBal();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  const max=mode==='deposit'?wal:myShares;
  const unit=mode==='deposit'?'USDC':'shares';
  const pick=(m:'deposit'|'withdraw')=>{setMode(m);setMsg(null);setAmount('');};
  return <section className="panel" aria-label="Deposit or withdraw">
    <div className="tabs" role="tablist" aria-label="Action">
      <button type="button" role="tab" aria-selected={mode==='deposit'} onClick={()=>pick('deposit')}>Deposit</button>
      <button type="button" role="tab" aria-selected={mode==='withdraw'} onClick={()=>pick('withdraw')}>Withdraw</button>
    </div>
    <form onSubmit={submit}>
      <label className="amount">
        <span className="amount-top"><span>{mode==='deposit'?'Amount':'Shares'}</span>
          {wallet.account&&<span>{mode==='deposit'?'Balance':'You hold'} {max!=null?(mode==='deposit'?usdc(max):decimal(max,6,4)):'…'}{max&&max!=='0'&&<button type="button" className="max" onClick={()=>setAmount(decimal(max).replace(/,/g,''))}>Max</button>}</span>}
        </span>
        <span className="amount-box">
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={e=>{setAmount(e.target.value);setMsg(null);}} aria-label={mode==='deposit'?'USDC amount':'Shares to redeem'}/>
          <span className="unit">{unit}</span>
        </span>
      </label>
      <dl className="facts">
        <div><dt>{mode==='deposit'?'You get':'You receive'}</dt><dd>{preview||'—'}</dd></div>
        <div><dt>Share price</dt><dd>{price===null?'—':decimal(price,6,4)} USDC</dd></div>
      </dl>
      {!wallet.account
        ?<button type="button" className="btn btn-ink wide" onClick={()=>void wallet.connect()} disabled={!wallet.ready}>Connect wallet</button>
        :<button className="btn btn-ink wide" disabled={wallet.busy||locked||!amount||!!unavailable||!!v?.paused}>{unavailable??(locked?'Locked during a vote':v?.paused?'Vault paused':wallet.busy?'Confirm in your wallet…':mode==='deposit'?'Deposit':'Withdraw')}</button>}
      {msg&&<p className={msg.ok?'ok':'err'} role={msg.ok?'status':'alert'}>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)}</a></>}</p>}
      <p className="fine">Circle testnet USDC on NEAR. <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">Get some from the faucet</a>.</p>
    </form>
  </section>;
}

function ActivityTable({history,live}:{history?:History;live:Data['history']}){
  if(!history&&live.state==='loading')return <div className="sk sk-rows" aria-busy="true"><span/><span/></div>;
  if(!history)return <p className="err" role="alert">{live.state==='error'?live.message:''}</p>;
  if(!history.events.length)return <p className="empty">No deposits yet. The first one will appear here with its transaction.</p>;
  return <table className="table">
    <thead><tr><th>Date</th><th>Action</th><th>Account</th><th className="r">Amount</th><th className="r">Transaction</th></tr></thead>
    <tbody>{history.events.slice().reverse().map(e=><tr key={e.hash+e.kind}>
      <td data-label="Date">{when(e.at)}</td>
      <td data-label="Action">{e.kind==='deposit'?'Deposit':e.kind==='withdrawal'?'Withdrawal':'Sent out'}</td>
      <td data-label="Account"><a className="mono" href={nearblocksAccount(e.account)} target="_blank" rel="noreferrer">{short(e.account,12,8)}</a></td>
      <td data-label="Amount" className="r num">{e.kind==='deposit'?'+':'−'}{usdc(e.amount)} USDC</td>
      <td data-label="Transaction" className="r"><a className="mono tx" href={nearblocksTx(e.hash)} target="_blank" rel="noreferrer">{short(e.hash,6,4)}<Icon name="external" size={13}/></a></td>
    </tr>)}</tbody>
  </table>;
}

/** Fills come only from the listen-only solver, which needs a PARTNER_JWT. Without it this is one quiet line. */
function Fills(){
  const [s,setS]=useState<{state:'off'}|{state:'ok';v:SolverState}|{state:'error';message:string}>({state:'off'});
  useEffect(()=>{if(!solverUrl)return;let on=true;const run=()=>solverState().then(v=>on&&setS({state:'ok',v})).catch(e=>on&&setS({state:'error',message:(e as Error).message}));run();const t=setInterval(run,5000);return()=>{on=false;clearInterval(t);};},[]);
  if(s.state==='ok')return <p className="fine">Swap fills: {s.v.won}. Listening only: {s.v.requestsSeen} requests seen, {s.v.wouldQuote} would have been quoted, none answered.</p>;
  return <p className="fine">Swap fills: none yet. Filling needs NEAR Intents relay access (Setup required: PARTNER_JWT){s.state==='error'?`; solver: ${s.message}`:''}.</p>;
}

function Rules({data,wallet,proposals,locked,refresh,proposalError}:{data:Data;wallet:Wallet;proposals:Proposal[]|null;locked:boolean;refresh:()=>void;proposalError?:string}){
  const c=valueOf(data.vault)?.constitution;
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  async function act(method:string,args:object,label:string){setMsg(null);try{const hash=await wallet.call(method,args);setMsg({ok:true,text:label,hash});refresh();}catch(e){setMsg({ok:false,text:(e as Error).message});}}
  const [shares]=useLive(async()=>wallet.account?view<string>(vaultId,'shares_of',{account_id:wallet.account}):'0',30000,[wallet.account]);
  const isHolder=(valueOf(shares)??'0')!=='0';
  return <section className="block" id="rules" aria-labelledby="rules-h">
    <div className="block-head"><h2 id="rules-h">Rules</h2><span className="muted">Changed only by a depositor vote</span></div>
    <dl className="kv">
      <div><dt>Allowed pair</dt><dd>{c?c.allowed_pairs.map(pairLabel).join(', ')||'None':'…'}</dd></div>
      <div><dt>Largest trade</dt><dd>{c?`${usdc(c.max_inventory_usdc)} USDC`:'…'}</dd></div>
      <div><dt>Smallest fee</dt><dd>{c?`${(c.min_spread_bps/100).toFixed(2)}%`:'…'}</dd></div>
      <div><dt>Pauses after a daily loss of</dt><dd>{c?`${usdc(c.daily_loss_limit_usdc)} USDC`:'…'}</dd></div>
    </dl>
    <TradeCheck pairs={c?.allowed_pairs??[]} minSpread={c?.min_spread_bps}/>
    <div className="votes">
      <h3>Votes</h3>
      {proposalError?<p className="err" role="alert">Votes unavailable: {proposalError}</p>:!proposals?<div className="sk sk-rows" aria-busy="true"><span/></div>:proposals.length===0
        ?<p className="muted">No votes yet. A rule change needs a 24-hour vote with more than half of all shares.</p>
        :<ul className="vote-list">{proposals.slice().reverse().map(p=>{
          const open=!p.executed&&Date.now()<p.closes_at_ms;const voted=p.voters.includes(wallet.account);
          const t=BigInt(p.snapshot_shares||'0');const pct=(x:string)=>t>0n?Number(BigInt(x)*10000n/t)/100:0;
          return <li key={p.id}>
            <div className="vote-top"><b>Proposal {p.id}</b><span className="muted">{p.executed?'Executed':open?`Open until ${when(p.closes_at_ms)}`:'Ready to execute'}</span></div>
            <p className="muted">{p.constitution.allowed_pairs.map(pairLabel).join(', ')} · largest trade {usdc(p.constitution.max_inventory_usdc)} USDC · fee {(p.constitution.min_spread_bps/100).toFixed(2)}% · loss limit {usdc(p.constitution.daily_loss_limit_usdc)} USDC</p>
            <div className="vbar" aria-label={`Yes ${pct(p.yes)}%, no ${pct(p.no)}%`}><span className="vy" style={{width:`${pct(p.yes)}%`}}/><span className="vn" style={{width:`${pct(p.no)}%`}}/></div>
            <div className="vote-actions">
              {open&&<><button className="btn btn-line" disabled={wallet.busy||!isHolder||voted} onClick={()=>void act('vote',{id:p.id,yes:true},'Vote recorded')}>Vote yes</button><button className="btn btn-line" disabled={wallet.busy||!isHolder||voted} onClick={()=>void act('vote',{id:p.id,yes:false},'Vote recorded')}>Vote no</button></>}
              {!open&&!p.executed&&<button className="btn btn-ink" disabled={wallet.busy||!wallet.account} onClick={()=>void act('execute',{id:p.id},'Proposal executed')}>Execute</button>}
            </div>
          </li>;})}</ul>}
      {msg&&<p className={msg.ok?'ok':'err'} role={msg.ok?'status':'alert'}>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)}</a></>}</p>}
      {c&&<Propose c={c} wallet={wallet} isHolder={isHolder} locked={locked} refresh={refresh}/>}
    </div>
  </section>;
}

const OFF_LIST=`nep141:${usdcId}/nep141:eth.testnet`;
/** Calls the vault's check_trade view on testnet with the visitor's inputs. */
function TradeCheck({pairs,minSpread}:{pairs:string[];minSpread?:number}){
  const [pair,setPair]=useState('');
  const [inv,setInv]=useState('0.50');
  const [fee,setFee]=useState('');
  const [res,setRes]=useState<{state:'idle'|'busy'}|{state:'ok';pass:boolean;for:string}|{state:'error';message:string}>({state:'idle'});
  useEffect(()=>{if(!pair&&pairs[0])setPair(pairs[0]);},[pairs,pair]);
  useEffect(()=>{if(!fee&&minSpread!==undefined)setFee((minSpread/100).toFixed(2));},[minSpread,fee]);
  async function ask(e:React.FormEvent){
    e.preventDefault();
    try{
      const pct=Number(fee);if(!Number.isFinite(pct)||pct<0||pct>=100)throw new Error('Fee must be a percentage from 0 to 99.99');
      setRes({state:'busy'});
      const pass=await view<boolean>(vaultId,'check_trade',{pair,inventory_usdc:rawUnits(inv),spread_bps:Math.round(pct*100)});
      setRes({state:'ok',pass,for:`${pairLabel(pair)}, ${inv} USDC at ${pct}%`});
    }catch(err){setRes({state:'error',message:(err as Error).message});}
  }
  const reset=()=>setRes({state:'idle'});
  return <form className="check" onSubmit={ask}>
    <h3>Check a trade against the rules</h3>
    <div className="check-row">
      <label className="field"><span>Pair</span><select value={pair} onChange={e=>{setPair(e.target.value);reset();}}>{pairs.map(p=><option key={p} value={p}>{pairLabel(p)}</option>)}<option value={OFF_LIST}>USDC ↔ ETH</option></select></label>
      <label className="field"><span>Size (USDC)</span><input inputMode="decimal" value={inv} onChange={e=>{setInv(e.target.value);reset();}}/></label>
      <label className="field"><span>Fee (%)</span><input inputMode="decimal" value={fee} onChange={e=>{setFee(e.target.value);reset();}}/></label>
      <button className="btn btn-line" disabled={res.state==='busy'||!pairs.length}>{res.state==='busy'?'Checking…':'Check'}</button>
    </div>
    <p className="check-out" aria-live="polite">
      {res.state==='ok'&&<span className={res.pass?'pass':'refused'}><Icon name={res.pass?'check':'x'} size={15}/>{res.pass?'Allowed':'Refused'}: {res.for}</span>}
      {res.state==='error'&&<span className="err" role="alert">{res.message}</span>}
      {res.state==='idle'&&<span className="muted">Asks the vault contract’s <code>check_trade</code> on testnet.</span>}
    </p>
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
      const hash=await wallet.call('propose',{constitution});setMsg({ok:true,text:'Vote opened for 24 hours',hash});refresh();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  const reason=!wallet.account?'Connect a testnet wallet to propose.':!isHolder?'Only depositors can propose.':locked?'A vote is already open.':'';
  return <details className="propose">
    <summary>Propose new rules<Icon name="chevron"/></summary>
    <form onSubmit={submit}>
      <label className="field"><span>Allowed pairs, one per line</span><textarea rows={2} value={draft.pairs} onChange={set('pairs')} spellCheck={false}/></label>
      <div className="check-row three">
        <label className="field"><span>Largest trade (USDC)</span><input inputMode="decimal" value={draft.cap} onChange={set('cap')}/></label>
        <label className="field"><span>Smallest fee (bps)</span><input inputMode="numeric" value={draft.spread} onChange={set('spread')}/></label>
        <label className="field"><span>Daily loss limit (USDC)</span><input inputMode="decimal" value={draft.loss} onChange={set('loss')}/></label>
      </div>
      <div className="propose-foot">
        <button className="btn btn-ink" disabled={!!reason||wallet.busy}>{wallet.busy?'Confirm in your wallet…':'Open a 24-hour vote'}</button>
        {reason&&<span className="muted">{reason}</span>}
      </div>
      {msg&&<p className={msg.ok?'ok':'err'} role={msg.ok?'status':'alert'}>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)}</a></>}</p>}
    </form>
  </details>;
}
