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

/** Valid GST rates in India */
export const VALID_GST_RATES = [0, 5, 12, 18, 28] as const;
export type GSTRate = typeof VALID_GST_RATES[number];

/** Validate if a tax rate is a valid GST rate */
export function isValidGSTRate(rate: number): rate is GSTRate {
  return (VALID_GST_RATES as readonly number[]).includes(rate);
}

/**
 * Validate GSTIN format (15-character alphanumeric).
 * Format: 2-digit state code + 10-char PAN + 1 entity code + Z + 1 check digit
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return true; // optional field
  return GSTIN_REGEX.test(gstin.toUpperCase());
}

/** Get state name from GSTIN state code (first 2 digits) */
const STATE_CODE_MAP: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Dadra & Nagar Haveli and Daman & Diu", "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra", "28": "Andhra Pradesh", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
};

export function getStateFromGSTIN(gstin: string): string | undefined {
  if (!gstin || gstin.length < 2) return undefined;
  return STATE_CODE_MAP[gstin.substring(0, 2)];
}

/**
 * Classify invoice as B2B (has GSTIN) or B2C (no GSTIN)
 */
export function classifyB2BorB2C(customerGstin?: string): "B2B" | "B2C" {
  return customerGstin && customerGstin.trim().length > 0 ? "B2B" : "B2C";
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
      igst: Math.round(totalTax * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
    };
  }

  const half = totalTax / 2;
  const cgst = Math.round(half * 100) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;
  return {
    taxableValue,
    cgst,
    sgst,
    igst: 0,
    totalTax: Math.round(totalTax * 100) / 100,
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
