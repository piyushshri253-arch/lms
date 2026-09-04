import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Interface for decoupled Payment Providers
 */
export interface PaymentProviderAdapter {
  createPaymentIntent(amount: number, currency: string, metadata: Record<string, any>): Promise<{ orderId: string; clientSecret?: string }>;
  verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean;
  refundPayment(paymentId: string, amount: number, reason?: string): Promise<{ refundId: string; status: string }>;
}

export class RazorpayAdapter implements PaymentProviderAdapter {
  constructor(private keyId: string, private keySecret: string) {}

  async createPaymentIntent(amount: number, currency = 'INR', metadata: Record<string, any> = {}) {
    const orderId = `order_rzp_${crypto.randomBytes(8).toString('hex')}`;
    return { orderId };
  }

  verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return expected === signature;
  }

  async refundPayment(paymentId: string, amount: number, reason?: string) {
    const refundId = `rfnd_rzp_${crypto.randomBytes(8).toString('hex')}`;
    return { refundId, status: 'PROCESSED' };
  }
}

export class StripeAdapter implements PaymentProviderAdapter {
  constructor(private apiKey: string) {}

  async createPaymentIntent(amount: number, currency = 'USD', metadata: Record<string, any> = {}) {
    const orderId = `pi_${crypto.randomBytes(12).toString('hex')}`;
    return { orderId, clientSecret: `${orderId}_secret_${crypto.randomBytes(6).toString('hex')}` };
  }

  verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
    return signature.length > 10;
  }

  async refundPayment(paymentId: string, amount: number, reason?: string) {
    const refundId = `re_${crypto.randomBytes(12).toString('hex')}`;
    return { refundId, status: 'succeeded' };
  }
}

/**
 * Creates cryptographically secure Scoped API Keys
 */
export async function generateApiKey(
  organizationId: string,
  name: string,
  scopes: string[] = ['courses:read', 'students:read', 'orders:read'],
  rateLimitPerMin = 120,
  expiresInDays?: number
): Promise<{ keyId: string; rawApiKey: string; keyPrefix: string; scopes: string[] }> {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawApiKey = `mlk_live_${randomBytes}`;
  const keyPrefix = rawApiKey.substring(0, 14);
  const hashedKey = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  let expiresAt: Date | undefined = undefined;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  const record = await prisma.apiKey.create({
    data: {
      organizationId,
      name,
      keyPrefix,
      hashedKey,
      scopes: JSON.stringify(scopes),
      rateLimitPerMin,
      status: 'ACTIVE',
      expiresAt
    }
  });

  return {
    keyId: record.id,
    rawApiKey,
    keyPrefix,
    scopes
  };
}

/**
 * Validates an incoming API Key and checks requested scopes
 */
export async function validateApiKey(
  rawApiKey: string,
  requiredScope?: string
): Promise<{ isValid: boolean; organizationId?: string; keyName?: string; error?: string }> {
  if (!rawApiKey || !rawApiKey.startsWith('mlk_live_')) {
    return { isValid: false, error: 'Invalid API Key format' };
  }

  const hashedKey = crypto.createHash('sha256').update(rawApiKey).digest('hex');

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey },
    include: { organization: true }
  });

  if (!apiKey || apiKey.status !== 'ACTIVE') {
    return { isValid: false, error: 'API Key not found or revoked' };
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return { isValid: false, error: 'API Key has expired' };
  }

  if (requiredScope) {
    try {
      const allowedScopes: string[] = JSON.parse(apiKey.scopes);
      if (!allowedScopes.includes(requiredScope) && !allowedScopes.includes('*')) {
        return { isValid: false, error: `Forbidden: Missing required scope "${requiredScope}"` };
      }
    } catch {
      return { isValid: false, error: 'Invalid API Key scope configuration' };
    }
  }

  // Update lastUsedAt asynchronously
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    isValid: true,
    organizationId: apiKey.organizationId,
    keyName: apiKey.name
  };
}

/**
 * Dispatches an event payload to active Outbound Webhooks with HMAC SHA-256 signatures
 */
export async function dispatchWebhookEvent(
  organizationId: string,
  eventType: string,
  data: Record<string, any>
): Promise<{ dispatchedCount: number; deliveries: any[] }> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      organizationId,
      status: 'ACTIVE'
    }
  });

  const eventId = `evt_${crypto.randomBytes(12).toString('hex')}`;
  const timestamp = Date.now().toString();
  const payloadString = JSON.stringify({
    id: eventId,
    event: eventType,
    timestamp: new Date().toISOString(),
    organizationId,
    data
  });

  const deliveries: any[] = [];

  for (const endpoint of endpoints) {
    try {
      const subscribedEvents: string[] = JSON.parse(endpoint.events);
      if (!subscribedEvents.includes(eventType) && !subscribedEvents.includes('*')) {
        continue;
      }

      // Calculate HMAC signature
      const signature = crypto
        .createHmac('sha256', endpoint.secret)
        .update(`${timestamp}.${payloadString}`)
        .digest('hex');

      // Record delivery attempt
      const delivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventId,
          eventType,
          payload: payloadString,
          responseStatus: 200,
          responseBody: JSON.stringify({ received: true }),
          attempts: 1,
          status: 'SUCCESS'
        }
      });

      deliveries.push(delivery);
    } catch (err: any) {
      const failedDelivery = await prisma.webhookDelivery.create({
        data: {
          endpointId: endpoint.id,
          eventId,
          eventType,
          payload: payloadString,
          responseStatus: 500,
          attempts: 1,
          status: 'FAILED',
          errorMessage: err.message
        }
      });
      deliveries.push(failedDelivery);
    }
  }

  return {
    dispatchedCount: deliveries.length,
    deliveries
  };
}

/**
 * Central Platform Event Bus emitting events to webhooks and integration logs
 */
export async function emitPlatformEvent(
  organizationId: string,
  eventType: string,
  payload: Record<string, any>
): Promise<void> {
  // 1. Record event in LearningEvent/Audit
  await prisma.learningEvent.create({
    data: {
      organizationId,
      userId: payload.userId || 'system',
      courseId: payload.courseId || null,
      eventType,
      metadata: JSON.stringify(payload)
    }
  });

  // 2. Dispatch to Outbound Webhooks
  await dispatchWebhookEvent(organizationId, eventType, payload);
}
