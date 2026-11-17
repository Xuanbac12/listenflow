import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { corsMiddleware } from '../src/cors';
test('cross-origin API only admits configured website origins',async()=>{
  const app=express();app.use(corsMiddleware('https://listenflow.example'));app.get('/api/health',(_req,res)=>res.json({ok:true}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error('No server port');
  const url=`http://127.0.0.1:${address.port}/api/health`;
  try{
    const allowed=await fetch(url,{headers:{Origin:'https://listenflow.example'}});assert.equal(allowed.status,200);assert.equal(allowed.headers.get('access-control-allow-origin'),'https://listenflow.example');
    const denied=await fetch(url,{headers:{Origin:'https://untrusted.example'}});assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
    const preflight=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://listenflow.example','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(preflight.status,204);assert.match(preflight.headers.get('access-control-allow-headers')??'',/Authorization/);
    const health=await fetch(url);assert.equal(health.status,200);
  }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
