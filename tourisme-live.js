/* Guestflow — DATAtourisme live bridge
   Contournement léger : ajoute le moteur touristique au front existant
   sans remplacer index.html.
*/
(function(){
  'use strict';

  var API_URL='https://script.google.com/macros/s/AKfycbxEaAAR7dv3L1w5MqGbVKV_KHmFPGgTvtbQLormLi-rI2a973MTxD0tgoGsTNb5LX/exec';
  var PAGE_SIZE=8;

  function getLang(){
    var l='fr';
    try { l=String(window.langueSelectionnee||document.documentElement.lang||'fr').toLowerCase(); } catch(e){}
    return /^(fr|en|es|de)$/.test(l)?l:'fr';
  }

  function tourist(q){
    var s=String(q||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return /\b(visiter|visite|tourisme|touristique|faire|voir|quoi voir|que voir|que peut[- ]on voir|qu[’']est[- ]ce qu[’']on peut voir|sortir|restaurant|restaurants|manger|musee|chateau|abbaye|marche|cinema|activite|activites|balade|randonnee|plage|lac|monument|patrimoine|fete|evenement|bar|cafe|spectacle|concert|aux alentours|alentours|a proximite|proximite|pres d'ici|pres dici|pres de moi|autour de moi|autour d'ici|autour dici|autour du logement|autour de l'hebergement|autour de l'immeuble|dans le coin|dans les environs|a proximite du logement)\b/i.test(s);
  }

  function token(){
    var t='';
    try { if(typeof tokenVoyageur!=='undefined') t=String(tokenVoyageur||''); } catch(e){}
    if(!t) try { t=new URLSearchParams(location.search).get('token')||''; } catch(e){}
    if(!t) try { t=localStorage.getItem('guestflow_token')||''; } catch(e){}
    return String(t).trim();
  }

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function mapUrl(p){
    return /^https?:\/\//i.test(String(p&&p.googleMapsUrl||'')) ? p.googleMapsUrl : '';
  }

  function style(){
    if(document.getElementById('gf-tourisme-bridge-style')) return;
    var s=document.createElement('style');
    s.id='gf-tourisme-bridge-style';
    s.textContent=
      '#gfTourismeBridge{position:fixed;inset:0;z-index:2147483000;background:rgba(20,24,18,.58);display:none;overflow:auto;padding:18px;box-sizing:border-box}'+
      '#gfTourismeBridge.show{display:block}'+
      '.gf-tb-box{max-width:760px;margin:5vh auto;background:#f8f4ec;border-radius:24px;box-shadow:0 20px 70px rgba(0,0,0,.3);overflow:hidden}'+
      '.gf-tb-head{padding:22px 22px 14px;background:#edf0e6;position:sticky;top:0;z-index:2}'+
      '.gf-tb-kicker{font-size:12px;text-transform:uppercase;letter-spacing:.12em;opacity:.65}.gf-tb-title{margin:5px 0;font-size:28px}.gf-tb-sub{margin:0;opacity:.72}'+
      '.gf-tb-close{position:absolute;right:16px;top:16px;border:0;background:transparent;font-size:28px;cursor:pointer}'+
      '.gf-tb-meta{display:flex;gap:7px;flex-wrap:wrap;padding:12px 22px 0}.gf-tb-pill{background:white;border-radius:999px;padding:6px 10px;font-size:12px}'+
      '.gf-tb-list{padding:14px 18px 6px;display:grid;gap:12px}.gf-tb-card{background:white;border-radius:18px;overflow:hidden;display:grid;grid-template-columns:120px 1fr;min-height:120px;box-shadow:0 4px 16px rgba(30,35,25,.08)}'+
      '.gf-tb-photo{width:120px;height:100%;min-height:120px;object-fit:cover;background:#dfe4d6}.gf-tb-content{padding:14px}.gf-tb-type{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.55}.gf-tb-name{margin:4px 0;font-size:18px}.gf-tb-info{font-size:12px;opacity:.65}.gf-tb-desc{font-size:13px;line-height:1.45;margin:8px 0}.gf-tb-map{display:inline-block;margin-top:4px;text-decoration:none;font-weight:600}.gf-tb-more{display:block;margin:12px auto 20px;border:0;border-radius:999px;padding:12px 18px;background:#66734b;color:white;font-weight:700;cursor:pointer}'+
      '@media(max-width:560px){#gfTourismeBridge{padding:0}.gf-tb-box{margin:0;min-height:100vh;border-radius:0}.gf-tb-head{padding-top:20px}.gf-tb-card{grid-template-columns:92px 1fr}.gf-tb-photo{width:92px;min-height:105px}.gf-tb-name{font-size:16px}}';
    document.head.appendChild(s);
  }

  function ensurePanel(){
    if(document.getElementById('gfTourismeBridge')) return;
    var ov=document.createElement('div');
    ov.id='gfTourismeBridge';
    ov.innerHTML='<div class="gf-tb-box" role="dialog" aria-modal="true" aria-label="Suggestions touristiques">'+
      '<div class="gf-tb-head"><button class="gf-tb-close" id="gfTbClose" aria-label="Fermer">×</button>'+
      '<div class="gf-tb-kicker" id="gfTbKicker"></div><h2 class="gf-tb-title" id="gfTbTitle"></h2><p class="gf-tb-sub" id="gfTbSub"></p></div>'+
      '<div class="gf-tb-meta" id="gfTbMeta"></div><div class="gf-tb-list" id="gfTbList"></div>'+
      '<button class="gf-tb-more" id="gfTbMore" hidden>＋ Voir plus de lieux</button></div>';
    document.body.appendChild(ov);
    document.getElementById('gfTbClose').onclick=close;
    ov.addEventListener('click',function(e){if(e.target===ov)close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  }

  var state={items:[],shown:PAGE_SIZE};

  function isEvent(p){
    return /event|entertainment|festival|spectacle|manifestation/i.test(String(p&&p.type||''));
  }

  function render(){
    var l=getLang(), labels={
      fr:{k:'Suggestions autour de vous',t:'À découvrir',s:'Une sélection de lieux et d’idées à proximité.',map:'Voir sur la carte',places:'lieux',events:'événements',more:'＋ Voir plus de lieux'},
      en:{k:'Suggestions near you',t:'Worth discovering',s:'A selection of places and ideas nearby.',map:'View on map',places:'places',events:'events',more:'＋ See more places'},
      es:{k:'Sugerencias cerca de usted',t:'Para descubrir',s:'Una selección de lugares e ideas cercanas.',map:'Ver en el mapa',places:'lugares',events:'eventos',more:'＋ Ver más lugares'},
      de:{k:'Vorschläge in Ihrer Nähe',t:'Zu entdecken',s:'Eine Auswahl an Orten und Ideen in der Umgebung.',map:'Auf der Karte',places:'Orte',events:'Veranstaltungen',more:'＋ Mehr Orte anzeigen'}
    }[l]||null;
    document.getElementById('gfTbKicker').textContent=labels.k;
    document.getElementById('gfTbTitle').textContent=labels.t;
    document.getElementById('gfTbSub').textContent=labels.s;
    var list=document.getElementById('gfTbList');
    list.innerHTML=state.items.slice(0,state.shown).map(function(p){
      var photo=/^https?:\/\//i.test(String(p.imageUrl||''))?'<img class="gf-tb-photo" src="'+esc(p.imageUrl)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility=\'hidden\'">':'<div class="gf-tb-photo"></div>';
      var d=p.distanceKm!=null&&isFinite(Number(p.distanceKm))?Number(p.distanceKm).toFixed(1)+' km':'';
      var m=mapUrl(p)?'<a class="gf-tb-map" target="_blank" rel="noopener" href="'+esc(p.googleMapsUrl)+'">'+esc(labels.map)+'</a>':'';
      return '<article class="gf-tb-card">'+photo+'<div class="gf-tb-content"><div class="gf-tb-type">'+(isEvent(p)?esc(labels.events):esc(labels.places))+'</div><h3 class="gf-tb-name">'+esc(p.nom||'Lieu à découvrir')+'</h3><div class="gf-tb-info">'+esc(p.ville||'')+(d?' · '+esc(d):'')+'</div>'+(p.description?'<p class="gf-tb-desc">'+esc(p.description)+'</p>':'')+m+'</div></article>';
    }).join('');
    var places=state.items.filter(function(p){return !isEvent(p)}).length;
    var events=state.items.length-places;
    document.getElementById('gfTbMeta').innerHTML='<span class="gf-tb-pill">'+places+' '+esc(labels.places)+'</span>'+(events?'<span class="gf-tb-pill">'+events+' '+esc(labels.events)+'</span>':'')+'<span class="gf-tb-pill">'+state.items.length+' résultats</span>';
    var more=document.getElementById('gfTbMore');
    more.hidden=state.shown>=state.items.length;
    more.textContent=labels.more+' ('+Math.min(PAGE_SIZE,state.items.length-state.shown)+')';
  }

  function close(){
    var ov=document.getElementById('gfTourismeBridge');
    if(ov){ov.classList.remove('show');document.body.style.overflow='';}
  }

  function show(items){
    ensurePanel(); style();
    state.items=(Array.isArray(items)?items:[]).filter(function(p){return p&&p.nom;});
    state.shown=Math.min(PAGE_SIZE,state.items.length);
    render();
    var ov=document.getElementById('gfTourismeBridge');
    ov.classList.add('show'); document.body.style.overflow='hidden';
  }

  function askTourism(q){
    var t=token();
    if(!t){
      var r=document.getElementById('reponse'); if(r) r.textContent='Accès voyageur manquant. Ouvrez Guestflow avec votre lien personnel.';
      return;
    }
    try{ if(typeof afficherEtatReflexion==='function') afficherEtatReflexion(); }catch(e){}
    var cb='gfTourismeBridgeCb_'+Date.now()+'_'+Math.floor(Math.random()*100000);
    var sc=document.createElement('script'), done=false;
    function cleanup(){if(done)return;done=true;clearTimeout(timer);try{delete window[cb];}catch(e){}if(sc.parentNode)sc.parentNode.removeChild(sc);}
    var timer=setTimeout(function(){
      cleanup();
      var r=document.getElementById('reponse'); if(r) r.textContent='La recherche touristique a pris trop de temps. Réessayez dans un instant.';
    },15000);
    window[cb]=function(payload){
      cleanup();
      if(!payload||payload.ok!==true){
        var r=document.getElementById('reponse'); if(r) r.textContent=(payload&&payload.erreur)?String(payload.erreur):'La recherche touristique est momentanément indisponible.';
        return;
      }
      var items=Array.isArray(payload.resultats)?payload.resultats:(Array.isArray(payload.places)?payload.places:[]);
      if(items.length) show(items);
      else {var r=document.getElementById('reponse'); if(r) r.textContent='Aucune suggestion touristique trouvée pour cette recherche.';}
    };
    sc.onerror=function(){cleanup();var r=document.getElementById('reponse');if(r)r.textContent='Impossible de joindre le service touristique.';};
    sc.src=API_URL+'?api=tourisme_geo&token='+encodeURIComponent(t)+'&lang='+encodeURIComponent(getLang())+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.body.appendChild(sc);
  }

  document.addEventListener('click',function(e){
    var more=e.target.closest&&e.target.closest('#gfTbMore');
    if(more){state.shown=Math.min(state.items.length,state.shown+PAGE_SIZE);render();}
  });

  function install(){
    if(typeof window.envoyerQuestion!=='function') return;
    if(window.__gfTourismeBridgeInstalled) return;
    var original=window.envoyerQuestion;
    window.envoyerQuestion=function(){
      var input=document.getElementById('question');
      var q=input?String(input.value||'').trim():'';
      if(tourist(q)){askTourism(q);return;}
      return original.apply(this,arguments);
    };
    window.__gfTourismeBridgeInstalled=true;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
  setTimeout(install,500);
  setTimeout(install,1500);
  setTimeout(install,3000);
})();
