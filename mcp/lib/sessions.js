import { supabase } from './db.js'

function newSessionId() {
  return 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

export async function createSession(userId, projectName) {
  const id = newSessionId()
  const { error } = await supabase.from('ccc_sessions').insert({
    id,
    user_id: userId,
    project_name: projectName,
    status: 'pending',
  })
  if (error) throw new Error(error.message)
  return id
}

export async function uploadBrief(sessionId, userId, content) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ brief_content: content, status: 'ready' })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getSession(sessionId, userId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function updateSessionFields(sessionId, fields) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update(fields)
    .eq('id', sessionId)
  if (error) throw new Error(error.message)
}

export async function deleteSession(sessionId, userId) {
  const { error } = await supabase
    .from('ccc_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getBrief(sessionId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('brief_content, project_name, status')
    .eq('id', sessionId)
    .single()
  return data
}

export async function saveIdea(sessionId, userId, ideaText) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ idea_text: ideaText, status: 'pending_questionnaire' })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function saveQuestionnaire(sessionId, userId, questionnaire) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ questionnaire, status: 'questionnaire_ready' })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function saveAnswers(sessionId, userId, answers) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ answers, status: 'pending_evaluation' })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function saveEvaluation(sessionId, userId, semaforo, claudeMd) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ semaforo, claude_md: claudeMd, status: 'evaluation_ready' })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function getIdea(sessionId, userId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('idea_text, project_name')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function getAnswers(sessionId, userId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('idea_text, answers, questionnaire')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()
  return data
}

export async function saveBrandProfile(sessionId, userId, brandProfile) {
  const { error } = await supabase
    .from('ccc_sessions')
    .update({ brand_profile: brandProfile })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function listAudienceProfiles(userId) {
  const { data, error } = await supabase
    .from('ccc_audience_profiles')
    .select('id, name, role_level, pain_point, objection, success_signal, buying_stage, channel')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveAudienceProfile(sessionId, userId, profile) {
  const { name, role_level, pain_point, objection, success_signal, buying_stage, channel, raw_text, profile_id, save_to_library } = profile
  const structured = { role_level, pain_point, objection, success_signal, buying_stage, channel }

  let resolvedId = profile_id ?? null
  if (!resolvedId && save_to_library !== false) {
    const { data, error } = await supabase
      .from('ccc_audience_profiles')
      .insert({ user_id: userId, name: name ?? 'Perfil sin nombre', ...structured })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    resolvedId = data.id
  }

  const { error } = await supabase
    .from('ccc_sessions')
    .update({
      client_profile: raw_text ?? null,
      audience_profile: structured,
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  return resolvedId
}
