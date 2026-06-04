import smtplib
from email.message import EmailMessage

from ..core.config import settings
from datetime import datetime


def get_verification_email_html(full_name: str, code: str) -> str:
    name = full_name if full_name else "Traveler"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f4f7f6;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }}
            .header {{
                background-color: #00aa6c; /* TripAdvisor Green */
                padding: 30px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 28px;
                letter-spacing: 1px;
            }}
            .content {{
                padding: 40px 30px;
                color: #333333;
                line-height: 1.6;
            }}
            .content h2 {{
                color: #00aa6c;
                margin-top: 0;
            }}
            .otp-box {{
                background-color: #f0fdf4;
                border: 2px dashed #00aa6c;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }}
            .otp-code {{
                font-size: 36px;
                font-weight: bold;
                color: #00aa6c;
                letter-spacing: 4px;
                margin: 0;
            }}
            .expiry {{
                color: #666666;
                font-size: 14px;
                text-align: center;
                margin-top: 10px;
            }}
            .footer {{
                background-color: #f4f7f6;
                padding: 20px;
                text-align: center;
                color: #888888;
                font-size: 12px;
                border-top: 1px solid #eeeeee;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>TripAdvisor</h1>
            </div>
            <div class="content">
                <h2>Email Verification</h2>
                <p>Hi {name},</p>
                <p>Thank you for signing up! Please verify your email address by entering the code below:</p>
                <div class="otp-box">
                    <p class="otp-code">{code}</p>
                </div>
                <p class="expiry">This code will expire in 10 minutes.</p>
                <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} TripAdvisor. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_password_reset_email_html(full_name: str, code: str) -> str:
    name = full_name if full_name else "Traveler"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #f4f7f6;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }}
            .header {{
                background-color: #00aa6c; /* TripAdvisor Green */
                padding: 30px;
                text-align: center;
            }}
            .header h1 {{
                color: #ffffff;
                margin: 0;
                font-size: 28px;
                letter-spacing: 1px;
            }}
            .content {{
                padding: 40px 30px;
                color: #333333;
                line-height: 1.6;
            }}
            .content h2 {{
                color: #00aa6c;
                margin-top: 0;
            }}
            .otp-box {{
                background-color: #f0fdf4;
                border: 2px dashed #00aa6c;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }}
            .otp-code {{
                font-size: 36px;
                font-weight: bold;
                color: #00aa6c;
                letter-spacing: 4px;
                margin: 0;
            }}
            .expiry {{
                color: #666666;
                font-size: 14px;
                text-align: center;
                margin-top: 10px;
            }}
            .footer {{
                background-color: #f4f7f6;
                padding: 20px;
                text-align: center;
                color: #888888;
                font-size: 12px;
                border-top: 1px solid #eeeeee;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>TripAdvisor</h1>
            </div>
            <div class="content">
                <h2>Password Reset</h2>
                <p>Hi {name},</p>
                <p>Use the verification code below to reset your password:</p>
                <div class="otp-box">
                    <p class="otp-code">{code}</p>
                </div>
                <p class="expiry">This code will expire in 10 minutes.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} TripAdvisor. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

def send_email(to_email: str, subject: str, body_text: str, body_html: str = None) -> None:
    """
    Simple SMTP sender.
    Configure SMTP_* and EMAIL_FROM in backend/.env or environment variables.
    For development, if SMTP is not configured, the code will be logged to console.
    """

    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD or not settings.EMAIL_FROM:
        # Development fallback: log the email to console instead of sending
        print(f"\n{'='*50}")
        print(f"EMAIL SERVICE NOT CONFIGURED - DEVELOPMENT MODE")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body_text}")
        print(f"{'='*50}\n")
        return

    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype='html')

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")
        print(f"Email content: To: {to_email}, Subject: {subject}, Body: {body_text}")
        raise RuntimeError(f"Failed to send email: {e}")


def notify_admin(subject: str, body_text: str) -> None:
    send_email(settings.NOTIFY_EMAIL, subject, body_text)

