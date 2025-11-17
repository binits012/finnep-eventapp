# Development Cost Breakdown - Finnep Event App
## Internal Employee Costs (Finnish Market)

### Executive Summary

**Total Project Cost: €17,000 - €22,000**

This document provides a detailed cost breakdown for developing the Finnep Event App using internal employees in the Finnish market, including all employer costs and overhead.

---

## Application Overview

### What is Finnep Event App?

Finnep Event App is a modern, full-featured event ticketing and discovery platform designed for the Finnish and Nordic markets. Built with Next.js 15 and TypeScript, it provides a seamless experience for users to discover, browse, and purchase tickets for various events including concerts, festivals, conferences, and cultural events.

### Key Features

#### 1. Event Discovery & Browsing
- **Homepage with Hero Carousel:** Dynamic carousel showcasing featured events with video/image support
- **Event Listing Page:** Comprehensive event browsing with grid/list views
- **Event Categories:** Filter events by type, date, location, and status
- **Search Functionality:** Advanced search with filtering capabilities
- **Featured Events:** Priority-based featured event system with sticky and regular featured types
- **Ongoing Events:** Real-time display of events happening today
- **Infinite Scroll:** Seamless loading of upcoming events

#### 2. Event Details & Information
- **Comprehensive Event Pages:** Detailed event information including:
  - Event title, description, and date/time
  - Venue information with address and location
  - Interactive maps (Leaflet integration) showing event location
  - Image and video galleries
  - Social media links (Facebook, Twitter, Instagram, TikTok)
  - Event tags and categories
  - Ticket availability and pricing
- **Multi-media Support:** Image galleries and embedded video support (YouTube, Vimeo, TED)
- **Timezone Support:** Proper timezone handling for accurate event times

#### 3. Ticket Management
- **Multiple Ticket Types:** Support for various ticket tiers with different pricing
- **Dynamic Pricing:** Base price, service fees, and VAT calculations
- **Real-time Availability:** Live ticket availability tracking
- **Quantity Selection:** Flexible quantity selection for ticket purchases
- **Price Breakdown:** Transparent pricing with detailed cost breakdown (subtotal, service fee, VAT, total)

#### 4. Payment Integration
- **Stripe Payment Processing:** Full Stripe integration for secure payments
- **Secure Checkout Flow:** Multi-step checkout process with:
  - Customer information collection
  - Payment method entry (Stripe CardElement)
  - Order summary and confirmation
  - Receipt generation
- **Payment Intent Management:** Server-side payment intent creation and confirmation
- **Error Handling:** Comprehensive error handling for payment failures
- **Success Token System:** Secure success token generation and validation

#### 5. Internationalization (i18n)
- **Multi-language Support:** Full support for 5 languages:
  - English (en-US)
  - Finnish (fi-FI)
  - Swedish (sv-SE)
  - Danish (da-DK)
  - Norwegian (no-NO)
- **Dynamic Translation System:** S3-based translation loading with local fallback
- **Locale-specific Features:**
  - Currency conversion and display
  - Date/time formatting per locale
  - Country-specific settings
- **Real-time Translation Updates:** Translations can be updated via S3 without code deployment
- **Translation Caching:** 5-minute cache for optimal performance

#### 6. User Experience
- **Responsive Design:** Fully responsive design for desktop, tablet, and mobile devices
- **Dark/Light Theme:** System-aware theme switching with user preference support
- **Loading States:** Skeleton loaders and loading indicators
- **Error Handling:** User-friendly error messages and fallback states
- **Accessibility:** WCAG-compliant design with proper semantic HTML
- **Performance Optimization:** Optimized images, lazy loading, and code splitting

#### 7. SEO & Discoverability
- **Dynamic Metadata:** Per-page SEO metadata generation
- **Structured Data (JSON-LD):** Schema.org markup for events, organizations, and websites
- **Open Graph Tags:** Social media sharing optimization
- **Twitter Cards:** Twitter-specific metadata
- **Sitemap Generation:** Dynamic sitemap for search engines
- **Robots.txt:** Search engine crawling configuration
- **Canonical URLs:** Proper canonical URL management

#### 8. Additional Pages & Features
- **About Page:** Company information and mission
- **Contact Page:** Contact form and information
- **Careers Page:** Job listings and career opportunities
- **Venues Page:** Venue directory and information
- **Terms & Conditions:** Legal terms and conditions
- **Privacy Policy:** Privacy policy and data handling
- **Merchant Page:** Merchant-specific information
- **Success Page:** Post-purchase confirmation and ticket information

#### 9. Technical Architecture
- **Next.js 15:** Latest Next.js with App Router
- **TypeScript:** Full type safety throughout the application
- **React 19:** Latest React with modern hooks and patterns
- **Tailwind CSS 4:** Utility-first CSS framework
- **Context API:** Global state management with React Context
- **API Client:** Centralized API client with error handling
- **Type Definitions:** Comprehensive TypeScript interfaces

#### 10. Third-party Integrations
- **Stripe:** Payment processing
- **AWS S3/CloudFront:** Translation file hosting and CDN
- **Leaflet Maps:** Interactive map functionality
- **FontAwesome & React Icons:** Icon library
- **Framer Motion:** Animation library
- **Day.js:** Date manipulation and formatting

### Target Market

The application is designed for:
- **Primary Market:** Finland and Nordic region (Sweden, Denmark, Norway)
- **Event Organizers:** Merchants and event organizers looking to sell tickets
- **End Users:** Event-goers seeking to discover and purchase tickets for various events
- **Languages:** English, Finnish, Swedish, Danish, Norwegian speakers

### Technical Requirements

- **Frontend Framework:** Next.js 15 with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Payment Gateway:** Stripe
- **Hosting:** Compatible with Vercel, AWS, or similar platforms
- **Translation Storage:** AWS S3 with CloudFront CDN
- **Browser Support:** Modern browsers (Chrome, Firefox, Safari, Edge)

### Business Value

The platform enables:
- **Event Discovery:** Easy discovery of events across Finland and Nordic region
- **Ticket Sales:** Streamlined ticket purchasing process
- **Merchant Support:** Multi-merchant support with individual branding
- **International Reach:** Multi-language support for broader audience
- **SEO Optimization:** Better discoverability through search engines
- **Mobile-first:** Accessible on all devices

---

## 1. Finnish Market Rates (2024-2025)

### Monthly Salaries
- **Junior Developer:** €3,500 - €4,400/month
- **Mid-Level Developer:** €4,200 - €5,500/month
- **Senior Developer:** €5,300 - €7,000/month

### Hourly Rates (160 working hours/month)
- **Junior Developer:** €21.88 - €27.50/hour
- **Mid-Level Developer:** €26.25 - €34.38/hour
- **Senior Developer:** €33.13 - €43.75/hour

### Total Employer Cost (Salary + 25% Employer Contributions)
- **Junior Developer:** €27.34 - €34.38/hour
- **Mid-Level Developer:** €32.81 - €42.98/hour
- **Senior Developer:** €41.41 - €54.69/hour

> **Note:** Employer contributions include:
> - Social security (TyEL): ~17%
> - Unemployment insurance: ~1.5%
> - Accident insurance: ~0.5%
> - Other statutory costs: ~6%
> - **Total: ~25%**

---

## 2. Detailed Cost Breakdown by Component

### 2.1 Core Infrastructure & Setup
- **Description:** Next.js 15 setup, TypeScript configuration, Tailwind CSS, project structure
- **Hours:** 16-20 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €560 - €700

### 2.2 Internationalization (i18n)
- **Description:** Multi-locale support (5 languages), S3 translation system, caching, locale utilities
- **Hours:** 40-50 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €1,400 - €1,750

### 2.3 Core Pages & Components

#### 2.3.1 Homepage
- **Description:** Hero carousel, event filtering, infinite scroll, galleries
- **Hours:** 24-30 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €840 - €1,050

#### 2.3.2 Event Listing
- **Description:** Grid/list views, search, filtering, pagination
- **Hours:** 20-25 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €700 - €875

#### 2.3.3 Event Detail
- **Description:** Event display, ticket selection, interactive map, galleries, SEO
- **Hours:** 35-45 hours
- **Rate:** €45/hour (Senior)
- **Cost:** €1,575 - €2,025

#### 2.3.4 Checkout
- **Description:** Stripe integration, payment flow, price calculations
- **Hours:** 30-40 hours
- **Rate:** €45/hour (Senior)
- **Cost:** €1,350 - €1,800

#### 2.3.5 Other Pages
- **Description:** About, Contact, Careers, Venues, Terms, Privacy, Merchant, Success
- **Hours:** 30-40 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €1,050 - €1,400

**Total Core Pages:** €4,615 - €6,150

### 2.4 Payment Integration
- **Description:** Stripe setup, payment intents, error handling, success flow
- **Hours:** 25-35 hours
- **Rate:** €45/hour (Senior)
- **Cost:** €1,125 - €1,575

### 2.5 UI/UX Components
- **Description:** Header, Footer, Modals, Loading states, Theme system
- **Hours:** 20-28 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €700 - €980

### 2.6 State Management & Data Flow
- **Description:** Contexts, API client, data fetching, caching
- **Hours:** 15-20 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €525 - €700

### 2.7 SEO & Performance
- **Description:** Metadata, structured data, sitemap, optimization
- **Hours:** 20-28 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €700 - €980

### 2.8 Utilities & Helpers
- **Description:** Currency conversion, date formatting, translation loaders
- **Hours:** 18-25 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €630 - €875

### 2.9 API Integration
- **Description:** REST client, error handling, type definitions
- **Hours:** 12-18 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €420 - €630

### 2.10 Testing & QA
- **Description:** Unit testing, integration testing, E2E testing, bug fixes
- **Hours:** 30-40 hours
- **Rate:** €35/hour (Mid-level)
- **Cost:** €1,050 - €1,400

### 2.11 Documentation
- **Description:** Code documentation, setup guides, API documentation
- **Hours:** 8-12 hours
- **Rate:** €30/hour (Junior/Mid)
- **Cost:** €240 - €360

---

## 3. Cost Summary Table

| Component | Low (€) | High (€) |
|-----------|---------|----------|
| Core Infrastructure | 560 | 700 |
| Internationalization | 1,400 | 1,750 |
| Core Pages | 4,615 | 6,150 |
| Payment Integration | 1,125 | 1,575 |
| UI/UX Components | 700 | 980 |
| State Management | 525 | 700 |
| SEO & Performance | 700 | 980 |
| Utilities | 630 | 875 |
| API Integration | 420 | 630 |
| Testing & QA | 1,050 | 1,400 |
| Documentation | 240 | 360 |
| **SUBTOTAL** | **11,995** | **15,900** |

---

## 4. Additional Costs

### 4.1 Project Management (10%)
- **Cost:** €1,200 - €1,590

### 4.2 Code Reviews & Quality Assurance (5%)
- **Cost:** €600 - €795

### 4.3 Meetings & Coordination (5%)
- **Cost:** €600 - €795

### 4.4 Contingency (10%)
- **Cost:** €1,200 - €1,590

**Total Additional Costs:** €3,600 - €4,770

---

## 5. Total Project Cost

**Development Cost:**
- Low: €11,995
- High: €15,900

**Additional Costs:**
- €3,600 - €4,770

**TOTAL PROJECT COST:**
- **Low: €15,595**
- **High: €20,670**

**Most Likely Scenario: €17,000 - €22,000**

---

## 6. Team Structure Options

### Option 1: 1 Mid-Level Developer
- **Rate:** €35/hour
- **Hours:** 300-400 hours
- **Cost:** €10,500 - €14,000
- **Timeline:** 4-6 months
- **Monthly Cost:** €6,062.50 (including employer costs)

### Option 2: 1 Senior Developer
- **Rate:** €45/hour
- **Hours:** 300-400 hours
- **Cost:** €13,500 - €18,000
- **Timeline:** 4-6 months
- **Monthly Cost:** €7,687.50 (including employer costs)

### Option 3: 2 Mid-Level Developers
- **Rate:** €35/hour each
- **Hours:** 300-400 hours total
- **Cost:** €10,500 - €14,000
- **Timeline:** 2.5-3.5 months
- **Monthly Cost:** €12,125 (including employer costs)

### Option 4: 1 Senior + 1 Mid-Level
- **Senior:** €45/hour × 200h = €9,000
- **Mid-Level:** €35/hour × 200h = €7,000
- **Total:** €16,000
- **Timeline:** 2.5-3.5 months
- **Monthly Cost:** €13,750 (including employer costs)

---

## 7. Timeline & Cost Summary

| Team Structure | Duration | Total Cost (€) |
|----------------|----------|----------------|
| 1 Mid-level | 4-6 months | 16,900 - 22,100 |
| 1 Senior | 4-6 months | 18,500 - 24,500 |
| 2 Mid-level | 2.5-3.5 months | 16,900 - 22,100 |
| 1 Senior + 1 Mid | 2.5-3.5 months | 19,000 - 25,000 |

---

## 8. Assumptions & Notes

### 8.1 Assumptions
- Based on Finnish market rates for 2024-2025
- Includes all employer costs (25% overhead)
- Assumes standard 160 working hours per month
- Based on existing codebase analysis
- Includes testing and documentation

### 8.2 Not Included
- Office space/equipment (assumes remote work or existing infrastructure)
- Software licenses (assumes company-provided)
- Third-party service costs (Stripe fees, AWS S3/CloudFront, hosting)
- Ongoing maintenance costs (15-20% annually)

### 8.3 Risk Factors
- First-time Next.js projects may require 10-15% additional time
- Complex integrations may require additional senior developer time
- Scope changes will increase costs proportionally

### 8.4 Efficiency Factors
- Internal teams may be 10-20% more efficient due to:
  - Better context understanding
  - Existing tooling and infrastructure
  - Direct communication channels

---

## 9. Recommendations

### Recommended Approach
**Option 4: 1 Senior + 1 Mid-Level Developer**
- **Timeline:** 2.5-3.5 months
- **Cost:** €19,000 - €25,000
- **Benefits:**
  - Faster delivery
  - Senior oversight for complex features
  - Mid-level handles standard components
  - Good balance of cost and quality

### Alternative Approach
**Option 3: 2 Mid-Level Developers**
- **Timeline:** 2.5-3.5 months
- **Cost:** €16,900 - €22,100
- **Benefits:**
  - Lower cost
  - Faster delivery
  - Good for standard features
- **Considerations:**
  - May need senior review for complex features
  - Payment integration may require senior oversight

---

## 10. Next Steps

1. **Review and Approve Budget:** €17,000 - €22,000
2. **Select Team Structure:** Based on timeline and budget constraints
3. **Define Project Timeline:** 2.5-6 months depending on team size
4. **Set Up Project Management:** Track hours and milestones
5. **Plan for Contingencies:** Reserve 10-15% for unexpected issues

---

## Document Information

**Prepared for:** Finnep Event App Development
**Date:** 2024
**Market:** Finland
**Cost Basis:** Internal Employee Costs (including employer contributions)
**Currency:** EUR (€)

---

**End of Document**