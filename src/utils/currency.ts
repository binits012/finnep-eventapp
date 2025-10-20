// utils/currency.ts
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import cc from 'currency-codes';

// Register English locale
countries.registerLocale(en);

/**
 * Get country code from country name
 * @param countryName - Full country name (e.g., "Finland", "United States")
 * @returns Two-letter country code (e.g., "FI", "US")
 */
export const getCountryCode = (countryName: string): string | undefined => {
  return countries.getAlpha2Code(countryName, 'en');
};

/**
 * Get currency symbol from country name
 * @param countryName - Full country name (e.g., "Finland", "United States")
 * @returns Currency symbol (e.g., "€", "$")
 */
export const getCurrencySymbol = (countryName: string): string => {
  const countryCode = getCountryCode(countryName); 
  if (!countryCode) return '';
  
  const currencies = cc.country(countryName);
  
  if (!currencies || currencies.length === 0) return '';
  
  const currencyCode = currencies[0].code; 
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol'
    });
    
    const parts = formatter.formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value || currencyCode;
  } catch (error) {
    console.error(`Error getting currency symbol for ${countryName}:`, error);
    return currencyCode;
  }
};

/**
 * Get currency code from country name
 * @param countryName - Full country name (e.g., "Finland", "United States")
 * @returns Currency code (e.g., "EUR", "USD")
 */
export const getCurrencyCode = (countryName: string): string => {
  const countryCode = getCountryCode(countryName);
  if (!countryCode) return 'EURO';
  
  const currencies = cc.country(countryName);  
  return currencies && currencies.length > 0 ? currencies[0].code : 'EURO';
};

/**
 * Format price with proper currency
 * @param amount - Price amount
 * @param countryName - Full country name
 * @param locale - Optional locale for formatting (defaults to 'en-US')
 * @returns Formatted price string
 */
export const formatPrice = (
  amount: number,
  countryName: string,
  locale: string = 'en-US'
): string => {
  const currencyCode = getCurrencyCode(countryName);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting price for ${countryName}:`, error);
    const symbol = getCurrencySymbol(countryName);
    return `${symbol}${amount.toFixed(2)}`;
  }
};

/**
 * Get full currency information
 * @param countryName - Full country name
 * @returns Currency object with code, digits, and currency name
 */
export const getCurrencyInfo = (countryName: string) => {
  const countryCode = getCountryCode(countryName);
  if (!countryCode) return null;
  
  const currencies = cc.country(countryCode);
  return currencies && currencies.length > 0 ? currencies[0] : null;
};

export default {
  getCountryCode,
  getCurrencySymbol,
  getCurrencyCode,
  formatPrice,
  getCurrencyInfo,
};