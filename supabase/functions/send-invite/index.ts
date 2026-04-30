import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_ADDRESS   = Deno.env.get('FROM_ADDRESS')   ?? 'Away <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, inviterName, tripTitle, token, appUrl } = await req.json()

    if (!email || !token || !appUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const inviteUrl = `${appUrl}/invite/${token}`
    const signupUrl = `${appUrl}/signup`

    const html = buildEmail({ inviterName, tripTitle, inviteUrl, signupUrl })

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      email,
        subject: `${inviterName} invited you to "${tripTitle}" on Away`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return new Response(JSON.stringify({ error: body }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ── Email template ─────────────────────────────────────────────────────────

function buildEmail({ inviterName, tripTitle, inviteUrl, signupUrl }: {
  inviterName: string
  tripTitle:   string
  inviteUrl:   string
  signupUrl:   string
}) {
  const logoSvg = `
    <svg width="26" height="32" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,2 20,20 16,17 12,20" fill="#D95F2B"/>
      <polygon points="16,38 20,20 16,23 12,20" fill="#1C2E4A" opacity="0.4"/>
      <circle cx="16" cy="20" r="2.2" fill="#1C2E4A"/>
      <circle cx="16" cy="20" r="1" fill="#F9F7F4"/>
    </svg>
  `.trim().replace(/\n\s*/g, ' ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>You're invited to join Away</title>
</head>
<body style="margin:0;padding:0;background-color:#F9F7F4;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9F7F4;padding:48px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle" style="padding-right:10px;">${logoSvg}</td>
                <td valign="middle">
                  <span style="font-family:Trebuchet MS,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:300;letter-spacing:0.22em;text-transform:uppercase;color:#0B0F1A;">away</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:20px;padding:48px 52px;box-shadow:0 4px 24px rgba(11,15,26,0.08);">

            <!-- Eyebrow -->
            <p style="margin:0 0 16px;font-family:Trebuchet MS,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#8C97A6;">
              Trip invitation
            </p>

            <!-- Heading -->
            <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;line-height:1.15;color:#0B0F1A;">
              You're invited<br/>to plan a trip.
            </h1>

            <!-- Divider -->
            <div style="width:48px;height:3px;background:#D95F2B;border-radius:2px;margin:0 0 28px;"></div>

            <!-- Body copy -->
            <p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.65;color:#475563;">
              <strong style="color:#0B0F1A;">${esc(inviterName)}</strong> has invited you to join them on
            </p>
            <p style="margin:0 0 32px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#1C2E4A;line-height:1.3;">
              "${esc(tripTitle)}"
            </p>

            <!-- Primary CTA -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#D95F2B;border-radius:9999px;">
                  <a href="${inviteUrl}"
                     style="display:inline-block;padding:15px 36px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                    Accept invitation &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #F4F6F8;margin:32px 0;"/>

            <!-- New user path -->
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#677585;line-height:1.6;">
              <strong style="color:#0B0F1A;">New to Away?</strong> Create a free account first, then your invitation will be waiting.
            </p>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1.5px solid #1C2E4A;border-radius:9999px;">
                  <a href="${signupUrl}"
                     style="display:inline-block;padding:11px 28px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;color:#1C2E4A;text-decoration:none;">
                    Create account
                  </a>
                </td>
              </tr>
            </table>

            <!-- Fallback link -->
            <p style="margin:28px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#A0ADBC;line-height:1.6;">
              Or copy this link into your browser:<br/>
              <a href="${inviteUrl}" style="color:#D95F2B;word-break:break-all;">${inviteUrl}</a>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:32px 0 0;">
            <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#A0ADBC;">
              Away &mdash; Collaborative travel planning
            </p>
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#C4CDD8;">
              You received this because ${esc(inviterName)} entered your email address.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
