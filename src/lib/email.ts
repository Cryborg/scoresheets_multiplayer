/**
 * Email service abstraction
 * Supports both Resend (production) and console logging (development)
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface EmailService {
  send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }>;
}

/**
 * Console email service for development
 */
class ConsoleEmailService implements EmailService {
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    console.log('=====================================');
    console.log('📧 EMAIL (Development Mode)');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('From:', options.from || 'noreply@ohsheet.fun');
    console.log('-------------------------------------');
    console.log('Content:', options.html.replace(/<[^>]*>/g, '')); // Strip HTML for console
    console.log('=====================================');
    
    return { success: true, messageId: 'console-' + Date.now() };
  }
}

/**
 * Resend email service for production
 */
class ResendEmailService implements EmailService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || 'Oh Sheet! <noreply@ohsheet.fun>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Resend API error:', error);
        return { success: false };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return { success: false };
    }
  }
}

/**
 * Factory function to create appropriate email service
 */
function createEmailService(): EmailService {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey && process.env.NODE_ENV === 'production') {
    console.log('Using Resend email service');
    return new ResendEmailService(resendApiKey);
  }
  
  console.log('Using console email service (development)');
  return new ConsoleEmailService();
}

// Singleton instance
let emailService: EmailService | null = null;

/**
 * Get email service instance
 */
export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = createEmailService();
  }
  return emailService;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetUrl: string
): Promise<boolean> {
  const emailService = getEmailService();
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Réinitialisation de votre mot de passe</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 5px; color: #991b1b; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 Oh Sheet!</h1>
            <p>Score like a pro</p>
          </div>
          <div class="content">
            <h2>Bonjour ${username},</h2>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Oh Sheet! - Tous droits réservés</p>
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  const result = await emailService.send({
    to: email,
    subject: '🔐 Réinitialisation de votre mot de passe - Oh Sheet!',
    html,
    from: 'Oh Sheet! <noreply@ohsheet.fun>',
  });
  
  return result.success;
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  email: string,
  username: string
): Promise<boolean> {
  const emailService = getEmailService();
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Bienvenue sur Oh Sheet!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { display: flex; align-items: center; margin: 15px 0; }
          .feature-icon { font-size: 24px; margin-right: 15px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue sur Oh Sheet!</h1>
            <p>Score like a pro</p>
          </div>
          <div class="content">
            <h2>Bonjour ${username} ! 👋</h2>
            <p>Nous sommes ravis de vous accueillir dans la communauté Oh Sheet! Votre compte a été créé avec succès.</p>
            
            <h3>🎮 Découvrez nos fonctionnalités :</h3>
            <div class="feature">
              <span class="feature-icon">🃏</span>
              <div>
                <strong>Jeux classiques</strong><br>
                Tarot, Belote, Yams, Mille Bornes et plus encore !
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">👥</span>
              <div>
                <strong>Multijoueur en temps réel</strong><br>
                Jouez avec vos amis, où qu'ils soient
              </div>
            </div>
            <div class="feature">
              <span class="feature-icon">✨</span>
              <div>
                <strong>Jeux personnalisés</strong><br>
                Créez vos propres règles et scoresheets
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://ohsheet.fun'}" class="button">Commencer à jouer</a>
            </div>
            
            <p>Des questions ? N'hésitez pas à nous contacter !</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Oh Sheet! - Tous droits réservés</p>
            <p>Bon jeu ! 🎲</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  const result = await emailService.send({
    to: email,
    subject: '🎉 Bienvenue sur Oh Sheet!',
    html,
    from: 'Oh Sheet! <welcome@ohsheet.fun>',
  });
  
  return result.success;
}