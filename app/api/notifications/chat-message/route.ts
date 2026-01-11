import { NextRequest, NextResponse } from "next/server"
import { sendEmail, brandEmailTemplate } from "lib/email"
import { getServerSupabaseOrNull } from "lib/supabaseServer"
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Helper to verify the request is from an authenticated user
async function getAuthenticatedUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    const bearerToken = bearerMatch?.[1]?.trim()
    if (bearerToken) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (url && anonKey) {
        const tokenClient = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: { user } } = await tokenClient.auth.getUser(bearerToken)
        if (user) return user
      }
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // Security: Verify the user is authenticated
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookingId, resortId, senderUserId, content, to, skipSelfNotification } = await req.json()

    // Security: Ensure senderUserId matches authenticated user (prevent spoofing)
    if (senderUserId && senderUserId !== authUser.id) {
      return NextResponse.json({ error: "Sender mismatch" }, { status: 403 })
    }

    if (!content || (!bookingId && !resortId)) {
      return NextResponse.json({ error: "Missing content or identifiers" }, { status: 400 })
    }

    const sb = getServerSupabaseOrNull()

    let ownerEmail: string | null = null
    let ownerId: string | null = null
    let resortName: string | null = null
    let link: string | null = null

    // Ensure chat and participants exist server-side to bypass RLS limitations
    let chatId: string | null = null

    if (sb) {
      try {
        if (bookingId) {
          // Find or create chat for booking
          const { data: existingChat } = await sb
            .from('chats')
            .select('id, resort_id')
            .eq('booking_id', bookingId)
            .maybeSingle()
          if (existingChat?.id) {
            chatId = existingChat.id
          } else {
            const { data: created } = await sb
              .from('chats')
              .insert({ booking_id: bookingId, creator_id: senderUserId })
              .select('id, resort_id')
              .single()
            chatId = created?.id ?? null
          }
          // Resolve resort/owner
        } else if (resortId) {
          // Find or create chat for resort
          const { data: existingResortChat } = await sb
            .from('chats')
            .select('id')
            .eq('resort_id', resortId)
            .eq('creator_id', senderUserId)
            .maybeSingle()
          if (existingResortChat?.id) {
            chatId = existingResortChat.id
          } else {
            const { data: created } = await sb
              .from('chats')
              .insert({ resort_id: resortId, creator_id: senderUserId })
              .select('id')
              .single()
            chatId = created?.id ?? null
          }
        }

        // Upsert sender participant (default to guest role for notifications)
        if (chatId && senderUserId) {
          await sb
            .from('chat_participants')
            .upsert({ chat_id: chatId, user_id: senderUserId, role: 'guest' } as any, {
              onConflict: 'chat_id,user_id',
              ignoreDuplicates: true,
            })
            .select('chat_id')
        }
      } catch (e) {
        console.warn('Server ensure chat/participant failed:', e)
      }
    }

    if (bookingId && !to && sb) {
      const { data: booking } = await sb
        .from('bookings')
        .select('id, resort_id, resorts(name, owner_id), guest_id')
        .eq('id', bookingId)
        .single()
      const resRow = (booking as any)?.resorts
      resortName = resRow?.name ?? null
      ownerId = resRow?.owner_id ?? null
      link = `/chat/${bookingId}?as=owner`
      
      // Skip notification if sender is the owner (don't notify yourself)
      if (senderUserId && ownerId && senderUserId === ownerId) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'sender-is-owner' }, { status: 202 })
      }
      
      if (ownerId && sb) {
        const { data: owner } = await sb
          .from('profiles')
          .select('email')
          .eq('id', ownerId)
          .maybeSingle()
        ownerEmail = (owner as any)?.email ?? null

        // Ensure owner participant exists
        if (sb && chatId) {
          try {
            await sb
              .from('chat_participants')
              .upsert({ chat_id: chatId, user_id: ownerId, role: 'owner' } as any, {
                onConflict: 'chat_id,user_id',
                ignoreDuplicates: true,
              })
          } catch (e) {
            console.warn('Ensure owner participant failed:', e)
          }
        }
      }
    } else if (resortId && !to && sb) {
      const { data: resort } = await sb
        .from('resorts')
        .select('name, owner_id')
        .eq('id', resortId)
        .single()
      resortName = resort?.name ?? null
      ownerId = resort?.owner_id ?? null
      // Resort-based chats are per-guest (resort_id + creator_id). Don't link owners into an ambiguous URL.
      link = `/owner/chats`
      
      // Skip notification if sender is the owner (don't notify yourself)
      if (senderUserId && ownerId && senderUserId === ownerId) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'sender-is-owner' }, { status: 202 })
      }
      
      if (ownerId && sb) {
        const { data: owner } = await sb
          .from('profiles')
          .select('email')
          .eq('id', ownerId)
          .maybeSingle()
        ownerEmail = (owner as any)?.email ?? null

        // Ensure owner participant exists
        if (sb && chatId) {
          try {
            await sb
              .from('chat_participants')
              .upsert({ chat_id: chatId, user_id: ownerId, role: 'owner' } as any, {
                onConflict: 'chat_id,user_id',
                ignoreDuplicates: true,
              })
          } catch (e) {
            console.warn('Ensure owner participant (resort) failed:', e)
          }
        }
      }
    }

    // If server Supabase is unavailable or owner email could not be resolved, skip sending instead of failing
    if (!ownerEmail && !to) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'owner-email-not-found-or-server-supabase-unavailable' }, { status: 202 })
    }

    const subject = resortName
      ? `New message about ${resortName}`
      : `New message in chat`

    const html = brandEmailTemplate({
      title: subject,
      intro: 'You have a new message from a guest.',
      rows: resortName ? [{ label: 'Resort', value: resortName }] : [],
      cta: link ? { label: 'Open Chat', href: link } : undefined,
    })

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"
    const windowMsParam = req.nextUrl.searchParams.get("windowMs")
    const firstOnlyParam = req.nextUrl.searchParams.get("firstOnly")
    const firstOnly = firstOnlyParam !== '0'
    const windowMs = windowMsParam ? parseInt(windowMsParam, 10) : 0
    if (sb && chatId && !dryRun) {
      try {
        const { count, data: lastMsgs } = await sb
          .from('chat_messages')
          .select('id, created_at', { count: 'exact' })
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
        if (firstOnly && (count ?? 0) > 0) {
          return NextResponse.json({ ok: true, skipped: true, reason: 'first-only' })
        }
        if (!firstOnly && windowMs > 0 && (lastMsgs || []).length > 0) {
          const lastCreated = new Date((lastMsgs as any)[0].created_at).getTime()
          if ((Date.now() - lastCreated) < windowMs) {
            return NextResponse.json({ ok: true, skipped: true, reason: 'window' })
          }
        }
      } catch (e) {
        console.warn('Throttle check failed:', e)
      }
    }
    let res: any = null
    const finalTo = to ?? ownerEmail
    if (!dryRun && finalTo) {
      try {
        res = await sendEmail({ to: finalTo, subject, html })
      } catch (e: any) {
        // Avoid hard failure; report as skipped
        return NextResponse.json({ ok: true, skipped: true, reason: 'email-send-error', error: e?.message }, { status: 202 })
      }
    }

    // Optional: log notification
    try {
      if (sb) {
        await sb.from('notifications').insert({
        user_id: ownerId ?? null,
        actor_id: senderUserId ?? authUser.id,
        type: 'chat_message',
        title: subject,
        body: 'New chat message notification',
        link: link ?? null,
        metadata: {
          bookingId: bookingId ?? null,
          resortId: resortId ?? null,
          email: {
            to: finalTo,
            subject,
            status: dryRun ? 'dry_run' : 'sent',
          },
        },
        })
      }
    } catch {}

    return NextResponse.json({ id: res?.data?.id ?? null, ok: true, dryRun })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Send failed' }, { status: 500 })
  }
}
