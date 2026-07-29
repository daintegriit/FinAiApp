from __future__ import annotations
import resend
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


# =====================================================
# SHARED EMAIL SHELL
# =====================================================

def _email_shell(content: str, preview_text: str = "") -> str:
    """
    Wraps email content in a consistent, email-client-safe shell.
    Uses table-based layout for maximum compatibility (Outlook, Gmail, etc).
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FinBudgetAI</title>
    </head>
    <body style="margin:0; padding:0; background-color:#0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
        <span style="display:none; font-size:1px; color:#0A0A0A; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
            {preview_text}
        </span>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A; padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#111111; border-radius:20px; border:1px solid #222222; overflow:hidden;">

                        <!-- LOGO HEADER -->
                        <tr>
                            <td style="padding: 36px 40px 24px 40px; border-bottom:1px solid #1F1F1F;">
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="width:40px; height:40px; background-color:#FFFFFF; border-radius:12px; text-align:center; vertical-align:middle;">
                                            <span style="font-size:18px; font-weight:700; color:#0A0A0A; line-height:40px;">F</span>
                                        </td>
                                        <td style="padding-left:12px; vertical-align:middle;">
                                            <span style="font-size:17px; font-weight:600; color:#FFFFFF; letter-spacing:-0.3px;">FinBudgetAI</span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- CONTENT -->
                        <tr>
                            <td style="padding: 36px 40px;">
                                {content}
                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td style="padding: 24px 40px 36px 40px; border-top:1px solid #1F1F1F;">
                                <p style="margin:0; font-size:12px; color:#555555; line-height:18px;">
                                    FinBudgetAI · AI-powered financial insights<br>
                                    This is an automated message — please don't reply directly to this email.
                                </p>
                                <p style="margin:12px 0 0 0; font-size:12px; color:#444444;">
                                    Questions? Contact us at
                                    <a href="mailto:support@finbudgetai.com" style="color:#777777; text-decoration:underline;">support@finbudgetai.com</a>
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


# =====================================================
# WELCOME EMAIL (EMAIL SIGNUP)
# =====================================================

def send_welcome_email(to_email: str, username: str) -> None:
    content = f"""
        <h1 style="margin:0 0 8px 0; font-size:26px; font-weight:600; color:#FFFFFF; letter-spacing:-0.5px;">
            Welcome, {username} 👋
        </h1>
        <p style="margin:0 0 28px 0; font-size:15px; color:#999999; line-height:24px;">
            Your account is ready. Let's get your finances working smarter, not harder.
        </p>

        <p style="margin:0 0 24px 0; font-size:15px; color:#CCCCCC; line-height:24px;">
            FinBudgetAI uses AI to analyze your spending, surface real risks and opportunities,
            and give you a clear picture of where you stand financially — all in real time.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#161616; border:1px solid #232323; border-radius:14px; margin:28px 0;">
            <tr>
                <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px 0; font-size:13px; font-weight:600; color:#888888; text-transform:uppercase; letter-spacing:0.5px;">
                        Get started in 3 steps
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:6px 0; font-size:14px; color:#DDDDDD;">1 &nbsp; Set your monthly income & budget</td></tr>
                        <tr><td style="padding:6px 0; font-size:14px; color:#DDDDDD;">2 &nbsp; Log your first transaction</td></tr>
                        <tr><td style="padding:6px 0; font-size:14px; color:#DDDDDD;">3 &nbsp; Run your AI financial score</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <p style="margin:24px 0 0 0; font-size:14px; color:#777777; line-height:22px;">
            We're glad you're here.
        </p>
    """
    try:
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": to_email,
            "subject": "Welcome to FinBudgetAI 🎉",
            "html": _email_shell(content, preview_text=f"Welcome to FinBudgetAI, {username}"),
        })
    except Exception as e:
        print(f"❌ Email send failed: {e}")


# =====================================================
# WELCOME EMAIL (GOOGLE SIGNUP)
# =====================================================

def send_google_welcome_email(to_email: str, username: str) -> None:
    content = f"""
        <h1 style="margin:0 0 8px 0; font-size:26px; font-weight:600; color:#FFFFFF; letter-spacing:-0.5px;">
            Welcome, {username} 👋
        </h1>
        <p style="margin:0 0 28px 0; font-size:15px; color:#999999; line-height:24px;">
            You signed in with Google — your account is ready to go.
        </p>

        <p style="margin:0 0 24px 0; font-size:15px; color:#CCCCCC; line-height:24px;">
            FinBudgetAI uses AI to analyze your spending, surface real risks and opportunities,
            and give you a clear picture of where you stand financially — all in real time.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#161616; border:1px solid #232323; border-radius:14px; margin:28px 0;">
            <tr>
                <td style="padding:22px 24px;">
                    <p style="margin:0 0 14px 0; font-size:13px; font-weight:600; color:#888888; text-transform:uppercase; letter-spacing:0.5px;">
                        Get started in 3 steps
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:6px 0; font-size:14px; color:#DDDDDD;">1 &nbsp; Set your monthly income & budget</td></tr>
                        <tr><td style="padding:6px 0; font-size:14px; color:#DDDDDD;">2 &nbsp; Log your first transaction</td></tr>
                        <tr><td style="padding:6px 0; font-size:14px; color:#DDDDDD;">3 &nbsp; Run your AI financial score</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <p style="margin:24px 0 0 0; font-size:14px; color:#777777; line-height:22px;">
            We're glad you're here.
        </p>
    """
    try:
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": to_email,
            "subject": "Welcome to FinBudgetAI 🎉",
            "html": _email_shell(content, preview_text=f"Welcome to FinBudgetAI, {username}"),
        })
    except Exception as e:
        print(f"❌ Email send failed: {e}")


# =====================================================
# PASSWORD RESET EMAIL
# =====================================================

def send_password_reset_email(to_email: str, username: str, token: str) -> None:
    reset_link = f"finbudgetai://reset-password?token={token}"

    content = f"""
        <h1 style="margin:0 0 8px 0; font-size:26px; font-weight:600; color:#FFFFFF; letter-spacing:-0.5px;">
            Reset your password
        </h1>
        <p style="margin:0 0 28px 0; font-size:15px; color:#999999; line-height:24px;">
            Hey {username}, we received a request to reset your password.
        </p>

        <p style="margin:0 0 28px 0; font-size:15px; color:#CCCCCC; line-height:24px;">
            Tap the button below to choose a new password. This link expires in 1 hour for your security.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center" style="padding: 8px 0 28px 0;">
                    <a href="{reset_link}"
                       style="display:inline-block; background-color:#FFFFFF; color:#0A0A0A; font-size:15px; font-weight:600;
                              padding:15px 36px; border-radius:12px; text-decoration:none;">
                        Reset Password
                    </a>
                </td>
            </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#161616; border:1px solid #232323; border-radius:12px;">
            <tr>
                <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px 0; font-size:12px; color:#888888;">
                        Or copy this link into your browser:
                    </p>
                    <p style="margin:0; font-size:12px; color:#666666; word-break:break-all;">
                        {reset_link}
                    </p>
                </td>
            </tr>
        </table>

        <p style="margin:28px 0 0 0; font-size:13px; color:#666666; line-height:21px;">
            If you didn't request this, you can safely ignore this email — your password will not be changed.
        </p>
    """
    try:
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": to_email,
            "subject": "Reset your FinBudgetAI password",
            "html": _email_shell(content, preview_text="Reset your FinBudgetAI password"),
        })
    except Exception as e:
        print(f"❌ Password reset email failed: {e}")