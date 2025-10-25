import { LocaleInfo } from './localeUtils';

// Get currency code for a locale
export function getLocaleCurrencyCode(locale: string, apiLocales?: LocaleInfo[]): string {
  if (apiLocales && apiLocales.length > 0) {
    const apiLocale = apiLocales.find(l => l.code === locale);
    if (apiLocale) return apiLocale.currency;
  }

  // Fallback mapping
  const currencyMap: Record<string, string> = {
    'en-US': 'USD',
    'fi-FI': 'EUR',
    'sv-SE': 'SEK',
    'da-DK': 'DKK',
    'no-NO': 'NOK'
  };

  return currencyMap[locale] || 'USD';
}

// Get currency symbol for a locale
export function getLocaleCurrencySymbol(locale: string, apiLocales?: LocaleInfo[]): string {
  if (apiLocales && apiLocales.length > 0) {
    const apiLocale = apiLocales.find(l => l.code === locale);
    if (apiLocale) return apiLocale.currencySymbol;
  }

  // Fallback mapping
  const symbolMap: Record<string, string> = {
    'en-US': '$',
    'fi-FI': '€',
    'sv-SE': 'kr',
    'da-DK': 'kr',
    'no-NO': 'kr'
  };

  return symbolMap[locale] || '$';
}

// Smart currency symbol that adapts to locale
export function getSmartCurrencySymbol(locale: string, apiLocales?: LocaleInfo[]): string {
  return getLocaleCurrencySymbol(locale, apiLocales);
}

// Format price with smart currency handling
export function formatSmartPrice(price: number, locale: string, apiLocales?: LocaleInfo[]): string {
  const currency = getLocaleCurrencyCode(locale, apiLocales);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
}
