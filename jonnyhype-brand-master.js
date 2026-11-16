/* JONNYHYPE — inline wordmark color normalizer.
   Splits visible uppercase brand mentions into white JONNY + fuchsia HYPE. */
(function(){
  'use strict';
  var SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1,INPUT:1,SELECT:1,OPTION:1};
  function normalize(root){
    if(!root||!root.ownerDocument)return;
    var doc=root.ownerDocument,walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode()){
      var node=walker.currentNode;
      if(SKIP[node.parentElement&&node.parentElement.tagName])continue;
      if(node.parentElement&&node.parentElement.closest('.jh-brand-inline'))continue;
      if(node.nodeValue&&node.nodeValue.indexOf('JONNYHYPE')!==-1)nodes.push(node);
    }
    nodes.forEach(function(node){
      var parts=node.nodeValue.split(/(JONNYHYPE)/g);
      if(parts.length<2)return;
      var frag=doc.createDocumentFragment();
      parts.forEach(function(part){
        if(part==='JONNYHYPE'){
          var wrap=doc.createElement('span');wrap.className='jh-brand-inline';
          var jonny=doc.createElement('span');jonny.className='jh-brand-inline__jonny';jonny.textContent='JONNY';
          var hype=doc.createElement('span');hype.className='jh-brand-inline__hype';hype.textContent='HYPE';
          wrap.append(jonny,hype);frag.appendChild(wrap);
        }else if(part)frag.appendChild(doc.createTextNode(part));
      });
      node.parentNode.replaceChild(frag,node);
    });
  }
  function start(){
    normalize(document.body);
    if(window.MutationObserver){
      new MutationObserver(function(records){
        records.forEach(function(record){
          record.addedNodes.forEach(function(node){
            if(node.nodeType===Node.TEXT_NODE)normalize(node.parentElement);
            else if(node.nodeType===Node.ELEMENT_NODE)normalize(node);
          });
        });
      }).observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();