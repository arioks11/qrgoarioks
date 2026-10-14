// ---------- validation helpers ----------
const SAFE=/^(https?):\/\//i;
const isUrl=v=>{try{const u=new URL(v);return SAFE.test(v)&&!!u.hostname}catch{return false}};
const wifiEsc=s=>s.replace(/([\\;,:"])/g,'\\$1');
const vEsc=s=>String(s).replace(/([\\;,])/g,'\\$1').replace(/\r?\n/g,'\\n');
const digits=v=>v.replace(/[^\d+]/g,'');
const phoneOk=v=>/^\+?\d{6,15}$/.test(digits(v));
const icsDate=v=>v.replace(/[-:]/g,'')+(v.length===16?'00':'');
const req=(o,k,l)=>{if(!o[k]?.trim())throw new Error(l+' is required.')};

// ---------- QR types: fields + payload builders ----------
const T=(id,label,fields,build,note)=>({id,label,fields,build,note});
const F=(k,l,type='text',extra={})=>({k,l,type,...extra});
const urlType=(id,label,ph)=>T(id,label,[F('url','URL','url',{ph})],o=>{req(o,'url','URL');if(!isUrl(o.url.trim()))throw new Error('Enter a valid http(s):// URL.');return o.url.trim()});
const TYPES=[
 urlType('url','Website','https://example.com'),
 urlType('social','Social / video','https://youtube.com/…, instagram, tiktok, x, linkedin…'),
 urlType('shop','Shop / menu / booking / payment','https://…'),
 T('text','Text',[F('text','Text','textarea')],o=>{req(o,'text','Text');return o.text},'Plain text works in every scanner.'),
 T('phone','Phone',[F('n','Phone number','tel',{ph:'+48 123 456 789'})],o=>{if(!phoneOk(o.n||''))throw new Error('Enter a valid phone number (6–15 digits).');return 'tel:'+digits(o.n)}),
 T('email','Email',[F('to','Email address','email'),F('sub','Subject'),F('body','Message','textarea')],o=>{if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.to||''))throw new Error('Enter a valid email address.');const q=[];if(o.sub)q.push('subject='+encodeURIComponent(o.sub));if(o.body)q.push('body='+encodeURIComponent(o.body));return 'mailto:'+o.to.trim()+(q.length?'?'+q.join('&'):'')}),
 T('sms','SMS',[F('n','Phone number','tel'),F('m','Message','textarea')],o=>{if(!phoneOk(o.n||''))throw new Error('Enter a valid phone number.');return 'SMSTO:'+digits(o.n)+':'+(o.m||'')}),
 T('wa','WhatsApp',[F('n','Phone (international, digits only)','tel',{ph:'48123456789'}),F('m','Prefilled message','textarea')],o=>{const d=(o.n||'').replace(/\D/g,'');if(d.length<6||d.length>15)throw new Error('Enter a valid international number.');return 'https://wa.me/'+d+(o.m?'?text='+encodeURIComponent(o.m):'')}),
 T('wifi','Wi-Fi',[F('ssid','Network name (SSID)'),F('enc','Security','select',{opts:[['WPA','WPA/WPA2/WPA3'],['nopass','Open (no password)']]}),F('pw','Password','password'),F('hid','Hidden network','checkbox')],o=>{req(o,'ssid','SSID');const open=o.enc==='nopass';if(!open&&(o.pw||'').length<8)throw new Error('WPA passwords need at least 8 characters.');return 'WIFI:T:'+(open?'nopass':'WPA')+';S:'+wifiEsc(o.ssid)+';'+(open?'':'P:'+wifiEsc(o.pw)+';')+(o.hid==='on'?'H:true;':'')+';'},'Anyone who scans this QR code can join your network. Share printed codes carefully.'),
 T('vcard','Contact (vCard)',[F('fn','First name'),F('ln','Last name'),F('org','Organization'),F('title','Job title'),F('tel','Phone','tel'),F('em','Email','email'),F('web','Website','url'),F('adr','Address')],o=>{if(!o.fn?.trim()&&!o.ln?.trim())throw new Error('Enter at least a first or last name.');if(o.em&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.em))throw new Error('Invalid email.');if(o.web&&!isUrl(o.web))throw new Error('Website must start with http(s)://');return['BEGIN:VCARD','VERSION:3.0','N:'+vEsc(o.ln||'')+';'+vEsc(o.fn||'')+';;;','FN:'+vEsc(((o.fn||'')+' '+(o.ln||'')).trim()),o.org&&'ORG:'+vEsc(o.org),o.title&&'TITLE:'+vEsc(o.title),o.tel&&'TEL:'+digits(o.tel),o.em&&'EMAIL:'+o.em.trim(),o.web&&'URL:'+o.web.trim(),o.adr&&'ADR:;;'+vEsc(o.adr)+';;;;','END:VCARD'].filter(Boolean).join('\n')}),
 T('geo','Location',[F('lat','Latitude','text',{ph:'51.7592'}),F('lng','Longitude','text',{ph:'19.4560'})],o=>{const a=+o.lat,b=+o.lng;if(o.lat===''||o.lng===''||o.lat==null||o.lng==null||!isFinite(a)||!isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)throw new Error('Latitude must be −90…90 and longitude −180…180.');return 'geo:'+a+','+b}),
 T('map','Map link (address)',[F('q','Address or place')],o=>{req(o,'q','Address');return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(o.q.trim())}),
 T('event','Calendar event',[F('t','Title'),F('d','Description','textarea'),F('l','Location'),F('s','Start','datetime-local'),F('e','End','datetime-local')],o=>{req(o,'t','Title');if(!o.s||!o.e)throw new Error('Start and end are required.');if(o.e<o.s)throw new Error('End must not be before start.');return['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','SUMMARY:'+vEsc(o.t),o.d&&'DESCRIPTION:'+vEsc(o.d),o.l&&'LOCATION:'+vEsc(o.l),'DTSTART:'+icsDate(o.s),'DTEND:'+icsDate(o.e),'END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\n')},'Times are "floating" (local time of the scanning device) – no time zone is encoded.'),
 T('custom','Custom payload',[F('c','Text or URI','textarea')],o=>{req(o,'c','Payload');if(/^\s*(javascript|data|vbscript|file):/i.test(o.c))throw new Error('Unsafe URI scheme (javascript:, data:, vbscript:, file:) is blocked.');if(o.c.length>2000)throw new Error('Payload too long (max 2000 characters).');return o.c},'Custom schemes may not be recognised by every scanner.')
];

export {isUrl,wifiEsc,vEsc,digits,phoneOk,icsDate,TYPES};
