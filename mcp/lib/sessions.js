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
  await supabase
    .from('ccc_sessions')
    .update(fields)
    .eq('id', sessionId)
}

export async function deleteSession(sessionId, userId) {
  await supabase
    .from('ccc_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)
}

export async function getBrief(sessionId) {
  const { data } = await supabase
    .from('ccc_sessions')
    .select('brief_content, project_name, status')
    .eq('id', sessionId)
    .single()
  return data
}
