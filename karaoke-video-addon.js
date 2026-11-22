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
  <label for="video-file">SELEZIONA UN VIDEO (MASSIMO 30 SECONDI)</label>
  <input id="video-file" name="video" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" required>
  <div id="video-preview" aria-live="polite"></div>
  <label class="photo-consent"><input id="video-consent" type="checkbox" required><span>Confermo di avere il diritto di condividere questo video e autorizzo la sua visualizzazione durante l'evento nel riquadro FOTO LIVE.</span></label>
  <button id="video-upload-button" type="submit">INVIA IL VIDEO</button>
  <p id="video-upload-status" role="status" aria-live="polite"></p>
  <span class="photo-upload-note">Formati ammessi: MP4 e MOV. Durata massima 30 secondi. Dimensione massima 100 MB.</span>
 </form>`;
 photoForm.closest('.photo-upload-section').after(section);
 const form=section.querySelector('#video-upload-form'),input=section.querySelector('#video-file'),preview=section.querySelector('#video-preview'),status=section.querySelector('#video-upload-status'),button=section.querySelector('#video-upload-button');
 let objectUrl='';
 function clearPreview(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';preview.replaceChildren();}
 function validate(file){
  const type=(file.type||'').toLowerCase(),valid=['video/mp4','application/mp4','video/quicktime'].includes(type)||/\.(mp4|mov)$/i.test(file.name);
  if(!valid)throw Error('Formato non valido. Seleziona un MP4 o MOV.');
  if(file.size<1024||file.size>100*1024*1024)throw Error('Il video deve pesare al massimo 100 MB.');
 }
 input.addEventListener('change',()=>{
  clearPreview();status.textContent='';const file=input.files&&input.files[0];if(!file)return;
  try{validate(file);}catch(error){input.value='';status.textContent=error.message;return;}
  objectUrl=URL.createObjectURL(file);const player=document.createElement('video');player.src=objectUrl;player.controls=true;player.playsInline=true;player.preload='metadata';player.style.cssText='display:block;width:100%;max-height:260px;margin:12px auto;border-radius:10px;background:#000';
  player.addEventListener('loadedmetadata',()=>{if(!Number.isFinite(player.duration)||player.duration<=0||player.duration>30.05){input.value='';clearPreview();status.textContent='Il video deve durare al massimo 30 secondi.';}else status.textContent='Durata verificata: '+player.duration.toFixed(1)+' secondi.';},{once:true});
  player.addEventListener('error',()=>{input.value='';clearPreview();status.textContent='Il file video non è leggibile. Prova un altro MP4 o MOV.';},{once:true});preview.append(player);
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();const file=input.files&&input.files[0];if(!file||!document.getElementById('video-consent').checked){form.reportValidity();return;}
  try{validate(file);}catch(error){status.textContent=error.message;return;}
  const player=preview.querySelector('video');if(!player||!Number.isFinite(player.duration)||player.duration<=0||player.duration>30.05){status.textContent='Attendi il controllo della durata oppure seleziona un video entro 30 secondi.';return;}
  button.disabled=true;input.disabled=true;status.textContent='Invio e conversione del video in corso…';
  try{
   const mime=file.type||(/\.mov$/i.test(file.name)?'video/quicktime':'video/mp4');
   const response=await fetch('https://karaoke.jonnyhype.it/api/videos',{method:'POST',headers:{'Content-Type':mime},body:file});
   let result={};try{result=await response.json();}catch{}
   if(!response.ok)throw Error(result.error||'Invio video non riuscito.');
   form.reset();clearPreview();status.textContent='Video inviato alla regia! Sarà disponibile nella galleria NOVA.';
  }catch(error){status.textContent=error.message||'Invio non riuscito. Riprova tra poco.';}
  finally{button.disabled=false;input.disabled=false;}
 });
 addEventListener('pagehide',clearPreview,{once:true});
})();