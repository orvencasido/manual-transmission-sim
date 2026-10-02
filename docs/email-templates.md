# Supabase Auth Email Templates (Powered by Resend)
**Manual Driving Trainer — Dark Cockpit Automotive Edition**

These templates are designed specifically for Supabase Auth delivering transactional emails via Resend SMTP. They feature a high-end dark cockpit aesthetic (`#020617` background, `#0f172a` cards, `#06b6d4` cyan & `#10b981` emerald accents, monospace telemetry accents), high email client compatibility (inline CSS, table-based layout), and bulletproof call-to-action buttons.

---

## 1. Confirm Signup (Email Verification)

### Subject Line:
```
Confirm your Manual Driving Trainer account
```
*(Or: `🏁 Complete your pilot registration — Manual Driving Trainer`)*

### HTML Template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Registration</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f1f5f9;">
  <!-- Hidden Preview Text -->
  <div style="display: none; font-size: 1px; color: #020617; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Verify your email address to sync driving lessons, smoothness scores, and powertrain telemetry.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020617; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #0b1120; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Accent Trim -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #06b6d4 0%, #10b981 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Header / Brand -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="background-color: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 12px; width: 44px; height: 44px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 22px; line-height: 44px;">⛭</span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #06b6d4; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-bottom: 6px;">
                Manual Driving Trainer
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
                Confirm Driver Registration
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 36px 28px 36px; text-align: left; font-size: 14px; line-height: 22px; color: #94a3b8;">
              <p style="margin: 0 0 16px 0;">
                Welcome to the cockpit! You're one step away from unlocking real-time cloud synchronization for your manual driving masterclasses, clutch friction bite-point telemetry, and track sessions.
              </p>

              <!-- Telemetry Highlight Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; margin: 20px 0; padding: 14px 16px;">
                <tr>
                  <td style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #cbd5e1; line-height: 20px;">
                    <span style="color: #10b981; font-weight: bold;">✔</span> Guest Progress Auto-Merge: <span style="color: #38bdf8;">ACTIVE</span><br>
                    <span style="color: #10b981; font-weight: bold;">✔</span> Powertrain Telemetry Tracking: <span style="color: #38bdf8;">READY</span><br>
                    <span style="color: #10b981; font-weight: bold;">✔</span> Multi-Device Profile Cloud Sync: <span style="color: #38bdf8;">STANDBY</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0;">
                Please click the button below to verify your email address and authorize your pilot account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #10b981 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 8px 20px rgba(6, 182, 212, 0.35); text-align: center; letter-spacing: 0.3px;">
                      Confirm Driver Registration →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Note -->
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 18px; text-align: center;">
                This confirmation link will expire in 24 hours. If you did not create this account, you can safely ignore this message.
              </p>
            </td>
          </tr>

          <!-- Plaintext Link Fallback -->
          <tr>
            <td style="padding: 20px 36px; background-color: #030712; border-top: 1px solid #1e293b; font-size: 11px; line-height: 18px; color: #64748b;">
              <div style="font-weight: 600; color: #94a3b8; margin-bottom: 4px;">Having trouble with the button?</div>
              Paste this URL directly into your web browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color: #38bdf8; word-break: break-all; text-decoration: underline;">
                {{ .ConfirmationURL }}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; text-align: center; font-size: 11px; color: #475569; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
              Manual Driving Trainer &bull; High-Fidelity Powertrain Simulation<br>
              Delivered securely via Resend SMTP
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Password Reset (Reset Password / Magic Link)

### Subject Line:
```
Reset your Manual Driving Trainer password
```
*(Or: `🔑 Password recovery request — Manual Driving Trainer`)*

### HTML Template:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #f1f5f9;">
  <!-- Hidden Preview Text -->
  <div style="display: none; font-size: 1px; color: #020617; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Reset your Manual Driving Trainer password and regain cockpit access.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020617; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #0b1120; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Top Accent Trim -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #f59e0b 0%, #06b6d4 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Header / Brand -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px auto;">
                <tr>
                  <td style="background-color: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; width: 44px; height: 44px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 22px; line-height: 44px;">🔑</span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #f59e0b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin-bottom: 6px;">
                Manual Driving Trainer
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px;">
                Password Reset Request
              </h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 36px 28px 36px; text-align: left; font-size: 14px; line-height: 22px; color: #94a3b8;">
              <p style="margin: 0 0 16px 0;">
                We received a request to reset the password for your Manual Driving Trainer account.
              </p>

              <p style="margin: 0 0 24px 0;">
                To choose a new password and restore cockpit access, click the button below:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #06b6d4 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3); text-align: center; letter-spacing: 0.3px;">
                      Reset Account Password →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #030712; border: 1px solid #1e293b; border-radius: 12px; margin: 20px 0; padding: 14px 16px;">
                <tr>
                  <td style="font-size: 12px; color: #cbd5e1; line-height: 18px;">
                    <span style="color: #f59e0b; font-weight: bold;">Security Notice:</span> If you did not make this request, your account is still secure. No changes have been made.
                  </td>
                </tr>
              </table>

              <!-- Expiration Note -->
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 18px; text-align: center;">
                This recovery link is single-use and expires in 60 minutes.
              </p>
            </td>
          </tr>

          <!-- Plaintext Link Fallback -->
          <tr>
            <td style="padding: 20px 36px; background-color: #030712; border-top: 1px solid #1e293b; font-size: 11px; line-height: 18px; color: #64748b;">
              <div style="font-weight: 600; color: #94a3b8; margin-bottom: 4px;">Having trouble with the button?</div>
              Paste this URL directly into your web browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color: #38bdf8; word-break: break-all; text-decoration: underline;">
                {{ .ConfirmationURL }}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; text-align: center; font-size: 11px; color: #475569; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
              Manual Driving Trainer &bull; High-Fidelity Powertrain Simulation<br>
              Delivered securely via Resend SMTP
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. How to Configure in Supabase Dashboard

1. **Open Supabase Project Dashboard**:
   - Navigate to `https://supabase.com/dashboard/project/<your-project-ref>`.
2. **Go to Authentication Settings**:
   - In the left sidebar, click **Authentication** $\rightarrow$ **Email Templates**.
3. **Update "Confirm signup"**:
   - Click on the **Confirm signup** tab.
   - Set **Subject**: `Confirm your Manual Driving Trainer account` (or your preferred subject).
   - In the **Body** editor, switch to HTML view and paste the complete **Confirm Signup** HTML template above.
   - Click **Save**.
4. **Update "Reset Password"**:
   - Click on the **Reset Password** tab.
   - Set **Subject**: `Reset your Manual Driving Trainer password`.
   - In the **Body** editor, paste the complete **Password Reset** HTML template above.
   - Click **Save**.
5. **Verify Resend SMTP**:
   - In **Authentication** $\rightarrow$ **SMTP Settings**, ensure:
     - **Enable Custom SMTP**: Enabled
     - **Sender Email**: Your verified Resend domain (e.g. `auth@yourdomain.com` or `onboarding@resend.dev`)
     - **Sender Name**: `Manual Driving Trainer`
     - **Host**: `smtp.resend.com`
     - **Port**: `465` (SSL) or `587` (TLS)
     - **User**: `resend`
     - **Pass**: Your Resend API key (`re_...`)
