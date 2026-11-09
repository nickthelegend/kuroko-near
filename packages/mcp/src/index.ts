import {McpServer} from '@modelcontextprotocol/server';
import {serveStdio} from '@modelcontextprotocol/server/stdio';
import {z} from 'zod';
import {listenStats,vaultState} from './data.js';

export function createServer(){
  const server=new McpServer({name:'kuroko-readonly',version:'0.1.0'});
  server.registerTool('get_vault_state',{description:'Read the deployed Kuroko vault state from NEAR testnet RPC. No transactions are signed.',inputSchema:z.object({accountId:z.string().optional()})},async({accountId})=>{
    try{return {content:[{type:'text',text:JSON.stringify(await vaultState(accountId),null,2)}]}}
    catch(e){return {content:[{type:'text',text:String(e)}],isError:true}}
  });
  server.registerTool('get_listen_stats',{description:'Read live request counts and observed relay tape from the local listen-only solver. It never quotes to the relay.',inputSchema:z.object({})},async()=>{
    try{return {content:[{type:'text',text:JSON.stringify(await listenStats(),null,2)}]}}
    catch(e){return {content:[{type:'text',text:String(e)}],isError:true}}
  });
  return server;
}
void serveStdio(createServer);
