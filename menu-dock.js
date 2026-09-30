(function(){
  'use strict';
  var root=document.documentElement,page=(location.pathname.split('/').pop()||'index.html').toLowerCase(),indexPage=page==='index.html';
  function addDock(markup){
    var host=document.createElement('div');host.innerHTML=markup;var dock=host.firstElementChild;dock.id='dock';document.body.appendChild(dock);
    var star=dock.querySelector('#menuStar'),firstAuto=false,timer=0,closedByUser=false,wasScrolling=false;
    if(!indexPage){dock.querySelector('#dockM1').href='index.html#products';dock.querySelector('#dockM2').href='index.html#lookup';}
    try{firstAuto=sessionStorage.getItem('commissionMenuAutoOpened')==='1'}catch(_){firstAuto=false}
    function close(){dock.classList.remove('is-open');star.setAttribute('aria-expanded','false')}
    function open(auto){dock.classList.add('is-open');star.setAttribute('aria-expanded','true');if(auto){try{sessionStorage.setItem('commissionMenuAutoOpened','1')}catch(_){}}}
    function current(){
      var active=page==='estimate.html'?1:page==='queue.html'?3:page==='fabrics.html'?4:0;
      if(indexPage){var f=parseFloat(getComputedStyle(root).getPropertyValue('--fit'))||1,y=window.scrollY+window.innerHeight/2;active=y>=2009*f?2:(y>=1040*f?1:0)}
      [1,2,3,4].forEach(function(i){var b=dock.querySelector('.mbtn[data-btn="'+i+'"]'),h=dock.querySelector('#dockM'+i),t=dock.querySelectorAll('.tx')[i-1],on=i===active;if(b)b.classList.toggle('is-here',on);if(h){h.classList.toggle('is-here',on);if(on)h.setAttribute('aria-current','page');else h.removeAttribute('aria-current')}if(t)t.classList.toggle('is-here-tx',on)})
    }
    function scrollChanged(){
      if(indexPage){var f=parseFloat(getComputedStyle(root).getPropertyValue('--fit'))||1;dock.hidden=window.scrollY<487*f}
      if(dock.classList.contains("is-open"))close();wasScrolling=true;clearTimeout(timer);
      if(!dock.hidden&&!firstAuto&&!closedByUser)timer=setTimeout(function(){open(true);firstAuto=true},800);
      current()
    }
    star.addEventListener('click',function(){closedByUser=true;if(star.getAttribute('aria-expanded')==='true')close();else open(false)});
    document.addEventListener('pointerdown',function(e){if(!dock.contains(e.target)&&dock.classList.contains('is-open')){closedByUser=true;close()}});
    window.addEventListener('scroll',scrollChanged,{passive:true});
    window.addEventListener('resize',function(){if(!indexPage)root.style.setProperty('--fit',Math.min(1,document.documentElement.clientWidth/1920));scrollChanged()});
    if(!indexPage)root.style.setProperty('--fit',Math.min(1,document.documentElement.clientWidth/1920));
    dock.hidden=indexPage&&window.scrollY<487*(parseFloat(getComputedStyle(root).getPropertyValue('--fit'))||1);current();if(!indexPage&&!firstAuto)timer=setTimeout(function(){open(true);firstAuto=true},800)
  }
  fetch('dock-menu.html?v=2').then(function(r){if(!r.ok)throw Error('menu load failed');return r.text()}).then(addDock).catch(function(e){console.error(e)})
})();
