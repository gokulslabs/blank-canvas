/**
 * GST Calculation Utility
 * Handles CGST/SGST (intra-state) and IGST (inter-state) logic for India.
 */

export interface GSTBreakdown {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

/**
 * Calculate GST breakdown for a given taxable amount.
 * @param taxableValue - The amount before tax
 * @param taxRate - GST rate (e.g. 18 for 18%)
 * @param isInterstate - If true, applies IGST; otherwise splits into CGST + SGST
 */
export function calculateGST(taxableValue: number, taxRate: number, isInterstate: boolean): GSTBreakdown {
  const totalTax = taxableValue * (taxRate / 100);

  if (isInterstate) {
    return {
      taxableValue,
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
    };
  }

  const half = totalTax / 2;
  return {
    taxableValue,
    cgst: Math.round(half * 100) / 100,
    sgst: Math.round((totalTax - Math.round(half * 100) / 100) * 100) / 100,
    igst: 0,
    totalTax,
  };
}

/** Indian states and UTs for place of supply selection */
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh",
  "Puducherry", "Lakshadweep", "Andaman & Nicobar Islands",
  "Dadra & Nagar Haveli and Daman & Diu",
];
