import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create admin client with service role key for user management
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceRoleKey) {
    return null
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Verify the requesting user is an admin
async function verifyAdmin(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anonKey) {
    return { isAdmin: false, error: 'Server configuration error' }
  }
  
  // Get auth token from cookies
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value || 
    cookieStore.get('supabase-auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!accessToken) {
    return { isAdmin: false, error: 'Not authenticated' }
  }
  
  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { isAdmin: false, error: 'Invalid session' }
  }
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  
  if (!profile?.is_admin) {
    return { isAdmin: false, error: 'Not authorized' }
  }
  
  return { isAdmin: true, userId: user.id }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin
    const authCheck = await verifyAdmin(request)
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: authCheck.error }, { status: 403 })
    }
    
    // Get user ID to delete from request body
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    // Prevent admin from deleting themselves
    if (userId === authCheck.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }
    
    const adminSupabase = getAdminSupabase()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    // Check if target user is an admin (prevent deleting other admins)
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('is_admin, email, full_name')
      .eq('id', userId)
      .single()
    
    if (targetProfile?.is_admin) {
      return NextResponse.json({ error: 'Cannot delete admin users. Revoke admin privileges first.' }, { status: 400 })
    }
    
    // Delete user from auth.users (this will cascade delete profile and related data)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Delete user error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${targetProfile?.email || userId} deleted successfully` 
    })
    
  } catch (err) {
    console.error('Delete user API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
