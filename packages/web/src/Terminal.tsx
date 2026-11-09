import {useCallback,useEffect,useState} from 'react';
import type {Wallet} from './App';
import {decimal,nearblocksAccount,nearblocksTx,navNumber,pairLabel,rawUnits,short,solverState,usdcId,vaultId,view,type Constitution,type Proposal,type SolverState,type VaultState} from './rpc';
import {Art,Chip,Empty,Icon,Num} from './ui';

type Chain={vault:VaultState;proposals:Proposal[];shares:string;at:number};

function useChain(account:string){
  const [chain,setChain]=useState<Chain|null>(null);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try{
      if(!vaultId)throw new Error('Setup required: VITE_VAULT_ACCOUNT');
      const [vault,proposals,shares]=await Promise.all([view<VaultState>(vaultId,'state'),view<Proposal[]>(vaultId,'proposals'),account?view<string>(vaultId,'shares_of',{account_id:account}):Promise.resolve('0')]);
      setChain({vault,proposals,shares,at:Date.now()});setError('');
    }catch(e){setError((e as Error).message);}
  },[account]);
  useEffect(()=>{void refresh();const t=setInterval(()=>void refresh(),15000);return()=>clearInterval(t);},[refresh]);
  return {chain,error,refresh};
}

/** The local listen service only exists once PARTNER_JWT is set, so it is polled only after it has answered. */
function useSolver(){
  const [state,setState]=useState<{s:'checking'}|{s:'ok';v:SolverState}|{s:'down';message:string}>({s:'checking'});
  const check=useCallback(async()=>{try{setState({s:'ok',v:await solverState()});}catch(e){setState({s:'down',message:(e as Error).message});}},[]);
  useEffect(()=>{void check();},[check]);
  useEffect(()=>{if(state.s!=='ok')return;const t=setInterval(()=>void check(),5000);return()=>clearInterval(t);},[state.s,check]);
  return {solver:state,recheck:()=>{setState({s:'checking'});void check();}};
}

export default function Terminal({wallet}:{wallet:Wallet}){
  const {chain,error,refresh}=useChain(wallet.account);
  const {solver,recheck}=useSolver();
  const c=chain?.vault.constitution;
  const openVote=chain?.proposals.find(p=>!p.executed&&Date.now()<p.closes_at_ms);
  return <div className="terminal">
    <div className="t-head">
      <div>
        <h1>Terminal</h1>
        <p>{vaultId?<a href={nearblocksAccount(vaultId)} target="_blank" rel="noreferrer"><code>{vaultId}</code><Icon name="external" size={13}/></a>:<Chip tone="warn">Setup required: VITE_VAULT_ACCOUNT</Chip>}</p>
      </div>
      <div className="t-head-end">
        <span className="stamp">{chain?`Chain read ${new Date(chain.at).toLocaleTimeString()}`:'Reading chain…'}</span>
        <button className="btn btn-ghost btn-sm" onClick={()=>void refresh()}><Icon name="refresh" size={16}/>Refresh</button>
      </div>
    </div>
    {error&&<p className="inline-error" role="alert"><Icon name="x" size={16}/>{error}</p>}
    <div className="ticker t-ticker" aria-label="Current constitution">
      <span className="tk"><b>Pairs</b>{c?c.allowed_pairs.map(pairLabel).join(', ')||'none':'…'}</span>
      <span className="tk"><b>Max inv</b>{c?`${decimal(c.max_inventory_usdc)} USDC`:'…'}</span>
      <span className="tk"><b>Min spread</b>{c?`${c.min_spread_bps} bps`:'…'}</span>
      <span className="tk"><b>Loss today</b>{chain&&c?`${decimal(chain.vault.daily_loss_usdc)} / ${decimal(c.daily_loss_limit_usdc)} USDC`:'…'}</span>
      <span className="tk"><b>Vault</b>{chain?(chain.vault.paused?'Paused':openVote?'Vote open · locked':'Open'):'…'}</span>
    </div>
    <div className="t-grid">
      <Tape solver={solver} recheck={recheck}/>
      <VaultPanel wallet={wallet} chain={chain} locked={!!openVote} refresh={refresh}/>
      <ConstitutionPanel wallet={wallet} chain={chain} refresh={refresh}/>
      <ProposePanel wallet={wallet} chain={chain} locked={!!openVote} refresh={refresh}/>
      <Fills/>
    </div>
  </div>;
}

function Panel({className,title,meta,children}:{className:string;title:string;meta?:React.ReactNode;children:React.ReactNode}){
  return <section className={`panel ${className}`}><header className="panel-head"><h2>{title}</h2>{meta}</header>{children}</section>;
}

function Tape({solver,recheck}:{solver:ReturnType<typeof useSolver>['solver'];recheck:()=>void}){
  const s=solver.s==='ok'?solver.v:null;
  const meta=solver.s==='ok'?<Chip tone="live">Listening · mainnet relay</Chip>:solver.s==='checking'?<Chip>Checking…</Chip>:<Chip tone="warn">Setup required</Chip>;
  return <Panel className="p-tape" title="Live tape" meta={meta}>
    <div className="tape-stats">
      <div><span>Requests seen</span><b>{s?s.requestsSeen.toLocaleString():'—'}</b></div>
      <div><span>Would quote</span><b>{s?s.wouldQuote.toLocaleString():'—'}</b></div>
      <div><span>Quotes sent</span><b>{s?s.quoted.toLocaleString():'0'}</b></div>
      <div><span>Won</span><b>{s?s.won.toLocaleString():'0'}</b></div>
    </div>
    <div className="tape-table" role="table" aria-label="Relay quote requests">
      <div className="tt-row tt-head" role="row"><span>Time</span><span>Pair</span><span>Requested</span><span>Kuroko would</span></div>
      {s&&s.lastError&&<p className="inline-error" role="alert"><Icon name="x" size={16}/>{s.lastError}</p>}
      {s&&s.tape.length>0&&s.tape.slice().reverse().map(row=><div className="tt-row" role="row" key={`${row.at}-${row.request.quote_id}`}>
        <span><b>{new Date(row.at).toLocaleTimeString()}</b><small>{short(row.request.quote_id,8,4)}</small></span>
        <span className="mono">{short(row.request.defuse_asset_identifier_in,12,4)} → {short(row.request.defuse_asset_identifier_out,12,4)}</span>
        <span className="mono">{row.request.exact_amount_in||row.request.exact_amount_out||'—'}<small>raw units</small></span>
        <span className={typeof row.result.amount_out==='string'?'would':'refuse'}>{typeof row.result.amount_out==='string'?`Quote ${row.result.amount_out} raw`:typeof row.result.reason==='string'?row.result.reason:'No quote'}</span>
      </div>)}
      {s&&s.tape.length===0&&<Empty icon="pulse" title="Listening. No requests yet.">The relay is connected. Requests appear here as they arrive; nothing is sent back in listen mode.</Empty>}
      {!s&&<div className="tape-setup">
        <Art name="kuroko-empty" className="empty-art"/>
        <div className="setup-copy">
          <span className="setup-k">{solver.s==='checking'?'Checking the local solver…':'Setup required: PARTNER_JWT'}</span>
          <h3>The stage is set. The relay is closed to us.</h3>
          <p>The NEAR Intents relay only streams quote requests to approved market makers. Kuroko shows a real request or nothing.</p>
          <ol>
            <li>Apply for solver Message Bus access at the <a href="https://partners.near-intents.org/" target="_blank" rel="noreferrer">Partner Portal <Icon name="external" size={12}/></a></li>
            <li>Put the issued token in a gitignored <code>.env</code> as <code>PARTNER_JWT</code></li>
            <li>Run <code>pnpm listen</code>; the tape fills here from <code>127.0.0.1:3100</code></li>
          </ol>
          <button className="btn btn-ghost btn-sm" onClick={recheck} disabled={solver.s==='checking'}><Icon name="refresh" size={16}/>Check again</button>
        </div>
      </div>}
    </div>
  </Panel>;
}

function VaultPanel({wallet,chain,locked,refresh}:{wallet:Wallet;chain:Chain|null;locked:boolean;refresh:()=>Promise<void>}){
  const [mode,setMode]=useState<'deposit'|'withdraw'>('deposit');
  const [amount,setAmount]=useState('');
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const nav=navNumber(chain?.vault??null);
  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg(null);
    try{
      const raw=rawUnits(amount);let hash='';
      if(mode==='deposit'){if(!usdcId)throw new Error('Setup required: VITE_USDC_ACCOUNT');if(!vaultId)throw new Error('Setup required: VITE_VAULT_ACCOUNT');hash=await wallet.call('ft_transfer_call',{receiver_id:vaultId,amount:raw,msg:''},{deposit:'1',receiver:usdcId});}
      else hash=await wallet.call('withdraw',{shares:raw});
      setMsg({ok:true,text:mode==='deposit'?'Deposit confirmed':'Withdrawal confirmed',hash});setAmount('');await refresh();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  return <Panel className="p-vault" title="Vault" meta={<Chip tone={chain?.vault.paused?'bad':'live'}>{chain?(chain.vault.paused?'Paused':'Testnet · live'):'Loading'}</Chip>}>
    <div className="nav-block">
      <span>NAV per share</span>
      <Num value={nav?.value??null} unit="USDC"/>
      <small>{nav?.genesis?'Genesis price: no shares yet, first deposit mints 1:1':'Cash balance ÷ outstanding shares'}</small>
    </div>
    <dl className="kv">
      <div><dt>Vault USDC</dt><dd>{chain?decimal(chain.vault.usdc_balance):'—'}</dd></div>
      <div><dt>Shares outstanding</dt><dd>{chain?decimal(chain.vault.total_shares):'—'}</dd></div>
      <div><dt>Your shares</dt><dd>{wallet.account?(chain?decimal(chain.shares):'—'):'Not connected'}</dd></div>
    </dl>
    <form className="trade" onSubmit={submit}>
      <div className="seg" role="tablist" aria-label="Vault action">
        <button type="button" role="tab" aria-selected={mode==='deposit'} onClick={()=>{setMode('deposit');setMsg(null);}}>Deposit</button>
        <button type="button" role="tab" aria-selected={mode==='withdraw'} onClick={()=>{setMode('withdraw');setMsg(null);}}>Withdraw</button>
      </div>
      <label className="amount"><span>{mode==='deposit'?'Amount':'Shares to burn'}</span>
        <div className="amount-box"><input inputMode="decimal" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} aria-label={mode==='deposit'?'USDC amount':'Shares'}/><em>{mode==='deposit'?'USDC':'SHARES'}</em>
          {mode==='withdraw'&&wallet.account&&chain&&chain.shares!=='0'&&<button type="button" className="max" onClick={()=>setAmount(decimal(chain.shares))}>Max</button>}
        </div>
      </label>
      <p className="hint">{mode==='deposit'?<>NEP-141 <code>ft_transfer_call</code> on <code>{usdcId||'VITE_USDC_ACCOUNT'}</code>; shares mint when the transfer lands.</>:'Burns shares at cash NAV and sends USDC back to your wallet.'}</p>
      {!wallet.account
        ?<button type="button" className="btn btn-primary wide" onClick={()=>void wallet.connect()} disabled={!wallet.ready}><Icon name="wallet" size={16}/>Connect testnet wallet</button>
        :<button className="btn btn-primary wide" disabled={wallet.busy||locked||!amount||(mode==='deposit'&&!usdcId)}>{locked?'Locked while a vote is open':wallet.busy?'Waiting for wallet…':mode==='deposit'?'Deposit on testnet':'Withdraw on testnet'}</button>}
      {mode==='deposit'&&!usdcId&&<p className="fail"><Icon name="x" size={14}/>Setup required: VITE_USDC_ACCOUNT</p>}
      {msg&&<p className={msg.ok?'pass':'fail'} role={msg.ok?'status':'alert'}><Icon name={msg.ok?'check':'x'} size={14}/>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)} <Icon name="external" size={12}/></a></>}</p>}
    </form>
  </Panel>;
}

function Bar({yes,no,total}:{yes:string;no:string;total:string}){
  const t=BigInt(total||'0');const pct=(x:string)=>t>0n?Number(BigInt(x)*10000n/t)/100:0;
  return <div className="vbar" aria-hidden="true"><span className="vy" style={{width:`${pct(yes)}%`}}/><span className="vn" style={{width:`${pct(no)}%`}}/><i style={{left:'50%'}}/></div>;
}

function ConstitutionPanel({wallet,chain,refresh}:{wallet:Wallet;chain:Chain|null;refresh:()=>Promise<void>}){
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const c=chain?.vault.constitution;
  const isHolder=!!chain&&chain.shares!=='0';
  async function act(method:string,args:object,label:string){setMsg(null);try{const hash=await wallet.call(method,args);setMsg({ok:true,text:label,hash});await refresh();}catch(e){setMsg({ok:false,text:(e as Error).message});}}
  return <Panel className="p-const" title="Constitution" meta={<span className="stamp">read from <code>state</code></span>}>
    <div className="rule-rows">
      <div><span><Icon name="layers" size={16}/>Allowed pairs</span><b>{c?c.allowed_pairs.map(pairLabel).join(', ')||'None':'—'}</b></div>
      <div><span><Icon name="lock" size={16}/>Max inventory</span><b>{c?decimal(c.max_inventory_usdc):'—'} <em>USDC</em></b></div>
      <div><span><Icon name="scale" size={16}/>Minimum spread</span><b>{c?c.min_spread_bps:'—'} <em>bps</em></b></div>
      <div><span><Icon name="shield" size={16}/>Daily loss limit</span><b>{c?decimal(c.daily_loss_limit_usdc):'—'} <em>USDC</em></b></div>
    </div>
    <h3 className="sub">Shareholder votes</h3>
    {!chain?<div className="skeleton-line"/>:chain.proposals.length===0
      ?<Empty icon="vote" title="No proposals yet">Any shareholder can propose a replacement constitution. The vault has no shareholders yet.</Empty>
      :<div className="votes">{chain.proposals.slice().reverse().map(p=>{
        const open=!p.executed&&Date.now()<p.closes_at_ms;const voted=p.voters.includes(wallet.account);
        return <article className="vote" key={p.id}>
          <header><b>Proposal #{p.id}</b><Chip tone={open?'live':p.executed?'idle':'warn'}>{p.executed?'Executed':open?`Open until ${new Date(p.closes_at_ms).toLocaleString()}`:'Ready to execute'}</Chip></header>
          <p className="vote-diff">{p.constitution.allowed_pairs.map(pairLabel).join(', ')} · max {decimal(p.constitution.max_inventory_usdc)} USDC · {p.constitution.min_spread_bps} bps · loss {decimal(p.constitution.daily_loss_limit_usdc)} USDC</p>
          <Bar yes={p.yes} no={p.no} total={p.snapshot_shares}/>
          <div className="vote-foot"><span>Yes <b>{decimal(p.yes)}</b> · No <b>{decimal(p.no)}</b> · of {decimal(p.snapshot_shares)} shares</span>
            <div className="vote-actions">
              {open&&<><button className="btn btn-ghost btn-sm" disabled={wallet.busy||!isHolder||voted} onClick={()=>void act('vote',{id:p.id,yes:true},'Vote recorded')}>Yes</button><button className="btn btn-ghost btn-sm" disabled={wallet.busy||!isHolder||voted} onClick={()=>void act('vote',{id:p.id,yes:false},'Vote recorded')}>No</button></>}
              {!open&&!p.executed&&<button className="btn btn-primary btn-sm" disabled={wallet.busy||!wallet.account} onClick={()=>void act('execute',{id:p.id},'Proposal executed')}>Execute</button>}
            </div>
          </div>
        </article>;})}</div>}
    {msg&&<p className={msg.ok?'pass':'fail'} role={msg.ok?'status':'alert'}><Icon name={msg.ok?'check':'x'} size={14}/>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)} <Icon name="external" size={12}/></a></>}</p>}
    <p className="source">Native share voting on the vault contract. Sputnik DAO is not integrated.</p>
  </Panel>;
}

function ProposePanel({wallet,chain,locked,refresh}:{wallet:Wallet;chain:Chain|null;locked:boolean;refresh:()=>Promise<void>}){
  const [draft,setDraft]=useState<{pairs:string;cap:string;spread:string;loss:string}|null>(null);
  const [msg,setMsg]=useState<{ok:boolean;text:string;hash?:string}|null>(null);
  const c=chain?.vault.constitution;
  useEffect(()=>{if(c&&!draft)setDraft({pairs:c.allowed_pairs.join('\n'),cap:decimal(c.max_inventory_usdc),spread:String(c.min_spread_bps),loss:decimal(c.daily_loss_limit_usdc)});},[c,draft]);
  const isHolder=!!chain&&chain.shares!=='0';
  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg(null);
    try{
      if(!draft)throw new Error('The current constitution has not loaded yet');
      const bps=Number(draft.spread);if(!Number.isInteger(bps)||bps<0||bps>9999)throw new Error('Spread must be a whole number of bps from 0 to 9999');
      const pairs=draft.pairs.split('\n').map(x=>x.trim()).filter(Boolean);if(!pairs.length)throw new Error('List at least one pair');
      const constitution:Constitution={allowed_pairs:pairs,max_inventory_usdc:rawUnits(draft.cap),min_spread_bps:bps,daily_loss_limit_usdc:rawUnits(draft.loss)};
      const hash=await wallet.call('propose',{constitution});setMsg({ok:true,text:'Proposal opened for 24 hours',hash});await refresh();
    }catch(err){setMsg({ok:false,text:(err as Error).message});}
  }
  const set=(k:'pairs'|'cap'|'spread'|'loss')=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setDraft(d=>d&&{...d,[k]:e.target.value});
  const changes=c&&draft?[
    {label:'Pairs',from:c.allowed_pairs.map(pairLabel).join(', '),to:draft.pairs.split('\n').map(x=>x.trim()).filter(Boolean).map(pairLabel).join(', ')||'none'},
    {label:'Max inventory',from:`${decimal(c.max_inventory_usdc)} USDC`,to:`${draft.cap||'—'} USDC`},
    {label:'Min spread',from:`${c.min_spread_bps} bps`,to:`${draft.spread||'—'} bps`},
    {label:'Daily loss limit',from:`${decimal(c.daily_loss_limit_usdc)} USDC`,to:`${draft.loss||'—'} USDC`},
  ].map(x=>({...x,changed:x.from!==x.to})):[];
  const reason=!wallet.account?'Connect a testnet wallet to propose':!isHolder?'Only shareholders can propose. Deposit USDC first.':locked?'A vote is already open':'';
  return <Panel className="p-propose" title="Propose a change" meta={<span className="stamp">full replacement · 24 h vote</span>}>
    <form className="propose" onSubmit={submit}>
      <label className="field"><span>Allowed pairs · one per line</span><textarea rows={2} value={draft?.pairs??''} onChange={set('pairs')} spellCheck={false}/></label>
      <div className="field-row three">
        <label className="field"><span>Max inventory</span><div className="unit-in"><input inputMode="decimal" value={draft?.cap??''} onChange={set('cap')}/><em>USDC</em></div></label>
        <label className="field"><span>Min spread</span><div className="unit-in"><input inputMode="numeric" value={draft?.spread??''} onChange={set('spread')}/><em>bps</em></div></label>
        <label className="field"><span>Daily loss</span><div className="unit-in"><input inputMode="decimal" value={draft?.loss??''} onChange={set('loss')}/><em>USDC</em></div></label>
      </div>
      <div className="diff" aria-label="Changes against the current constitution">
        <div className="diff-head"><span>Against current</span><span>{changes.filter(x=>x.changed).length} change{changes.filter(x=>x.changed).length===1?'':'s'}</span></div>
        {changes.map(x=><div key={x.label} className={`diff-row${x.changed?' changed':''}`}><span>{x.label}</span><b>{x.changed&&<s>{x.from}</s>}{x.to}</b></div>)}
      </div>
      <div className="push"/>
      <button className="btn btn-primary wide" disabled={!!reason||wallet.busy||!draft||!changes.some(x=>x.changed)}><Icon name="vote" size={16}/>{wallet.busy?'Waiting for wallet…':'Open the vote on testnet'}</button>
      {reason&&<p className="hint">{reason}</p>}
      {msg&&<p className={msg.ok?'pass':'fail'} role={msg.ok?'status':'alert'}><Icon name={msg.ok?'check':'x'} size={14}/>{msg.text}{msg.hash&&<> · <a href={nearblocksTx(msg.hash)} target="_blank" rel="noreferrer">{short(msg.hash,6,4)} <Icon name="external" size={12}/></a></>}</p>}
    </form>
  </Panel>;
}

function Fills(){
  return <Panel className="p-fills" title="Fills ledger" meta={<Chip>Verified settlements only</Chip>}>
    <div className="fills-table" role="table" aria-label="Verified fills">
      <div className="ft-row ft-head" role="row"><span>Settled</span><span>Pair</span><span>Paid in</span><span>Paid out</span><span>Spread</span><span>Transaction</span></div>
      <Empty icon="flag" title="No verified fills">Kuroko sends no quotes in listen mode, so it has filled nothing and earned no spread. A fill appears here only with an <code>intents.near</code> settlement transaction anyone can re-query.</Empty>
    </div>
  </Panel>;
}
