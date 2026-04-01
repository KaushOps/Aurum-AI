import smtplib
from email.message import EmailMessage
import os

def send_alert_email(asset, current_price, predicted_price, percent_change, recommendation, news_context=None):
    """
    Sends an automated HTML email alert when the AI triggers a STRONG BUY.
    """
    
    # Ideally credentials be loaded from .env
    # For now utilizing placeholder or environment logic:
    sender_email = os.environ.get("SENDER_EMAIL", "alerts@aurum-ai.com")
    # For local testing, we print instead of crashing if SMTP is not configured
    smtp_server = os.environ.get("SMTP_SERVER")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_pass = os.environ.get("SMTP_PASS")
    
    target_email = "k.s.poojari10@hotmail.com"
    
    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #d4af37;">Aurum AI - Critical Asset Alert</h2>
        <p>The Aurum XGBoost AI has detected a highly favorable geopolitical and technical setup for <b>{asset}</b>.</p>
        
        <h3>Signal: <span style="color: #2e7d32;">{recommendation}</span></h3>
        
        <table style="border-collapse: collapse; width: 100%; max-width: 400px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #ddd;">
             <td style="padding: 8px;"><b>Current Price (24K INR)</b></td>
             <td style="padding: 8px;">₹{float(current_price):,.2f} / 10g</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
             <td style="padding: 8px;"><b>Predicted Price (T+7)</b></td>
             <td style="padding: 8px;">₹{float(predicted_price):,.2f} / 10g</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
             <td style="padding: 8px;"><b>Expected Weekly Move</b></td>
             <td style="padding: 8px; color: #2e7d32; font-weight: bold;">+{float(percent_change):.2f}%</td>
          </tr>
        </table>
        
        <h3>FinBERT Geopolitical Context (Last 7 Days)</h3>
        <p style="background: #f9f9f9; padding: 15px; border-left: 4px solid #d4af37;">
            {news_context if news_context else "The AI aggregated recent inflation and geopolitical news pointing towards a bullish macro structure."}
        </p>
        
        <p style="font-size: 0.8rem; color: #999;">Automated by OmniQuant Aurum Architecture</p>
      </body>
    </html>
    """

    if not smtp_server or not smtp_pass:
        print(f"⚠️ [SMTP Unconfigured] Would have emailed {target_email}: {recommendation} on {asset} (+{percent_change:.2f}%)")
        return

    msg = EmailMessage()
    msg['Subject'] = f"🚨 Aurum AI: {recommendation} Alert for {asset}"
    msg['From'] = sender_email
    msg['To'] = target_email
    msg.set_content("Please enable HTML viewing to see this alert.")
    msg.add_alternative(body, subtype='html')

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, smtp_pass)
            server.send_message(msg)
        print(f"✅ Successfully emailed {target_email} regarding {asset}")
    except Exception as e:
        print(f"❌ Failed to send SMTP email: {e}")
