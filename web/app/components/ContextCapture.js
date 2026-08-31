'use client';
import { useState, useRef } from 'react';
import { analyzeBrand } from '../lib/mcp-client';
import { useIsDesktop } from '../lib/useIsDesktop';
import { FlowBrand, FlowFooter } from './FlowChrome';

const ICON_GALLERY = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><g fill="currentColor"><path d="M18.5116 10.0771C18.5116 10.8157 17.8869 11.4146 17.1163 11.4146C16.3457 11.4146 15.7209 10.8157 15.7209 10.0771C15.7209 9.33841 16.3457 8.7396 17.1163 8.7396C17.8869 8.7396 18.5116 9.33841 18.5116 10.0771Z"/><path fill-rule="evenodd" d="M18.0363 5.53245C16.9766 5.39588 15.6225 5.39589 13.9129 5.39591H10.0871C8.37751 5.39589 7.02343 5.39588 5.9637 5.53245C4.87308 5.673 3.99033 5.96913 3.29418 6.63641C2.59803 7.30369 2.28908 8.14982 2.14245 9.19521C1.99997 10.211 1.99999 11.5089 2 13.1475V13.2482C1.99999 14.8868 1.99997 16.1847 2.14245 17.2005C2.28908 18.2459 2.59803 19.092 3.29418 19.7593C3.99033 20.4266 4.87307 20.7227 5.9637 20.8633C7.02344 20.9998 8.37751 20.9998 10.0871 20.9998H13.9129C15.6225 20.9998 16.9766 20.9998 18.0363 20.8633C19.1269 20.7227 20.0097 20.4266 20.7058 19.7593C21.402 19.092 21.7109 18.2459 21.8575 17.2005C22 16.1847 22 14.8868 22 13.2482V13.1476C22 11.5089 22 10.211 21.8575 9.19521C21.7109 8.14982 21.402 7.30369 20.7058 6.63641C20.0097 5.96913 19.1269 5.673 18.0363 5.53245ZM6.14963 6.858C5.21373 6.97861 4.67452 7.20479 4.28084 7.58215C3.88716 7.9595 3.65119 8.47635 3.52536 9.37343C3.42443 10.093 3.40184 10.9923 3.3968 12.1686L3.86764 11.7737C4.99175 10.8309 6.68596 10.885 7.74215 11.8974L11.7326 15.7223C12.1321 16.1053 12.7611 16.1575 13.2234 15.8461L13.5008 15.6593C14.8313 14.763 16.6314 14.8668 17.8402 15.9096L20.2479 17.9866C20.3463 17.7226 20.4206 17.4075 20.4746 17.0223C20.6032 16.106 20.6047 14.8981 20.6047 13.1979C20.6047 11.4976 20.6032 10.2897 20.4746 9.37343C20.3488 8.47635 20.1128 7.9595 19.7192 7.58215C19.3255 7.20479 18.7863 6.97861 17.8504 6.858C16.8944 6.7348 15.6343 6.73338 13.8605 6.73338H10.1395C8.36575 6.73338 7.10559 6.7348 6.14963 6.858Z" clip-rule="evenodd"/><path d="M17.0863 2.61039C16.2265 2.49997 15.1318 2.49998 13.7672 2.5H10.6775C9.31284 2.49998 8.21815 2.49997 7.35834 2.61039C6.46796 2.72473 5.72561 2.96835 5.13682 3.53075C4.79725 3.8551 4.56856 4.22833 4.41279 4.64928C4.91699 4.41928 5.48704 4.28374 6.12705 4.20084C7.21143 4.06037 8.597 4.06038 10.3463 4.06039H14.2612C16.0105 4.06038 17.396 4.06037 18.4804 4.20084C19.0394 4.27325 19.545 4.38581 20 4.56638C19.8454 4.17917 19.625 3.83365 19.3078 3.53075C18.719 2.96835 17.9767 2.72473 17.0863 2.61039Z"/></g></svg>';
const ICON_DOC = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V10C21 6.22876 21 4.34315 19.8284 3.17157C18.6569 2 16.7712 2 13 2H11C7.22876 2 5.34315 2 4.17157 3.17157ZM7.25 8C7.25 7.58579 7.58579 7.25 8 7.25H16C16.4142 7.25 16.75 7.58579 16.75 8C16.75 8.41421 16.4142 8.75 16 8.75H8C7.58579 8.75 7.25 8.41421 7.25 8ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4142 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4142 7.25 12ZM8 15.25C7.58579 15.25 7.25 15.5858 7.25 16C7.25 16.4142 7.58579 16.75 8 16.75H13C13.4142 16.75 13.75 16.4142 13.75 16C13.75 15.5858 13.4142 15.25 13 15.25H8Z" clip-rule="evenodd"/></svg>';

const AUDIENCE_QUESTIONS = [
  { key: 'roleLevel', text: 'Rol y nivel de decisión de quien va a ver esto', options: ['Decisor final', 'Influenciador', 'Filtra antes de escalarlo a otro'] },
  { key: 'painPoint', text: 'Su dolor u objetivo específico frente a esto', options: ['No sabe cuánto le va a costar', 'No confía en que funcione', 'No tiene tiempo de evaluar opciones', 'Ya usa algo y cambiar le da pereza'] },
  { key: 'objection', text: 'Su objeción principal', options: ['Precio', 'Confianza', 'Complejidad', 'Urgencia — no es prioridad ahora'] },
  { key: 'successSignal', text: 'Qué necesita ver o sentir para decir que sí', options: ['Un caso concreto parecido al suyo', 'Ver el resultado antes de comprometerse', 'Que sea simple de entender rápido', 'Que resuelva su duda específica'] },
  { key: 'buyingStage', text: 'Etapa del proceso de compra', options: ['Recién explorando', 'Comparando opciones', 'Lista para decidir'] },
  { key: 'channel', text: 'Dónde la va a ver', options: ['Reunión en vivo', 'Link compartido por correo', 'Redes sociales', 'Otro'] },
];

const BRAND_FALLBACK_QUESTIONS = [
  { key: 'tone', text: 'Tono de comunicación', options: ['Formal', 'Cercano / informal', 'Técnico', 'Otro'] },
  { key: 'colors', text: 'Colores principales de la marca', options: ['Oscuros / serios', 'Claros / neutros', 'Vibrantes / de color', 'No estoy seguro'] },
  { key: 'avoid', text: 'Qué evitar', options: ['Jerga técnica', 'Tono muy informal', 'Imágenes genéricas de stock', 'Nada en particular'] },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

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

const chipBtn = (active) => ({
  padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
  border: `1.5px solid ${active ? '#7c3aed' : '#2A2A2A'}`,
  background: active ? 'rgba(124,58,237,0.12)' : '#0D0D0D',
  color: active ? '#E0E0E0' : '#888888',
  fontSize: 12.5, fontWeight: active ? 600 : 400, transition: 'all 150ms',
});

const sectionCard = { background: '#111111', border: '1px solid #2A2A2A', borderRadius: 14, padding: 16, marginBottom: 14 };
const modeBtn = (active) => ({
  flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
  border: `1.5px solid ${active ? '#7c3aed' : '#2A2A2A'}`,
  background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
  color: active ? '#E0E0E0' : '#888888', fontSize: 12, fontWeight: 600,
});

export default function ContextCapture({ ideaText, savedProfiles = [], onSubmit, onSkip, onBack, error, onClearError }) {
  const isDesktop = useIsDesktop();
  const [audienceMode, setAudienceMode] = useState(savedProfiles.length ? 'existing' : 'build');
  const [selectedProfileId, setSelectedProfileId] = useState(savedProfiles[0]?.id ?? '');
  const [audiencePaste, setAudiencePaste] = useState('');
  const [audienceAnswers, setAudienceAnswers] = useState({});

  const [brandUrl, setBrandUrl] = useState('');
  const [brandImages, setBrandImages] = useState([]);
  const [brandPdf, setBrandPdf] = useState(null);
  const [brandFallback, setBrandFallback] = useState({});
  const [compressing, setCompressing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const imgInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const pickAudience = (key, val) => setAudienceAnswers(prev => ({ ...prev, [key]: val }));
  const pickBrandFallback = (key, val) => setBrandFallback(prev => ({ ...prev, [key]: val }));

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - brandImages.length);
    e.target.value = '';
    if (!files.length) return;
    setCompressing(true);
    try {
      const results = await Promise.all(files.map(f => compressImage(f)));
      setBrandImages(prev => [...prev, ...results.map(r => ({ id: Math.random().toString(36).slice(2), ...r }))]);
    } catch {} finally { setCompressing(false); }
  };
  const removeImage = (id) => setBrandImages(prev => prev.filter(i => i.id !== id));

  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await fileToBase64(file);
      setBrandPdf({ name: file.name, media_type: 'application/pdf', data });
    } catch {}
  };

  const hasAnyBrandSignal = !!brandUrl.trim() || brandImages.length > 0 || !!brandPdf || Object.keys(brandFallback).length > 0;

  const handleContinue = async () => {
    onClearError?.();

    // Perfil de público objetivo — resolver según el modo elegido
    let audience = null;
    let clientProfileRaw = null;
    let audienceProfileId = null;
    if (audienceMode === 'existing' && selectedProfileId) {
      const p = savedProfiles.find(sp => sp.id === selectedProfileId);
      if (p) {
        audience = { role_level: p.roleLevel, pain_point: p.painPoint, objection: p.objection, success_signal: p.successSignal, buying_stage: p.buyingStage, channel: p.channel };
        audienceProfileId = p.id;
      }
    } else if (audienceMode === 'paste' && audiencePaste.trim()) {
      clientProfileRaw = audiencePaste.trim();
    } else if (audienceMode === 'build' && Object.keys(audienceAnswers).length > 0) {
      audience = {
        role_level: audienceAnswers.roleLevel, pain_point: audienceAnswers.painPoint,
        objection: audienceAnswers.objection, success_signal: audienceAnswers.successSignal,
        buying_stage: audienceAnswers.buyingStage, channel: audienceAnswers.channel,
      };
    }

    // Lineamientos de marca — consolidar las señales dadas en una sola llamada
    let brandProfile = null;
    if (hasAnyBrandSignal) {
      setAnalyzing(true);
      try {
        const result = await analyzeBrand(ideaText, {
          url: brandUrl.trim() || undefined,
          images: brandImages.map(({ media_type, data }) => ({ media_type, data })),
          pdf: brandPdf ? { data: brandPdf.data } : undefined,
          answers: Object.keys(brandFallback).length ? brandFallback : undefined,
        });
        brandProfile = result.brand_profile;
      } catch (e) {
        setAnalyzing(false);
        onSubmit?.({ error: e.message });
        return;
      }
      setAnalyzing(false);
    }

    onSubmit({ audience, clientProfileRaw, audienceProfileId, audienceName: audiencePaste ? null : (audience ? 'Perfil ' + new Date().toLocaleDateString('es') : null), brandProfile });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: isDesktop ? 'center' : 'stretch', padding: 'env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px)' }}>
    <div style={{ width: '100%', maxWidth: isDesktop ? 640 : undefined, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} aria-label="Volver" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E0E0' }}>¿A quién querés convencer?</div>
          <div style={{ fontSize: 10, color: '#525252', marginTop: 1 }}>Opcional — mejora las preguntas y el resultado</div>
        </div>
        <FlowBrand />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        {/* Perfil de público objetivo */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E0E0E0', marginBottom: 8 }}>Perfil de público objetivo</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {savedProfiles.length > 0 && (
            <button style={modeBtn(audienceMode === 'existing')} onClick={() => setAudienceMode('existing')}>Reutilizar guardado</button>
          )}
          <button style={modeBtn(audienceMode === 'paste')} onClick={() => setAudienceMode('paste')}>Ya lo tengo</button>
          <button style={modeBtn(audienceMode === 'build')} onClick={() => setAudienceMode('build')}>Ayudame a armarlo</button>
        </div>

        {audienceMode === 'existing' && (
          <div style={sectionCard}>
            <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
              style={{ width: '100%', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none' }}>
              {savedProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {audienceMode === 'paste' && (
          <div style={sectionCard}>
            <textarea value={audiencePaste} onChange={e => setAudiencePaste(e.target.value)}
              placeholder="Pegá el perfil que ya tenés: industria, rol, objeciones típicas, qué le importa..."
              style={{ width: '100%', minHeight: 90, resize: 'vertical', boxSizing: 'border-box', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, padding: 12, color: '#E0E0E0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        )}

        {audienceMode === 'build' && (
          <div style={sectionCard}>
            {AUDIENCE_QUESTIONS.map(q => (
              <div key={q.key} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#E0E0E0', margin: '0 0 8px' }}>{q.text}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {q.options.map(opt => (
                    <button key={opt} onClick={() => pickAudience(q.key, opt)} style={chipBtn(audienceAnswers[q.key] === opt)}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lineamientos de marca */}
        <div style={{ fontSize: 12, fontWeight: 700, color: '#E0E0E0', margin: '18px 0 8px' }}>Lineamientos de marca</div>
        <p style={{ fontSize: 11, color: '#525252', margin: '0 0 12px', lineHeight: 1.5 }}>Podés combinar más de uno — documento, imágenes, tu sitio, o unas preguntas rápidas si no tenés nada de esto.</p>

        <div style={sectionCard}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: '#888888', display: 'block', marginBottom: 6 }}>Link de tu sitio actual</label>
            <input value={brandUrl} onChange={e => setBrandUrl(e.target.value)} placeholder="https://tuempresa.com" type="url"
              style={{ width: '100%', boxSizing: 'border-box', background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#E0E0E0', padding: '10px 12px', fontSize: 13, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => imgInputRef.current?.click()} disabled={compressing || brandImages.length >= 3}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid #2A2A2A', background: 'rgba(255,255,255,0.05)', color: '#888888', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span dangerouslySetInnerHTML={{ __html: ICON_GALLERY }} /> Imágenes de referencia
            </button>
            <button onClick={() => pdfInputRef.current?.click()}
              style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid #2A2A2A', background: 'rgba(255,255,255,0.05)', color: '#888888', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span dangerouslySetInnerHTML={{ __html: ICON_DOC }} /> Manual de marca (PDF)
            </button>
            <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} />
            <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdf} style={{ display: 'none' }} />
          </div>

          {(brandImages.length > 0 || brandPdf) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {brandImages.map(img => (
                <div key={img.id} style={{ position: 'relative', width: 48, height: 48 }}>
                  <img src={img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #2A2A2A' }} />
                  <button onClick={() => removeImage(img.id)} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: '50%', background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#E0E0E0', fontSize: 11, cursor: 'pointer', padding: 0 }}>×</button>
                </div>
              ))}
              {brandPdf && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0A0A0A', border: '1px solid #2A2A2A', borderRadius: 8, padding: '6px 10px' }}>
                  <span style={{ fontSize: 11, color: '#888888', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandPdf.name}</span>
                  <button onClick={() => setBrandPdf(null)} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: 13, padding: 0 }}>×</button>
                </div>
              )}
            </div>
          )}

          <div style={{ height: 1, background: '#1E1E1E', margin: '4px 0 14px' }} />
          <p style={{ fontSize: 11, color: '#525252', margin: '0 0 10px' }}>Sin nada de lo anterior — respaldo rápido:</p>
          {BRAND_FALLBACK_QUESTIONS.map(q => (
            <div key={q.key} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#E0E0E0', margin: '0 0 6px' }}>{q.text}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {q.options.map(opt => (
                  <button key={opt} onClick={() => pickBrandFallback(q.key, opt)} style={chipBtn(brandFallback[q.key] === opt)}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 10 }} />
      </div>

      <div style={{ padding: '12px 20px 20px', flexShrink: 0, borderTop: '1px solid #141414' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 1.5 }}>{error}</span>
            {onClearError && <button onClick={onClearError} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}>×</button>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onSkip}
            style={{ padding: '16px 18px', borderRadius: 14, cursor: 'pointer', background: '#161616', border: '1.5px solid #2A2A2A', color: '#888888', fontSize: 14, fontWeight: 600 }}>
            Omitir
          </button>
          <button onClick={handleContinue} disabled={analyzing}
            style={{
              flex: 1, padding: '16px 0', background: analyzing ? '#1A1A1A' : '#7c3aed', color: analyzing ? '#525252' : '#fff',
              border: `1.5px solid ${analyzing ? '#2A2A2A' : '#7c3aed'}`, borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: analyzing ? 'default' : 'pointer', boxShadow: analyzing ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
            }}>
            {analyzing ? 'Analizando marca...' : 'Continuar →'}
          </button>
        </div>
        <FlowFooter />
      </div>
    </div>
    </div>
  );
}
