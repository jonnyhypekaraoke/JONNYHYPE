/* JONNYHYPE — comportamento menu master */
(()=> {
 const menus=[...document.querySelectorAll('details.jh-menu')];
 if(!menus.length)return;
 const closeAll=()=>menus.forEach(menu=>menu.open=false);
 document.addEventListener('pointerdown',event=>{
   menus.forEach(menu=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAll();});
 menus.forEach(menu=>{
   menu.querySelectorAll('.jh-menu-panel a').forEach(link=>link.addEventListener('click',closeAll));
 });
})();