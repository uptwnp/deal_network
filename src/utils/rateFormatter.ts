/**
 * Formats rate per unit amount in Indian numbering system (Lakhs, Crores, K)
 * @param rate - Rate per unit in rupees
 * @returns Formatted rate string
 */
export function formatRatePerUnit(rate: number): string {
    // Handle edge cases
    if (!rate || rate === 0 || isNaN(rate)) {
        return '';
    }

    // Convert to crores (>= 1 Cr)
    if (rate >= 10000000) {
        const rateInCr = rate / 10000000;
        return `₹ ${rateInCr.toFixed(2).replace(/\.?0+$/, '')} Cr`;
    }

    // Convert to lakhs (>= 1 L)
    if (rate >= 100000) {
        const rateInL = rate / 100000;
        return `₹ ${rateInL.toFixed(2).replace(/\.?0+$/, '')} L`;
    }

    // Convert to thousands (>= 1 K)
    if (rate >= 1000) {
        const rateInK = rate / 1000;
        return `₹ ${rateInK.toFixed(1).replace(/\.?0+$/, '')}K`;
    }

    // Less than 1000, show as is
    return `₹ ${Math.round(rate)}`;
}
