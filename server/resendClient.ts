// Email service for password resets
import { Resend } from 'resend';
let connectionSettings: any;

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string } | null> {
  // First, check for direct env var (works on any platform: Render, AWS, etc.)
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'MyEasyPass <noreply@myeasypass.net>',
    };
  }

  // Fallback: Replit Connectors
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    // Not on Replit - fall back to direct environment variable
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'MyEasyPass <noreply@myeasypass.net>';
    if (!apiKey) {
      console.log('Not running on Replit and RESEND_API_KEY not set, skipping email service');
      return null;
    }
    console.log('Using RESEND_API_KEY from environment');
    return { apiKey, fromEmail };
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || (!connectionSettings.settings.api_key)) {
      console.error('[Email] Replit Resend connector not configured');
      return null;
    }
    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: connectionSettings.settings.from_email
    };
  } catch (error) {
    console.error('[Email] Failed to fetch Replit connector credentials:', error);
    return null;
  }
}

export async function getResendClient() {
  const credentials = await getCredentials();

  if (!credentials) {
    console.log('[Email] Resend not available — set RESEND_API_KEY env var to enable');
    return null;
  }
  
  const { apiKey, fromEmail } = credentials;
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendPasswordResetEmail(
  toEmail: string, 
  resetToken: string, 
  firstName?: string, 
  isAdminInitiated: boolean = false
): Promise<boolean> {
  try {
    const resendClient = await getResendClient();
    
    if (!resendClient) {
      console.log('[Email] Resend not configured, email not sent');
      return false;
    }
    
    const { client, fromEmail } = resendClient;
    
    const host = process.env.APP_DOMAIN || 'easy-pass-ht1x.onrender.com';
    const protocol = 'https';
    const resetLink = `${protocol}://${host}/reset-password?token=${resetToken}`;
    
    const initiationMessage = isAdminInitiated 
      ? 'An administrator has initiated a password reset for your MyEasyPass account.'
      : 'We received a request to reset the password for your MyEasyPass account.';
    
    const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">MyEasyPass</h1>
    <p style="color: #666; margin: 5px 0 0 0;">Texas Licensing Exam Prep</p>
  </div>
  <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
  <p style="color: #333; line-height: 1.6;">Hi${firstName ? ` ${firstName}` : ''},</p>
  <p style="color: #333; line-height: 1.6;">${initiationMessage}</p>
  <p style="color: #333; line-height: 1.6;">Click the button below to set a new password:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
      Reset Password
    </a>
  </div>
  <p style="color: #666; font-size: 14px; line-height: 1.6;">
    <strong>This link will expire in 1 hour.</strong>
  </p>
  <p style="color: #666; font-size: 14px; line-height: 1.6;">
    If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
  <p style="color: #999; font-size: 12px; text-align: center;">
    MyEasyPass - Texas Licensing Exam Prep<br/>
    <a href="https://myeasypass.net" style="color: #2563eb;">myeasypass.net</a>
  </p>
</div>
    `;
    
    await client.emails.send({
      from: fromEmail || 'MyEasyPass <noreply@myeasypass.net>',
      to: toEmail,
      subject: 'Reset Your Password - MyEasyPass',
      html: emailHtml
    });
    
    console.log('[Email] Password reset sent to:', toEmail);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send password reset:', error);
    return false;
  }
}
