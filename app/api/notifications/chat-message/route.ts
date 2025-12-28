import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "lib/email"
import { getServerSupabaseOrNull } from "lib/supabaseServer"

export async function POST(req: NextRequest) {
  try {
    const { bookingId, resortId, senderUserId, content } = await req.json()

    if (!content || (!bookingId && !resortId)) {
      return NextResponse.json({ error: "Missing content or identifiers" }, { status: 400 })
    }

    const sb = getServerSupabaseOrNull()
    if (!sb) {
      return NextResponse.json({ error: "Server Supabase not configured" }, { status: 500 })
    }

    let ownerEmail: string | null = null
    let resortName: string | null = null
    let link: string | null = null

    if (bookingId) {
      const { data: booking } = await sb
        .from('bookings')
        .select('id, resort_id, resorts(name, owner_id), guest_id')
        .eq('id', bookingId)
        .single()
      const resRow = (booking as any)?.resorts
      resortName = resRow?.name ?? null
      const ownerId = resRow?.owner_id ?? null
      link = `/chat/${bookingId}?as=owner`
      if (ownerId) {
        const { data: owner } = await sb
          .from('profiles')
          .select('email')
          .eq('id', ownerId)
          .single()
        ownerEmail = owner?.email ?? null
      }
    } else if (resortId) {
      const { data: resort } = await sb
        .from('resorts')
        .select('name, owner_id')
        .eq('id', resortId)
        .single()
      resortName = resort?.name ?? null
      const ownerId = resort?.owner_id ?? null
      link = `/chat/resort/${resortId}?as=owner`
      if (ownerId) {
        const { data: owner } = await sb
          .from('profiles')
          .select('email')
          .eq('id', ownerId)
          .single()
        ownerEmail = owner?.email ?? null
      }
    }

    if (!ownerEmail) {
      return NextResponse.json({ error: "Owner email not found" }, { status: 404 })
    }

    const subject = resortName
      ? `New message about ${resortName}`
      : `New message in chat`

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
        <h2>${subject}</h2>
        <p>${content}</p>
        ${link ? `<p><a href="${link}">Open chat</a></p>` : ''}
        <p>Thanks,<br/>ResortifyPH</p>
      </div>
    `

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "1"
    let res: any = null
    if (!dryRun) {
      res = await sendEmail({ to: ownerEmail, subject, html })
    }

    // Optional: log notification
    try {
      await sb.from('notifications').insert({
        user_id: null,
        type: 'chat_message',
        to_email: ownerEmail,
        subject,
        status: dryRun ? 'dry_run' : 'sent',
      })
    } catch {}

    return NextResponse.json({ id: res?.data?.id ?? null, ok: true, dryRun })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Send failed' }, { status: 500 })
  }
}
