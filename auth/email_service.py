"""
ProofMesh — Email Dispatcher & Password Reset Service

Provides email delivery for authentication events (e.g. password resets).
Supports production SMTP configuration via environment variables with a
transparent development mode when SMTP credentials are not configured.
"""

import os
import smtplib
from email.message import EmailMessage
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Track the last dispatched email in memory for testing/development inspection
_LAST_DISPATCHED_RESET: Optional[Dict[str, Any]] = None


def get_email_config() -> Dict[str, Any]:
    """Resolve SMTP configuration from environment variables."""
    return {
        "smtp_host": os.getenv("SMTP_HOST", "").strip(),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "smtp_user": os.getenv("SMTP_USER", "").strip(),
        "smtp_password": os.getenv("SMTP_PASSWORD", "").strip(),
        "smtp_from": os.getenv("SMTP_FROM", "no-reply@proofmesh.local").strip(),
        "smtp_tls": os.getenv("SMTP_TLS", "true").strip().lower() in ("true", "1", "yes"),
        "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:5173").strip().rstrip("/"),
    }


def send_password_reset_email(
    to_email: str,
    raw_token: str,
    expires_minutes: int = 15
) -> Dict[str, Any]:
    """
    Send password reset instructions with single-use reset token.
    If SMTP credentials are provided, dispatches via TLS SMTP server.
    If SMTP is unconfigured, logs cleanly for local development and testing.
    """
    global _LAST_DISPATCHED_RESET
    config = get_email_config()
    reset_link = f"{config['frontend_url']}/reset-password?token={raw_token}"

    subject = "ProofMesh — Password Reset Request"
    text_content = (
        f"Hello,\n\n"
        f"A password reset was requested for your ProofMesh account ({to_email}).\n\n"
        f"Click the link below to set a new password:\n"
        f"{reset_link}\n\n"
        f"This link will expire in {expires_minutes} minutes and can only be used once.\n\n"
        f"If you did not request this password reset, you can safely ignore this message. "
        f"Your account remains secure.\n\n"
        f"— ProofMesh Security Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }}
            .container {{ max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }}
            .brand {{ font-size: 20px; font-weight: 700; color: #3b82f6; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }}
            .title {{ font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #9ca3af; margin-bottom: 24px; }}
            .btn-container {{ text-align: center; margin: 28px 0; }}
            .btn {{ display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); }}
            .footer {{ border-top: 1px solid #1f2937; padding-top: 20px; font-size: 12px; color: #6b7280; line-height: 1.5; }}
            .code-box {{ background-color: #0d1117; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; color: #60a5fa; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="brand">ProofMesh Security</div>
            <div class="title">Reset Your Password</div>
            <p class="text">
                We received a request to reset the password for your ProofMesh account (<strong>{to_email}</strong>).
                Click the button below to choose a new password:
            </p>
            <div class="btn-container">
                <a href="{reset_link}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p class="text" style="font-size: 12px;">
                Or copy and paste this secure link directly into your browser:
            </p>
            <div class="code-box">{reset_link}</div>
            <div class="footer">
                <p><strong>Note:</strong> This link is valid for {expires_minutes} minutes and can only be used once.</p>
                <p>If you did not request a password reset, no action is needed. Your existing password remains unchanged.</p>
            </div>
        </div>
    </body>
    </html>
    """

    dispatch_info = {
        "recipient": to_email,
        "reset_link": reset_link,
        "token": raw_token,
        "expires_minutes": expires_minutes,
        "delivery_mode": "development_logged",
    }

    # Attempt live SMTP delivery if host is configured
    if config["smtp_host"] and config["smtp_user"]:
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = config["smtp_from"]
            msg["To"] = to_email
            msg.set_content(text_content)
            msg.add_alternative(html_content, subtype="html")

            with smtplib.SMTP(config["smtp_host"], config["smtp_port"], timeout=10) as server:
                if config["smtp_tls"]:
                    server.starttls()
                if config["smtp_password"]:
                    server.login(config["smtp_user"], config["smtp_password"])
                server.send_message(msg)

            dispatch_info["delivery_mode"] = "smtp"
            dispatch_info["success"] = True
            _LAST_DISPATCHED_RESET = dispatch_info
            return dispatch_info
        except Exception as smtp_err:
            print(f"[EMAIL SERVICE WARNING] SMTP delivery failed ({smtp_err}). Falling back to development log.", flush=True)

    # Development or fallback mode
    print(f"[EMAIL SERVICE NOTICE] Password reset link generated for {to_email}: {reset_link}", flush=True)
    dispatch_info["success"] = True
    _LAST_DISPATCHED_RESET = dispatch_info
    return dispatch_info


def get_last_dispatched_reset() -> Optional[Dict[str, Any]]:
    """Retrieve details of the last generated reset email for automated testing."""
    return _LAST_DISPATCHED_RESET

