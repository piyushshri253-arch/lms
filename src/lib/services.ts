import { prisma } from './prisma';

export interface CreateServiceInput {
  organizationId: string;
  name: string;
  description: string;
  shortDescription?: string;
  category?: string;
  thumbnail?: string;
  pricingType?: 'FIXED' | 'HOURLY' | 'PACKAGE';
  price: number;
  currency?: string;
  deliveryDays?: number;
  packages?: Array<{
    name: string;
    price: number;
    deliveryDays: number;
    features: string[];
  }>;
  requirements?: string[];
}

/**
 * Creates a new business service offering
 */
export async function createService(input: CreateServiceInput) {
  const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const service = await prisma.service.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      slug,
      description: input.description.trim(),
      shortDescription: input.shortDescription?.trim() || null,
      category: input.category || 'DESIGN',
      thumbnail: input.thumbnail || null,
      pricingType: input.pricingType || 'FIXED',
      price: Number(input.price) || 0.0,
      currency: input.currency || 'INR',
      deliveryDays: Number(input.deliveryDays) || 3,
      packages: JSON.stringify(input.packages || []),
      requirements: JSON.stringify(input.requirements || []),
      status: 'ACTIVE'
    }
  });

  return service;
}

export interface BookServiceInput {
  organizationId: string;
  serviceId: string;
  userId: string;
  orderId?: string | null;
  packageName?: string;
  amount: number;
  currency?: string;
  scheduledAt?: Date | null;
  requirementsSubmitted?: Record<string, any>;
  clientNotes?: string;
}

/**
 * Creates a confirmed service booking upon payment verification
 */
export async function bookService(input: BookServiceInput) {
  const service = await prisma.service.findUnique({
    where: { id: input.serviceId }
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const deliveryDays = service.deliveryDays || 3;
  const deliveryDate = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);

  const booking = await prisma.serviceBooking.create({
    data: {
      organizationId: input.organizationId,
      serviceId: input.serviceId,
      userId: input.userId,
      orderId: input.orderId || null,
      packageName: input.packageName || 'Standard',
      amount: input.amount,
      currency: input.currency || service.currency || 'INR',
      status: 'CONFIRMED',
      scheduledAt: input.scheduledAt || null,
      deliveryDate,
      requirementsSubmitted: input.requirementsSubmitted ? JSON.stringify(input.requirementsSubmitted) : null,
      clientNotes: input.clientNotes || null
    },
    include: {
      service: {
        select: {
          id: true,
          name: true,
          thumbnail: true
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

  // Increment total bookings on service
  await prisma.service.update({
    where: { id: input.serviceId },
    data: { totalBookings: { increment: 1 } }
  });

  return booking;
}

/**
 * Updates a service booking lifecycle state
 */
export async function updateBookingStatus(params: {
  bookingId: string;
  organizationId: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  deliveryFiles?: Array<{ name: string; url: string }>;
  sellerNotes?: string;
}) {
  const booking = await prisma.serviceBooking.findFirst({
    where: {
      id: params.bookingId,
      organizationId: params.organizationId
    }
  });

  if (!booking) {
    throw new Error('Service booking not found or permission denied.');
  }

  const updated = await prisma.serviceBooking.update({
    where: { id: booking.id },
    data: {
      status: params.status,
      deliveryFiles: params.deliveryFiles ? JSON.stringify(params.deliveryFiles) : booking.deliveryFiles,
      sellerNotes: params.sellerNotes !== undefined ? params.sellerNotes : booking.sellerNotes
    }
  });

  return updated;
}
