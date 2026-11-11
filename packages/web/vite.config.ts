import {defineConfig} from 'vite';
export default defineConfig(({mode})=>({
  server:{port:5371,strictPort:true},
  // An accidentally inherited flag cannot enable signing in an ordinary production build.
  define:{'import.meta.env.VITE_QA_SIGNER':JSON.stringify(mode==='qa'&&process.env.VITE_QA_SIGNER==='1'?'1':'0')},
}));
