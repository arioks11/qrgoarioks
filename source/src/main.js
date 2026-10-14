import QRCodeStyling from 'qr-code-styling';
import JSZip from 'jszip';
import './style.css';
import {isUrl,TYPES} from './payloads.js';
import {parseCSV} from './csv.js';
import {clean} from './utils.js';
import {readConfig,validateMedia,uploadMedia} from './upload.js';

const $=s=>document.querySelector(s);
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2400)};
$('#yr').textContent=new Date().getFullYear();

let cur=TYPES[0],vals={};

// ---------- UI: tabs + fields ----------
const tabs=$('#tabs');
TYPES.forEach(t=>{const b=document.createElement('button');b.className='tab';b.role='tab';b.textContent=t.label;b.dataset.id=t.id;b.onclick=()=>pick(t.id);tabs.append(b)});
function pick(id,preset){cur=TYPES.find(t=>t.id===id);vals=preset||{};
 tabs.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',b.dataset.id===id));
 const f=$('#fields');f.textContent='';
 cur.fields.forEach(d=>{const w=document.createElement('div');const l=document.createElement('label');l.textContent=d.l;l.htmlFor='f_'+d.k;let i;
  if(d.type==='textarea'){i=document.createElement('textarea');i.rows=3}
  else if(d.type==='select'){i=document.createElement('select');d.opts.forEach(([v,t])=>{const o=new Option(t,v);i.add(o)})}
  else{i=document.createElement('input');i.type=d.type}
  i.id='f_'+d.k;if(d.ph)i.placeholder=d.ph;i.autocomplete='off';
  if(d.type==='checkbox'){i.checked=vals[d.k]==='on';i.onchange=()=>{vals[d.k]=i.checked?'on':'';render()}}
  else{i.value=vals[d.k]||'';i.oninput=()=>{vals[d.k]=i.value;render()}}
  if(d.type==='checkbox'){l.prepend(i,' ');w.append(l)}else if(d.type==='password'){const s=document.createElement('label');const c=document.createElement('input');c.type='checkbox';c.onchange=()=>i.type=c.checked?'text':'password';s.append(c,' Show password');s.style.fontWeight=400;w.append(l,i,s)}else w.append(l,i);
  f.append(w)});
 if(cur.note){const n=document.createElement('p');n.className='hint';n.textContent=cur.note;f.append(n)}
 render()}

// ---------- appearance ----------
const defaults={fg:'#065f46',bg:'#ffffff',size:'512',ec:'M',dots:'rounded',corner:'extra-rounded',margin:'16'};
const hexOk=v=>/^#[0-9a-f]{6}$/i.test(v);
let logoUrl=null;
const qr=new QRCodeStyling({width:512,height:512,data:' ',type:'canvas'});
let payload=null,rt;
function lum(h){const c=[1,3,5].map(i=>{const v=parseInt(h.substr(i,2),16)/255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function render(){
 clearTimeout(rt);rt=setTimeout(()=>{
  const err=$('#err');
  try{payload=cur.build(vals);err.textContent=''}catch(e){payload=null;err.textContent=e.message;$('#prev').innerHTML='<span class="hint">Fix the highlighted issue to see the QR code.</span>';return}
  if(payload.length>2300){payload=null;err.textContent='Content is too long for a QR code.';return}
  const fg=hexOk($('#fgh').value)?$('#fgh').value:defaults.fg,bg=hexOk($('#bgh').value)?$('#bgh').value:defaults.bg,sz=+$('#size').value;
  qr.update({width:sz,height:sz,data:payload,margin:+$('#margin').value,image:logoUrl||undefined,
   qrOptions:{errorCorrectionLevel:$('#ec').value},dotsOptions:{color:fg,type:$('#dots').value},
   cornersSquareOptions:{color:fg,type:$('#corner').value},cornersDotOptions:{color:fg},backgroundOptions:{color:bg},
   imageOptions:{margin:4,imageSize:.3,crossOrigin:'anonymous'}});
  const p=$('#prev');p.textContent='';qr.append(p);
  const w=[];const a=lum(fg),b=lum(bg),cr=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  if(cr<4)w.push('Low contrast between colours – this may not scan reliably.');
  if(a>b)w.push('Light-on-dark (inverted) codes are not supported by every scanner.');
  if(logoUrl&&$('#ec').value!=='H')w.push('A logo covers part of the code: use error correction H.');
  if(+$('#margin').value<16)w.push('A small quiet zone can hurt scanning.');
  const W=$('#warn');W.hidden=!w.length;W.textContent=w.join(' ')},120)}
const link=(c,h)=>{$(c).oninput=()=>{if(hexOk($(c).value))$(h).value=$(c).value;render()};$(h).oninput=()=>{if(hexOk($(h).value))$(c).value=$(h).value;$(h).setAttribute('aria-invalid',!hexOk($(h).value));render()}};
link('#fg','#fgh');link('#bg','#bgh');
['size','ec','dots','corner'].forEach(i=>$('#'+i).onchange=render);
$('#margin').oninput=()=>{$('#mv').textContent=$('#margin').value;render()};
$('#reset').onclick=()=>{$('#fg').value=$('#fgh').value=defaults.fg;$('#bg').value=$('#bgh').value=defaults.bg;['size','ec','dots','corner','margin'].forEach(k=>$('#'+k).value=defaults[k]);$('#mv').textContent=16;logoUrl=null;$('#logo').value='';render();toast('Appearance reset')};
$('#rmlogo').onclick=()=>{logoUrl=null;$('#logo').value='';render()};
$('#logo').onchange=e=>{const f=e.target.files[0];if(!f)return;
 if(!['image/png','image/jpeg','image/svg+xml'].includes(f.type)){toast('Logo must be PNG, JPG or SVG');e.target.value='';return}
 if(f.size>1048576){toast('Logo is larger than 1 MB');e.target.value='';return}
 const r=new FileReader();r.onload=()=>{logoUrl=r.result;$('#ec').value='H';render()};r.readAsDataURL(f)};

// ---------- exports ----------
const fname=ext=>(cur.id+'-'+(vals.url||vals.ssid||vals.fn||vals.to||vals.n||vals.t||'qr')).toString().toLowerCase().replace(/^https?:\/\//,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'.'+ext;
async function save(ext){
 if(!payload){toast('Enter valid content first');return}
 try{const blob=await qr.getRawData(ext);if(!blob)throw 0;const d=(window.claude?await window.claude.use('downloads'):null);
  if(d){await d.save({filename:fname(ext),data:blob});toast('Saved '+fname(ext))}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname(ext);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
 }catch(e){if(e&&e.code==='declined')return;toast('Export failed in this browser')}}
$('#dlpng').onclick=()=>save('png');$('#dlsvg').onclick=()=>save('svg');
$('#cppay').onclick=async()=>{if(!payload)return toast('Nothing to copy');try{await navigator.clipboard.writeText(payload);toast('Payload copied')}catch{toast('Clipboard unavailable')}};
$('#cpimg').onclick=async()=>{if(!payload)return toast('Nothing to copy');try{const b=await qr.getRawData('png');await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);toast('Image copied')}catch{toast('Image copy not supported here')}};
$('#print').onclick=()=>{if(!payload)return toast('Nothing to print');document.body.insertAdjacentHTML('beforeend','<style id="ps">@media print{body>*:not(#pp){display:none!important}#pp{display:flex!important;justify-content:center}#pp canvas,#pp svg{max-width:90vw;height:auto}}#pp{display:none}</style><div id="pp"></div>');
 qr.getRawData('png').then(b=>{const i=new Image();i.src=URL.createObjectURL(b);i.style.maxWidth='90vw';$('#pp').append(i);i.onload=()=>{try{window.print()}catch{toast('Printing is blocked here')}setTimeout(()=>{$('#pp').remove();$('#ps').remove()},500)}})};

// ---------- history (localStorage, no Wi-Fi passwords) ----------
const KEY='qrgo.history.v1';
const style=()=>({fg:$('#fgh').value,bg:$('#bgh').value,size:$('#size').value,ec:$('#ec').value,dots:$('#dots').value,corner:$('#corner').value,margin:$('#margin').value});
function load(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&TYPES.some(t=>t.id===x.type)&&typeof x.name==='string'&&x.vals&&typeof x.vals==='object'):[]}catch{return []}}
function store(a){try{localStorage.setItem(KEY,JSON.stringify(a));return true}catch{toast('Could not save: browser storage is full or blocked');return false}}
function drawHist(){const h=$('#hist'),a=load();h.textContent='';if(!a.length){h.innerHTML='<span class="hint">Nothing saved yet.</span>';return}
 a.forEach((x,i)=>{const r=document.createElement('div');r.className='hist';const s=document.createElement('span');s.textContent=x.name;s.title=x.type;r.append(s);
  [['Open',()=>{pick(x.type,{...x.vals});Object.entries(x.style).forEach(([k,v])=>{const m={fg:'#fg',bg:'#bg'}[k];if(k==='fg'||k==='bg'){$('#'+k).value=$('#'+k+'h').value=v}else $('#'+k).value=v});$('#mv').textContent=$('#margin').value;render()}],
   ['Rename',()=>{const n=prompt('New name',x.name);if(n&&n.trim()){const l=load();l[i].name=n.trim().slice(0,80);store(l);drawHist()}}],
   ['Delete',()=>{const l=load();l.splice(i,1);store(l);drawHist()}]].forEach(([t,f])=>{const b=document.createElement('button');b.className='btn';b.textContent=t;b.onclick=f;r.append(b)});h.append(r)})}
$('#save').onclick=()=>{if(!payload)return toast('Enter valid content first');const v={...vals};if(cur.id==='wifi')delete v.pw;
 const a=load();a.unshift({type:cur.id,name:(cur.label+': '+(v.url||v.ssid||v.fn||v.to||v.n||v.t||v.text||v.q||'').toString().slice(0,40)).trim(),vals:v,style:style(),at:Date.now()});
 if(store(a.slice(0,50))){drawHist();toast(cur.id==='wifi'?'Saved (password not stored)':'Saved to history')}};
$('#clr').onclick=()=>{if(load().length&&confirm('Delete all saved QR codes from this browser?')){store([]);drawHist()}};

// ---------- shared helpers ----------
async function dl(blob,name){try{const d=(window.claude?await window.claude.use('downloads'):null);if(d)await d.save({filename:name,data:blob});else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}}catch(e){if(!(e&&e.code==='declined'))toast('Download failed in this browser')}}
const opts=data=>({width:+$('#size').value,height:+$('#size').value,type:'canvas',data,margin:+$('#margin').value,image:logoUrl||undefined,qrOptions:{errorCorrectionLevel:$('#ec').value},dotsOptions:{color:$('#fgh').value,type:$('#dots').value},cornersSquareOptions:{color:$('#fgh').value,type:$('#corner').value},cornersDotOptions:{color:$('#fgh').value},backgroundOptions:{color:$('#bgh').value},imageOptions:{margin:4,imageSize:.3}});
function applyStyle(s){$('#fg').value=$('#fgh').value=s.fg;$('#bg').value=$('#bgh').value=s.bg;['size','ec','dots','corner','margin'].forEach(k=>$('#'+k).value=s[k]);$('#mv').textContent=s.margin}
function validStyle(s){return s&&typeof s==='object'&&hexOk(s.fg)&&hexOk(s.bg)&&['256','512','1024','2048'].includes(String(s.size))&&['L','M','Q','H'].includes(s.ec)&&['square','dots','rounded','extra-rounded','classy'].includes(s.dots)&&['square','extra-rounded','dot'].includes(s.corner)&&+s.margin>=8&&+s.margin<=48}

// ---------- config export / import ----------
$('#cexp').onclick=()=>{const v={...vals};delete v.pw;dl(new Blob([JSON.stringify({app:'qrgo',version:1,type:cur.id,vals:v,style:style()},null,2)],{type:'application/json'}),'qrgo-config.json')};
$('#cimp').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 try{if(f.size>1e6)throw 0;const j=JSON.parse(await f.text());
 if(j.app!=='qrgo'||!TYPES.some(t=>t.id===j.type)||!j.vals||typeof j.vals!=='object'||!Object.values(j.vals).every(x=>typeof x==='string')||!validStyle(j.style))throw 0;
 const s={...j.style,size:String(j.style.size),margin:String(j.style.margin)};applyStyle(s);pick(j.type,{...j.vals,pw:''});toast('Configuration imported')}catch{toast('Invalid configuration file')}};

// ---------- bulk ----------
let bulk=[],bbusy=false;
$('#btpl').onclick=()=>dl(new Blob(['name,data\nExample site,https://example.com\n"Quoted, with comma","https://example.org/a,b"\n'],{type:'text/csv'}),'qrgo-template.csv');
$('#bfile').onchange=async e=>{const f=e.target.files[0];if(!f||bbusy)return;const st=$('#bstat'),er=$('#berr'),g=$('#bgrid');er.textContent='';g.textContent='';bulk=[];$('#bzip').disabled=true;
 try{if(!/\.csv$|\.txt$/i.test(f.name))throw new Error('Please choose a .csv file.');if(f.size>1048576)throw new Error('File is larger than 1 MB.');if(!f.size)throw new Error('The file is empty.');
 const rows=parseCSV(await f.text()),h=rows[0].map(x=>x.trim().toLowerCase()),di=h.findIndex(x=>['data','url','text','content'].includes(x)),ni=h.indexOf('name');
 if(di<0)throw new Error('No "data" column found in the header row.');const body=rows.slice(1);if(!body.length)throw new Error('The file has a header but no data rows.');
 if(body.length>500||(+$('#size').value>=1024&&body.length>200))throw new Error('Too many rows for the selected size (500 max, 200 at 1024 px or larger).');
 const errs=[],seen=new Map(),used=new Set(),jobs=[];
 body.forEach((r,i)=>{const n=i+2,d=(r[di]||'').trim();if(!d)return errs.push('Row '+n+': empty data.');
  if($('#bmode').value==='url'?!isUrl(d):d.length>1000)return errs.push('Row '+n+($('#bmode').value==='url'?': not a valid http(s) URL.':': text longer than 1000 characters.'));
  if(seen.has(d))return errs.push('Row '+n+': duplicate of row '+seen.get(d)+' (skipped).');seen.set(d,n);
  let b=clean(ni>=0&&r[ni]?r[ni]:d),u=b,k=2;while(used.has(u))u=b+'-'+k++;used.add(u);jobs.push({n,d,name:u})});
 bbusy=true;
 for(let i=0;i<jobs.length;i++){st.textContent='Generating '+(i+1)+' of '+jobs.length+'…';const j=jobs[i];
  try{const q=new QRCodeStyling(opts(j.d));const png=await q.getRawData('png'),svg=await q.getRawData('svg');if(!png||!svg)throw 0;bulk.push({...j,png,svg});
   const c=document.createElement('div');c.className='card';c.style.padding='8px';const im=document.createElement('img');im.src=URL.createObjectURL(png);im.alt='QR code for '+j.name;im.style.width='100%';im.style.background='#fff';const p=document.createElement('div');p.className='hint';p.textContent=j.name;p.style.wordBreak='break-all';
   const b1=document.createElement('button'),b2=document.createElement('button');b1.className=b2.className='btn';b1.textContent='PNG';b2.textContent='SVG';b1.onclick=()=>dl(j.png,j.name+'.png');b2.onclick=()=>dl(j.svg,j.name+'.svg');c.append(im,p,b1,' ',b2);g.append(c)}
  catch{errs.push('Row '+j.n+': QR generation failed (data may be too long).')}
  await new Promise(r=>setTimeout(r,0))}
 bbusy=false;errs.sort((a,b)=>parseInt(a.slice(4))-parseInt(b.slice(4)));
 st.textContent=bulk.length+' succeeded, '+errs.length+' failed or skipped.';errs.forEach(x=>{const li=document.createElement('li');li.textContent=x;er.append(li)});
 bulk.errs=errs;$('#bzip').disabled=!bulk.length;
 }catch(x){bbusy=false;st.textContent='';er.textContent='';const li=document.createElement('li');li.textContent=x.message||'Could not read the file.';er.append(li)}};
$('#bzip').onclick=async()=>{if(!bulk.length)return;const z=new JSZip();bulk.forEach(b=>{z.file(b.name+'.png',b.png);z.file(b.name+'.svg',b.svg)});if(bulk.errs?.length)z.file('errors.txt',bulk.errs.join('\n'));
 $('#bstat').textContent='Building ZIP…';try{const blob=await z.generateAsync({type:'blob'});await dl(blob,'qrgo-bulk.zip');$('#bstat').textContent=bulk.length+' QR codes zipped.'}catch{toast('Could not build the ZIP')}};

// ---------- photo/video upload (owner's Supabase bucket) ----------
const mcfg=readConfig(import.meta.env),mst=$('#mstat');
if(!mcfg){$('#mfile').disabled=$('#mup').disabled=$('#mok').disabled=true;mst.textContent='Upload is not configured. Add your Supabase details to a .env file (see README) and rebuild.'}
$('#mup').onclick=async()=>{const f=$('#mfile').files[0],e=validateMedia(f);if(e){mst.textContent=e;return}
 if(!$('#mok').checked){mst.textContent='Please confirm the file will be public.';return}
 $('#mup').disabled=true;try{const u=await uploadMedia(mcfg,f,p=>{mst.textContent='Uploading '+Math.round(p*100)+'%\u2026'});mst.textContent='Uploaded. Public link: '+u;pick('url',{url:u});toast('QR code ready');window.scrollTo({top:0,behavior:'smooth'})}catch(x){mst.textContent=x.message}finally{$('#mup').disabled=false}};

// ---------- theme ----------
$('#theme').onclick=()=>{const d=document.documentElement,dark=getComputedStyle(d).getPropertyValue('--bg').trim()==='#0d1612';d.dataset.theme=dark?'light':'dark'};
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.activeElement?.blur()});
pick('url');drawHist();
