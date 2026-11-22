/* JONNYHYPE VIDEO LIVE */
(()=> {
 const photoForm=document.getElementById('photo-upload-form');
 if(!photoForm||document.getElementById('video-upload-form'))return;
 const section=document.createElement('section');
 section.className='photo-upload-section video-upload-section';
 section.style.marginTop='18px';
 section.innerHTML=`<h2>INVIA UN VIDEO LIVE</h2>
 <p>Condividi un breve video della serata: potrà essere trasmesso in diretta sullo schermo.</p>
 <form id="video-upload-form">
  <label for="video-file">SELEZIONA UN VIDEO (MASSIMO 1 MINUTO)</label>
  <input id="video-file" name="video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" required>
  <div id="video-preview" aria-live="polite"></div>
  <label class="photo-consent"><input id="video-consent" type="checkbox" required><span>Confermo di avere il diritto di condividere questo video e autorizzo la sua visualizzazione durante l'evento nel riquadro FOTO LIVE.</span></label>
  <button id="video-upload-button" type="submit">INVIA IL VIDEO</button>
  <p id="video-upload-status" role="status" aria-live="polite"></p>
  <span class="photo-upload-note">Formati ammessi: MP4 e MOV. Durata massima 1 minuto. Compressione automatica prima dell'invio.</span>
 </form>`;
 photoForm.closest('.photo-upload-section').after(section);
 const form=section.querySelector('#video-upload-form'),input=section.querySelector('#video-file'),preview=section.querySelector('#video-preview'),status=section.querySelector('#video-upload-status'),button=section.querySelector('#video-upload-button');
 let objectUrl='';
 function clearPreview(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';preview.replaceChildren();}
 function validate(file){
  const type=(file.type||'').toLowerCase(),valid=['video/mp4','application/mp4','video/quicktime'].includes(type)||/\.(mp4|mov)$/i.test(file.name);
  if(!valid)throw Error('Formato non valido. Seleziona un MP4 o MOV.');
  if(file.size<1024||file.size>300*1024*1024)throw Error('Il video deve pesare al massimo 300 MB.');
 }
 function loadVideo(file){return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),video=document.createElement('video');
  video.preload='metadata';video.muted=false;video.playsInline=true;video.src=url;
  video.onloadedmetadata=()=>resolve({video,url});
  video.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Il file video non è leggibile. Prova un altro MP4 o MOV.'));};
 });}
 function chooseRecorderType(){
  if(!window.MediaRecorder)throw Error('Questo browser non supporta la compressione automatica. Aggiorna Safari o Chrome.');
  const candidates=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'];
  return candidates.find(type=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(type))||'';
 }
 async function compressVideo(file,onProgress){
  const {video,url}=await loadVideo(file);let audioContext=null,source=null,stream=null,recorder=null,raf=0;
  try{
   if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>60.05)throw Error('Il video deve durare al massimo 1 minuto.');
   if(!video.videoWidth||!video.videoHeight)throw Error('Non riesco a leggere le dimensioni del video.');
   const type=chooseRecorderType();
   if(!HTMLCanvasElement.prototype.captureStream)throw Error('La compressione automatica non è supportata. Aggiorna Safari o Chrome.');
   const scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(2,Math.floor(video.videoWidth*scale/2)*2);
   canvas.height=Math.max(2,Math.floor(video.videoHeight*scale/2)*2);
   const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Impossibile avviare la compressione video.');
   stream=canvas.captureStream(24);
   const AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)throw Error('Questo browser non consente di mantenere l’audio durante la compressione.');
   audioContext=new AudioContextClass();source=audioContext.createMediaElementSource(video);
   const audioDestination=audioContext.createMediaStreamDestination();source.connect(audioDestination);
   audioDestination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
   await audioContext.resume();
   const chunks=[],options={videoBitsPerSecond:2200000,audioBitsPerSecond:128000};
   if(type)options.mimeType=type;
   recorder=new MediaRecorder(stream,options);
   const finished=new Promise((resolve,reject)=>{
    recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>reject(Error('Errore durante la compressione del video.'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||type||'video/webm'}));
   });
   const ended=new Promise((resolve,reject)=>{video.onended=resolve;video.onerror=()=>reject(Error('Lettura video interrotta durante la compressione.'));});
   recorder.start(1000);
   const draw=()=>{if(video.readyState>=2)ctx.drawImage(video,0,0,canvas.width,canvas.height);onProgress(Math.min(99,Math.round(video.currentTime/video.duration*100)));if(!video.ended&&!video.paused)raf=requestAnimationFrame(draw);};
   await video.play();draw();await ended;
   if(recorder.state!=='inactive')recorder.stop();
   const blob=await finished;if(blob.size<1024)throw Error('La compressione non ha prodotto un video valido.');
   return blob;
  }finally{
   if(raf)cancelAnimationFrame(raf);
   if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}
   if(stream)stream.getTracks().forEach(track=>track.stop());
   if(source){try{source.disconnect();}catch{}}
   if(audioContext){try{await audioContext.close();}catch{}}
   video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
  }
 }
 input.addEventListener('change',()=>{
  clearPreview();status.textContent='';const file=input.files&&input.files[0];if(!file)return;
  try{validate(file);}catch(error){input.value='';status.textContent=error.message;return;}
  objectUrl=URL.createObjectURL(file);const player=document.createElement('video');player.src=objectUrl;player.controls=true;player.playsInline=true;player.preload='metadata';player.style.cssText='display:block;width:100%;max-height:260px;margin:12px auto;border-radius:10px;background:#000';
  player.addEventListener('loadedmetadata',()=>{if(!Number.isFinite(player.duration)||player.duration<=0||player.duration>60.05){input.value='';clearPreview();status.textContent='Il video deve durare al massimo 1 minuto.';}else status.textContent='Durata verificata: '+player.duration.toFixed(1)+' secondi.';},{once:true});
  player.addEventListener('error',()=>{input.value='';clearPreview();status.textContent='Il file video non è leggibile. Prova un altro MP4 o MOV.';},{once:true});preview.append(player);
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();const file=input.files&&input.files[0];if(!file||!document.getElementById('video-consent').checked){form.reportValidity();return;}
  try{validate(file);}catch(error){status.textContent=error.message;return;}
  const player=preview.querySelector('video');if(!player||!Number.isFinite(player.duration)||player.duration<=0||player.duration>60.05){status.textContent='Attendi il controllo della durata oppure seleziona un video entro 1 minuto.';return;}
  button.disabled=true;input.disabled=true;status.textContent='Invio e conversione del video in corso…';
  try{
   let compressed,mime;
   try{
    status.textContent='Compressione automatica… 0%';
    compressed=await compressVideo(file,p=>{status.textContent='Compressione automatica… '+p+'%';});
    mime=(compressed.type||'').split(';')[0].toLowerCase();
    if(!['video/mp4','video/webm'].includes(mime))throw Error('Formato compresso non supportato.');
    status.textContent='Video ottimizzato: '+(compressed.size/1024/1024).toFixed(1)+' MB. Invio…';
   }catch(compressionError){
    compressed=file;mime=file.type||(/\\.mov$/i.test(file.name)?'video/quicktime':'video/mp4');
    status.textContent='Compressione non disponibile: invio del file originale, potrebbe richiedere più tempo…';
   }
   const chunkSize=8*1024*1024,totalChunks=Math.ceil(compressed.size/chunkSize),uploadId=(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''));
   let result={};
   for(let index=0;index<totalChunks;index++){
    const start=index*chunkSize,end=Math.min(compressed.size,start+chunkSize),part=compressed.slice(start,end);
    const params=new URLSearchParams({upload:uploadId,index:String(index),total:String(totalChunks),size:String(compressed.size),mime});
    const response=await fetch('https://karaoke.jonnyhype.it/api/videos/chunk?'+params.toString(),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:part});
    try{result=await response.json();}catch{result={};}
    if(!response.ok)throw Error(result.error||'Invio video non riuscito al blocco '+(index+1)+'.');
    const percent=Math.round(Math.min(end,compressed.size)/compressed.size*100);
    status.textContent=index===totalChunks-1?'Video ricevuto. Avvio conversione…':'Caricamento video ottimizzato… '+percent+'%';
   }
   if(!result.processing||!result.name)throw Error('Il video è stato inviato ma la regia non ha confermato la conversione.');
   form.reset();clearPreview();
   if(result.processing&&result.name){
    status.textContent='Video ricevuto. La regia sta completando la conversione…';
    const statusUrl='https://karaoke.jonnyhype.it/api/videos/status?name='+encodeURIComponent(result.name);
    for(let attempt=0;attempt<120;attempt++){
     await new Promise(resolve=>setTimeout(resolve,3000));
     const check=await fetch(statusUrl,{method:'GET',cache:'no-store'});
     let job={};try{job=await check.json();}catch{}
     if(!check.ok)throw Error(job.error||'Non riesco a verificare la conversione. Controlla la galleria NOVA tra poco.');
     if(job.state==='ready'){status.textContent='Video pronto! È disponibile nella galleria NOVA.';break;}
     if(job.state==='error')throw Error(job.message||'Conversione video non riuscita.');
     status.textContent='Conversione in corso… non chiudere la pagina ('+(attempt+1)+' / 120).';
    }
    if(status.textContent.startsWith('Conversione in corso'))status.textContent='Video ricevuto, ma la conversione richiede ancora tempo. Controlla la galleria NOVA tra poco.';
   }else status.textContent='Video inviato alla regia!';
  }catch(error){status.textContent=error.message||'Invio non riuscito. Riprova tra poco.';}
  finally{button.disabled=false;input.disabled=false;}
 });
 addEventListener('pagehide',clearPreview,{once:true});
})();