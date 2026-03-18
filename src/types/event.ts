export interface WaitlistConfig {
  pre_sale_enabled?: boolean;
  sold_out_enabled?: boolean;
  pre_sale_cap?: number;
}

export interface Event {
    _id: string;
    eventTitle: string;
    eventDescription?: string;
    eventDate: string;
    eventPromotionPhoto?: string;
    status?: string;
    venueInfo?: {
      name?: string;
      description?: string;
      media?: {
        photo?: string[];
        social?: {
          facebook?: string;
          twitter?: string;
          instagram?: string;
          tiktok?: string;
        };
        website?: string;
      };
    };
    venue?: {
      name?: string;
      address?: string;
      hasSeatSelection?: boolean;
      venueId?: string;
      externalVenueId?: string;
      lockedManifestId?: string;
      manifestS3Key?: string;
      pricing?: Record<string, number>;
      pricingModel?: 'ticket_info' | 'pricing_configuration';
    };
    /** Present on some API responses for seat + pricing_configuration events */
    pricingConfig?: {
      tiers: Array<{
        id: string;
        basePrice: number;
        tax?: number;
        serviceFee?: number;
        serviceTax?: number;
      }>;
      orderFee?: number;
      currency?: string;
    };
    city?: string;
    country?: string;
    eventLocationAddress?: string;
    eventLocationGeoCode?: string;
    ticketInfo: TicketInfo[];
    transportLink?: string;
    socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      tiktok?: string;
    };
    active?: boolean;
    occupancy?: number;
    merchant?: {
      _id?: string;
      name?: string;
      logo?: string;
      website?: string;
      merchantId?: string;
    };
    merchantId?: string;
    externalMerchantId?: string;
    ticketsSold?: number;
    eventTimezone?: string;
    videoUrl?: string;
    eventPhoto?: string[];
    otherInfo?: {
      [key: string]: string | number | boolean | null | undefined | {
        eventType?: string;
        doorSaleAllowed?: boolean;
        doorSaleExtraAmount?: string | number | null;
      };
      categoryName?: string;
      subCategoryName?: string;
      eventExtraInfo?: {
        eventType?: string;
        doorSaleAllowed?: boolean;
        doorSaleExtraAmount?: string | number | null;
      };
    };
    featured?: {
      isFeatured?: boolean;
      featuredType?: string;
      priority?: number;
      startDate?: string;
      endDate?: string;
    };
    tags?: string[];
    waitlistConfig?: WaitlistConfig;
    /** Set by backend when pre_sale cap is configured; used to disable "Join waitlist" when full */
    pre_sale_waitlist_count?: number;
    pre_sale_waitlist_cap?: number;
    /** Set by backend when ?presale=TOKEN is valid; allows showing ticket purchase UI during pre-sale */
    presaleAccess?: boolean;
  }

  export interface TicketInfo {
    _id: string;
    name: string;
    price: number; // basePrice
    quantity: number;
    available?: number;
    serviceFee?: number;
    entertainmentTax?: number; // percentage on basePrice (e.g., 14% in Finland)
    serviceTax?: number; // percentage on serviceFee (e.g., 25.5% VAT in Finland)
    orderFee?: number; // fixed amount per transaction
    vat?: number; // legacy field, kept for backward compatibility
    status?: string;
    createdAt?: string;
  }

  export interface Settings {
    _id?: string;
    aboutSection?: string;
    contactInfo?: {
      email?: string;
      phone?: string;
    };
    socialMedia?: {
      fb?: string;
      x?: string;
      instagram?: string;
    };
  }

  export interface ApiResponse {
    photo: unknown[];
    notification: unknown[];
    event: Event[];
    setting: Settings[];
  }