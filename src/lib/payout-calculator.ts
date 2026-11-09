export interface PayoutBreakdown {
  basePrice: number;            // Course Base Price (BP) e.g. 100
  gstRatePercent: number;       // GST rate e.g. 18%
  gstAmount: number;            // 18% of BP e.g. 18.00
  studentTotal: number;         // Total paid by student (BP + GST) e.g. 118.00
  gtfRatePercent: number;       // Payment Gateway Fee (GTF) rate e.g. 2%
  gtfAmount: number;            // 2% of studentTotal e.g. 2.36
  netPool: number;              // Net pool (BP - GTF) e.g. 97.64
  instructorSharePercent: number; // Instructor split e.g. 60%
  instructorGross: number;      // 60% of netPool e.g. 58.58
  platformSharePercent: number; // Platform split e.g. 40%
  platformShare: number;        // 40% of netPool e.g. 39.06
  tdsRatePercent: number;       // Govt TDS e.g. 2%
  tdsAmount: number;            // 2% of instructorGross e.g. 1.17
  netInstructorPayout: number;  // Final payout to instructor e.g. 57.41
}

/**
 * Calculates platform fee, GST, Gateway fee, TDS, and final instructor payout.
 * Pure mathematical helper safe for both client and server runtimes.
 *
 * Formula:
 * - Student pays: Base Price + 18% GST (e.g. 100 + 18 = 118)
 * - GTF: 2% of Student Total (118 * 2% = 2.36)
 * - Net Pool: Base Price - GTF (100 - 2.36 = 97.64)
 * - Instructor Share: 60% of Net Pool (97.64 * 60% = 58.58)
 * - Platform Share: 40% of Net Pool (97.64 * 40% = 39.06)
 * - TDS: 2% of Instructor Share (58.58 * 2% = 1.17)
 * - Final Instructor Payout: 58.58 - 1.17 = 57.41
 */
export function calculateInstructorPayout(basePrice: number): PayoutBreakdown {
  const BP = Math.max(0, Number(Number(basePrice || 0).toFixed(2)));
  const gstRatePercent = 18;
  const gstAmount = Number(((BP * gstRatePercent) / 100).toFixed(2));
  const studentTotal = Number((BP + gstAmount).toFixed(2));

  const gtfRatePercent = 2;
  const gtfAmount = Number(((studentTotal * gtfRatePercent) / 100).toFixed(2));

  const netPool = Math.max(0, Number((BP - gtfAmount).toFixed(2)));

  const instructorSharePercent = 60;
  const instructorGross = Number(((netPool * instructorSharePercent) / 100).toFixed(2));

  const platformSharePercent = 40;
  const platformShare = Number((netPool - instructorGross).toFixed(2));

  const tdsRatePercent = 2;
  const tdsAmount = Number(((instructorGross * tdsRatePercent) / 100).toFixed(2));

  const netInstructorPayout = Number((instructorGross - tdsAmount).toFixed(2));

  return {
    basePrice: BP,
    gstRatePercent,
    gstAmount,
    studentTotal,
    gtfRatePercent,
    gtfAmount,
    netPool,
    instructorSharePercent,
    instructorGross,
    platformSharePercent,
    platformShare,
    tdsRatePercent,
    tdsAmount,
    netInstructorPayout
  };
}
