/* JONNYHYPE — menu principale unico, 11 voci. INFO rimosso; CONTATTI mantenuto. */
(function(){
  'use strict';
  const items = [
    ['/','HOME'],
    ['/eventi.html','PROSSIMI EVENTI'],
    ['/karaoke.html','RICHIEDI UNA CANZONE LIVE'],
    ['/show-battle.html','SHOW BATTLE'],
    ['/ravenna-song-festival.html','RAVENNA SONG FESTIVAL'],
    ['/team-rsf.html','TEAM RSF'],
    ['/musica.html','PRODUZIONI'],
    ['/galleria.html','GALLERY'],
    ['/jonnyhype.html','CHI È JONNYHYPE'],
    ['/community.html','CHAT / COMMUNITY'],
    ['/contatti.html','CONTATTI']
  ];
  function applyMenu(){
    document.querySelectorAll('details.jh-menu').forEach(function(details){
      details.id='jh-menu-master';
      const topbar=details.closest('.jh-topbar');
      if(topbar)topbar.id='jh-site-topbar';
      let nav=details.querySelector('nav.jh-menu-panel');
      if(!nav){nav=document.createElement('nav');nav.className='jh-menu-panel jh-menu-numbered';nav.setAttribute('aria-label','Menu principale');details.appendChild(nav);}
      nav.classList.add('jh-menu-numbered');
      nav.setAttribute('aria-label','Menu principale');
      const fragment=document.createDocumentFragment();
      items.forEach(function(item,index){
        const a=document.createElement('a');a.href=item[0];
        const number=document.createElement('span');number.className='jh-menu-number';number.textContent=String(index+1).padStart(2,'0');
        const label=document.createElement('span');label.className='jh-menu-label';label.textContent=item[1];
        a.append(number,label);fragment.appendChild(a);
      });
      nav.replaceChildren(fragment);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyMenu,{once:true});
  else applyMenu();
})();