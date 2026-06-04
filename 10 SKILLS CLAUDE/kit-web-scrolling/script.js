(function(){
  // NAV scroll effect
  const nav=document.querySelector('.nav');
  window.addEventListener('scroll',()=>{
    nav.classList.toggle('scrolled',window.scrollY>50);
  },{passive:true});

  // PARALLAX on hero background
  const heroBg=document.querySelector('.hero-bg');
  if(heroBg){
    let ticking=false;
    window.addEventListener('scroll',()=>{
      if(!ticking){requestAnimationFrame(()=>{
        const y=window.scrollY;
        heroBg.style.transform=`scale(1.1) translateY(${y*0.3}px)`;
        ticking=false;
      });ticking=true;}
    },{passive:true});
  }

  // PARALLAX on section backgrounds
  document.querySelectorAll('.section-bg').forEach(bg=>{
    let t=false;
    window.addEventListener('scroll',()=>{
      if(!t){requestAnimationFrame(()=>{
        const rect=bg.parentElement.getBoundingClientRect();
        const progress=(window.innerHeight-rect.top)/(window.innerHeight+rect.height);
        bg.style.transform=`scale(1.05) translateY(${(progress-0.5)*60}px)`;
        t=false;
      });t=true;}
    },{passive:true});
  });

  // INTERSECTION OBSERVER - reveal animations
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        // counter animation
        if(e.target.classList.contains('stat-number')){
          animateCounter(e.target);
        }
      }
    });
  },{threshold:0.15,rootMargin:'0px 0px -50px 0px'});

  document.querySelectorAll('.reveal,.stagger,.stat-number').forEach(el=>observer.observe(el));

  // COUNTER animation
  function animateCounter(el){
    const target=parseInt(el.dataset.target)||0;
    const suffix=el.dataset.suffix||'';
    const prefix=el.dataset.prefix||'';
    const duration=2000;
    const start=performance.now();
    function update(now){
      const elapsed=now-start;
      const progress=Math.min(elapsed/duration,1);
      const eased=1-Math.pow(1-progress,3);
      const current=Math.round(eased*target);
      el.textContent=prefix+current.toLocaleString()+suffix;
      if(progress<1)requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // TYPING effect
  const typingEl=document.getElementById('typing-text');
  if(typingEl){
    const text=typingEl.dataset.text||'';
    typingEl.textContent='';
    let i=0;
    function typeChar(){
      if(i<text.length){
        typingEl.textContent+=text[i];
        i++;
        setTimeout(typeChar,50+Math.random()*30);
      }
    }
    setTimeout(typeChar,800);
  }

  // PARTICLES generator
  const particlesContainer=document.querySelector('.particles');
  if(particlesContainer){
    for(let i=0;i<30;i++){
      const p=document.createElement('div');
      p.className='particle';
      p.style.left=Math.random()*100+'%';
      p.style.animationDuration=(8+Math.random()*12)+'s';
      p.style.animationDelay=Math.random()*10+'s';
      p.style.width=p.style.height=(1+Math.random()*2)+'px';
      particlesContainer.appendChild(p);
    }
  }

  // AUTO-REVEAL after time (for elements with data-auto-reveal)
  document.querySelectorAll('[data-auto-reveal]').forEach(el=>{
    const delay=parseInt(el.dataset.autoReveal)||3000;
    setTimeout(()=>el.classList.add('visible'),delay);
  });

  // SMOOTH SCROLL for nav links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const target=document.querySelector(a.getAttribute('href'));
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // GLITCH effect on hover for hero title
  const heroTitle=document.querySelector('.hero h1');
  if(heroTitle){
    heroTitle.addEventListener('mouseenter',()=>{
      heroTitle.style.animation='glitch .3s ease';
      setTimeout(()=>heroTitle.style.animation='',300);
    });
  }
})();
