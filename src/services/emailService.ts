export type EmailEventType =
  | 'trainer_approved'
  | 'trainer_rejected'
  | 'course_enrolled'
  | 'new_resource'
  | 'assessment_result'
  | 'admin_trainer_registered';

export interface SendEmailPayload {
  eventType: EmailEventType;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, any>;
  idempotencyKey?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  delivered: boolean;
  provider: 'resend' | 'sendgrid' | 'none';
  message: string;
  preview?: {
    subject: string;
    to: string;
    eventType: string;
  };
}

/**
 * Dispatches an email notification request to the trusted server backend endpoint.
 * Protects secrets by executing all provider API integrations strictly on the server.
 */
export async function sendEmailNotification(payload: SendEmailPayload): Promise<EmailDispatchResult> {
  if (!payload.recipientEmail) {
    console.warn('Notice: Email recipient address missing, skipping email dispatch.');
    return {
      success: false,
      delivered: false,
      provider: 'none',
      message: 'Recipient email address is required.',
    };
  }

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn('Notice: Server email endpoint response:', res.status, errBody);
      return {
        success: false,
        delivered: false,
        provider: 'none',
        message: errBody.error || `Server responded with status ${res.status}`,
      };
    }

    const data = await res.json();
    return data as EmailDispatchResult;
  } catch (error: any) {
    console.warn('Notice: Non-critical email service dispatch warning:', error?.message || error);
    return {
      success: false,
      delivered: false,
      provider: 'none',
      message: error?.message || 'Failed to dispatch email request to server.',
    };
  }
}
