import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/storage';
import { auditWebsite } from '@/lib/auditor';
import { generateEmail } from '@/lib/ai';
import { sendEmail } from '@/lib/mailer';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { leadId, recipientEmail, sendWhatsapp = true } = (await req.json()) as {
      leadId: string;
      recipientEmail?: string;
      sendWhatsapp?: boolean;
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

    if (lead.hasRealWebsite && lead.website) {
      const auditData = await auditWebsite(lead.website);
      const leadAfterAudit = updateLead(leadId, { auditData, status: 'audited' });
      if (leadAfterAudit) updatedLead = leadAfterAudit;
      result.audit = { ok: true, performance: auditData.performance, issues: auditData.issues.length };
    } else {
      result.audit = { ok: false, skipped: true, reason: 'No real website' };
    }

    const emailContent = await generateEmail(updatedLead, updatedLead.auditData);
    const leadAfterEmail = updateLead(leadId, { emailContent, status: 'email_generated' });
    if (leadAfterEmail) updatedLead = leadAfterEmail;
    result.emailGeneration = { ok: true, subject: emailContent.subject };

    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        body: emailContent.body,
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

    if (sendWhatsapp && updatedLead.phone) {
      const waBody =
        `Hi, this is ${process.env.SENDER_NAME || 'LeadTool'}. ` +
        `I reviewed ${updatedLead.businessName} and can share quick ideas to improve online leads. ` +
        `If helpful, I can send a short free website concept.`;
      const wa = await sendWhatsAppMessage(updatedLead.phone, waBody);
      result.whatsApp = wa.ok
        ? { ok: true, sid: wa.sid }
        : { ok: false, error: wa.error };
    } else {
      result.whatsApp = { ok: false, skipped: true, reason: sendWhatsapp ? 'No phone on lead' : 'Disabled' };
    }

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Automation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
