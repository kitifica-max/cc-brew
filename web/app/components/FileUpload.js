'use client';
import { useRef, useState } from 'react';
import { supabase, SESSION_ID } from '../lib/supabase';

const ICON_PAPERCLIP = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 6l-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/></svg>`;

const ALLOWED = new Set(['image/png','image/jpeg','image/gif','application/pdf','text/plain','text/markdown','application/json','text/csv','image/svg+xml','application/zip']);
const MAX_BYTES = 10 * 1024 * 1024;

export default function FileUpload({ currentProject, sendEvent, onFileSent }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.has(file.type)) { alert(`Tipo no permitido: ${file.type}`); return; }
    if (file.size > MAX_BYTES) { alert('Archivo demasiado grande (máx 10MB)'); return; }
    if (!currentProject?.id) { alert('Selecciona un proyecto primero'); return; }

    setUploading(true);
    try {
      const storageKey = `uploads/${SESSION_ID}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('uploads').upload(storageKey, file);
      if (error) throw error;

      sendEvent('upload-file', { storageKey, filename: file.name, projectId: currentProject.id });
      onFileSent?.(file.name);
    } catch (err) {
      alert(`Error subiendo archivo: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" onChange={handleFile} style={{ display: 'none' }} accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.md,.json,.csv,.svg,.zip" />
      <button
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          background: 'none', border: 'none', padding: 6, cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', color: uploading ? '#ccc' : '#888', flexShrink: 0,
          opacity: uploading ? 0.5 : 1,
        }}
        title="Adjuntar archivo"
        dangerouslySetInnerHTML={{ __html: ICON_PAPERCLIP }}
      />
    </>
  );
}
