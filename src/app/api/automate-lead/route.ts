import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/storage';
import { auditWebsite } from '@/lib/auditor';
import { generateEmail, generateWhatsAppMessage } from '@/lib/ai';
import { sendEmail } from '@/lib/mailer';
import { checkWhatsAppAvailability, buildWhatsAppMessage } from '@/lib/whatsapp';
import { buildFallbackOutreachMessage, buildSocialOutreachMessage, detectSocialPlatform } from '@/lib/outreachMessage';

export async function POST(req: NextRequest) {
  try {
    const { leadId, recipientEmail, force } = (await req.json()) as {
      leadId: string;
      recipientEmail?: string;
      force?: boolean;
    };

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const alreadyProcessed = lead.status === 'sent'
      || !!lead.emailSent
      || !!lead.whatsAppMessage
      || !!lead.emailContent;

    if (alreadyProcessed && !force) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Lead already processed',
        leadId,
        businessName: lead.businessName,
        status: lead.status,
        alreadyProcessedSignals: {
          status: lead.status,
          emailSent: !!lead.emailSent,
          hasEmailContent: !!lead.emailContent,
          hasWhatsAppMessage: !!lead.whatsAppMessage,
        },
        hint: 'Pass force=true to reprocess this lead.',
      });
    }

    let updatedLead = lead;
    const result: Record<string, unknown> = { leadId, businessName: lead.businessName };
    if (alreadyProcessed && force) {
      result.reprocess = { forced: true, previousStatus: lead.status };
    }

    const socialPlatform = detectSocialPlatform(lead.website || lead.socialMedia);
    if (lead.hasRealWebsite && lead.website) {
      const auditData = await auditWebsite(lead.website);
      const leadAfterAudit = await updateLead(leadId, { auditData, status: 'audited' });
      if (leadAfterAudit) updatedLead = leadAfterAudit;
      result.audit = { ok: true, performance: auditData.performance, issues: auditData.issues.length };
    } else if (socialPlatform) {
      const socialMessage = buildSocialOutreachMessage(lead, socialPlatform);
      const leadAfterSocial = await updateLead(leadId, { socialPlatform, socialMessage, status: 'audited' });
      if (leadAfterSocial) updatedLead = leadAfterSocial;
      result.audit = { ok: false, skipped: true, reason: 'Social profile lead', socialPlatform };
    } else {
      result.audit = { ok: false, skipped: true, reason: 'No real website' };
      if (updatedLead.status === 'new') {
        const leadAfterState = await updateLead(leadId, { status: 'audited' });
        if (leadAfterState) updatedLead = leadAfterState;
      }
    }

    let emailBodyForMessaging = updatedLead.emailContent?.body || buildFallbackOutreachMessage(updatedLead);
    let emailSubjectForSending = updatedLead.emailContent?.subject || '';
    if (recipientEmail) {
      const emailContent = await generateEmail(updatedLead, updatedLead.auditData);
      emailBodyForMessaging = emailContent.body;
      emailSubjectForSending = emailContent.subject;
      const leadAfterEmail = await updateLead(leadId, { emailContent, status: 'email_generated' });
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
      const leadAfterSend = await updateLead(leadId, {
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        status: 'sent',
      });
      if (leadAfterSend) updatedLead = leadAfterSend;
      result.emailSend = { ok: true, to: recipientEmail };
    } else {
      result.emailSend = { ok: false, skipped: true, reason: 'recipientEmail not provided' };
    }

    // ── WhatsApp availability check + AI message pre-generation ─────────────
    if (updatedLead.phone) {
      const waAvailable = checkWhatsAppAvailability(updatedLead.phone, updatedLead.country);
      let waMessage: string;
      try {
        waMessage = await generateWhatsAppMessage(updatedLead, updatedLead.auditData);
      } catch {
        waMessage = buildWhatsAppMessage(
          updatedLead.businessName,
          updatedLead.socialMessage || emailBodyForMessaging,
        );
      }
      const leadAfterWa = await updateLead(leadId, {
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
