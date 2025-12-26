import { supabase } from './supabaseClient'

export type NotificationPayload = {
  userId: string
  type: string
  title: string
  body?: string
  link?: string
  metadata?: Record<string, any>
}

export async function notify({ userId, type, title, body = '', link = '', metadata = {} }: NotificationPayload){
  try {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_link: link,
      p_metadata: metadata,
    })
    if (error) throw error
  } catch (err) {
    console.error('Notification RPC error:', err)
  }
}

export async function listNotifications(limit = 10){
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('Notifications fetch error:', error)
    return []
  }
  return data || []
}

export async function markAllRead(){
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .is('read_at', null)
  if (error) console.error('Notifications mark read error:', error)
}

export async function deleteAllNotifications(){
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', session.user.id)
  if (error) console.error('Notifications delete all error:', error)
}
