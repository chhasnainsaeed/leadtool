import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/storage';
import { auditWebsite } from '@/lib/auditor';
import { generateEmail } from '@/lib/ai';
import { sendEmail } from '@/lib/mailer';
import { checkWhatsAppAvailability, buildWhatsAppMessage } from '@/lib/whatsapp';
import { buildFallbackOutreachMessage, buildSocialOutreachMessage, detectSocialPlatform } from '@/lib/outreachMessage';

export async function POST(req: NextRequest) {
  try {
    const { leadId, recipientEmail } = (await req.json()) as {
      leadId: string;
      recipientEmail?: string;
    };

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    let updatedLead = lead;
    const result: Record<string, unknown> = { leadId, businessName: lead.businessName };

    const socialPlatform = detectSocialPlatform(lead.website || lead.socialMedia);
    if (lead.hasRealWebsite && lead.website) {
      const auditData = await auditWebsite(lead.website);
      const leadAfterAudit = updateLead(leadId, { auditData, status: 'audited' });
      if (leadAfterAudit) updatedLead = leadAfterAudit;
      result.audit = { ok: true, performance: auditData.performance, issues: auditData.issues.length };
    } else if (socialPlatform) {
      const socialMessage = buildSocialOutreachMessage(lead, socialPlatform);
      const leadAfterSocial = updateLead(leadId, { socialPlatform, socialMessage, status: 'audited' });
      if (leadAfterSocial) updatedLead = leadAfterSocial;
      result.audit = { ok: false, skipped: true, reason: 'Social profile lead', socialPlatform };
    } else {
      result.audit = { ok: false, skipped: true, reason: 'No real website' };
      if (updatedLead.status === 'new') {
        const leadAfterState = updateLead(leadId, { status: 'audited' });
        if (leadAfterState) updatedLead = leadAfterState;
      }
    }

    let emailBodyForMessaging = updatedLead.emailContent?.body || buildFallbackOutreachMessage(updatedLead);
    let emailSubjectForSending = updatedLead.emailContent?.subject || '';
    if (recipientEmail) {
      const emailContent = await generateEmail(updatedLead, updatedLead.auditData);
      emailBodyForMessaging = emailContent.body;
      emailSubjectForSending = emailContent.subject;
      const leadAfterEmail = updateLead(leadId, { emailContent, status: 'email_generated' });
      if (leadAfterEmail) updatedLead = leadAfterEmail;
      result.emailGeneration = { ok: true, subject: emailContent.subject };
    } else {
      result.emailGeneration = { ok: false, skipped: true, reason: 'No recipient email' };
    }

    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: emailSubjectForSending,
        body: emailBodyForMessaging,
      });
      const leadAfterSend = updateLead(leadId, {
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        status: 'sent',
      });
      if (leadAfterSend) updatedLead = leadAfterSend;
      result.emailSend = { ok: true, to: recipientEmail };
    } else {
      result.emailSend = { ok: false, skipped: true, reason: 'recipientEmail not provided' };
    }

    // ── WhatsApp availability check + message pre-generation ─────────────────
    if (updatedLead.phone) {
      const waAvailable = checkWhatsAppAvailability(updatedLead.phone, updatedLead.country);
      const waMessage = buildWhatsAppMessage(
        updatedLead.businessName,
        updatedLead.socialMessage || emailBodyForMessaging,
      );
      const leadAfterWa = updateLead(leadId, {
        hasWhatsApp: waAvailable,
        whatsAppMessage: waMessage,
      });
      if (leadAfterWa) updatedLead = leadAfterWa;
      result.whatsApp = { checked: true, hasWhatsApp: waAvailable };
    } else {
      result.whatsApp = { checked: false, reason: 'No phone on lead' };
    }

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Automation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
