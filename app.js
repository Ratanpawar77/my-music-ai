(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'my_music_ai_projects_v1';
  const state = { projects: [], currentAudioUrl: null, audioBlob: null, playing: false, deferredInstall: null };
  const chordSets = {
    emotional: [[0,3,7],[8,0,3],[5,9,0],[10,2,5]],
    hopeful: [[0,4,7],[7,11,2],[9,0,4],[5,9,0]],
    romantic: [[0,4,7],[9,0,4],[5,9,0],[7,11,2]],
    energetic: [[0,4,7],[5,9,0],[7,11,2],[0,4,7]],
    devotional: [[0,5,7],[5,9,0],[7,0,2],[0,5,7]],
    peaceful: [[0,4,7],[2,5,9],[5,9,0],[0,4,7]]
  };
  const moodNames = {emotional:'Emotional',hopeful:'Hopeful',romantic:'Romantic',energetic:'Energetic',devotional:'Devotional',peaceful:'Peaceful'};
  const genreNames = {cinematic:'Cinematic',acoustic:'Acoustic',lofi:'Lo-fi',pop:'Pop',folk:'Folk-inspired',ambient:'Ambient'};
  const keyNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  function readProjects() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function currentDraft() {
    return { id: crypto.randomUUID(), title: $('songTitle').value.trim() || 'Untitled song', idea: $('idea').value.trim(), language: $('language').value, mood: $('mood').value, genre: $('genre').value, key: $('key').value, tempo: Number($('tempo').value), duration: Number($('duration').value), lyrics: $('lyrics').value, updatedAt: new Date().toISOString() };
  }
  function setStatus(message) { $('audioStatus').textContent = message; }
  function updateWordCount() { const n = $('lyrics').value.trim().split(/\s+/).filter(Boolean).length; $('wordCount').textContent = n + (n === 1 ? ' word' : ' words'); }
  function updateMeta() {
    $('trackTitle').textContent = $('songTitle').value.trim() || 'Untitled song';
    $('trackMeta').textContent = genreNames[$('genre').value] + ' · ' + moodNames[$('mood').value] + ' · ' + $('key').value + ' key feel';
    $('tempoValue').textContent = $('tempo').value + ' BPM';
  }
  function lyricStarter() {
    const lang = $('language').value, mood = $('mood').value, idea = $('idea').value.trim();
    const templates = {
      mr: {
        emotional: ['मनातल्या वाटेवर, आठवणींची चाहूल','शब्द हरवले तरी, भावना बोलत राहतात','रात्र सरते हळूच, नवी पहाट येते','स्वप्नांच्या दिशेने, पाऊल पुढे जाते'],
        hopeful: ['वादळ कितीही येऊ दे, दिवा माझा जळत राहील','पडून पुन्हा उठताना, विश्वास सोबत राहील','आजचा संघर्ष उद्याची, नवी ओळख बनेल','मनातल्या स्वप्नांना, आकाश नवे मिळेल'],
        romantic: ['तुझ्या हसण्यात माझी, सकाळ खुलते','तुझ्या शब्दांनी मनाची, धून जुळते','अंतर कितीही असो, ओढ ही राहते','प्रत्येक क्षणी मन, तुझ्याकडे वाहते'],
        energetic: ['चाल पुढे चाल, थांबायचे नाही','स्वप्नांच्या मागे, वळायचे नाही','घामाच्या थेंबातून, यश फुलणार','आजचा निर्धार उद्या जिंकणार'],
        devotional: ['तुझ्या नामात माझे, मन शांत होते','तुझ्या चरणी चिंता, दूर वाहते','अंधारात तूच माझा, दीप बनतोस','प्रत्येक श्वासात तू, साथ देतोस'],
        peaceful: ['वार्‍याच्या सुरांत, मन अलगद झुलते','निळ्या आभाळाखाली, चिंता विरते','क्षणभर थांबून, स्वतःला ऐकावे','शांत या वाटेवर, मनाला भेटावे']
      },
      hi: {
        emotional: ['खामोश रातों में, यादें जगती हैं','टूटे हुए सपनों में, उम्मीद रहती है','वक़्त के साथ ये, दर्द भी ढल जाएगा','एक नया सवेरा, फिर से आएगा'],
        hopeful: ['राह कठिन सही, कदम रुकेंगे नहीं','आँधियों में भी, सपने झुकेंगे नहीं','आज की मेहनत, कल रंग लाएगी','मेरी कहानी, मंज़िल पाएगी'],
        romantic: ['तेरी हँसी से, मौसम सँवरता है','तेरे ही ख़यालों में, दिल ये ठहरता है','दूरियाँ हों फिर भी, एहसास रहता है','हर धड़कन में तेरा, नाम बहता है'],
        energetic: ['चल उठ ज़रा, आसमान छूना है','हर मुश्किल से, आगे निकलना है','मेहनत की आग में, चमकना है','अपनी कहानी, खुद लिखना है'],
        devotional: ['तेरे नाम से, मन को सहारा मिले','तेरी राह में, जीने का इशारा मिले','जब भी अँधेरा, मुझको घेरता है','तेरा ही उजाला, राह दिखाता है'],
        peaceful: ['धीमी हवा में, सुकून सा मिले','खामोश लम्हों में, जुनून सा मिले','आँखें बंद करके, खुद को सुनूँ','इस पल में जीकर, थोड़ा सा चुनूँ']
      },
      en: {
        emotional: ['The quiet night remembers your name','A little hope survives the rain','The darkest road will find the dawn','A new day comes, and I move on'],
        hopeful: ['I keep on walking through the storm','I hold the dream that keeps me warm','Each little step becomes my way','I am becoming more each day'],
        romantic: ['Your laughter turns the grey to gold','A thousand little stories told','Across the miles, our hearts remain','A gentle song beneath the rain'],
        energetic: ['I rise again, I own the night','I chase the spark, I find the light','No looking back, no standing still','I turn my dreams into my will'],
        devotional: ['A quiet light is guiding me','A deeper peace is setting me free','Through every turn, I feel the grace','A steady love in every place'],
        peaceful: ['The evening settles soft and slow','The open sky has room to grow','I breathe the moment, let it be','And find a little peace in me']
      }
    };
    const lines = templates[lang][mood] || templates[lang].emotional;
    const title = $('songTitle').value.trim() || 'Untitled song';
    const chorus = lang === 'mr' ? 'तुझ्या स्वप्नांसाठी, पुन्हा उभा राहा\nमनातल्या आवाजाला, नवा सूर देऊन जा' : lang === 'hi' ? 'अपने सपनों के लिए, फिर से उठ जाना\nदिल की इस धुन को, दुनिया तक पहुँचाना' : 'For every dream, I rise again\nI find my song beyond the rain';
    $('lyrics').value = '[Verse 1]\n' + lines.slice(0,2).join('\n') + '\n\n[Pre-Chorus]\n' + lines[2] + '\n' + lines[3] + '\n\n[Chorus — ' + title + ']\n' + chorus + '\n\n[Verse 2]\n' + (idea ? (lang === 'en' ? 'This is my story: ' : lang === 'hi' ? 'ये मेरी कहानी है: ' : 'ही माझी गोष्ट आहे: ') + idea : lines[1]) + '\n' + lines[0] + '\n\n[Outro]\n' + lines[3];
    updateWordCount(); setStatus('A lyric starter is ready. Edit it until it feels like your song.');
  }
  function noteFrequency(semitone, octave) { return 440 * Math.pow(2, (semitone + (octave - 4) * 12 - 9) / 12); }
  function makeNoiseBuffer(ctx, duration) { const length = Math.ceil(ctx.sampleRate * duration), buffer = ctx.createBuffer(1,length,ctx.sampleRate), data = buffer.getChannelData(0); for(let i=0;i<length;i++) data[i] = Math.random()*2-1; return buffer; }
  async function renderInstrumental(draft) {
    const sampleRate = 44100, duration = draft.duration, bpm = draft.tempo, beat = 60 / bpm;
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) throw new Error('This browser does not support offline audio rendering. Try a recent Chrome browser.');
    const ctx = new Offline(2, Math.ceil(sampleRate * duration), sampleRate);
    const master = ctx.createGain(); master.gain.value = 0.68; master.connect(ctx.destination);
    const delay = ctx.createDelay(0.5); delay.delayTime.value = beat * 0.75;
    const feedback = ctx.createGain(); feedback.gain.value = draft.genre === 'ambient' ? 0.2 : 0.1;
    delay.connect(feedback); feedback.connect(delay); delay.connect(master);
    const chords = chordSets[draft.mood] || chordSets.emotional;
    const root = keyNames.indexOf(draft.key);
    const bars = Math.ceil(duration / (beat * 4));
    const isSoft = ['ambient','acoustic','lofi'].includes(draft.genre);
    function tone(freq, start, len, wave, vol, destination=master, attack=0.025, release=0.18) {
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type=wave; osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(0.0001,start); gain.gain.linearRampToValueAtTime(vol,start+attack);
      gain.gain.setValueAtTime(vol,start+Math.max(attack,len-release));
      gain.gain.exponentialRampToValueAtTime(0.0001,start+len);
      osc.connect(gain); gain.connect(destination); if(destination===master && draft.genre==='ambient') { gain.connect(delay); }
      osc.start(start); osc.stop(start+len+0.02);
    }
    const noise = makeNoiseBuffer(ctx,0.25);
    function drum(start, kind) {
      const source=ctx.createBufferSource(); source.buffer=noise;
      const gain=ctx.createGain(); source.connect(gain); gain.connect(master);
      if(kind==='kick') {
        const osc=ctx.createOscillator(), og=ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(115,start); osc.frequency.exponentialRampToValueAtTime(42,start+0.16); og.gain.setValueAtTime(0.65,start); og.gain.exponentialRampToValueAtTime(0.001,start+0.22); osc.connect(og); og.connect(master); osc.start(start); osc.stop(start+0.23);
        gain.gain.setValueAtTime(0.0001,start); gain.gain.exponentialRampToValueAtTime(0.001,start+0.04); source.start(start); source.stop(start+0.05);
      } else {
        gain.gain.setValueAtTime(kind==='snare'?0.22:0.055,start); gain.gain.exponentialRampToValueAtTime(0.001,start+(kind==='snare'?0.13:0.035)); source.start(start); source.stop(start+(kind==='snare'?0.14:0.04));
      }
    }
    for(let bar=0;bar<bars;bar++) {
      const start=bar*beat*4, chord=chords[bar%chords.length];
      for(const interval of chord) {
        const freq=noteFrequency(root+interval,4);
        tone(freq,start,beat*3.8,'triangle',isSoft?0.075:0.045,master,0.25,0.6);
        if(draft.genre==='cinematic'||draft.genre==='ambient') tone(freq/2,start,beat*3.7,'sine',0.055,master,0.3,0.7);
      }
      for(let b=0;b<4;b++) {
        const t=start+b*beat;
        if(draft.genre!=='ambient') drum(t,'kick');
        if(b===1||b===3) drum(t,'snare');
        if(draft.genre!=='acoustic'&&draft.genre!=='ambient') drum(t,'hat');
        const melody=[chord[2],chord[1],chord[0],chord[1]][b];
        if(bar%2===0 || b===2) tone(noteFrequency(root+melody,5),t+beat*0.5,beat*0.42,'sine',0.07,master,0.015,0.1);
      }
      if(draft.genre==='folk') {
        tone(noteFrequency(root+chord[2],5),start+beat*2,beat*0.7,'triangle',0.08,master,0.02,0.15);
      }
    }
    const rendered=await ctx.startRendering();
    return audioBufferToWav(rendered);
  }
  function audioBufferToWav(buffer) {
    const channels=buffer.numberOfChannels, length=buffer.length, bytes=44+length*channels*2;
    const out=new ArrayBuffer(bytes), view=new DataView(out); let offset=0;
    const writeString=s=>{for(let i=0;i<s.length;i++)view.setUint8(offset++,s.charCodeAt(i));};
    writeString('RIFF'); view.setUint32(offset,bytes-8,true); offset+=4; writeString('WAVE'); writeString('fmt '); view.setUint32(offset,16,true); offset+=4; view.setUint16(offset,1,true); offset+=2; view.setUint16(offset,channels,true); offset+=2; view.setUint32(offset,buffer.sampleRate,true); offset+=4; view.setUint32(offset,buffer.sampleRate*channels*2,true); offset+=4; view.setUint16(offset,channels*2,true); offset+=2; view.setUint16(offset,16,true); offset+=2; writeString('data'); view.setUint32(offset,bytes-44,true); offset+=4;
    const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
    for(let i=0;i<length;i++) for(let ch=0;ch<channels;ch++){let sample=Math.max(-1,Math.min(1,data[ch][i])); view.setInt16(offset,sample<0?sample*32768:sample*32767,true); offset+=2;}
    return new Blob([out],{type:'audio/wav'});
  }
  function downloadBlob(blob, filename) { const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500); }
  async function createPreview() {
    const button=$('playPreview'); button.disabled=true; button.textContent='Creating your sound…'; setStatus('Rendering your instrumental. This may take a few seconds.');
    try {
      const draft=currentDraft(), blob=await renderInstrumental(draft);
      state.audioBlob=blob;
      if(state.currentAudioUrl) URL.revokeObjectURL(state.currentAudioUrl);
      state.currentAudioUrl=URL.createObjectURL(blob);
      const audio=$('audioPlayer'); audio.src=state.currentAudioUrl; audio.load();
      $('downloadWav').disabled=false; $('totalTime').textContent='00:'+String(draft.duration).padStart(2,'0');
      await audio.play(); state.playing=true; $('waveform').classList.add('playing');
      button.innerHTML='<span>Ⅱ</span> Playing preview'; setStatus('Your original instrumental sketch is ready. Download the WAV to keep it.');
    } catch(error) { setStatus(error.message || 'Audio generation failed. Please try again.'); button.innerHTML='<span>▶</span> Create &amp; play preview'; }
    finally { button.disabled=false; }
  }
  function stopAudio() { const audio=$('audioPlayer'); audio.pause(); audio.currentTime=0; state.playing=false; $('waveform').classList.remove('playing'); $('playTime').textContent='00:00'; $('progressBar').style.width='0%'; $('playPreview').innerHTML='<span>▶</span> Play again'; }
  function saveProject() {
    const draft=currentDraft(); const old=state.projects.findIndex(p=>p.id===draft.id);
    const existing=state.projects.findIndex(p=>p.title===draft.title);
    if(existing>=0) { draft.id=state.projects[existing].id; state.projects[existing]=draft; }
    else if(old>=0) state.projects[old]=draft; else state.projects.unshift(draft);
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state.projects)); renderProjects(); setStatus('Project saved on this device.'); }
    catch(_) { setStatus('Could not save. Your browser storage may be full. Export the project JSON instead.'); }
  }
  function renderProjects() {
    $('projectCount').textContent=state.projects.length;
    $('projectList').innerHTML=state.projects.length?state.projects.map(p=>'<article class="project-card"><h3>'+escapeHtml(p.title)+'</h3><p>'+escapeHtml(genreNames[p.genre]||p.genre)+' · '+escapeHtml(moodNames[p.mood]||p.mood)+' · '+new Date(p.updatedAt).toLocaleDateString()+'</p><div class="project-actions"><button type="button" data-load="'+escapeHtml(p.id)+'">Open</button><button type="button" data-delete="'+escapeHtml(p.id)+'" class="delete-button">Delete</button></div></article>').join(''):'<div class="empty-state">No saved projects yet. Create an idea in the Studio and tap “Save project”.</div>';
  }
  function escapeHtml(v){return escapeHtmlSafe(v);}
  function escapeHtmlSafe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function loadProject(id) {
    const p=state.projects.find(x=>x.id===id); if(!p)return;
    $('songTitle').value=p.title||''; $('idea').value=p.idea||''; $('language').value=p.language||'mr'; $('mood').value=p.mood||'emotional'; $('genre').value=p.genre||'cinematic'; $('key').value=p.key||'C'; $('tempo').value=p.tempo||82; $('duration').value=String(p.duration||30); $('lyrics').value=p.lyrics||'';
    updateMeta(); updateWordCount(); document.querySelector('[data-tab="studio"]').click(); setStatus('Project loaded. Make it yours.');
  }
  function exportProject() { const blob=new Blob([JSON.stringify({app:'My Music AI',version:1,exportedAt:new Date().toISOString(),projects:state.projects},null,2)],{type:'application/json'}); downloadBlob(blob,'my-music-ai-backup.json'); }
  function exportCurrentLyrics() { downloadBlob(new Blob([$('lyrics').value],{type:'text/plain;charset=utf-8'}),( $('songTitle').value.trim()||'lyrics').replace(/[^a-z0-9-_]/gi,'_')+'.txt'); }
  document.querySelectorAll('[data-tab]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===tab)); ['studio','projects','guide'].forEach(name=>$(name+'Panel').classList.toggle('active',tab.dataset.tab===name)); if(tab.dataset.tab==='projects')renderProjects();}));
  $('generateLyrics').addEventListener('click',lyricStarter);
  $('lyrics').addEventListener('input',updateWordCount);
  ['songTitle','mood','genre','key'].forEach(id=>$(id).addEventListener('input',updateMeta));
  $('tempo').addEventListener('input',()=>{$('tempoValue').textContent=$('tempo').value+' BPM';});
  $('playPreview').addEventListener('click',()=>{if(state.audioBlob && $('audioPlayer').paused){$('audioPlayer').play();return;}createPreview();});
  $('stopPreview').addEventListener('click',stopAudio);
  $('audioPlayer').addEventListener('timeupdate',()=>{const a=$('audioPlayer');$('playTime').textContent='00:'+String(Math.floor(a.currentTime)).padStart(2,'0');$('progressBar').style.width=(a.duration?100*a.currentTime/a.duration:0)+'%';});
  $('audioPlayer').addEventListener('ended',()=>{state.playing=false;$('waveform').classList.remove('playing');$('playPreview').innerHTML='<span>▶</span> Play again';});
  $('downloadWav').addEventListener('click',()=>{if(state.audioBlob)downloadBlob(state.audioBlob,( $('songTitle').value.trim()||'instrumental').replace(/[^a-z0-9-_]/gi,'_')+'.wav');});
  $('saveProject').addEventListener('click',saveProject);
  $('exportProject').addEventListener('click',exportProject);
  $('copyLyrics').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('lyrics').value);setStatus('Lyrics copied to clipboard.');}catch(_){$('lyrics').select();setStatus('Select and copy the lyrics manually.');}});
  $('downloadLyrics').addEventListener('click',exportCurrentLyrics);
  $('clearLyrics').addEventListener('click',()=>{if(confirm('Clear the current lyrics?')){$('lyrics').value='';updateWordCount();}});
  $('projectList').addEventListener('click',event=>{const load=event.target.closest('[data-load]'),del=event.target.closest('[data-delete]');if(load)loadProject(load.dataset.load);if(del){state.projects=state.projects.filter(p=>p.id!==del.dataset.delete);localStorage.setItem(STORAGE_KEY,JSON.stringify(state.projects));renderProjects();}});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.deferredInstall=event;$('installButton').hidden=false;});
  $('installButton').addEventListener('click',async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('installButton').hidden=true;});
  state.projects=readProjects(); renderProjects(); updateMeta(); updateWordCount();
  if('serviceWorker' in navigator && location.protocol!=='file:') window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
})();