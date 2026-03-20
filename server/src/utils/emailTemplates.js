/**
 * Returns a fully styled HTML email string for team invitations.
 */
export function inviteEmailTemplate({ inviteeName, inviterName, orgName, role, email, tempPassword, loginUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Team Invitation</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
          style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:#0A0A0A;padding:32px 40px;">
              <h1 style="color:#FFFFFF;margin:0;font-size:24px;font-weight:700;letter-spacing:0.04em;">
                ${orgName}
              </h1>
              <p style="color:#9CA3AF;margin:4px 0 0;font-size:13px;">Team Workspace</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h2 style="color:#0A0A0A;font-size:22px;font-weight:700;margin:0 0 8px;">
                You've been invited 🎉
              </h2>
              <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
                <strong style="color:#0A0A0A;">${inviterName}</strong> has invited you to join
                <strong style="color:#0A0A0A;">${orgName}</strong> as a
                <strong style="color:#0A0A0A;">${role}</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.1em;">Your Login Credentials</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px;color:#6B7280;width:140px;display:inline-block;">Email</span>
                          <span style="font-size:14px;font-weight:600;color:#0A0A0A;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px;color:#6B7280;width:140px;display:inline-block;">Temporary Password</span>
                          <span style="font-size:14px;font-weight:700;color:#0A0A0A;font-family:monospace;background:#EEF2FF;padding:2px 8px;border-radius:4px;">${tempPassword}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:13px;color:#6B7280;width:140px;display:inline-block;">Role</span>
                          <span style="font-size:13px;font-weight:600;color:#FFFFFF;background:#4A3D72;padding:2px 10px;border-radius:20px;">${role}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#0A0A0A;border-radius:8px;">
                    <a href="${loginUrl}"
                      style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
                      Accept Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">
                  <strong>⚠️ Security Notice:</strong> You will be required to change your password after your first login.
                  This invitation link expires in <strong>72 hours</strong>.
                </p>
              </div>

              <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:0;">
                If you did not expect this invitation, you can safely ignore this email.
                If you have questions, contact your team admin.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#F9FAFB;padding:20px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
                This is an automated message from ${orgName}. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
