// utils/currency.ts
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import cc from 'currency-codes';

// Register English locale
countries.registerLocale(en);

/**
 * Get country code from country name
 * @param countryName - Full country name (e.g., "Finland", "United States", "united kingdom")
 * @returns Two-letter country code (e.g., "FI", "US", "GB")
 */
export const getCountryCode = (countryName: string): string | undefined => {
  if (!countryName) return undefined;

  // Try exact match first
  let code = countries.getAlpha2Code(countryName, 'en');
  if (code) return code;
  // Try title case (capitalize first letter of each word)
  const titleCase = countryName
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  code = countries.getAlpha2Code(titleCase, 'en');
  if (code) return code;

  // Try getting all country names and doing case-insensitive match
  const allCountries = countries.getNames('en', { select: 'official' });
  const normalizedInput = countryName.toLowerCase().trim();

  for (const [code, name] of Object.entries(allCountries)) {
    if (name.toLowerCase() === normalizedInput) {
      return code;
    }
  }

  return undefined;
};

/**
 * Get currency symbol from country name
 * @param countryName - Full country name (e.g., "Finland", "United States")
 * @returns Currency symbol (e.g., "€", "$")
 */
export const getCurrencySymbol = (countryName: string): string => {
  const countryCode = getCountryCode(countryName);
  if (!countryCode) return '';

  // Get official country name from i18n-iso-countries
  const officialCountryName = countries.getName(countryCode, 'en', { select: 'official' });
  if (!officialCountryName) return '';

  // currency-codes library stores country names in specific format
  // Try exact match first
  let currencies = cc.country(officialCountryName);

  // If no match, search through all currencies to find one that matches
  if (!currencies || currencies.length === 0) {
    const normalizedCountryName = officialCountryName.toLowerCase();
    currencies = cc.data.filter(currency =>
      currency.countries.some(country =>
        country.toLowerCase().includes(normalizedCountryName) ||
        normalizedCountryName.includes(country.toLowerCase().split('(')[0].trim())
      )
    );
  }

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

  // Get official country name from i18n-iso-countries
  const officialCountryName = countries.getName(countryCode, 'en', { select: 'official' });
  if (!officialCountryName) return 'EURO';

  // currency-codes library stores country names in specific format
  // Try exact match first
  let currencies = cc.country(officialCountryName);

  // If no match, search through all currencies to find one that matches
  if (!currencies || currencies.length === 0) {
    const normalizedCountryName = officialCountryName.toLowerCase();
    currencies = cc.data.filter(currency =>
      currency.countries.some(country =>
        country.toLowerCase().includes(normalizedCountryName) ||
        normalizedCountryName.includes(country.toLowerCase().split('(')[0].trim())
      )
    );
  }

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

  // Get official country name from i18n-iso-countries
  const officialCountryName = countries.getName(countryCode, 'en', { select: 'official' });
  if (!officialCountryName) return null;

  // currency-codes library stores country names in specific format
  // Try exact match first
  let currencies = cc.country(officialCountryName);

  // If no match, search through all currencies to find one that matches
  if (!currencies || currencies.length === 0) {
    const normalizedCountryName = officialCountryName.toLowerCase();
    currencies = cc.data.filter(currency =>
      currency.countries.some(country =>
        country.toLowerCase().includes(normalizedCountryName) ||
        normalizedCountryName.includes(country.toLowerCase().split('(')[0].trim())
      )
    );
  }

  return currencies && currencies.length > 0 ? currencies[0] : null;
};

const currencyUtils = {
  getCountryCode,
  getCurrencySymbol,
  getCurrencyCode,
  formatPrice,
  getCurrencyInfo,
};

export default currencyUtils;