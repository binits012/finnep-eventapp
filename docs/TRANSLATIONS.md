# Translation System

This document explains how the translation system works in the Finnep Event App.

## Overview

The application uses a dynamic translation system that loads translations from S3, with fallback to local JSON files. This allows for real-time translation updates without requiring code deployments.

## Architecture

### 1. Translation Loading Priority

1. **S3 Bucket** (Primary): `https://finnep-eventapp-test.s3.eu-central-1.amazonaws.com/locale/{locale}.json`
2. **Local Files** (Fallback): `src/locales/{locale}.json`
3. **English** (Final Fallback): `src/locales/en-US.json`

### 2. Caching

- Translations are cached in memory for 5 minutes to reduce S3 API calls
- Cache is automatically invalidated when locale changes
- Cache can be manually cleared using `clearTranslationCache()`

### 3. API-Driven Locale Configuration

Locale information (currency, date formats, etc.) is loaded from the API response:
```json
{
  "setting": [{
    "otherInfo": {
      "locales": [
        {
          "code": "en-US",
          "name": "English",
          "nativeName": "English",
          "flag": "🇺🇸",
          "currency": "USD",
          "currencySymbol": "$",
          "dateFormat": "MM/DD/YYYY",
          "timeFormat": "12h"
        }
      ]
    }
  }]
}
```

## Usage

### Loading Translations

```typescript
import { loadTranslations } from '@/utils/translationLoader';

// Load translations for a specific locale
const translations = await loadTranslations('en-US');
```

### Using Translations in Components

```typescript
import { useTranslation } from '@/hooks/useTranslation';

function MyComponent() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('home.hero.title')}</h1>
      <p>{t('home.hero.subtitle')}</p>
    </div>
  );
}
```

### Translation with Parameters

```typescript
// Translation file: "capacity": "Capacity {{capacity}}"
const capacityText = t('home.capacity', { capacity: 100 });
// Result: "Capacity 100"
```

## Development

### Uploading Translations to S3

Use the provided script to upload translations:

```bash
# Upload all translations
npm run upload-translations:all

# Upload specific locale
npm run upload-translations en-US
```

### Manual Upload

```javascript
import { S3TranslationManager } from '@/utils/s3TranslationManager';

// Upload a single translation
await S3TranslationManager.uploadTranslation('en-US', translations);

// Check if translation exists
const exists = await S3TranslationManager.translationExists('en-US');

// Download translation
const translations = await S3TranslationManager.downloadTranslation('en-US');
```

### Cache Management

```typescript
import { clearTranslationCache, getCacheStatus } from '@/utils/translationLoader';

// Clear cache (useful for development)
clearTranslationCache();

// Check cache status
const status = getCacheStatus();
console.log(status);
```

## File Structure

```
src/
├── locales/                 # Local translation files (fallback)
│   ├── en-US.json
│   ├── fi-FI.json
│   ├── sv-SE.json
│   ├── da-DK.json
│   └── no-NO.json
├── utils/
│   ├── translationLoader.ts  # S3 translation loading with caching
│   ├── s3TranslationManager.ts # S3 upload/download utilities
│   └── localeUtils.ts       # Locale-specific utilities
├── contexts/
│   └── DataContext.tsx      # Main context with translation state
└── hooks/
    └── useTranslation.ts    # Translation hook
```

## Translation File Format

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "submit": "Submit"
  },
  "home": {
    "hero": {
      "title": "Discover Amazing Events",
      "subtitle": "Find and buy tickets for the best events in your area"
    }
  }
}
```

## Supported Locales

- `en-US` - English (United States)
- `fi-FI` - Finnish (Finland)
- `sv-SE` - Swedish (Sweden)
- `da-DK` - Danish (Denmark)
- `no-NO` - Norwegian (Norway)

## Error Handling

The system gracefully handles various error scenarios:

1. **S3 Unavailable**: Falls back to local files
2. **Local Files Missing**: Falls back to English
3. **Network Issues**: Uses cached translations if available
4. **Invalid JSON**: Logs error and continues with fallback

## Performance Considerations

- **Caching**: 5-minute cache reduces S3 API calls
- **Lazy Loading**: Translations loaded only when locale changes
- **Fallback Chain**: Ensures app never breaks due to missing translations
- **Memory Efficient**: Cache automatically expires

## Environment Configuration

### Required Environment Variable

```bash
# AWS CloudFront URL for translation files
NEXT_PUBLIC_AWS_CLOUD_FRONT_URL=https://your-cloudfront-domain.cloudfront.net

# Example S3 direct URL (fallback)
# NEXT_PUBLIC_AWS_CLOUD_FRONT_URL=https://your-bucket.s3.region.amazonaws.com
```

### Environment Setup

1. **Development**: Uses fallback S3 URL if env var not set
2. **Production**: Set `NEXT_PUBLIC_AWS_CLOUD_FRONT_URL` to your CloudFront/S3 URL
3. **Local Testing**: Can use local files without S3

## Deployment

### Pre-deployment

1. Set `NEXT_PUBLIC_AWS_CLOUD_FRONT_URL` environment variable
2. Update local translation files
3. Upload to S3: `npm run upload-translations:all`
4. Verify translations are accessible

### Post-deployment

- Translations can be updated on S3 without code changes
- Changes take effect within 1 hour (cache duration)
- Emergency fallback to local files always available

## Troubleshooting

### Translations Not Loading

1. Check S3 URL accessibility
2. Verify JSON format is valid
3. Check browser console for errors
4. Clear cache: `clearTranslationCache()`

### Cache Issues

1. Clear cache: `clearTranslationCache()`
2. Check cache status: `getCacheStatus()`
3. Wait for cache expiration (5 minutes)

### Upload Issues

1. Verify S3 permissions
2. Check file format and encoding
3. Ensure JSON is valid
4. Check network connectivity
