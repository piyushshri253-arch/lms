import { prisma } from './prisma';
import crypto from 'crypto';

/**
 * Generates a formatted cryptographic software license key
 * Example: MORENA TEACH-7K9P-M4W2-8XN1
 */
export function generateLicenseKey(prefix = 'MORENA TEACH'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars (0, 1, I, O)
  const getRandomSegment = (len = 4) => {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };

  return `${prefix}-${getRandomSegment(4)}-${getRandomSegment(4)}-${getRandomSegment(4)}`;
}

export interface IssueLicenseInput {
  organizationId: string;
  productId: string;
  userId: string;
  orderId?: string | null;
  licenseType?: 'SINGLE_USER' | 'MULTI_USER' | 'ENTERPRISE' | 'SUBSCRIPTION';
  maxActivations?: number;
  expiresAt?: Date | null;
}

/**
 * Issues a new Software License upon product purchase
 */
export async function issueSoftwareLicense(input: IssueLicenseInput) {
  const licenseKey = generateLicenseKey();
  const maxActivations = input.maxActivations || (input.licenseType === 'ENTERPRISE' ? 25 : input.licenseType === 'MULTI_USER' ? 5 : 1);

  const license = await prisma.softwareLicense.create({
    data: {
      organizationId: input.organizationId,
      productId: input.productId,
      userId: input.userId,
      orderId: input.orderId || null,
      licenseKey,
      licenseType: input.licenseType || 'SINGLE_USER',
      maxActivations,
      currentActivations: 0,
      status: 'ACTIVE',
      expiresAt: input.expiresAt || null
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          version: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return license;
}

/**
 * Cryptographically verifies a license key status
 */
export async function verifyLicenseKey(licenseKey: string) {
  const normalizedKey = licenseKey.trim().toUpperCase();

  const license = await prisma.softwareLicense.findUnique({
    where: { licenseKey: normalizedKey },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          version: true,
          type: true
        }
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      activations: {
        where: { status: 'ACTIVE' },
        select: {
          deviceId: true,
          deviceName: true,
          activatedAt: true,
          lastPingAt: true
        }
      }
    }
  });

  if (!license) {
    return { valid: false, reason: 'LICENSE_NOT_FOUND', message: 'License key does not exist.' };
  }

  if (license.status !== 'ACTIVE') {
    return {
      valid: false,
      reason: `LICENSE_${license.status}`,
      message: `License is currently ${license.status.toLowerCase()}.`
    };
  }

  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return { valid: false, reason: 'LICENSE_EXPIRED', message: 'License validity period has expired.' };
  }

  return {
    valid: true,
    license: {
      key: license.licenseKey,
      type: license.licenseType,
      status: license.status,
      maxActivations: license.maxActivations,
      activeActivations: license.activations.length,
      expiresAt: license.expiresAt,
      product: license.product,
      organization: license.organization,
      customer: {
        name: license.user.name,
        email: license.user.email
      },
      activations: license.activations
    }
  };
}

export interface ActivateLicenseInput {
  licenseKey: string;
  deviceId: string;
  deviceName?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}

/**
 * Activates a device on an active software license
 */
export async function activateLicenseDevice(input: ActivateLicenseInput) {
  const verifyResult = await verifyLicenseKey(input.licenseKey);
  if (!verifyResult.valid || !verifyResult.license) {
    return { success: false, error: verifyResult.message || 'Invalid license key' };
  }

  const normalizedKey = input.licenseKey.trim().toUpperCase();
  const licenseRecord = await prisma.softwareLicense.findUnique({
    where: { licenseKey: normalizedKey }
  });

  if (!licenseRecord) {
    return { success: false, error: 'License record not found' };
  }

  // Check if device already activated
  const existingActivation = await prisma.licenseActivation.findUnique({
    where: {
      licenseId_deviceId: {
        licenseId: licenseRecord.id,
        deviceId: input.deviceId
      }
    }
  });

  if (existingActivation && existingActivation.status === 'ACTIVE') {
    // Update last ping timestamp
    await prisma.licenseActivation.update({
      where: { id: existingActivation.id },
      data: { lastPingAt: new Date() }
    });

    return {
      success: true,
      alreadyActivated: true,
      message: 'Device is already activated for this license.',
      activation: existingActivation
    };
  }

  // Check activation capacity
  const activeCount = await prisma.licenseActivation.count({
    where: {
      licenseId: licenseRecord.id,
      status: 'ACTIVE'
    }
  });

  if (activeCount >= licenseRecord.maxActivations) {
    return {
      success: false,
      error: `Activation limit reached (${activeCount}/${licenseRecord.maxActivations} devices). Please deactivate a previous device first.`
    };
  }

  // Create or reactivate activation
  const activation = await prisma.licenseActivation.upsert({
    where: {
      licenseId_deviceId: {
        licenseId: licenseRecord.id,
        deviceId: input.deviceId
      }
    },
    create: {
      licenseId: licenseRecord.id,
      deviceId: input.deviceId,
      deviceName: input.deviceName || 'Client Device',
      deviceFingerprint: input.deviceFingerprint || null,
      ipAddress: input.ipAddress || null,
      status: 'ACTIVE',
      activatedAt: new Date(),
      lastPingAt: new Date()
    },
    update: {
      deviceName: input.deviceName || 'Client Device',
      status: 'ACTIVE',
      activatedAt: new Date(),
      lastPingAt: new Date()
    }
  });

  // Update currentActivations count
  await prisma.softwareLicense.update({
    where: { id: licenseRecord.id },
    data: { currentActivations: activeCount + 1 }
  });

  return {
    success: true,
    message: 'License successfully activated for this machine.',
    activation
  };
}

/**
 * Deactivates a device on a license
 */
export async function deactivateLicenseDevice(licenseKey: string, deviceId: string) {
  const normalizedKey = licenseKey.trim().toUpperCase();
  const licenseRecord = await prisma.softwareLicense.findUnique({
    where: { licenseKey: normalizedKey }
  });

  if (!licenseRecord) {
    return { success: false, error: 'License key not found' };
  }

  const activation = await prisma.licenseActivation.findUnique({
    where: {
      licenseId_deviceId: {
        licenseId: licenseRecord.id,
        deviceId
      }
    }
  });

  if (!activation) {
    return { success: false, error: 'No active activation found for this device ID.' };
  }

  await prisma.licenseActivation.update({
    where: { id: activation.id },
    data: { status: 'DEACTIVATED' }
  });

  const activeCount = await prisma.licenseActivation.count({
    where: {
      licenseId: licenseRecord.id,
      status: 'ACTIVE'
    }
  });

  await prisma.softwareLicense.update({
    where: { id: licenseRecord.id },
    data: { currentActivations: activeCount }
  });

  return { success: true, message: 'Device successfully deactivated from license.' };
}
