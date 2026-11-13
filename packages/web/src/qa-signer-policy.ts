export const QA_RPC='https://test.rpc.fastnear.com';
/** FastNEAR's archival testnet node serves the same chain; it is approved so a per-IP rate limit on one does not strand a signed run. */
export const QA_RPCS=[QA_RPC,'https://archival-rpc.testnet.fastnear.com'];
export const QA_CAP=300000000000000000000000n;
export const QA_GAS=100000000000000n;
export function checkQaNetwork(accountId:string,rpcUrl:string,vault:string){
  const namedTestnet=/^(([a-z\d]+[-_])*[a-z\d]+\.)+testnet$/;
  if(!namedTestnet.test(accountId)||!namedTestnet.test(vault)||accountId.length>64||vault.length>64||!QA_RPCS.includes(rpcUrl))throw Error('QA signer requires named testnet accounts and the approved testnet RPC.');
}
export function qaReservation(gas:bigint,deposit:bigint,gasPrice:bigint){
  if(gas<=0n||gas>QA_GAS||deposit<0n||deposit>1n||gasPrice<=0n)throw Error('QA signer only allows bounded function calls with at most one yoctoNEAR attached.');
  const reservation=gas*gasPrice+deposit+1n;
  if(reservation>QA_CAP)throw Error('QA signer gas reservation exceeds the 0.3 NEAR cap.');
  return reservation;
}
