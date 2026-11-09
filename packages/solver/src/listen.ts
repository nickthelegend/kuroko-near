import WebSocket from 'ws';
import {createServer} from 'node:http';
import {mkdir,appendFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {evaluate, type QuoteRequest, type Constitution} from '@kuroko/sdk';

const jwt=process.env.PARTNER_JWT;
if (!jwt) { console.error('Setup required: PARTNER_JWT'); process.exit(2); }
const account=process.env.NEAR_MAINNET_ACCOUNT;
if (!account) { console.error('Setup required: NEAR_MAINNET_ACCOUNT'); process.exit(2); }
const assetIn=process.env.KUROKO_ASSET_IN;
const assetOut=process.env.KUROKO_ASSET_OUT;
if (!assetIn || !assetOut) { console.error('Setup required: KUROKO_ASSET_IN, KUROKO_ASSET_OUT'); process.exit(2); }
const constitution: Constitution={allowed_pairs:[`${assetIn}/${assetOut}`],max_inventory_usdc:process.env.KUROKO_MAX_INVENTORY || '0',min_spread_bps:Number(process.env.KUROKO_MIN_SPREAD_BPS || 30),daily_loss_limit_usdc:process.env.KUROKO_DAILY_LOSS_LIMIT || '0'};
const tokenIn=assetIn as string;
const tokenOut=assetOut as string;
const startedAt=new Date().toISOString();
const stats={mode:'listen',startedAt,requestsSeen:0,wouldQuote:0,quoted:0,won:0,spreadEarned:'0',inventory:{} as Record<string,string>,lastError:null as string|null};
const tape: unknown[]=[];
const dataDir=join(process.cwd(),'data');
await mkdir(dataDir,{recursive:true});
const date=startedAt.slice(0,10);
const server=createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json');if(req.url==='/health'||req.url==='/stats')res.end(JSON.stringify({...stats,tape:tape.slice(-50)}));else{res.statusCode=404;res.end(JSON.stringify({error:'not found'}));}});
server.listen(Number(process.env.PORT || 3100),'127.0.0.1');
async function balances(): Promise<Record<string,string>> {
  const args=Buffer.from(JSON.stringify({account_id:account,token_ids:[tokenIn,tokenOut]})).toString('base64');
  const response=await fetch('https://rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'kuroko',method:'query',params:{request_type:'call_function',finality:'final',account_id:'intents.near',method_name:'mt_batch_balance_of',args_base64:args}})});
  if(!response.ok) throw Error(`RPC HTTP ${response.status}`);
  const json=await response.json() as {result?:{result:number[]},error?:unknown};
  if(json.error||!json.result) throw Error(`RPC error: ${JSON.stringify(json.error)}`);
  const values=JSON.parse(Buffer.from(json.result.result).toString()) as string[];
  if(values.length!==2) throw Error('unexpected balance response');
  return {[tokenIn]:values[0],[tokenOut]:values[1]};
}
let ws:WebSocket|undefined;
let reconnect:NodeJS.Timeout|undefined;
async function connect(){
  try {stats.inventory=await balances();stats.lastError=null;} catch(e){stats.lastError=String(e);console.error(stats.lastError);}
  ws=new WebSocket('wss://solver-relay-v2.chaindefuser.com/ws',{headers:{Authorization:`Bearer ${jwt}`}});
  ws.on('open',()=>{console.log('relay connected: listen mode');ws?.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'subscribe',params:['quote',{tokens_in:[tokenIn,tokenOut],tokens_out:[tokenIn,tokenOut]}]}));});
  let subscription='';
  ws.on('message',async raw=>{try{
    const msg=JSON.parse(String(raw)) as {id?:number,result?:string,error?:unknown,method?:string,params?:{subscription?:string,data?:QuoteRequest}};
    if(msg.id===1){if(msg.error)throw Error(`subscribe rejected: ${JSON.stringify(msg.error)}`);subscription=msg.result || '';if(!subscription)throw Error('missing subscription ID');console.log('quote subscription active');return;}
    if(msg.method!=='event'||msg.params?.subscription!==subscription||!msg.params.data)return;
    const request=msg.params.data;
    if(typeof request.quote_id!=='string'||typeof request.defuse_asset_identifier_in!=='string')return;
    stats.requestsSeen++;
    if(stats.requestsSeen%20===1) {try{stats.inventory=await balances();}catch(e){stats.lastError=String(e);}}
    const result=evaluate(request,stats.inventory,constitution);
    if('amount_out' in result)stats.wouldQuote++;
    const item={at:new Date().toISOString(),request,result,mode:'listen'};
    tape.push(item);if(tape.length>100)tape.shift();
    await appendFile(join(dataDir,`relay-${date}.jsonl`),JSON.stringify(item)+'\n');
    console.log(JSON.stringify(item));
  }catch(e){stats.lastError=String(e);console.error(stats.lastError);}});
  ws.on('error',e=>{stats.lastError=e.message;console.error(`relay error: ${e.message}`)});
  ws.on('close',(code)=>{stats.lastError=`relay closed ${code}`;console.error(stats.lastError);reconnect=setTimeout(connect,5000);});
}
await connect();
const persist=setInterval(()=>writeFile(join(dataDir,`stats-${date}.json`),JSON.stringify({...stats,endedAt:new Date().toISOString()},null,2)).catch(e=>console.error(e)),10000);
process.on('SIGINT',()=>{if(reconnect)clearTimeout(reconnect);clearInterval(persist);ws?.removeAllListeners('close');ws?.close();server.close();writeFile(join(dataDir,`stats-${date}.json`),JSON.stringify({...stats,endedAt:new Date().toISOString()},null,2)).finally(()=>process.exit(0));});
