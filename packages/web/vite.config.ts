import {defineConfig,type Plugin} from 'vite';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const artDir=fileURLToPath(new URL('./public/art',import.meta.url));
const listArt=()=>{try{return readdirSync(artDir).filter(f=>f.endsWith('.webp'))}catch{return []}};

// Exposes the art files that actually exist, so the UI renders a designed placeholder
// instead of requesting a missing image. Adding a file to public/art triggers a reload.
function artManifest():Plugin{
  const id='virtual:art';const resolved='\0'+id;
  return {name:'kuroko-art',resolveId:s=>s===id?resolved:undefined,load:s=>s===resolved?`export default ${JSON.stringify(listArt())}`:undefined,
    configureServer(server){server.watcher.add(artDir);const bump=(f:string)=>{if(f.startsWith(artDir)){const m=server.moduleGraph.getModuleById(resolved);if(m)server.moduleGraph.invalidateModule(m);server.ws.send({type:'full-reload'});}};server.watcher.on('add',bump);server.watcher.on('unlink',bump);}};
}
export default defineConfig({plugins:[artManifest()],server:{port:5173,strictPort:true}});
