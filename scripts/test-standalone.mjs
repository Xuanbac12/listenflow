import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
if(!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run this script through Firebase emulators:exec.');
const origin='https://listenflow-english-20261117.web.app';
const port=3001;
const child=spawn(process.execPath,['functions/lib/server.js'],{stdio:'inherit',env:{...process.env,NODE_ENV:'test',PORT:String(port),GCLOUD_PROJECT:'demo-listenflow',FIREBASE_PROJECT_ID:'demo-listenflow',FIREBASE_SERVICE_ACCOUNT_JSON:'',ALLOWED_ORIGINS:origin}});
const base=`http://127.0.0.1:${port}/api`;
try{
  let ready=false;
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw new Error(`Standalone server exited: ${child.exitCode}`);
    try{const res=await fetch(`${base}/health`);if(res.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.equal(ready,true,'Standalone API should start');
  const preflight=await fetch(`${base}/contents`,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  const rejected=await fetch(`${base}/contents`,{headers:{Origin:'https://untrusted.example'}});assert.equal(rejected.status,403);
  const unauthorized=await fetch(`${base}/contents`,{headers:{Origin:origin}});assert.equal(unauthorized.status,401);assert.equal(unauthorized.headers.get('access-control-allow-origin'),origin);
  console.log('PASS: standalone server startup, preflight, denied origin and protected API');
  process.env.TEST_API_BASE=base;
  await import('./integration.mjs');
}finally{
  if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
}
