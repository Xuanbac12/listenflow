import { initializeApp } from 'firebase/app';
import { connectAuthEmulator,getAuth } from 'firebase/auth';
const env=import.meta.env;
export const emulator=env.VITE_USE_EMULATORS==='true';
export const configured=emulator||Boolean(env.VITE_FIREBASE_API_KEY&&env.VITE_FIREBASE_PROJECT_ID&&env.VITE_FIREBASE_APP_ID);
const app=initializeApp({apiKey:env.VITE_FIREBASE_API_KEY||'demo-key',authDomain:env.VITE_FIREBASE_AUTH_DOMAIN||'demo-listenflow.firebaseapp.com',projectId:env.VITE_FIREBASE_PROJECT_ID||'demo-listenflow',appId:env.VITE_FIREBASE_APP_ID||'demo-listenflow'});
export const auth=getAuth(app);
const apiBase=(env.VITE_API_BASE_URL||'/api').replace(/\/+$/,'');
if(env.PROD&&env.VITE_API_BASE_URL&&!apiBase.startsWith('https://'))throw new Error('Production API URL must use HTTPS.');
if(emulator)connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const user=auth.currentUser;
  if(!user)throw new Error('Please sign in to continue.');
  let response:Response;
  try { response=await fetch(`${apiBase}${path}`,{method,headers:{Authorization:`Bearer ${await user.getIdToken()}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)}); }
  catch(error) { if(error instanceof DOMException&&error.name==='TimeoutError')throw new Error('The practice server is waking up. Please try again in a moment.');throw new Error('Cannot reach the practice server. Check your connection and try again.'); }
  if(response.status===204)return undefined as T;
  const data=await response.json().catch(()=>({error:'API unavailable. Check that the Firebase emulators or deployed API are running.'}));
  if(!response.ok||data.error)throw new Error(data.error||`Request failed (${response.status}).`);
  return data as T;
}
