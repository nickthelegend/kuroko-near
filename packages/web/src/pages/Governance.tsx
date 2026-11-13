import {useEffect,useState} from 'react';
import {Link,useWallet} from '../App';
import {useStore,val,openVote,type VaultLive} from '../store';
import {bps} from '../derive';
import {decimal,pairLabel,rawUnits,usdc,usdcId,view,when,type Constitution,type Proposal} from '../rpc';
import {Empty,Icon,Num,Pulse,Skel,TxLink,useLive,useNow,valueOf} from '../ui';
import {Pair,Token} from '../tokens';

/** Depositors own the rules: a 24-hour share-weighted vote per vault, executed by anyone once it passes. */
export default function Governance(){
  const {vaults}=useStore();
  const [slug,setSlug]=useState(vaults[0].meta.slug);
  const v=vaults.find(x=>x.meta.slug===slug)!;
  const all=vaults.flatMap(x=>(val(x.proposals)??[]).map(p=>({p,v:x})));
  const open=all.filter(({p})=>!p.executed&&Date.now()<p.closes_at_ms);
  return <div className="page">
    <header className="page-head">
      <div><h1>Governance</h1><p className="lede">Each vault’s depositors set its rules: which pairs the solver may quote, the largest trade, the smallest fee and the daily loss that pauses it. A change needs a 24-hour vote carried by more than half of all shares.</p></div>
      <span className="live-chip"><Pulse tone={open.length?'warn':'ok'}/>{open.length?`${open.length} vote${open.length===1?'':'s'} open`:'No vote open'}</span>
    </header>

    <section className="rules-grid">{vaults.map(x=><RulesCard key={x.meta.slug} v={x}/>)}</section>

    <section className="block">
      <div className="block-head"><h2>Votes</h2><span className="muted">All vaults, newest first</span></div>
      {vaults.some(x=>x.proposals.state==='loading')&&!all.length?<Skel h={120} r={16}/>:!all.length
        ?<Empty art="ballot" title="No votes yet">Any depositor can open one below. While it runs, that vault’s deposits and withdrawals wait.</Empty>
        :<ul className="votes">{all.sort((a,b)=>b.p.closes_at_ms-a.p.closes_at_ms).map(({p,v:x})=><VoteCard key={`${x.meta.slug}-${p.id}`} p={p} v={x}/>)}</ul>}
    </section>

    <section className="block two-col">
      <div className="card">
        <div className="card-head"><h2>Propose new rules</h2>
          <label className="select"><span className="sr">Vault</span><select value={slug} onChange={e=>setSlug(e.target.value)}>{vaults.map(x=><option key={x.meta.slug} value={x.meta.slug}>{x.meta.name}</option>)}</select></label>
        </div>
        {val(v.state)?<Propose key={slug} v={v}/>:<Skel h={200}/>}
      </div>
      <div className="card">
        <div className="card-head"><h2>Check a trade</h2><span className="muted">{v.meta.short} vault</span></div>
        {val(v.state)?<TradeCheck vaultId={v.meta.id} pairs={val(v.state)!.constitution.allowed_pairs} minSpread={val(v.state)!.constitution.min_spread_bps}/>:<Skel h={120}/>}
      </div>
    </section>
  </div>;
}

function RulesCard({v}:{v:VaultLive}){
  const s=val(v.state);const vote=openVote(val(v.proposals));
  return <Link to={`/vault/${v.meta.slug}`} className={`rcard rcard-${v.meta.tone}`}>
    <span className="rcard-top"><Token name="USDC" size={26}/><b>{v.meta.name}</b>{vote&&<span className="tag tag-warn">Voting</span>}</span>
    {s?<dl>
      <div><dt>Pairs</dt><dd className="pairs">{s.constitution.allowed_pairs.map(p=><Pair key={p} pair={p} size={16}/>)}</dd></div>
      <div><dt>Largest trade</dt><dd>{usdc(s.constitution.max_inventory_usdc)} USDC</dd></div>
      <div><dt>Fee floor</dt><dd>{bps(s.constitution.min_spread_bps)}</dd></div>
      <div><dt>Loss pause</dt><dd>{usdc(s.constitution.daily_loss_limit_usdc)} USDC</dd></div>
    </dl>:<Skel h={110}/>}
  </Link>;
}

function useCountdown(to:number){const now=useNow(1000);const s=Math.max(0,Math.floor((to-now)/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return s<=0?null:`${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`;}
function VoteCard({p,v}:{p:Proposal;v:VaultLive}){
  const w=useWallet();const store=useStore();
  const s=val(v.state);
  const open=!p.executed&&Date.now()<p.closes_at_ms;
  const left=useCountdown(p.closes_at_ms);
  const t=BigInt(p.snapshot_shares||'0');const pct=(x:string)=>t>0n?Number(BigInt(x)*10000n/t)/100:0;
  const yes=pct(p.yes),no=pct(p.no);
  const [mine]=useLive(async()=>w.account?view<string>(v.meta.id,'shares_of',{account_id:w.account}):'0',15000,[w.account]);
  const holder=(valueOf(mine)??'0')!=='0';const voted=p.voters.includes(w.account);
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  async function act(method:string,args:object,label:string){setMsg(null);try{const hash=await w.call(method,args,{receiver:v.meta.id});setMsg({ok:true,text:label,hash});store.refresh();}catch(e){setMsg({ok:false,text:(e as Error).message});}}
  const c=p.constitution,cur=s?.constitution;
  const diff=(a:string,b:string|undefined)=>b!==undefined&&a!==b;
  return <li className={`vote ${open?'vote-open':''}`}>
    <div className="vote-top">
      <span><b>{v.meta.name}</b><span className="muted"> · proposal {p.id}</span></span>
      <span className={`status status-${p.executed?'ok':open?'warn':'off'}`}>{p.executed?'Executed':open?<><Pulse tone="warn"/>Closes in&nbsp;<span className="mono">{left}</span></>:yes>50?'Passed, ready to execute':'Did not pass'}</span>
    </div>
    <div className="vote-changes">
      <span className={diff(c.allowed_pairs.join(),cur?.allowed_pairs.join())?'chg':''}>Pairs: {c.allowed_pairs.map(pairLabel).join(', ')}</span>
      <span className={diff(c.max_inventory_usdc,cur?.max_inventory_usdc)?'chg':''}>Largest trade {usdc(c.max_inventory_usdc)} USDC</span>
      <span className={diff(String(c.min_spread_bps),cur?String(cur.min_spread_bps):undefined)?'chg':''}>Fee floor {bps(c.min_spread_bps)}</span>
      <span className={diff(c.daily_loss_limit_usdc,cur?.daily_loss_limit_usdc)?'chg':''}>Loss pause {usdc(c.daily_loss_limit_usdc)} USDC</span>
    </div>
    <div className="vbar" aria-label={`Yes ${yes}%, no ${no}%`}><span className="vy" style={{width:`${yes}%`}}/><span className="vn" style={{width:`${no}%`}}/><i className="vmid"/></div>
    <div className="vote-foot">
      <span><b className="yes"><Num value={yes} dp={1}/>% yes</b> · <b className="no"><Num value={no} dp={1}/>% no</b> <span className="muted">of {decimal(p.snapshot_shares,6,2)} shares · {p.voters.length} voter{p.voters.length===1?'':'s'} · closes {when(p.closes_at_ms)}</span></span>
      <span className="vote-actions">
        {open&&<><button className="btn btn-line btn-sm" disabled={w.busy||!holder||voted} onClick={()=>void act('vote',{id:p.id,yes:true},'Vote recorded')}>Vote yes</button><button className="btn btn-line btn-sm" disabled={w.busy||!holder||voted} onClick={()=>void act('vote',{id:p.id,yes:false},'Vote recorded')}>Vote no</button></>}
        {!open&&!p.executed&&yes>50&&<button className="btn btn-ink btn-sm" disabled={w.busy||!w.account} onClick={()=>void act('execute',{id:p.id},'Rules updated')}>Execute</button>}
      </span>
    </div>
    {open&&w.account&&(!holder||voted)&&<p className="fine">{voted?'You have voted on this proposal.':'Only depositors in this vault can vote.'}</p>}
    {msg&&<p className={msg.ok?'ok':'form-err'} role={msg.ok?'status':'alert'}>{msg.text}{msg.hash&&<> · <TxLink hash={msg.hash}/></>}</p>}
  </li>;
}

function Propose({v}:{v:VaultLive}){
  const w=useWallet();const store=useStore();
  const c=val(v.state)!.constitution;
  const [draft,setDraft]=useState({pairs:c.allowed_pairs.join('\n'),cap:decimal(c.max_inventory_usdc).replace(/,/g,''),spread:String(c.min_spread_bps),loss:decimal(c.daily_loss_limit_usdc).replace(/,/g,'')});
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const [mine]=useLive(async()=>w.account?view<string>(v.meta.id,'shares_of',{account_id:w.account}):'0',15000,[w.account]);
  const holder=(valueOf(mine)??'0')!=='0';
  const locked=!!openVote(val(v.proposals));
  const set=(k:keyof typeof draft)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setDraft(d=>({...d,[k]:e.target.value}));
  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg(null);
    try{
      const b=Number(draft.spread);if(!Number.isInteger(b)||b<0||b>9999)throw new Error('Fee floor must be a whole number of basis points from 0 to 9999');
      const pairs=draft.pairs.split('\n').map(x=>x.trim()).filter(Boolean);if(!pairs.length)throw new Error('List at least one pair');
      const constitution:Constitution={allowed_pairs:pairs,max_inventory_usdc:rawUnits(draft.cap),min_spread_bps:b,daily_loss_limit_usdc:rawUnits(draft.loss)};
      const hash=await w.call('propose',{constitution},{receiver:v.meta.id});setMsg({ok:true,text:'Vote opened for 24 hours',hash});store.refresh();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  const reason=!w.account?'Connect a testnet wallet to propose.':!holder?`Only ${v.meta.short} depositors can propose.`:locked?'A vote is already open in this vault.':'';
  return <form className="propose" onSubmit={submit}>
    <label className="field"><span>Pairs, one per line (NEP-141 IDs)</span><textarea rows={3} value={draft.pairs} onChange={set('pairs')} spellCheck={false}/></label>
    <div className="field-row">
      <label className="field"><span>Largest trade (USDC)</span><input inputMode="decimal" value={draft.cap} onChange={set('cap')}/></label>
      <label className="field"><span>Fee floor (bps)</span><input inputMode="numeric" value={draft.spread} onChange={set('spread')}/></label>
      <label className="field"><span>Loss pause (USDC)</span><input inputMode="decimal" value={draft.loss} onChange={set('loss')}/></label>
    </div>
    <div className="propose-foot">
      <button className="btn btn-ink" disabled={!!reason||w.busy}>{w.busy?'Confirm in your wallet…':'Open a 24-hour vote'}</button>
      {reason&&<span className="muted">{reason}</span>}
    </div>
    {msg&&<p className={msg.ok?'ok':'form-err'} role={msg.ok?'status':'alert'}>{msg.text}{msg.hash&&<> · <TxLink hash={msg.hash}/></>}</p>}
  </form>;
}

const OFF_LIST=`nep141:${usdcId}/nep141:eth.testnet`;
/** Calls the vault contract's check_trade view on testnet with the visitor's inputs. */
export function TradeCheck({vaultId,pairs,minSpread}:{vaultId:string;pairs:string[];minSpread:number}){
  const [pair,setPair]=useState(pairs[0]??'');
  const [inv,setInv]=useState('0.50');
  const [fee,setFee]=useState((minSpread/100).toFixed(2));
  const [res,setRes]=useState<{state:'idle'|'busy'}|{state:'ok';pass:boolean;for:string}|{state:'error';message:string}>({state:'idle'});
  useEffect(()=>{setPair(pairs[0]??'');setFee((minSpread/100).toFixed(2));setRes({state:'idle'});},[vaultId]);// eslint-disable-line react-hooks/exhaustive-deps
  async function ask(e:React.FormEvent){
    e.preventDefault();
    try{
      const pct=Number(fee);if(!fee.trim()||!Number.isFinite(pct)||pct<0||pct>=100)throw new Error('Fee must be a percentage from 0 to 99.99');
      setRes({state:'busy'});
      const pass=await view<boolean>(vaultId,'check_trade',{pair,inventory_usdc:rawUnits(inv),spread_bps:Math.round(pct*100)});
      setRes({state:'ok',pass,for:`${pairLabel(pair)}, ${inv} USDC at ${pct}%`});
    }catch(err){setRes({state:'error',message:(err as Error).message});}
  }
  const reset=()=>setRes({state:'idle'});
  return <form className="check" onSubmit={ask}>
    <div className="check-row">
      <label className="field"><span>Pair</span><select value={pair} onChange={e=>{setPair(e.target.value);reset();}}>{pairs.map(p=><option key={p} value={p}>{pairLabel(p)}</option>)}<option value={OFF_LIST}>USDC ↔ ETH (testnet)</option></select></label>
      <label className="field"><span>Size (USDC)</span><input inputMode="decimal" value={inv} onChange={e=>{setInv(e.target.value);reset();}}/></label>
      <label className="field"><span>Fee (%)</span><input inputMode="decimal" value={fee} onChange={e=>{setFee(e.target.value);reset();}}/></label>
      <button className="btn btn-line" disabled={res.state==='busy'||!pairs.length}>{res.state==='busy'?'Checking…':'Check'}</button>
    </div>
    <p className="check-out" aria-live="polite">
      {res.state==='ok'&&<span className={res.pass?'pass':'refused'}><Icon name={res.pass?'check':'x'} size={15}/>{res.pass?'Allowed':'Refused'}: {res.for}</span>}
      {res.state==='error'&&<span className="form-err" role="alert">{res.message}</span>}
      {res.state==='idle'&&<span className="muted">Asks the vault contract’s <code>check_trade</code> on testnet. It does not restrict an off-chain Intents signer.</span>}
    </p>
  </form>;
}
