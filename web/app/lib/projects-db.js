import { supabase } from './supabase'

function toDb(p) {
  return {
    id: p.id,
    name: p.name,
    idea_text: p.ideaText ?? null,
    idea_mode: p.ideaMode ?? 'idea',
    claude_md: p.claudeMd ?? null,
    semaforo: p.semaforo ?? null,
    session_id: p.sessionId ?? null,
    pending_questions: p.pendingQuestions ?? null,
    pending_answers: p.pendingAnswers ?? null,
    pending_followup_answers: p.pendingFollowupAnswers ?? null,
    document_confirmed: p.documentConfirmed ?? false,
    client_profile: p.clientProfile ?? null,
    brand_profile: p.brandProfile ?? null,
    audience_profile: p.audienceProfile ?? null,
    audience_profile_id: p.audienceProfileId ?? null,
    nodes: p.nodes ?? [],
    vectors: p.vectors ?? [],
    model: p.model ?? 'claude-sonnet-4-6',
    effort: p.effort ?? 'medium',
    updated_at: new Date().toISOString(),
  }
}

function fromDb(r) {
  return {
    id: r.id,
    name: r.name,
    path: null,
    ideaText: r.idea_text ?? null,
    ideaMode: r.idea_mode ?? 'idea',
    claudeMd: r.claude_md ?? null,
    semaforo: r.semaforo ?? null,
    sessionId: r.session_id ?? null,
    pendingQuestions: r.pending_questions ?? null,
    pendingAnswers: r.pending_answers ?? null,
    pendingFollowupAnswers: r.pending_followup_answers ?? null,
    documentConfirmed: r.document_confirmed ?? false,
    clientProfile: r.client_profile ?? null,
    brandProfile: r.brand_profile ?? null,
    audienceProfile: r.audience_profile ?? null,
    audienceProfileId: r.audience_profile_id ?? null,
    nodes: r.nodes ?? [],
    vectors: r.vectors ?? [],
    model: r.model ?? 'claude-sonnet-4-6',
    effort: r.effort ?? 'medium',
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    updatedAt: r.updated_at ?? null,
  }
}

export async function fetchProjects() {
  // Sin sesión válida, RLS filtra todas las filas y esto vuelve `[]` sin
  // error — indistinguible de "el usuario no tiene proyectos". Eso hacía
  // que un token vencido (típico en un PWA que estuvo horas en background)
  // se mostrara como "nube vacía" y pisara la UI con el local viejo para
  // siempre. Tratar sesión ausente igual que un fetch fallido (null).
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) { console.error('fetchProjects: sin sesión activa'); return null }
  const { data, error } = await supabase
    .from('ccc_projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchProjects:', error); return null }
  return (data ?? []).map(fromDb)
}

export async function upsertProject(project) {
  const { error } = await supabase
    .from('ccc_projects')
    .upsert(toDb(project), { onConflict: 'id' })
  if (error) { console.error('upsertProject:', error); return { ok: false, error } }
  return { ok: true }
}

export async function deleteProjectFromDb(id) {
  const { error } = await supabase.from('ccc_projects').delete().eq('id', id)
  if (error) console.error('deleteProject:', error)
}

// El step "evaluate" corre en una Background Function (la generación del
// CLAUDE.md completo puede tardar más que el límite de una function síncrona
// — ver mcp/netlify/functions/ai-process-evaluate-background.mjs). En vez de
// esperar una response HTTP, se dispara y se hace polling de esta misma fila
// hasta que claude_md o generation_error dejen de ser null.
export async function pollEvaluateResult(projectId, { intervalMs = 3000, timeoutMs = 150000 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, intervalMs))
    const { data, error } = await supabase
      .from('ccc_projects')
      .select('claude_md, semaforo, generation_error')
      .eq('id', projectId)
      .maybeSingle()
    if (error) { console.error('pollEvaluateResult:', error); continue } // hiccup de red — seguir esperando, no abortar por una lectura fallida
    if (data?.generation_error) throw new Error(data.generation_error)
    if (data?.claude_md) return { claude_md: data.claude_md, semaforo: data.semaforo }
  }
  throw new Error('La generación está tardando más de lo esperado. Intenta de nuevo en un momento.')
}

export async function fetchAudienceProfiles() {
  const { data, error } = await supabase
    .from('ccc_audience_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchAudienceProfiles:', error); return [] }
  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    roleLevel: r.role_level,
    painPoint: r.pain_point,
    objection: r.objection,
    successSignal: r.success_signal,
    buyingStage: r.buying_stage,
    channel: r.channel,
  }))
}

export async function fetchOnboardingSeen() {
  const { data, error } = await supabase
    .from('ccc_users')
    .select('onboarding_seen')
    .single()
  if (error) { console.error('fetchOnboardingSeen:', error); return true } // en duda, no molestar con el tour
  return data?.onboarding_seen ?? false
}

export async function markOnboardingSeen(userId) {
  // ccc_users no tiene policy de UPDATE para el cliente (a propósito, para
  // que no se pueda tocar minutes_balance/api_key directo) — se usa una RPC
  // angosta con SECURITY DEFINER, igual patrón que descontar_minuto.
  const { error } = await supabase.rpc('mark_onboarding_seen', { p_user_id: userId })
  if (error) console.error('markOnboardingSeen:', error)
}

export async function saveAudienceProfileToLibrary(userId, profile) {
  const { data, error } = await supabase
    .from('ccc_audience_profiles')
    .insert({
      user_id: userId,
      name: profile.name || 'Perfil sin nombre',
      role_level: profile.roleLevel ?? null,
      pain_point: profile.painPoint ?? null,
      objection: profile.objection ?? null,
      success_signal: profile.successSignal ?? null,
      buying_stage: profile.buyingStage ?? null,
      channel: profile.channel ?? null,
    })
    .select('id')
    .single()
  if (error) { console.error('saveAudienceProfileToLibrary:', error); return null }
  return data.id
}

export async function fetchUserCredits() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const SELECT = 'minutes_balance, trial_credits, byo_api_active'
  let { data: row, error } = await supabase.from('ccc_users').select(SELECT).single()
  if (!row && session.user.id) {
    const { data: inserted, error: upsertErr } = await supabase
      .from('ccc_users')
      .upsert({ supabase_user_id: session.user.id }, { onConflict: 'supabase_user_id' })
      .select(SELECT)
      .single()
    if (!upsertErr) row = inserted
  }
  if (error && !row) {
    console.error('fetchUserCredits:', error)
    return null
  }
  return {
    trialCredits: row?.trial_credits ?? 3,
    minutesBalance: row?.minutes_balance ?? 0,
    byoApiActive: !!row?.byo_api_active,
  }
}

