import express, { Request, Response, NextFunction } from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { grade, tokenize } from './grading';
import { corsMiddleware } from './cors';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (serviceAccount) {
  const credentials = JSON.parse(serviceAccount);
  if (process.env.FIREBASE_PROJECT_ID && credentials.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error('Service account project does not match FIREBASE_PROJECT_ID.');
  initializeApp({credential:cert(credentials),projectId:credentials.project_id});
} else initializeApp();
const db = getFirestore();
export const app = express();
app.disable('x-powered-by');
app.use(corsMiddleware(process.env.ALLOWED_ORIGINS ?? ''));
app.use(express.json({ limit: '32kb' }));
app.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
const wrap = (fn:(req:Request,res:Response)=>Promise<unknown>) => (req:Request,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};
class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
const id=z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const optionsSchema=z.object({ignoreCase:z.boolean(),ignorePunctuation:z.boolean()});
const contentSchema=z.object({title:z.string().trim().min(1).max(100),type:z.enum(['vocabulary','sentences','paragraphs']),text:z.string().trim().min(1).max(8000).refine(s=>s.split(/\s+/).length<=500,'Maximum 500 words').refine(s=>tokenize(s,{ignoreCase:true,ignorePunctuation:true}).length>0,'Enter at least one word'),hint:z.string().trim().max(500).default(''),topicId:z.union([id,z.literal('')]).default(''),collectionId:z.union([id,z.literal('')]).default('')}).strict();
const groupSchema=z.object({name:z.string().trim().min(1).max(60),kind:z.enum(['topic','collection'])}).strict();
const settingsSchema=z.object({ignoreCase:z.boolean(),ignorePunctuation:z.boolean(),dailyGoal:z.number().int().min(1).max(100),theme:z.enum(['light','dark','system']),timeZone:z.string().max(100).refine(s=>{try{new Intl.DateTimeFormat('en',{timeZone:s});return true;}catch{return false;}},'Invalid timezone')}).strict();
const defaults={ignoreCase:true,ignorePunctuation:true,dailyGoal:5,theme:'system',timeZone:'Asia/Ho_Chi_Minh'};
const owner=(res:Response)=>db.collection('users').doc(res.locals.uid as string);
const metadata=(doc:FirebaseFirestore.DocumentSnapshot)=>{const d=doc.data()!;return {id:doc.id,title:d.title,type:d.type,hint:d.hint,topicId:d.topicId,collectionId:d.collectionId,wordCount:d.wordCount,updatedAt:d.updatedAt};};
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.use('/api',(req,res,next)=>{void(async()=>{
  const match=/^Bearer (.+)$/.exec(req.headers.authorization??'');
  if(!match)throw new HttpError(401,'Sign in to continue.');
  try{res.locals.uid=(await getAuth().verifyIdToken(match[1],true)).uid;}catch{throw new HttpError(401,'Your session has expired. Please sign in again.');}
  next();
})().catch(next);});
app.get('/api/contents',wrap(async(req,res)=>{
  const docs=await owner(res).collection('contents').orderBy('updatedAt','desc').get();
  const search=String(req.query.q??'').toLowerCase();
  res.json(docs.docs.map(metadata).filter(d=>(!req.query.type||d.type===req.query.type)&&(!req.query.topicId||d.topicId===req.query.topicId)&&(!req.query.collectionId||d.collectionId===req.query.collectionId)&&`${d.title} ${d.hint}`.toLowerCase().includes(search)));
}));
// Only the explicit content editor uses this endpoint, never the practice screen.
app.get('/api/contents/:id/edit',wrap(async(req,res)=>{
  const doc=await owner(res).collection('contents').doc(id.parse(req.params.id)).get();
  if(!doc.exists)throw new HttpError(404,'Content no longer exists.');
  res.json({id:doc.id,...doc.data()});
}));
async function validateGroups(res:Response,data:z.infer<typeof contentSchema>){
  for(const [groupId,kind] of [[data.topicId,'topic'],[data.collectionId,'collection']])if(groupId){
    const group=await owner(res).collection('groups').doc(groupId).get();
    if(!group.exists||group.data()!.kind!==kind)throw new HttpError(400,`Invalid ${kind}.`);
  }
}
app.post('/api/contents',wrap(async(req,res)=>{
  const data=contentSchema.parse(req.body);await validateGroups(res,data);
  const ref=owner(res).collection('contents').doc();
  await ref.set({...data,wordCount:data.text.split(/\s+/).length,createdAt:Date.now(),updatedAt:Date.now()});
  res.status(201).json(metadata(await ref.get()));
}));
app.put('/api/contents/:id',wrap(async(req,res)=>{
  const data=contentSchema.parse(req.body);await validateGroups(res,data);
  const ref=owner(res).collection('contents').doc(id.parse(req.params.id));
  await db.runTransaction(async tx=>{if(!(await tx.get(ref)).exists)throw new HttpError(404,'Content no longer exists.');tx.update(ref,{...data,wordCount:data.text.split(/\s+/).length,updatedAt:Date.now()});});
  res.json(metadata(await ref.get()));
}));
app.delete('/api/contents/:id',wrap(async(req,res)=>{
  const contentId=id.parse(req.params.id),batch=db.batch();
  batch.delete(owner(res).collection('contents').doc(contentId));batch.delete(owner(res).collection('mistakes').doc(contentId));await batch.commit();res.status(204).end();
}));
app.get('/api/groups',wrap(async(_req,res)=>{res.json((await owner(res).collection('groups').orderBy('name').get()).docs.map(d=>({id:d.id,...d.data()})));}));
app.post('/api/groups',wrap(async(req,res)=>{const data=groupSchema.parse(req.body),ref=await owner(res).collection('groups').add(data);res.status(201).json({id:ref.id,...data});}));
app.put('/api/groups/:id',wrap(async(req,res)=>{
  const data=groupSchema.parse(req.body),ref=owner(res).collection('groups').doc(id.parse(req.params.id));
  await db.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists)throw new HttpError(404,'Group not found.');if(doc.data()!.kind!==data.kind)throw new HttpError(400,'Group kind cannot change.');tx.update(ref,data);});res.json({id:ref.id,...data});
}));
app.delete('/api/groups/:id',wrap(async(req,res)=>{
  const groupId=id.parse(req.params.id),ref=owner(res).collection('groups').doc(groupId);
  const contents=await owner(res).collection('contents').get();
  const affected=contents.docs.filter(d=>d.data().topicId===groupId||d.data().collectionId===groupId);
  for(let i=0;i<affected.length;i+=400){const batch=db.batch();for(const doc of affected.slice(i,i+400))batch.update(doc.ref,{...(doc.data().topicId===groupId?{topicId:''}:{}),...(doc.data().collectionId===groupId?{collectionId:''}:{})});await batch.commit();}
  await ref.delete();res.status(204).end();
}));
app.get('/api/settings',wrap(async(_req,res)=>{res.json({...defaults,...(await owner(res).collection('profile').doc('settings').get()).data()});}));
app.put('/api/settings',wrap(async(req,res)=>{const data=settingsSchema.parse(req.body);await owner(res).collection('profile').doc('settings').set(data);res.json(data);}));
app.post('/api/practice',wrap(async(req,res)=>{
  const {contentId,options}=z.object({contentId:id,options:optionsSchema}).strict().parse(req.body);
  const content=await owner(res).collection('contents').doc(contentId).get();if(!content.exists)throw new HttpError(404,'Content no longer exists.');
  const ref=owner(res).collection('sessions').doc();
  await ref.set({contentId,options,text:content.data()!.text,title:content.data()!.title,type:content.data()!.type,createdAt:Date.now(),expiresAt:Date.now()+3600000});
  res.status(201).json({id:ref.id,content:metadata(content),options});
}));
app.post('/api/practice/:id/check',wrap(async(req,res)=>{
  const sessionId=id.parse(req.params.id);
  const {answer}=z.object({answer:z.string().max(8000).refine(s=>s.trim().split(/\s+/).length<=500,'Maximum 500 words')}).strict().parse(req.body);
  const root=owner(res),sessionRef=root.collection('sessions').doc(sessionId),attemptRef=root.collection('attempts').doc(sessionId);
  const result=await db.runTransaction(async tx=>{
    const [session,previous,settings]=await Promise.all([tx.get(sessionRef),tx.get(attemptRef),tx.get(root.collection('profile').doc('settings'))]);
    if(previous.exists)return {id:previous.id,...previous.data()};
    if(!session.exists)throw new HttpError(404,'Practice session not found.');
    const s=session.data()!;if(s.expiresAt<Date.now())throw new HttpError(410,'Session expired. Start a new practice.');
    const content=await tx.get(root.collection('contents').doc(s.contentId));if(!content.exists)throw new HttpError(404,'Content was deleted. Choose another exercise.');
    const checked=grade(s.text,answer,s.options),createdAt=Date.now(),timeZone=settings.data()?.timeZone??defaults.timeZone;
    const day=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(createdAt);
    const data={...checked,contentId:s.contentId,title:s.title,type:s.type,answer,original:s.text,options:s.options,createdAt,day};
    tx.set(attemptRef,data);tx.delete(sessionRef);
    tx.set(root.collection('stats').doc('total'),{attempts:FieldValue.increment(1),scoreSum:FieldValue.increment(checked.score),perfect:FieldValue.increment(checked.score===100?1:0)},{merge:true});
    tx.set(root.collection('days').doc(day),{day,attempts:FieldValue.increment(1),scoreSum:FieldValue.increment(checked.score)},{merge:true});
    const mistakeRef=root.collection('mistakes').doc(s.contentId);
    if(checked.score<100)tx.set(mistakeRef,{contentId:s.contentId,title:content.data()!.title,type:s.type,score:checked.score,updatedAt:createdAt,attemptId:sessionId});else tx.delete(mistakeRef);
    return {id:sessionId,...data};
  });res.json(result);
}));
app.get('/api/history',wrap(async(req,res)=>{
  let query=owner(res).collection('attempts').orderBy('createdAt','desc').orderBy('__name__','desc').limit(20);
  if(req.query.cursor){const cursor=await owner(res).collection('attempts').doc(id.parse(req.query.cursor)).get();if(!cursor.exists)throw new HttpError(400,'Invalid cursor.');query=query.startAfter(cursor);}
  const docs=(await query.get()).docs;res.json({items:docs.map(d=>({id:d.id,...d.data()})),nextCursor:docs.length===20?docs[docs.length-1].id:null});
}));
app.get('/api/mistakes',wrap(async(_req,res)=>{res.json((await owner(res).collection('mistakes').orderBy('updatedAt','desc').get()).docs.map(d=>({id:d.id,...d.data()})));}));
app.get('/api/statistics',wrap(async(_req,res)=>{
  const root=owner(res);
  const [total,days,contents,mistakes,settings]=await Promise.all([root.collection('stats').doc('total').get(),root.collection('days').orderBy('day','desc').limit(90).get(),root.collection('contents').count().get(),root.collection('mistakes').count().get(),root.collection('profile').doc('settings').get()]);
  const t=total.data()??{attempts:0,scoreSum:0,perfect:0};
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:settings.data()?.timeZone??defaults.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now());
  res.json({...t,average:t.attempts?Math.round(t.scoreSum/t.attempts):0,contents:contents.data().count,mistakes:mistakes.data().count,today,days:days.docs.map(d=>d.data())});
}));
app.use((_req,res)=>res.status(404).json({error:'Endpoint not found.'}));
app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof z.ZodError){res.status(400).json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});return;}
  if(error instanceof HttpError){res.status(error.status).json({error:error.message});return;}
  if(error instanceof SyntaxError){res.status(400).json({error:'Invalid JSON.'});return;}
  if((error as {type?:string})?.type==='entity.too.large'){res.status(413).json({error:'Request too large.'});return;}
  console.error('API failure',error);res.status(500).json({error:'Something went wrong. Please try again.'});
});
export const api=onRequest({region:'asia-southeast1',memory:'256MiB',timeoutSeconds:60,maxInstances:10},app);
