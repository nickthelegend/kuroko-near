export const testnetRpc=process.env.TESTNET_RPC_URL||'https://test.rpc.fastnear.com';
export const solverApi=process.env.SOLVER_API||'http://127.0.0.1:3100';
export async function vaultState(accountId=process.env.VAULT_ACCOUNT):Promise<unknown>{
  if(!accountId)throw Error('Setup required: VAULT_ACCOUNT');
  const response=await fetch(testnetRpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'kuroko-mcp',method:'query',params:{request_type:'call_function',finality:'final',account_id:accountId,method_name:'state',args_base64:'e30='}})});
  if(!response.ok)throw Error(`NEAR testnet RPC HTTP ${response.status}`);
  const body=await response.json() as {error?:{message?:string};result?:{result?:number[]}};
  if(body.error)throw Error(`NEAR testnet RPC: ${body.error.message||JSON.stringify(body.error)}`);
  if(!Array.isArray(body.result?.result))throw Error('NEAR testnet RPC returned no contract result');
  return {accountId,network:'testnet',source:testnetRpc,state:JSON.parse(Buffer.from(body.result.result).toString('utf8'))};
}
export async function listenStats():Promise<unknown>{
  const response=await fetch(`${solverApi}/stats`);
  if(!response.ok)throw Error(`Solver HTTP ${response.status}`);
  const data=await response.json() as Record<string,unknown>;
  if(data.mode!=='listen')throw Error(`Unexpected solver mode: ${String(data.mode)}`);
  return {source:`${solverApi}/stats`,...data};
}
