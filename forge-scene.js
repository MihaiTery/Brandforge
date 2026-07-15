/* BrandForge — fundalul "focul din vulcan" al poveștii scrollytelling.
   WebGL raw, zero dependențe (~6KB). Se încarcă leneș (idle), doar pe
   dispozitive capabile; în rest rămâne activ fallback-ul CSS din styles.css.
   Scena reacționează la scroll (u_scroll) și la timpul petrecut pe pagină
   (u_dwell, 0..1 pe parcursul a DWELL_RAMP_MS): lava urcă și jarul se
   întețește atat pe măsură ce utilizatorul avansează în poveste, cat și
   cu cat stă mai mult pe site, indiferent daca e activ sau nu.
   Straturi de animație: heat-shimmer, lavă cu flux domain-warped, crăpături
   incandescente ce derivează lent, fum/cenușă ce se ridică din lavă, doua
   planuri de scântei (aproape/departe) cu paralaxă la mișcarea cursorului,
   puls de "foale" (bellows) care respiră jarul central, vinietă.
   Tier-uri:
     0. prefers-reduced-motion  -> fundal static (CSS-ul oprește singur animațiile)
     1. mobil / hardware modest -> fallback CSS animat (nu se încarcă WebGL)
     2. desktop capabil         -> shader WebGL complet (vezi mai sus)
   Watchdog de FPS: dacă scena nu ține pasul, se autodistruge și revine la CSS. */

(() => {
  "use strict";

  const scriptLoadTime = performance.now();
  const DWELL_RAMP_MS = 90000; // tine sincron cu dwellRampDuration din script.js

  const mount = document.querySelector("[data-forge-scene]");
  if (!mount) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;

  if (reducedMotion) return;                       // tier 0
  if (coarsePointer || cores <= 3 || memory <= 2) return; // tier 1

  const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

  const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_scroll;
uniform float u_dwell;
uniform vec2 u_pointer;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}

float noise(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),
             mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);
}

float fbm(vec2 p){
  float v=0.0;float a=0.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.3,7.1);a*=0.5;}
  return v;
}

void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  float aspect=u_res.x/u_res.y;
  vec2 p=vec2(uv.x*aspect,uv.y);
  float t=u_t*0.5;

  /* heat-shimmer: distorsiune ușoară, mai puternică spre lavă */
  vec2 warp=vec2(fbm(p*2.6+vec2(0.0,t*0.55)),fbm(p*2.6-vec2(t*0.45,0.0)));
  p+=(warp-0.5)*0.09*(1.15-uv.y);

  /* paralaxă subtilă la mișcarea cursorului — fundalul "respiră" cu scena */
  p+=u_pointer*0.035;

  /* puls de foale: focul respiră ritmic, ca și cum cineva pompează aerul */
  float bellows=pow(0.5+0.5*sin(u_t*0.9),3.0);

  vec3 ember=vec3(0.94,0.31,0.08);   /* --ember  #f04f14 */
  vec3 gold=vec3(1.0,0.79,0.24);     /* --gold   #ffc93d */
  vec3 hot=vec3(1.0,0.97,0.82);      /* --whitehot #fff8d2 */

  /* obsidian de bază, cu textură de rocă */
  float rock=fbm(p*6.0);
  vec3 col=vec3(0.032,0.018,0.012)+rock*vec3(0.05,0.032,0.022);

  /* lavă la baza vulcanului — urcă pe măsură ce povestea avansează SI pe
     măsură ce trece timpul petrecut pe pagină (u_dwell, 0..1, vezi
     updateDwellBurn in script.js) */
  float heat=u_scroll+u_dwell*0.7;
  float lavaLine=0.24+0.1*heat+0.04*fbm(vec2(p.x*2.2,t*0.35));
  float lava=smoothstep(lavaLine,lavaLine-0.26,uv.y);
  float flow=fbm(p*vec2(2.6,3.6)+vec2(t*0.12,t*0.5));
  vec3 lavaCol=mix(ember,gold,flow);
  lavaCol=mix(lavaCol,hot,pow(max(flow-0.35,0.0),2.2));
  col=mix(col,lavaCol,lava*(0.5+0.3*flow));

  /* crăpături incandescente în obsidian — derivează lent, ca și cum
     rețeaua de fisuri se reformează în timp, cu puls de jar */
  vec2 crackDrift=vec2(3.7+t*0.06,1.3-t*0.04);
  float c=fbm(p*6.5+crackDrift);
  float crack=smoothstep(0.022,0.0,abs(c-0.52))*smoothstep(0.92,0.28,uv.y)*(1.0-lava);
  crack*=0.55+0.45*sin(u_t*1.4+c*24.0);
  col+=crack*mix(ember,gold,0.4)*(0.9+0.4*heat+0.3*bellows);

  /* fum si cenusa care se ridica lent din lava, domain-warped */
  vec2 smokeP=p*vec2(1.3,1.8)+vec2(t*0.05,-t*0.24)+warp*0.5;
  float smokeN=fbm(smokeP);
  float smokeBand=smoothstep(lavaLine-0.04,lavaLine+0.4,uv.y)*(1.0-smoothstep(lavaLine+0.25,lavaLine+0.85,uv.y));
  float smoke=smokeBand*smoothstep(0.38,0.72,smokeN)*0.3*(1.0-lava);
  col=mix(col,vec3(0.045,0.032,0.028),smoke);

  /* lumina focului — jar pulsatoriu, tot mai intens spre finalul poveștii,
     cu cat vizitatorul sta mai mult pe pagina, si cu respiratia foalelor */
  float d=distance(uv,vec2(0.5,0.34));
  col+=ember*0.22*exp(-d*d*7.0)*(0.82+0.18*sin(u_t*1.7))*(1.0+0.5*heat+0.35*bellows);

  /* scântei pe doua planuri (aproape/departe), cu paralaxă la cursor */
  for(int i=0;i<24;i++){
    float fi=float(i);
    bool near=mod(fi,2.0)>0.5;
    float sx=hash(vec2(fi,1.7));
    float speed=(0.045+0.11*hash(vec2(fi,3.1)))*(near?1.15:0.7);
    float ph=hash(vec2(fi,9.3));
    float sy=fract(ph+u_t*speed);
    vec2 parallax=u_pointer*(near?0.09:0.03);
    vec2 sp=vec2(sx*aspect+0.02*sin(u_t*0.6+fi*2.1),sy)+parallax;
    float sd=distance(vec2(uv.x*aspect,uv.y),sp);
    float size=(0.000006+0.000005*hash(vec2(fi,5.7)))*(near?1.0:2.4);
    float s=exp(-(sd*sd)/size);
    float life=smoothstep(0.0,0.06,sy)*smoothstep(1.0,0.5,sy);
    float flicker=0.7+0.3*sin(u_t*8.0+fi*3.3);
    float brightness=near?1.0:0.5;
    col+=mix(gold,hot,ph)*s*life*flicker*brightness;
  }

  /* vinietă + întunecare sus și la bază, pentru contrastul textului */
  float vig=smoothstep(1.25,0.45,distance(uv,vec2(0.5,0.45)));
  col*=mix(0.55,1.0,vig);
  col*=mix(1.0,0.62,smoothstep(0.6,1.0,uv.y));
  col*=mix(1.0,0.72,smoothstep(0.22,0.0,uv.y));

  gl_FragColor=vec4(col,1.0);
}`;

  function start() {
    const canvas = document.createElement("canvas");
    canvas.className = "forge-canvas";
    const gl = canvas.getContext("webgl", {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: "high-performance"
    });
    if (!gl) return;

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    /* un singur triunghi care acoperă tot ecranul */
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uT = gl.getUniformLocation(program, "u_t");
    const uScroll = gl.getUniformLocation(program, "u_scroll");
    const uDwell = gl.getUniformLocation(program, "u_dwell");
    const uPointer = gl.getUniformLocation(program, "u_pointer");

    /* progresul poveștii (0..1), citit în bucla de randare */
    let scrollProgress = 0;
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });

    /* paralaxă lină la cursor: target actualizat pe pointermove, valoarea
       reală netezită (lerp) în bucla de randare ca să nu sară brusc */
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;
    window.addEventListener("pointermove", (event) => {
      pointerTargetX = event.clientX / window.innerWidth - 0.5;
      pointerTargetY = event.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    /* randăm sub rezoluția nativă și lăsăm compositorul să scaleze — ieftin */
    const RENDER_SCALE = 0.7;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * RENDER_SCALE;
      const w = Math.max(1, Math.round(mount.clientWidth * dpr));
      const h = Math.max(1, Math.round(mount.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }

    let raf = 0;
    let destroyed = false;
    const t0 = performance.now();
    let last = t0;
    let frames = 0;
    let slowFrames = 0;
    let watchdogDone = false;

    function teardown() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mount.classList.remove("scene-webgl");
      canvas.remove();
    }

    function frame(now) {
      if (destroyed) return;
      raf = requestAnimationFrame(frame);

      /* watchdog: primele ~120 de cadre; dacă GPU-ul nu ține 30fps, revenim la CSS */
      if (!watchdogDone) {
        const dt = now - last;
        frames += 1;
        if (frames > 10 && dt > 33) slowFrames += 1;
        if (frames >= 120) {
          watchdogDone = true;
          if (slowFrames > 45) { teardown(); return; }
        }
      }
      last = now;

      pointerX += (pointerTargetX - pointerX) * 0.06;
      pointerY += (pointerTargetY - pointerY) * 0.06;

      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform1f(uScroll, scrollProgress);
      gl.uniform1f(uDwell, Math.min(1, (now - scriptLoadTime) / DWELL_RAMP_MS));
      gl.uniform2f(uPointer, pointerX, pointerY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function play() {
      if (destroyed || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      teardown();
    });

    /* fundalul e mereu în viewport — pauză doar când tab-ul e ascuns */
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) play(); else pause();
    });

    window.addEventListener("resize", resize, { passive: true });

    resize();
    mount.appendChild(canvas);
    mount.classList.add("scene-webgl");
    requestAnimationFrame(() => canvas.classList.add("is-ready"));
    play();
  }

  /* inițializare după ce pagina devine interactivă — nu blocăm primul render */
  if ("requestIdleCallback" in window) {
    requestIdleCallback(start, { timeout: 2500 });
  } else {
    window.setTimeout(start, 400);
  }
})();
