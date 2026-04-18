/**
 * Email service — send verification codes via Resend API
 */

export async function sendVerificationEmail(
  apiKey: string,
  to: string,
  code: string,
): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Melodoro <noreply@cosmelon.app>',
      to: [to],
      subject: `Your verification code / 您的验证码: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://clock.cosmelon.app/logo.png" width="48" height="48" alt="Melodoro" style="border: 0;" />
          </div>

          <p style="color: #555; font-size: 14px; margin: 0 0 8px;">Your verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; padding: 16px 0; text-align: center;">${code}</div>
          <p style="color: #999; font-size: 12px; margin: 0 0 24px;">This code expires in 15 minutes.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="color: #555; font-size: 14px; margin: 0 0 8px;">您的验证码是：</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; padding: 16px 0; text-align: center;">${code}</div>
          <p style="color: #999; font-size: 12px; margin: 0 0 24px;">验证码 15 分钟内有效。</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

          <p style="text-align: center; color: #bbb; font-size: 11px; margin: 0;">&copy; 2026 Melodoro &middot; cosmelon.app</p>
        </div>
      `,
    }),
  })
  return res.ok
}

export function generateCode(): string {
  const buf = new Uint8Array(4)
  crypto.getRandomValues(buf)
  const num = ((buf[0] << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3]) >>> 0
  return String(num % 1000000).padStart(6, '0')
}
