'use client';
import { useState, useRef, useEffect } from 'react';
import { useIsDesktop } from '../lib/useIsDesktop';
import BrewSpinner from './BrewSpinner';
import { FlowBrand, FlowFooter } from './FlowChrome';

const MAX_IMAGES = 3;

const ICON_SPARK = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path d="M7.45284 2.71266C7.8276 1.76244 9.1724 1.76245 9.54716 2.71267L10.7085 5.65732C10.8229 5.94743 11.0526 6.17707 11.3427 6.29148L14.2873 7.45284C15.2376 7.8276 15.2376 9.1724 14.2873 9.54716L11.3427 10.7085C11.0526 10.8229 10.8229 11.0526 10.7085 11.3427L9.54716 14.2873C9.1724 15.2376 7.8276 15.2376 7.45284 14.2873L6.29148 11.3427C6.17707 11.0526 5.94743 10.8229 5.65732 10.7085L2.71266 9.54716C1.76244 9.1724 1.76245 7.8276 2.71267 7.45284L5.65732 6.29148C5.94743 6.17707 6.17707 5.94743 6.29148 5.65732L7.45284 2.71266Z"/><path d="M16.9245 13.3916C17.1305 12.8695 17.8695 12.8695 18.0755 13.3916L18.9761 15.6753C19.039 15.8348 19.1652 15.961 19.3247 16.0239L21.6084 16.9245C22.1305 17.1305 22.1305 17.8695 21.6084 18.0755L19.3247 18.9761C19.1652 19.039 19.039 19.1652 18.9761 19.3247L18.0755 21.6084C17.8695 22.1305 17.1305 22.1305 16.9245 21.6084L16.0239 19.3247C15.961 19.1652 15.8348 19.039 15.6753 18.9761L13.3916 18.0755C12.8695 17.8695 12.8695 17.1305 13.3916 16.9245L15.6753 16.0239C15.8348 15.961 15.961 15.8348 16.0239 15.6753L16.9245 13.3916Z"/></g></svg>';

function compressImage(file, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('No se pudo procesar la imagen')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          resolve({ media_type: 'image/jpeg', data: dataUrl.split(',')[1], previewUrl: dataUrl });
        };
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('No se pudo cargar la imagen')); };
    img.src = objectUrl;
  });
}

export default function IdeaCapture({ projectName, initialText = '', onSubmit, onBack, error, onClearError }) {
  const isDesktop = useIsDesktop();
  const [text, setText] = useState(initialText);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [images, setImages] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const committedRef = useRef('');
  const wakeLockRef = useRef(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  const startRecognition = (SR) => {
    const r = new SR();
    r.lang = 'es-MX';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finals = committedRef.current;
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) finals += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      committedRef.current = finals;
      setText(finals + interim);
    };
    r.onend = () => {
      if (shouldRestartRef.current) {
        const nr = startRecognition(SR);
        recognitionRef.current = nr;
      } else {
        setListening(false);
        releaseWakeLock();
      }
    };
    r.onerror = (e) => {
      if (e.error === 'no-speech') return;
      shouldRestartRef.current = false;
      setListening(false);
      releaseWakeLock();
    };
    r.start();
    return r;
  };

  const toggleVoice = () => {
    if (listening) {
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      releaseWakeLock();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    committedRef.current = text;
    shouldRestartRef.current = true;
    recognitionRef.current = startRecognition(SR);
    setListening(true);
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(l => { wakeLockRef.current = l; }).catch(() => {});
    }
  };

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0 || files.length === 0) return;
    setCompressing(true);
    try {
      const results = await Promise.all(files.slice(0, slots).map(f => compressImage(f)));
      setImages(prev => [...prev, ...results.map(r => ({ id: Math.random().toString(36).slice(2), ...r }))]);
    } catch {
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));

  const canSubmit = text.trim().length >= 10;
  const rawImages = () => images.map(({ media_type, data }) => ({ media_type, data }));

  const handleSubmit = () => {
    if (canSubmit) onSubmit(text.trim(), rawImages());
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: isDesktop ? 'center' : 'stretch',
      padding: 'env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)',
    }}>
    <div style={{ width: '100%', maxWidth: isDesktop ? 640 : undefined, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center',
                   justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#525252' }}>IA de Kitifica</span>
          </div>
        </div>
        <FlowBrand />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px 16px', gap: 20, overflow: 'hidden' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#E0E0E0', letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2 }}>
            Cuéntanos tu idea
          </h1>
          <p style={{ fontSize: 13, color: '#525252', margin: '6px 0 0', lineHeight: 1.5 }}>
            Describila como si se la explicaras a un amigo. Después la evaluamos juntos.
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Cuéntame tu idea: qué es, para quién es, y por qué creés que tiene sentido..."
              style={{
                width: '100%', height: '100%', minHeight: 180, resize: 'none', boxSizing: 'border-box',
                background: '#111111', border: `1.5px solid ${listening ? 'rgba(239,68,68,0.5)' : '#2A2A2A'}`,
                borderRadius: 14, padding: '16px', color: '#E0E0E0',
                fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 200ms',
              }}
            />
          </div>

          {(images.length > 0 || compressing) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {images.map(img => (
                <div key={img.id} style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                  <img src={img.previewUrl} alt="Referencia visual"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, border: '1px solid #2A2A2A' }} />
                  <button onClick={() => removeImage(img.id)} aria-label="Quitar imagen"
                    style={{
                      position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                      background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E0E0E0',
                      fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>×</button>
                </div>
              ))}
              {compressing && (
                <div style={{ width: 56, height: 56, borderRadius: 10, border: '1px dashed #2A2A2A',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BrewSpinner size={30} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#2A2A2A' }}>{text.length} caracteres</span>
              {listening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                              background: 'rgba(239,68,68,0.1)', borderRadius: 20, padding: '3px 9px' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Escuchando</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {images.length < MAX_IMAGES && (
                <button onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  aria-label="Adjuntar imagen de referencia"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid #2A2A2A',
                    borderRadius: 20, cursor: compressing ? 'default' : 'pointer', color: '#888888',
                    fontSize: 12, fontWeight: 600, transition: 'all 200ms', opacity: compressing ? 0.6 : 1,
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  Imagen
                </button>
              )}
              {speechSupported && (
                <button onClick={toggleVoice}
                  aria-label={listening ? 'Detener grabación' : 'Hablar'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                    background: listening ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : '#2A2A2A'}`,
                    borderRadius: 20, cursor: 'pointer', color: listening ? '#EF4444' : '#888888',
                    fontSize: 12, fontWeight: 600, transition: 'all 200ms',
                  }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  {listening ? 'Detener' : 'Hablar'}
                </button>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesSelected} style={{ display: 'none' }} />
        </div>
      </div>

      <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 1.5 }}>{error}</span>
              <button onClick={onClearError}
                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%', padding: '16px 0',
            background: canSubmit ? '#7c3aed' : '#1A1A1A',
            color: canSubmit ? '#fff' : '#3A3A3A',
            border: `1.5px solid ${canSubmit ? '#7c3aed' : '#2A2A2A'}`,
            borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default',
            transition: 'all 200ms', letterSpacing: '-0.01em',
            boxShadow: canSubmit ? '0 4px 20px rgba(124,58,237,0.35)' : 'none',
          }}>
          Evaluar idea →
        </button>
        <FlowFooter />
      </div>
    </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
