import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export function formatEventDate(dateISO: string, timeZone?: string): string {
    if (!dateISO) return '';
      
    try {
        // Use dayjs for timezone-aware formatting
        const localDateTime = dayjs(dateISO).tz(timeZone);
        return localDateTime.format('MMM D, YYYY HH:mm');
    } catch (e) {
        return dateISO;
    }
}