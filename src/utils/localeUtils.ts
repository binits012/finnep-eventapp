export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeFormat: string;
}

// Fallback locales if API data is not available
export const fallbackLocales: LocaleInfo[] = [
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  {
    code: 'fi-FI',
    name: 'Finnish',
    nativeName: 'Suomi',
    flag: '🇫🇮',
    rtl: false,
    currency: 'EUR',
    currencySymbol: '€',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  },
  {
    code: 'sv-SE',
    name: 'Swedish',
    nativeName: 'Svenska',
    flag: '🇸🇪',
    rtl: false,
    currency: 'SEK',
    currencySymbol: 'kr',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h'
  },
  {
    code: 'da-DK',
    name: 'Danish',
    nativeName: 'Dansk',
    flag: '🇩🇰',
    rtl: false,
    currency: 'DKK',
    currencySymbol: 'kr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  },
  {
    code: 'no-NO',
    name: 'Norwegian',
    nativeName: 'Norsk',
    flag: '🇳🇴',
    rtl: false,
    currency: 'NOK',
    currencySymbol: 'kr',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  }
];

// Get currency code for a locale
export function getCurrencyCode(locale: string, apiLocales?: LocaleInfo[]): string {
  if (apiLocales && apiLocales.length > 0) {
    const apiLocale = apiLocales.find(l => l.code === locale);
    if (apiLocale) return apiLocale.currency;
  }

  const fallbackLocale = fallbackLocales.find(l => l.code === locale);
  return fallbackLocale?.currency || 'USD';
}

// Get currency symbol for a locale
export function getCurrencySymbol(locale: string, apiLocales?: LocaleInfo[]): string {
  if (apiLocales && apiLocales.length > 0) {
    const apiLocale = apiLocales.find(l => l.code === locale);
    if (apiLocale) return apiLocale.currencySymbol;
  }

  const fallbackLocale = fallbackLocales.find(l => l.code === locale);
  return fallbackLocale?.currencySymbol || '$';
}

// Format price with locale-specific currency
export function formatPrice(price: number, locale: string, apiLocales?: LocaleInfo[]): string {
  const currency = getCurrencyCode(locale, apiLocales);
  // Currency symbol is not used in this function, only currency code

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
}

// Get locale info
export function getLocaleInfo(locale: string, apiLocales?: LocaleInfo[]): LocaleInfo | null {
  if (apiLocales && apiLocales.length > 0) {
    const apiLocale = apiLocales.find(l => l.code === locale);
    if (apiLocale) return apiLocale;
  }

  return fallbackLocales.find(l => l.code === locale) || null;
}

// Get all available locales
export function getAvailableLocales(apiLocales?: LocaleInfo[]): LocaleInfo[] {
  return apiLocales && apiLocales.length > 0 ? apiLocales : fallbackLocales;
}
