// S3 Translation Manager for handling S3 operations
export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class S3TranslationManager {
  private config: S3Config;
  private baseUrl: string;

  constructor(config: S3Config) {
    this.config = config;
    this.baseUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
  }

  // Get S3 URL for a translation file
  getTranslationUrl(locale: string): string {
    return `${this.baseUrl}/locale/${locale}.json`;
  }

  // Check if translation file exists in S3
  async checkTranslationExists(locale: string): Promise<boolean> {
    try {
      const response = await fetch(this.getTranslationUrl(locale), { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`Failed to check if translation exists for ${locale}:`, error);
      return false;
    }
  }

  // Load translation from S3
  async loadTranslation(locale: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(this.getTranslationUrl(locale));
      if (!response.ok) {
        throw new Error(`Failed to load translation from S3: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to load translation from S3 for ${locale}:`, error);
      throw error;
    }
  }

  // Get base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Default S3 manager instance
export const defaultS3Manager = new S3TranslationManager({
  bucket: 'finnep-eventapp-test',
  region: 'eu-central-1'
});
