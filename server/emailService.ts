import Mailgun from 'mailgun.js';
import formData from 'form-data';
import PDFDocument from 'pdfkit';
import type { 
  User, 
  SurveyResults, 
  GiftScore, 
  DISCProfile, 
  BiblicalLiteracyResult, 
  TechnicalSkillsProfile,
  MinistryMatch 
} from '@shared/schema';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';
const CHURCH_EMAILS = ['info@gardencitychurch.net', 'pastor@gardencitychurch.net'];

interface EmailData {
  user: User;
  results: SurveyResults;
}

function formatDate(date: Date | null): string {
  if (!date) return new Date().toLocaleString();
  return new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getParticipantName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.email) return user.email.split('@')[0];
  return 'Participant';
}

async function generatePDF(data: EmailData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { user, results } = data;
    const participantName = getParticipantName(user);
    const completedDate = formatDate(results.completedAt);
    
    const spiritualGifts = (results.spiritualGifts as GiftScore[]) || [];
    const discProfile = results.personalityProfile as DISCProfile | undefined;
    const biblicalLiteracy = results.biblicalLiteracy as BiblicalLiteracyResult | undefined;
    const technicalSkills = results.technicalSkills as TechnicalSkillsProfile | undefined;
    const ministryMatches = (results.ministryMatches as MinistryMatch[]) || [];

    // Header
    doc.fontSize(24).fillColor('#f8a84a').text('Garden City Church', { align: 'center' });
    doc.fontSize(12).fillColor('#666666').text('Live the life. Tell the Story.', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).fillColor('#f2660f').text('Ministry Assessment Results', { align: 'center' });
    doc.moveDown();
    
    // Participant Info
    doc.fontSize(14).fillColor('#000000');
    doc.text(`Participant: ${participantName}`);
    doc.text(`Email: ${user.email || 'Not provided'}`);
    if (user.phone) doc.text(`Phone: ${user.phone}`);
    doc.text(`Completed: ${completedDate}`);
    doc.moveDown();

    // Divider
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#f8a84a');
    doc.moveDown();

    // Spiritual Gifts Section
    doc.fontSize(16).fillColor('#f8a84a').text('Your Spiritual Gifts');
    doc.moveDown(0.5);
    
    const topGifts = spiritualGifts.slice(0, 5);
    topGifts.forEach((gift, index) => {
      doc.fontSize(12).fillColor('#000000');
      const label = index === 0 ? ' (Primary Gift)' : '';
      doc.text(`${index + 1}. ${gift.name || gift.gift}${label} - ${gift.score}%`, { continued: false });
      doc.fontSize(10).fillColor('#666666').text(`   ${gift.description || ''}`);
      doc.text(`   Scripture: ${gift.biblicalReference || ''}`);
      doc.moveDown(0.3);
    });
    doc.moveDown();

    // DISC Profile Section
    if (discProfile) {
      doc.fontSize(16).fillColor('#f8a84a').text('DISC Personality Profile');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000');
      doc.text(`Primary Type: ${discProfile.primaryType || 'N/A'}`);
      if (discProfile.secondaryType) {
        doc.text(`Secondary Type: ${discProfile.secondaryType}`);
      }
      if (discProfile.scores) {
        doc.moveDown(0.3);
        doc.text(`Scores: D-${discProfile.scores.D}% | I-${discProfile.scores.I}% | S-${discProfile.scores.S}% | C-${discProfile.scores.C}%`);
      }
      if (discProfile.description) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#666666').text(discProfile.description);
      }
      if (discProfile.strengths && discProfile.strengths.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#000000').text(`Strengths: ${discProfile.strengths.join(', ')}`);
      }
      doc.moveDown();
    }

    // Biblical Literacy Section
    if (biblicalLiteracy) {
      doc.fontSize(16).fillColor('#f8a84a').text('Biblical Literacy');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000');
      doc.text(`Level: ${biblicalLiteracy.level || 'N/A'}`);
      doc.text(`Score: ${biblicalLiteracy.correctAnswers || 0} / ${biblicalLiteracy.totalQuestions || 0} (${biblicalLiteracy.score || 0}%)`);
      if (biblicalLiteracy.description) {
        doc.fontSize(10).fillColor('#666666').text(biblicalLiteracy.description);
      }
      if (biblicalLiteracy.recommendations && biblicalLiteracy.recommendations.length > 0) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#000000').text('Recommendations:');
        biblicalLiteracy.recommendations.forEach(rec => {
          doc.text(`  • ${rec}`);
        });
      }
      doc.moveDown();
    }

    // Technical Skills Section
    if (technicalSkills) {
      doc.fontSize(16).fillColor('#f8a84a').text('Technical Skills Assessment');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000');
      
      const skills = [
        { name: 'Sound Tech', data: technicalSkills.soundTech },
        { name: 'Media/Livestream', data: technicalSkills.mediaTech },
        { name: 'ProPresenter/Lyrics', data: technicalSkills.proPresenter },
        { name: 'Photography', data: technicalSkills.photography },
      ];

      skills.forEach(skill => {
        if (skill.data) {
          const canServe = skill.data.canServe ? 'Ready to Serve' : (skill.data.needsTraining !== false ? 'Training Available' : 'Developing');
          doc.text(`${skill.name}: ${skill.data.level || 'N/A'} (${canServe})`);
        }
      });
      
      if (technicalSkills.overallReadiness) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#666666').text(technicalSkills.overallReadiness);
      }
      doc.moveDown();
    }

    // Ministry Matches Section
    const primaryMinistries = ministryMatches.filter(m => m?.isPrimary);
    const secondaryMinistries = ministryMatches.filter(m => !m?.isPrimary && (m?.score || 0) > 0.5).slice(0, 6);

    if (primaryMinistries.length > 0) {
      doc.fontSize(16).fillColor('#f8a84a').text('Recommended Ministries');
      doc.moveDown(0.5);
      
      doc.fontSize(12).fillColor('#f2660f').text('Top Matches:');
      primaryMinistries.forEach((match, index) => {
        doc.fontSize(11).fillColor('#000000');
        const bestMatch = index === 0 ? ' ★ Best Match' : '';
        doc.text(`${match.name} (${match.category})${bestMatch}`);
        if (match.whyMatched) {
          doc.fontSize(10).fillColor('#666666').text(`   Why matched: ${match.whyMatched}`);
        }
        if (match.growthPathway) {
          doc.text(`   Growth pathway: ${match.growthPathway}`);
        }
        doc.moveDown(0.3);
      });
    }

    if (secondaryMinistries.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000000').text('You May Also Consider:');
      secondaryMinistries.forEach(match => {
        doc.fontSize(10).fillColor('#666666').text(`  • ${match.name} (${match.category})`);
      });
      doc.moveDown();
    }

    // Footer
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke('#f8a84a');
    doc.moveDown();
    doc.fontSize(10).fillColor('#666666').text('Garden City Church - Ministry Assessment', { align: 'center' });
    doc.text('This report was generated automatically upon completion of the assessment.', { align: 'center' });

    doc.end();
  });
}

function generateEmailHTML(data: EmailData, isForChurch: boolean): string {
  const { user, results } = data;
  const participantName = getParticipantName(user);
  const completedDate = formatDate(results.completedAt);
  
  const spiritualGifts = (results.spiritualGifts as GiftScore[]) || [];
  const discProfile = results.personalityProfile as DISCProfile | undefined;
  const biblicalLiteracy = results.biblicalLiteracy as BiblicalLiteracyResult | undefined;
  const technicalSkills = results.technicalSkills as TechnicalSkillsProfile | undefined;
  const ministryMatches = (results.ministryMatches as MinistryMatch[]) || [];

  const greeting = isForChurch 
    ? 'Dear Garden City Church,' 
    : `Dear ${participantName},`;

  const intro = isForChurch
    ? `<p><strong>${participantName}</strong> has completed the Ministry Assessment. Below are their results.</p>`
    : `<p>Congratulations on completing the Garden City Church Ministry Assessment! We're excited to help you discover how God has uniquely designed you to serve.</p>`;

  const topGifts = spiritualGifts.slice(0, 5);
  const giftsHTML = topGifts.map((gift, index) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${index === 0 ? '<strong style="color: #f2660f;">Primary:</strong> ' : `${index + 1}. `}${gift.name || gift.gift}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${gift.score}%</td>
    </tr>
  `).join('');

  const primaryMinistries = ministryMatches.filter(m => m?.isPrimary);
  const ministriesHTML = primaryMinistries.map((match, index) => `
    <div style="background: ${index === 0 ? '#fff8f0' : '#f9f9f9'}; padding: 12px; margin: 8px 0; border-radius: 8px; ${index === 0 ? 'border: 2px solid #f2660f;' : ''}">
      <strong style="color: #f8a84a;">${match.name}</strong> <span style="color: #666;">(${match.category})</span>
      ${index === 0 ? '<span style="background: #f2660f; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px;">Best Match</span>' : ''}
      ${match.whyMatched ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #555;"><em>Why you're matched:</em> ${match.whyMatched}</p>` : ''}
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #f8a84a;">
    <h1 style="color: #f8a84a; margin: 0;">Garden City Church</h1>
    <p style="color: #666; font-style: italic; margin: 5px 0;">Live the life. Tell the Story.</p>
  </div>

  <!-- Main Content -->
  <div style="padding: 20px 0;">
    <h2 style="color: #f2660f;">Ministry Assessment Results</h2>
    
    <p>${greeting}</p>
    ${intro}

    <!-- Participant Info -->
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${participantName}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${user.email || 'Not provided'}</p>
      ${user.phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${user.phone}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Completed:</strong> ${completedDate}</p>
    </div>

    <!-- Spiritual Gifts -->
    <h3 style="color: #f8a84a; border-bottom: 2px solid #f8a84a; padding-bottom: 8px;">Spiritual Gifts</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      ${giftsHTML}
    </table>

    <!-- DISC Profile -->
    ${discProfile ? `
    <h3 style="color: #f8a84a; border-bottom: 2px solid #f8a84a; padding-bottom: 8px;">DISC Personality Profile</h3>
    <div style="background: #fff8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 5px 0;"><strong>Primary Type:</strong> <span style="font-size: 24px; color: #f2660f;">${discProfile.primaryType || 'N/A'}</span>
        ${discProfile.secondaryType ? `<span style="color: #666;"> / ${discProfile.secondaryType}</span>` : ''}
      </p>
      ${discProfile.scores ? `<p style="margin: 5px 0;">D: ${discProfile.scores.D}% | I: ${discProfile.scores.I}% | S: ${discProfile.scores.S}% | C: ${discProfile.scores.C}%</p>` : ''}
      ${discProfile.description ? `<p style="margin: 10px 0; color: #555;">${discProfile.description}</p>` : ''}
      ${discProfile.strengths && discProfile.strengths.length > 0 ? `<p style="margin: 5px 0;"><strong>Strengths:</strong> ${discProfile.strengths.join(', ')}</p>` : ''}
    </div>
    ` : ''}

    <!-- Biblical Literacy -->
    ${biblicalLiteracy ? `
    <h3 style="color: #f8a84a; border-bottom: 2px solid #f8a84a; padding-bottom: 8px;">Biblical Literacy</h3>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 5px 0;"><strong>Level:</strong> ${biblicalLiteracy.level || 'N/A'}</p>
      <p style="margin: 5px 0;"><strong>Score:</strong> ${biblicalLiteracy.correctAnswers || 0} / ${biblicalLiteracy.totalQuestions || 0} (${biblicalLiteracy.score || 0}%)</p>
      ${biblicalLiteracy.description ? `<p style="margin: 10px 0; color: #555;">${biblicalLiteracy.description}</p>` : ''}
    </div>
    ` : ''}

    <!-- Technical Skills -->
    ${technicalSkills ? `
    <h3 style="color: #f8a84a; border-bottom: 2px solid #f8a84a; padding-bottom: 8px;">Technical Skills</h3>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      ${technicalSkills.soundTech ? `<p style="margin: 5px 0;"><strong>Sound Tech:</strong> ${technicalSkills.soundTech.level || 'N/A'} ${technicalSkills.soundTech.canServe ? '✓ Ready' : ''}</p>` : ''}
      ${technicalSkills.mediaTech ? `<p style="margin: 5px 0;"><strong>Media/Livestream:</strong> ${technicalSkills.mediaTech.level || 'N/A'} ${technicalSkills.mediaTech.canServe ? '✓ Ready' : ''}</p>` : ''}
      ${technicalSkills.proPresenter ? `<p style="margin: 5px 0;"><strong>ProPresenter:</strong> ${technicalSkills.proPresenter.level || 'N/A'} ${technicalSkills.proPresenter.canServe ? '✓ Ready' : ''}</p>` : ''}
      ${technicalSkills.photography ? `<p style="margin: 5px 0;"><strong>Photography:</strong> ${technicalSkills.photography.level || 'N/A'} ${technicalSkills.photography.canServe ? '✓ Ready' : ''}</p>` : ''}
    </div>
    ` : ''}

    <!-- Ministry Matches -->
    <h3 style="color: #f8a84a; border-bottom: 2px solid #f8a84a; padding-bottom: 8px;">Recommended Ministries</h3>
    ${ministriesHTML || '<p>No ministry matches available.</p>'}

    <!-- Next Steps -->
    ${!isForChurch ? `
    <div style="background: #fff8f0; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #f8a84a;">
      <h3 style="color: #f2660f; margin-top: 0;">Your Next Step</h3>
      <p>Thank you for completing the Garden City Church Ministry Assessment! A leader from our team may reach out to help you take your next step in serving. In the meantime, feel free to share your results with a pastor or ministry leader you trust.</p>
    </div>
    ` : ''}
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 20px 0; border-top: 3px solid #f8a84a; color: #666;">
    <p style="margin: 5px 0;"><strong>Garden City Church</strong></p>
    <p style="margin: 5px 0; font-style: italic;">Live the life. Tell the Story.</p>
    <p style="margin: 10px 0; font-size: 12px;">This email was sent automatically upon completion of the Ministry Assessment.</p>
  </div>

</body>
</html>
  `;
}

export interface EmailResult {
  success: boolean;
  errors: string[];
  participantEmailSent: boolean;
  churchEmailsSent: boolean;
  allEmailsSent: boolean;
}

export async function sendAssessmentEmails(data: EmailData): Promise<EmailResult> {
  const errors: string[] = [];
  const participantName = getParticipantName(data.user);
  let participantEmailSent = false;
  let churchEmailsSentCount = 0;
  
  if (!MAILGUN_DOMAIN || !process.env.MAILGUN_API_KEY) {
    console.error('Mailgun configuration missing');
    return { 
      success: false, 
      errors: ['Email service not configured'],
      participantEmailSent: false,
      churchEmailsSent: false,
      allEmailsSent: false
    };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePDF(data);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { 
      success: false, 
      errors: ['Failed to generate PDF'],
      participantEmailSent: false,
      churchEmailsSent: false,
      allEmailsSent: false
    };
  }

  const attachment = {
    filename: `${participantName.replace(/\s+/g, '_')}_Ministry_Assessment.pdf`,
    data: pdfBuffer,
  };

  // Send email to participant
  if (data.user.email) {
    try {
      await mg.messages.create(MAILGUN_DOMAIN, {
        from: `Garden City Church <noreply@${MAILGUN_DOMAIN}>`,
        to: [data.user.email],
        subject: `Your Ministry Assessment Results - Garden City Church`,
        html: generateEmailHTML(data, false),
        attachment: [attachment],
      });
      console.log(`Email sent to participant: ${data.user.email}`);
      participantEmailSent = true;
    } catch (error: any) {
      console.error(`Error sending email to participant:`, error);
      errors.push(`Failed to send email to participant: ${error.message || error}`);
    }
  } else {
    errors.push('Participant email not available');
  }

  // Send emails to church
  for (const churchEmail of CHURCH_EMAILS) {
    try {
      await mg.messages.create(MAILGUN_DOMAIN, {
        from: `Garden City Church <noreply@${MAILGUN_DOMAIN}>`,
        to: [churchEmail],
        subject: `New Ministry Assessment Completed - ${participantName}`,
        html: generateEmailHTML(data, true),
        attachment: [attachment],
      });
      console.log(`Email sent to church: ${churchEmail}`);
      churchEmailsSentCount++;
    } catch (error: any) {
      console.error(`Error sending email to ${churchEmail}:`, error);
      errors.push(`Failed to send email to ${churchEmail}: ${error.message || error}`);
    }
  }

  const churchEmailsSent = churchEmailsSentCount === CHURCH_EMAILS.length;
  const allEmailsSent = participantEmailSent && churchEmailsSent;

  return { 
    success: errors.length === 0,
    errors,
    participantEmailSent,
    churchEmailsSent,
    allEmailsSent
  };
}

export interface RetroactiveEmailResult {
  sent: number;
  failed: number;
  errors: string[];
  results: Array<{
    resultId: string;
    userEmail: string | null;
    allEmailsSent: boolean;
    errors: string[];
  }>;
}

export async function sendRetroactiveEmails(
  usersWithResults: Array<{ user: User; results: SurveyResults }>
): Promise<RetroactiveEmailResult> {
  let sent = 0;
  let failed = 0;
  const allErrors: string[] = [];
  const results: RetroactiveEmailResult['results'] = [];

  for (const data of usersWithResults) {
    // Skip if email already sent
    if (data.results.emailSent) {
      console.log(`Skipping ${data.user.email} - email already sent`);
      continue;
    }

    const result = await sendAssessmentEmails(data);
    
    results.push({
      resultId: data.results.id,
      userEmail: data.user.email,
      allEmailsSent: result.allEmailsSent,
      errors: result.errors,
    });
    
    if (result.allEmailsSent) {
      sent++;
    } else {
      failed++;
      allErrors.push(...result.errors);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { sent, failed, errors: allErrors, results };
}

// =============================================================================
// TEAM INVITE EMAILS
// =============================================================================

interface InviteEmailData {
  invite: {
    firstName: string;
    lastName: string;
    email: string;
    token: string;
    message?: string | null;
  };
  inviter: User | null;
  ministry: { name: string } | null;
}

export async function sendInviteEmail(data: InviteEmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.MAILGUN_API_KEY) {
    console.log("MAILGUN_API_KEY not configured - skipping invite email");
    return { success: false, error: "Email service not configured" };
  }

  const { invite, inviter, ministry } = data;
  const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'A church leader' : 'A church leader';
  
  // Build the invite URL - use production domain if deployed, otherwise dev domain
  const getBaseUrl = () => {
    // In production, REPLIT_DOMAINS contains comma-separated list of domains
    if (process.env.REPLIT_DEPLOYMENT === '1' && process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      // Prefer the .replit.app domain
      const replitDomain = domains.find(d => d.includes('.replit.app')) || domains[0];
      return `https://${replitDomain}`;
    }
    // In development, use REPLIT_DEV_DOMAIN
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    }
    return 'https://ministrypath.replit.app';
  };
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;
  
  const ministryText = ministry ? ` to join the ${ministry.name} team` : ' to join our church community';
  const personalMessage = invite.message ? `<p style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #f8a84a; font-style: italic;">"${invite.message}"</p>` : '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f8a84a; margin-bottom: 5px;">Garden City Church</h1>
    <p style="color: #666; font-style: italic;">Live the life. Tell the Story.</p>
  </div>
  
  <h2 style="color: #f2660f;">You're Invited!</h2>
  
  <p>Dear ${invite.firstName},</p>
  
  <p>${inviterName} has invited you${ministryText} at Garden City Church.</p>
  
  ${personalMessage}
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="${inviteUrl}" style="display: inline-block; background-color: #f8a84a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
  </div>
  
  <p>By accepting this invitation, you'll be able to:</p>
  <ul style="color: #555;">
    <li>Complete your spiritual gifts assessment</li>
    <li>Connect with your ministry team</li>
    <li>Access training materials and resources</li>
    <li>Track your discipleship journey</li>
  </ul>
  
  <p style="color: #888; font-size: 14px;">This invitation will expire in 14 days. If you have any questions, please contact the church office.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #888; font-size: 12px; text-align: center;">
    Garden City Church<br>
    Assemblies of God, Beverly, MA<br>
    <a href="${baseUrl}" style="color: #f8a84a;">Visit our portal</a>
  </p>
</body>
</html>
  `;

  const textContent = `
You're Invited to Garden City Church!

Dear ${invite.firstName},

${inviterName} has invited you${ministryText} at Garden City Church.

${invite.message ? `Personal message: "${invite.message}"` : ''}

Accept your invitation by visiting: ${inviteUrl}

By accepting, you'll be able to:
- Complete your spiritual gifts assessment
- Connect with your ministry team
- Access training materials and resources
- Track your discipleship journey

This invitation expires in 14 days.

---
Garden City Church
Assemblies of God, Beverly, MA
  `;

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: 'Garden City Church <noreply@mg.gardencitychurch.net>',
      to: [invite.email],
      subject: `${inviterName} has invited you to Garden City Church`,
      text: textContent,
      html: htmlContent,
    });
    
    console.log(`Invite email sent successfully to ${invite.email}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending invite email:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// MEETING EMAIL FUNCTIONS
// ============================================================================

export interface MeetingEmailData {
  meetingTitle: string;
  meetingDate: string;
  location?: string;
  ministryName?: string;
  organizer?: { firstName: string | null; lastName: string | null };
  agenda?: string[];
  notes?: string;
  decisions?: string[];
  actionItems?: Array<{
    description: string;
    assignee?: string;
    dueDate?: string;
  }>;
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

/**
 * Generate meeting agenda email content (both HTML and plain text)
 * Can be used for sending or for generating copy-able content
 */
export function generateMeetingAgendaContent(data: MeetingEmailData): { html: string; text: string; subject: string } {
  const organizerName = data.organizer 
    ? `${data.organizer.firstName || ''} ${data.organizer.lastName || ''}`.trim() || 'Meeting Organizer'
    : 'Meeting Organizer';
  
  const subject = `Meeting Agenda: ${data.meetingTitle} - ${data.meetingDate}`;
  
  const agendaItems = data.agenda?.length 
    ? data.agenda.map((item, i) => `<li>${item}</li>`).join('')
    : '<li>No agenda items set</li>';
  
  const agendaTextItems = data.agenda?.length
    ? data.agenda.map((item, i) => `${i + 1}. ${item}`).join('\n')
    : '- No agenda items set';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f8a84a; margin-bottom: 5px;">Garden City Church</h1>
    <p style="color: #666; font-style: italic;">Live the life. Tell the Story.</p>
  </div>
  
  <h2 style="color: #f2660f;">Meeting Agenda</h2>
  
  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 5px 0;"><strong>Meeting:</strong> ${data.meetingTitle}</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> ${data.meetingDate}</p>
    ${data.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${data.location}</p>` : ''}
    ${data.ministryName ? `<p style="margin: 5px 0;"><strong>Ministry:</strong> ${data.ministryName}</p>` : ''}
    <p style="margin: 5px 0;"><strong>Organizer:</strong> ${organizerName}</p>
  </div>
  
  <h3 style="color: #333; border-bottom: 2px solid #f8a84a; padding-bottom: 5px;">Agenda</h3>
  <ol style="color: #555;">
    ${agendaItems}
  </ol>
  
  <p style="margin-top: 30px; color: #666;">Please come prepared to discuss these items. If you have any additional topics, please let ${organizerName} know beforehand.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #888; font-size: 12px; text-align: center;">
    Garden City Church<br>
    Assemblies of God, Beverly, MA
  </p>
</body>
</html>
  `;

  const textContent = `
MEETING AGENDA
==============

Meeting: ${data.meetingTitle}
Date: ${data.meetingDate}
${data.location ? `Location: ${data.location}` : ''}
${data.ministryName ? `Ministry: ${data.ministryName}` : ''}
Organizer: ${organizerName}

AGENDA:
${agendaTextItems}

Please come prepared to discuss these items. If you have any additional topics, please let ${organizerName} know beforehand.

---
Garden City Church
Assemblies of God, Beverly, MA
  `;

  return { html: htmlContent, text: textContent, subject };
}

/**
 * Generate meeting recap email content (both HTML and plain text)
 * Can be used for sending or for generating copy-able content
 */
export function generateMeetingRecapContent(data: MeetingEmailData): { html: string; text: string; subject: string } {
  const organizerName = data.organizer 
    ? `${data.organizer.firstName || ''} ${data.organizer.lastName || ''}`.trim() || 'Meeting Organizer'
    : 'Meeting Organizer';
  
  const subject = `Meeting Recap: ${data.meetingTitle} - ${data.meetingDate}`;
  
  const decisionsHtml = data.decisions?.length
    ? data.decisions.map(d => `<li>${d}</li>`).join('')
    : '<li>No decisions recorded</li>';
  
  const decisionsText = data.decisions?.length
    ? data.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n')
    : '- No decisions recorded';

  const actionItemsHtml = data.actionItems?.length
    ? data.actionItems.map(item => 
        `<li><strong>${item.description}</strong>${item.assignee ? ` (Assigned to: ${item.assignee})` : ''}${item.dueDate ? ` - Due: ${item.dueDate}` : ''}</li>`
      ).join('')
    : '<li>No action items assigned</li>';
  
  const actionItemsText = data.actionItems?.length
    ? data.actionItems.map((item, i) => 
        `${i + 1}. ${item.description}${item.assignee ? ` (Assigned to: ${item.assignee})` : ''}${item.dueDate ? ` - Due: ${item.dueDate}` : ''}`
      ).join('\n')
    : '- No action items assigned';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f8a84a; margin-bottom: 5px;">Garden City Church</h1>
    <p style="color: #666; font-style: italic;">Live the life. Tell the Story.</p>
  </div>
  
  <h2 style="color: #f2660f;">Meeting Recap</h2>
  
  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 5px 0;"><strong>Meeting:</strong> ${data.meetingTitle}</p>
    <p style="margin: 5px 0;"><strong>Date:</strong> ${data.meetingDate}</p>
    ${data.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${data.location}</p>` : ''}
    ${data.ministryName ? `<p style="margin: 5px 0;"><strong>Ministry:</strong> ${data.ministryName}</p>` : ''}
  </div>
  
  ${data.notes ? `
  <h3 style="color: #333; border-bottom: 2px solid #f8a84a; padding-bottom: 5px;">Meeting Notes</h3>
  <p style="color: #555; white-space: pre-wrap;">${data.notes}</p>
  ` : ''}
  
  <h3 style="color: #333; border-bottom: 2px solid #f8a84a; padding-bottom: 5px;">Key Decisions</h3>
  <ul style="color: #555;">
    ${decisionsHtml}
  </ul>
  
  <h3 style="color: #333; border-bottom: 2px solid #f8a84a; padding-bottom: 5px;">Action Items</h3>
  <ul style="color: #555;">
    ${actionItemsHtml}
  </ul>
  
  <p style="margin-top: 30px; color: #666;">Thank you for participating. Please complete your assigned action items by their due dates.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #888; font-size: 12px; text-align: center;">
    Garden City Church<br>
    Assemblies of God, Beverly, MA
  </p>
</body>
</html>
  `;

  const textContent = `
MEETING RECAP
=============

Meeting: ${data.meetingTitle}
Date: ${data.meetingDate}
${data.location ? `Location: ${data.location}` : ''}
${data.ministryName ? `Ministry: ${data.ministryName}` : ''}

${data.notes ? `MEETING NOTES:\n${data.notes}\n` : ''}

KEY DECISIONS:
${decisionsText}

ACTION ITEMS:
${actionItemsText}

Thank you for participating. Please complete your assigned action items by their due dates.

---
Garden City Church
Assemblies of God, Beverly, MA
  `;

  return { html: htmlContent, text: textContent, subject };
}

/**
 * Send meeting agenda email to attendees
 */
export async function sendMeetingAgendaEmail(
  data: MeetingEmailData,
  recipients: string[]
): Promise<{ success: boolean; error?: string; fallbackContent?: { text: string; subject: string } }> {
  const { html, text, subject } = generateMeetingAgendaContent(data);
  
  // Check if Mailgun is configured
  if (!process.env.MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.log("MAILGUN not configured - returning fallback content");
    return { 
      success: false, 
      error: "Email service not configured",
      fallbackContent: { text, subject }
    };
  }

  if (recipients.length === 0) {
    return { success: false, error: "No recipients provided" };
  }

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: 'Garden City Church <noreply@mg.gardencitychurch.net>',
      to: recipients,
      subject,
      text,
      html,
    });
    
    console.log(`Meeting agenda email sent to ${recipients.length} recipients`);
    return { success: true };
  } catch (error) {
    console.error("Error sending meeting agenda email:", error);
    return { 
      success: false, 
      error: String(error),
      fallbackContent: { text, subject }
    };
  }
}

/**
 * Send meeting recap email to attendees
 */
export async function sendMeetingRecapEmail(
  data: MeetingEmailData,
  recipients: string[]
): Promise<{ success: boolean; error?: string; fallbackContent?: { text: string; subject: string } }> {
  const { html, text, subject } = generateMeetingRecapContent(data);
  
  // Check if Mailgun is configured
  if (!process.env.MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.log("MAILGUN not configured - returning fallback content");
    return { 
      success: false, 
      error: "Email service not configured",
      fallbackContent: { text, subject }
    };
  }

  if (recipients.length === 0) {
    return { success: false, error: "No recipients provided" };
  }

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: 'Garden City Church <noreply@mg.gardencitychurch.net>',
      to: recipients,
      subject,
      text,
      html,
    });
    
    console.log(`Meeting recap email sent to ${recipients.length} recipients`);
    return { success: true };
  } catch (error) {
    console.error("Error sending meeting recap email:", error);
    return { 
      success: false, 
      error: String(error),
      fallbackContent: { text, subject }
    };
  }
}

// =============================================================================
// LEADER NOTIFICATION EMAILS
// =============================================================================

interface LeaderNotificationData {
  type: 'TEAM_JOINED' | 'ONBOARDING_STARTED' | 'ONBOARDING_COMPLETED' | 'TRAINING_SUBMITTED';
  leaderName: string;
  leaderEmail: string;
  memberName: string;
  ministryName?: string;
  link?: string;
  trainingTitle?: string;
}

function generateLeaderNotificationEmail(data: LeaderNotificationData): { subject: string; text: string; html: string } {
  const { type, leaderName, memberName, ministryName, link, trainingTitle } = data;
  
  let subject = '';
  let intro = '';
  let action = '';
  
  switch (type) {
    case 'TEAM_JOINED':
      subject = `New team member: ${memberName}${ministryName ? ` joined ${ministryName}` : ''}`;
      intro = `${memberName} has joined your${ministryName ? ` ${ministryName}` : ''} team in MinistryPath.`;
      action = 'View their profile and welcome them to the team.';
      break;
    case 'ONBOARDING_STARTED':
      subject = `${memberName} started onboarding`;
      intro = `${memberName} has begun their onboarding journey${ministryName ? ` for ${ministryName}` : ''}.`;
      action = 'Keep an eye on their progress and be ready to help if they have questions.';
      break;
    case 'ONBOARDING_COMPLETED':
      subject = `${memberName} completed onboarding!`;
      intro = `Great news! ${memberName} has completed their onboarding${ministryName ? ` for ${ministryName}` : ''}.`;
      action = 'Welcome them to the team and help them get started serving.';
      break;
    case 'TRAINING_SUBMITTED':
      subject = `Training requires your review: ${memberName}`;
      intro = `${memberName} has submitted ${trainingTitle ? `"${trainingTitle}"` : 'a training'} for your review.`;
      action = 'Please review and approve their training completion.';
      break;
  }

  const text = `Hi ${leaderName},

${intro}

${action}

${link ? `View details: ${link}` : ''}

—
MinistryPath
Garden City Church`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { color: #f2660f; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .content { margin-bottom: 24px; }
    .action { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .button { display: inline-block; background: #f2660f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { color: #666; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">MinistryPath</div>
    <div class="content">
      <p>Hi ${leaderName},</p>
      <p>${intro}</p>
      <div class="action">
        <p><strong>${action}</strong></p>
        ${link ? `<p><a href="${link}" class="button">View Details</a></p>` : ''}
      </div>
    </div>
    <div class="footer">
      <p>MinistryPath — Garden City Church</p>
      <p>Live the life. Tell the Story.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Send leader notification email
 */
export async function sendLeaderNotificationEmail(
  data: LeaderNotificationData
): Promise<{ success: boolean; error?: string }> {
  const { subject, text, html } = generateLeaderNotificationEmail(data);
  
  // Check if Mailgun is configured
  if (!process.env.MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.log(`[Email] Mailgun not configured - skipping leader notification to ${data.leaderEmail}`);
    return { success: false, error: "Email service not configured" };
  }

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: 'MinistryPath <noreply@mg.gardencitychurch.net>',
      to: [data.leaderEmail],
      subject,
      text,
      html,
    });
    
    console.log(`[Email] Leader notification sent to ${data.leaderEmail}: ${data.type}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending leader notification email:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string | null,
  resetToken: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  const name = firstName || 'Friend';
  
  const subject = 'Reset Your MinistryPath Password';
  
  const text = `
Hi ${name},

You requested to reset your password for your MinistryPath account.

Click the link below to create a new password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Blessings,
Garden City Church Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #f2660f 0%, #f8a84a 100%); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; background: #ffffff; }
    .button { display: inline-block; background: #f2660f; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MinistryPath</h1>
  </div>
  <div class="content">
    <h2>Reset Your Password</h2>
    <p>Hi ${name},</p>
    <p>You requested to reset your password for your MinistryPath account.</p>
    <p style="text-align: center;">
      <a href="${resetLink}" class="button">Reset My Password</a>
    </p>
    <p style="font-size: 14px; color: #666;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  </div>
  <div class="footer">
    <p>Garden City Church - Beverly, MA</p>
    <p>Live the life. Tell the Story.</p>
  </div>
</body>
</html>`;

  // Check if Mailgun is configured
  if (!process.env.MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.log(`[Email] Mailgun not configured - skipping password reset email to ${email}`);
    return { success: false, error: "Email service not configured" };
  }

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: 'MinistryPath <noreply@mg.gardencitychurch.net>',
      to: [email],
      subject,
      text,
      html,
    });
    
    console.log(`[Email] Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: String(error) };
  }
}
