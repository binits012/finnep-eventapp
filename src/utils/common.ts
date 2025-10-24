import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/en';
import 'dayjs/locale/fi';
import 'dayjs/locale/sv';
import 'dayjs/locale/da';
import 'dayjs/locale/nb';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Map our locale codes to dayjs locale codes
const localeMap: Record<string, string> = {
    'en-US': 'en',
    'fi-FI': 'fi',
    'sv-SE': 'sv',
    'da-DK': 'da',
    'no-NO': 'nb'
};

export function formatEventDate(dateISO: string, timeZone?: string, locale?: string): string {
    if (!dateISO) return '';

    try {
        // Use dayjs for timezone-aware formatting
        const localDateTime = dayjs(dateISO).tz(timeZone);

        // Set locale if provided
        if (locale && localeMap[locale]) {
            localDateTime.locale(localeMap[locale]);
        }

        return localDateTime.format('MMM D, YYYY HH:mm');
    } catch {
        return dateISO;
    }
}

// New locale-aware date formatting function
export function formatEventDateLocale(dateISO: string, timeZone?: string, locale?: string): string {
    if (!dateISO) return '';

    try {
        // Get the dayjs locale code
        const dayjsLocale = locale && localeMap[locale] ? localeMap[locale] : 'en';

        // Create dayjs object with timezone
        let localDateTime = dayjs(dateISO).tz(timeZone);

        // Set locale before formatting
        if (dayjsLocale !== 'en') {
            localDateTime = localDateTime.locale(dayjsLocale);
        }

        switch (dayjsLocale) {
            case 'fi':
                // Finnish format: 15. tammikuuta 2024 klo 14:30
                return localDateTime.format('D. MMMM YYYY [klo] HH:mm');
            case 'sv':
                // Swedish format: 15 januari 2024 kl 14:30
                return localDateTime.format('D MMMM YYYY [kl] HH:mm');
            case 'da':
                // Danish format: 15. januar 2024 kl. 14:30
                return localDateTime.format('D. MMMM YYYY [kl.] HH:mm');
            case 'nb':
                // Norwegian format: 15. januar 2024 kl. 14:30
                return localDateTime.format('D. MMMM YYYY [kl.] HH:mm');
            default:
                // English format: Jan 15, 2024 14:30
                return localDateTime.format('MMM D, YYYY HH:mm');
        }
    } catch {
        return dateISO;
    }
}

// Format date only (without time)
export function formatEventDateOnly(dateISO: string, timeZone?: string, locale?: string): string {
    if (!dateISO) return '';

    try {
        // Get the dayjs locale code
        const dayjsLocale = locale && localeMap[locale] ? localeMap[locale] : 'en';

        // Create dayjs object with timezone
        let localDateTime = dayjs(dateISO).tz(timeZone);

        // Set locale before formatting
        if (dayjsLocale !== 'en') {
            localDateTime = localDateTime.locale(dayjsLocale);
        }

        switch (dayjsLocale) {
            case 'fi':
                // Finnish format: 15. tammikuuta 2024
                return localDateTime.format('D. MMMM YYYY');
            case 'sv':
                // Swedish format: 15 januari 2024
                return localDateTime.format('D MMMM YYYY');
            case 'da':
                // Danish format: 15. januar 2024
                return localDateTime.format('D. MMMM YYYY');
            case 'nb':
                // Norwegian format: 15. januar 2024
                return localDateTime.format('D. MMMM YYYY');
            default:
                // English format: Jan 15, 2024
                return localDateTime.format('MMM D, YYYY');
        }
    } catch {
        return dateISO;
    }
}

// Format time only
export function formatEventTime(dateISO: string, timeZone?: string, locale?: string): string {
    if (!dateISO) return '';

    try {
        // Get the dayjs locale code
        const dayjsLocale = locale && localeMap[locale] ? localeMap[locale] : 'en';

        // Create dayjs object with timezone
        let localDateTime = dayjs(dateISO).tz(timeZone);

        // Set locale before formatting
        if (dayjsLocale !== 'en') {
            localDateTime = localDateTime.locale(dayjsLocale);
        }

        switch (dayjsLocale) {
            case 'fi':
                // Finnish format: klo 14:30
                return localDateTime.format('[klo] HH:mm');
            case 'sv':
                // Swedish format: kl 14:30
                return localDateTime.format('[kl] HH:mm');
            case 'da':
                // Danish format: kl. 14:30
                return localDateTime.format('[kl.] HH:mm');
            case 'nb':
                // Norwegian format: kl. 14:30
                return localDateTime.format('[kl.] HH:mm');
            default:
                // English format: 14:30
                return localDateTime.format('HH:mm');
        }
    } catch {
        return dateISO;
    }
}