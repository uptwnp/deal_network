/**
 * Formats price in lakhs, converting to crores if >= 100 lakhs
 * @param minPrice - Minimum price in lakhs
 * @param maxPrice - Maximum price in lakhs
 * @param includeRupeeSymbol - Whether to include ₹ symbol (default: false)
 * @returns Formatted price string
 */
export function formatPrice(
  minPrice: number,
  maxPrice: number,
  includeRupeeSymbol: boolean = false
): string {
  const useCrores = minPrice >= 100;
  const symbol = includeRupeeSymbol ? '₹' : '';

  if (useCrores) {
    const minCr = (minPrice / 100).toFixed(2).replace(/\.?0+$/, '');
    if (minPrice === maxPrice) {
      return `${symbol}${minCr} Cr`;
    } else {
      const maxCr = (maxPrice / 100).toFixed(2).replace(/\.?0+$/, '');
      return `${symbol}${minCr}-${maxCr} Cr`;
    }
  } else {
    if (minPrice === maxPrice) {
      return `${symbol}${minPrice} Lakh`;
    } else {
      return `${symbol}${minPrice}-${maxPrice} Lakh`;
    }
  }
}

/**
 * Formats price for display in text/copy operations (includes "Lakhs" or "Crores" label)
 * @param minPrice - Minimum price in lakhs
 * @param maxPrice - Maximum price in lakhs
 * @returns Formatted price string with unit label
 */
export function formatPriceWithLabel(
  minPrice: number,
  maxPrice: number
): string {
  const useCrores = minPrice >= 100;

  if (useCrores) {
    const minCr = (minPrice / 100).toFixed(2).replace(/\.?0+$/, '');
    if (minPrice === maxPrice) {
      return `₹${minCr} Crores`;
    } else {
      const maxCr = (maxPrice / 100).toFixed(2).replace(/\.?0+$/, '');
      return `₹${minCr}-${maxCr} Crores`;
    }
  } else {
    if (minPrice === maxPrice) {
      return `₹${minPrice} Lakhs`;
    } else {
      return `₹${minPrice}-${maxPrice} Lakhs`;
    }
  }
}

