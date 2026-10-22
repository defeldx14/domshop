/* EPUB 2/3 import: untrusted book markup is converted to inert text blocks. */
(function(g){
'use strict';
const MAX=40*1024*1024, MAX_FILES=4000;
function path(base,href){
 const url=new URL(href,new URL(base,'https://epub.invalid/'));
 if(url.origin!=='https://epub.invalid')return null;
 return {file:decodeURIComponent(url.pathname.slice(1)),hash:decodeURIComponent(url.hash.slice(1))};
}
const all=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
function xml(text){const d=new DOMParser().parseFromString(text,'application/xml');if(all(d,'parsererror').length)throw Error('Invalid EPUB XML.');return d;}
function textOf(node){return (node?.textContent||'').replace(/\s+/g,' ').trim();}
async function parse(buffer){
 if(buffer.byteLength>MAX)throw Error('Choose an EPUB smaller than 40 MB.');
 let total=0,count=0;
 const files=fflate.unzipSync(new Uint8Array(buffer),{filter:f=>{
  total+=f.originalSize;count++;if(total>MAX||count>MAX_FILES||f.originalSize>12*1024*1024)throw Error('EPUB expands beyond the import limit.');return true;
 }});
 function read(name){if(!files[name])throw Error('EPUB file missing: '+name);return fflate.strFromU8(files[name]);}
 if(files['META-INF/encryption.xml']&&/EncryptedData/.test(read('META-INF/encryption.xml'))&&!/idpf.org\/2008\/embedding|adobe.com\/pdf\/enc/.test(read('META-INF/encryption.xml')))throw Error('This EPUB is protected by DRM. Import an unprotected EPUB.');
 const container=xml(read('META-INF/container.xml')),root=all(container,'rootfile')[0]?.getAttribute('full-path');
 if(!root)throw Error('EPUB has no package document.');
 const opf=xml(read(root)),manifest=new Map(all(opf,'item').map(n=>[n.getAttribute('id'),{href:n.getAttribute('href'),type:n.getAttribute('media-type'),props:n.getAttribute('properties')||''}]));
 const chapters=[],images={},ids=new Map();
 for(const itemref of all(opf,'itemref')){
  if(itemref.getAttribute('linear')==='no')continue;
  const item=manifest.get(itemref.getAttribute('idref'));if(!item||!['application/xhtml+xml','text/html'].includes(item.type))continue;
  const target=path(root,item.href);if(!target)continue;
  const source=read(target.file),doc=new DOMParser().parseFromString(source,'text/html'),blocks=[],anchors={};
  let pending='';
  function flush(kind='p'){const text=pending.replace(/\s+/g,' ').trim();pending='';if(text)blocks.push({kind,text});}
  function walk(node){
   if(node.nodeType===3){pending+=node.textContent;return;}
   if(node.nodeType!==1)return;
   const tag=node.localName.toLowerCase();
   if(['script','style','noscript','iframe','object','embed','form','audio','video','head'].includes(tag))return;
   const block=/^(p|div|section|article|h[1-6]|li|blockquote|table|tr|ul|ol|pre)$/.test(tag);
   if(block)flush();
   if(node.id)anchors[node.id]=blocks.length;
   if(tag==='img'||tag==='image'){
    flush();const src=node.getAttribute('src')||node.getAttribute('href')||node.getAttribute('xlink:href'),ref=src&&path(target.file,src);
    if(ref&&files[ref.file]&&/\.(png|jpe?g|gif|webp)$/i.test(ref.file)){
     const type=/\.png$/i.test(ref.file)?'image/png':/\.gif$/i.test(ref.file)?'image/gif':/\.webp$/i.test(ref.file)?'image/webp':'image/jpeg';
     images[ref.file]={bytes:files[ref.file],type};blocks.push({kind:'img',src:ref.file,alt:node.getAttribute('alt')||''});
    }return;
   }
   if(tag==='br'){pending+='\n';return;}
   for(const child of node.childNodes)walk(child);
   if(block)flush(/^h[1-6]$/.test(tag)?'h2':tag==='li'?'li':'p');
  }
  walk(doc.body);flush();
  const title=blocks.find(b=>b.kind==='h2')?.text||blocks.find(b=>b.text&&b.text.length<120)?.text||textOf(doc.querySelector('title'))||'Chapter '+(chapters.length+1);
  ids.set(target.file,chapters.length);chapters.push({file:target.file,title,blocks,anchors});
 }
 if(!chapters.length)throw Error('This EPUB has no readable chapters.');
 const toc=[];
 function add(label,href,base,depth){const ref=path(base,href);if(ref&&ids.has(ref.file))toc.push({label:label.trim()||chapters[ids.get(ref.file)].title,chapter:ids.get(ref.file),block:chapters[ids.get(ref.file)].anchors[ref.hash]||0,depth:Math.min(depth,4)});}
 const nav=[...manifest.values()].find(i=>i.props.split(/\s+/).includes('nav'));
 if(nav){const ref=path(root,nav.href);if(ref){const d=new DOMParser().parseFromString(read(ref.file),'text/html'),n=[...d.querySelectorAll('nav')].find(n=>(n.getAttribute('epub:type')||n.getAttribute('role')||'').match(/toc/))||d.querySelector('nav');for(const a of n?.querySelectorAll('a[href]')||[]){let depth=0,p=a.parentElement;while(p&&p!==n){if(p.localName==='ol')depth++;p=p.parentElement;}add(textOf(a),a.getAttribute('href'),ref.file,depth-1);}}}
 if(!toc.length){const ncx=[...manifest.values()].find(i=>i.type==='application/x-dtbncx+xml');if(ncx){const ref=path(root,ncx.href);if(ref){const d=xml(read(ref.file));for(const n of all(d,'navPoint')){const content=all(n,'content')[0],label=all(n,'navLabel')[0];let depth=0,p=n.parentElement;while(p){if(p.localName==='navPoint')depth++;p=p.parentElement;}if(content)add(textOf(label),content.getAttribute('src'),ref.file,depth);}}}}
 if(!toc.length)chapters.forEach((c,chapter)=>toc.push({label:c.title,chapter,block:0,depth:0}));
 const digest=await crypto.subtle.digest('SHA-256',buffer),id=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
 return {id,title:textOf(all(opf,'title')[0])||'Untitled book',author:textOf(all(opf,'creator')[0]),language:textOf(all(opf,'language')[0])||'it',chapters,toc,images,added:new Date().toISOString()};
}
function sentence(text,offset){
 const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('it',{granularity:'sentence'}).segment(text)].map(s=>({text:s.segment,index:s.index})):Array.from(text.matchAll(/[^.!?]+[.!?]*(?:\s+|$)/g),m=>({text:m[0],index:m.index}));
 const s=segments.find(s=>offset>=s.index&&offset<s.index+s.text.length)||{text,index:0};
 const lead=s.text.length-s.text.trimStart().length;
 return {text:s.text.trim(),start:s.index+lead};
}
g.ReaderEPUB={parse,path,sentence};
})(globalThis);
