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
  }

  export interface TicketInfo {
    _id: string;
    name: string;
    price: number;
    quantity: number;
    available?: number;
    serviceFee?: number;
    vat?: number;
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