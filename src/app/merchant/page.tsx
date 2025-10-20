'use client';

import { useState, useMemo, useEffect } from 'react';
import { FaBuilding, FaGlobe, FaUser, FaStripe, FaInfoCircle, FaChevronDown, FaSearch, FaMapMarkerAlt, FaEnvelope, FaPhone, FaExternalLinkAlt, FaEye, FaEyeSlash } from 'react-icons/fa';

import crypto from 'crypto-js';
import querystring from 'querystring';

interface MerchantFormData {
  orgName: string;
  companyEmail: string;
  companyPhoneNumber: string;
  companyAddress: string;
  country: string;
  code: string;
  userName: string;
  password: string;
  verifyPassword: string;
  logo: string;
  website: string;
  companyDescription: string;
  stripeAccount: string;
  usePlatformAccount: boolean;
  stripeConnected: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// Country Dropdown Component
interface CountryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function CountryDropdown({ value, onChange, error }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Static country list to avoid hydration issues
  const countries = useMemo(() => [
    { "code": "AF", "name": "Afghanistan" },
  { "code": "AL", "name": "Albania" },
  { "code": "DZ", "name": "Algeria" },
  { "code": "AD", "name": "Andorra" },
  { "code": "AO", "name": "Angola" },
  { "code": "AR", "name": "Argentina" },
  { "code": "AM", "name": "Armenia" },
  { "code": "AU", "name": "Australia" },
  { "code": "AT", "name": "Austria" },
  { "code": "AZ", "name": "Azerbaijan" },
  { "code": "BS", "name": "Bahamas" },
  { "code": "BH", "name": "Bahrain" },
  { "code": "BD", "name": "Bangladesh" },
  { "code": "BB", "name": "Barbados" },
  { "code": "BY", "name": "Belarus" },
  { "code": "BE", "name": "Belgium" },
  { "code": "BZ", "name": "Belize" },
  { "code": "BJ", "name": "Benin" },
  { "code": "BT", "name": "Bhutan" },
  { "code": "BO", "name": "Bolivia" },
  { "code": "BA", "name": "Bosnia and Herzegovina" },
  { "code": "BW", "name": "Botswana" },
  { "code": "BR", "name": "Brazil" },
  { "code": "BN", "name": "Brunei" },
  { "code": "BG", "name": "Bulgaria" },
  { "code": "BF", "name": "Burkina Faso" },
  { "code": "BI", "name": "Burundi" },
  { "code": "KH", "name": "Cambodia" },
  { "code": "CM", "name": "Cameroon" },
  { "code": "CA", "name": "Canada" },
  { "code": "CV", "name": "Cabo Verde" },
  { "code": "CF", "name": "Central African Republic" },
  { "code": "TD", "name": "Chad" },
  { "code": "CL", "name": "Chile" },
  { "code": "CN", "name": "China" },
  { "code": "CO", "name": "Colombia" },
  { "code": "KM", "name": "Comoros" },
  { "code": "CG", "name": "Congo" },
  { "code": "CD", "name": "Congo (Democratic Republic)" },
  { "code": "CR", "name": "Costa Rica" },
  { "code": "HR", "name": "Croatia" },
  { "code": "CU", "name": "Cuba" },
  { "code": "CY", "name": "Cyprus" },
  { "code": "CZ", "name": "Czech Republic" },
  { "code": "DK", "name": "Denmark" },
  { "code": "DJ", "name": "Djibouti" },
  { "code": "DO", "name": "Dominican Republic" },
  { "code": "EC", "name": "Ecuador" },
  { "code": "EG", "name": "Egypt" },
  { "code": "SV", "name": "El Salvador" },
  { "code": "GQ", "name": "Equatorial Guinea" },
  { "code": "ER", "name": "Eritrea" },
  { "code": "EE", "name": "Estonia" },
  { "code": "SZ", "name": "Eswatini" },
  { "code": "ET", "name": "Ethiopia" },
  { "code": "FJ", "name": "Fiji" },
  { "code": "FI", "name": "Finland" },
  { "code": "FR", "name": "France" },
  { "code": "GA", "name": "Gabon" },
  { "code": "GM", "name": "Gambia" },
  { "code": "GE", "name": "Georgia" },
  { "code": "DE", "name": "Germany" },
  { "code": "GH", "name": "Ghana" },
  { "code": "GR", "name": "Greece" },
  { "code": "GT", "name": "Guatemala" },
  { "code": "GN", "name": "Guinea" },
  { "code": "GW", "name": "Guinea-Bissau" },
  { "code": "GY", "name": "Guyana" },
  { "code": "HT", "name": "Haiti" },
  { "code": "HN", "name": "Honduras" },
  { "code": "HK", "name": "Hong Kong" },
  { "code": "HU", "name": "Hungary" },
  { "code": "IS", "name": "Iceland" },
  { "code": "IN", "name": "India" },
  { "code": "ID", "name": "Indonesia" },
  { "code": "IR", "name": "Iran" },
  { "code": "IQ", "name": "Iraq" },
  { "code": "IE", "name": "Ireland" },
  { "code": "IL", "name": "Israel" },
  { "code": "IT", "name": "Italy" },
  { "code": "JM", "name": "Jamaica" },
  { "code": "JP", "name": "Japan" },
  { "code": "JO", "name": "Jordan" },
  { "code": "KZ", "name": "Kazakhstan" },
  { "code": "KE", "name": "Kenya" },
  { "code": "KI", "name": "Kiribati" },
  { "code": "KR", "name": "South Korea" },
  { "code": "KW", "name": "Kuwait" },
  { "code": "KG", "name": "Kyrgyzstan" },
  { "code": "LA", "name": "Laos" },
  { "code": "LV", "name": "Latvia" },
  { "code": "LB", "name": "Lebanon" },
  { "code": "LS", "name": "Lesotho" },
  { "code": "LR", "name": "Liberia" },
  { "code": "LY", "name": "Libya" },
  { "code": "LI", "name": "Liechtenstein" },
  { "code": "LT", "name": "Lithuania" },
  { "code": "LU", "name": "Luxembourg" },
  { "code": "MG", "name": "Madagascar" },
  { "code": "MW", "name": "Malawi" },
  { "code": "MY", "name": "Malaysia" },
  { "code": "MV", "name": "Maldives" },
  { "code": "ML", "name": "Mali" },
  { "code": "MT", "name": "Malta" },
  { "code": "MH", "name": "Marshall Islands" },
  { "code": "MR", "name": "Mauritania" },
  { "code": "MU", "name": "Mauritius" },
  { "code": "MX", "name": "Mexico" },
  { "code": "MD", "name": "Moldova" },
  { "code": "MC", "name": "Monaco" },
  { "code": "MN", "name": "Mongolia" },
  { "code": "ME", "name": "Montenegro" },
  { "code": "MA", "name": "Morocco" },
  { "code": "MZ", "name": "Mozambique" },
  { "code": "MM", "name": "Myanmar" },
  { "code": "NA", "name": "Namibia" },
  { "code": "NP", "name": "Nepal" },
  { "code": "NL", "name": "Netherlands" },
  { "code": "NZ", "name": "New Zealand" },
  { "code": "NI", "name": "Nicaragua" },
  { "code": "NE", "name": "Niger" },
  { "code": "NG", "name": "Nigeria" },
  { "code": "MK", "name": "North Macedonia" },
  { "code": "NO", "name": "Norway" },
  { "code": "OM", "name": "Oman" },
  { "code": "PK", "name": "Pakistan" },
  { "code": "PW", "name": "Palau" },
  { "code": "PA", "name": "Panama" },
  { "code": "PG", "name": "Papua New Guinea" },
  { "code": "PY", "name": "Paraguay" },
  { "code": "PE", "name": "Peru" },
  { "code": "PH", "name": "Philippines" },
  { "code": "PL", "name": "Poland" },
  { "code": "PT", "name": "Portugal" },
  { "code": "QA", "name": "Qatar" },
  { "code": "RO", "name": "Romania" },
  { "code": "RU", "name": "Russia" },
  { "code": "RW", "name": "Rwanda" },
  { "code": "KN", "name": "Saint Kitts and Nevis" },
  { "code": "LC", "name": "Saint Lucia" },
  { "code": "VC", "name": "Saint Vincent and the Grenadines" },
  { "code": "WS", "name": "Samoa" },
  { "code": "SM", "name": "San Marino" },
  { "code": "ST", "name": "Sao Tome and Principe" },
  { "code": "SA", "name": "Saudi Arabia" },
  { "code": "SN", "name": "Senegal" },
  { "code": "RS", "name": "Serbia" },
  { "code": "SC", "name": "Seychelles" },
  { "code": "SL", "name": "Sierra Leone" },
  { "code": "SG", "name": "Singapore" },
  { "code": "SK", "name": "Slovakia" },
  { "code": "SI", "name": "Slovenia" },
  { "code": "SB", "name": "Solomon Islands" },
  { "code": "SO", "name": "Somalia" },
  { "code": "ZA", "name": "South Africa" },
  { "code": "SS", "name": "South Sudan" },
  { "code": "ES", "name": "Spain" },
  { "code": "LK", "name": "Sri Lanka" },
  { "code": "SD", "name": "Sudan" },
  { "code": "SR", "name": "Suriname" },
  { "code": "SE", "name": "Sweden" },
  { "code": "CH", "name": "Switzerland" },
  { "code": "SY", "name": "Syria" },
  { "code": "TW", "name": "Taiwan" },
  { "code": "TJ", "name": "Tajikistan" },
  { "code": "TZ", "name": "Tanzania" },
  { "code": "TH", "name": "Thailand" },
  { "code": "TL", "name": "Timor-Leste" },
  { "code": "TG", "name": "Togo" },
  { "code": "TO", "name": "Tonga" },
  { "code": "TT", "name": "Trinidad and Tobago" },
  { "code": "TN", "name": "Tunisia" },
  { "code": "TR", "name": "Turkey" },
  { "code": "TM", "name": "Turkmenistan" },
  { "code": "TV", "name": "Tuvalu" },
  { "code": "UG", "name": "Uganda" },
  { "code": "UA", "name": "Ukraine" },
  { "code": "AE", "name": "United Arab Emirates" },
  { "code": "GB", "name": "United Kingdom" },
  { "code": "US", "name": "United States" },
  { "code": "UY", "name": "Uruguay" },
  { "code": "UZ", "name": "Uzbekistan" },
  { "code": "VU", "name": "Vanuatu" },
  { "code": "VA", "name": "Vatican City" },
  { "code": "VE", "name": "Venezuela" },
  { "code": "VN", "name": "Vietnam" },
  { "code": "YE", "name": "Yemen" },
  { "code": "ZM", "name": "Zambia" },
  { "code": "ZW", "name": "Zimbabwe" }
    
  ], []);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    return countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [countries, searchTerm]);

  const selectedCountry = countries.find(c => c.name === value);

  const handleCountrySelect = (countryName: string) => {
    onChange(countryName);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
          error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
        }`}
        style={{ 
          background: 'var(--surface)', 
          color: 'var(--foreground)'
        }}
      >
        <div className="flex items-center justify-between">
          <span className={selectedCountry ? 'text-current' : 'text-gray-500'}>
            {selectedCountry ? selectedCountry.name : 'Select a country'}
          </span>
          <FaChevronDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />
          
          {/* Dropdown */}
          <div className="absolute z-50 w-full mt-2 rounded-xl border-2 border-gray-200 shadow-lg max-h-64 overflow-hidden"
               style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            {/* Search Input */}
            <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  style={{ 
                    background: 'var(--surface)', 
                    color: 'var(--foreground)',
                    borderColor: 'var(--border)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Country List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country.name)}
                    className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors ${
                      value === country.name ? 'bg-indigo-100 text-indigo-700' : ''
                    }`}
                    style={{ 
                      color: 'var(--foreground)',
                      background: value === country.name ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{country.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{country.code}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-gray-500">
                  No countries found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MerchantRegistrationPage() {
  const [formData, setFormData] = useState<MerchantFormData>({
    orgName: '',
    companyEmail: '',
    companyPhoneNumber: '',
    companyAddress: '',
    country: 'Finland',
    code: '',
    userName: '',
    password: '',
    verifyPassword: '',
    logo: '',
    website: '',
    companyDescription: '',
    stripeAccount: '',
    usePlatformAccount: true,
    stripeConnected: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [oauthAttempts, setOauthAttempts] = useState(0);
  const [lastOauthAttempt, setLastOauthAttempt] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (submitMessage) {
      const timer = setTimeout(() => {
        setSubmitMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitMessage]);

  // Restore form data from session storage on page load
  useEffect(() => {
    const savedFormData = sessionStorage.getItem('merchant_form_data');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData(parsedData);
        console.log('Form data restored from session storage:', parsedData);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
        sessionStorage.removeItem('merchant_form_data');
      }
    }
  }, []);

  // Password validation function
  const validatePassword = (password: string) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  };

  // Verify password validation function
  const validateVerifyPassword = (password: string, verifyPassword: string) => {
    if (!verifyPassword) return { isValid: false, errors: ['Please confirm your password'] };
    if (password !== verifyPassword) return { isValid: false, errors: ['Passwords do not match'] };
    return { isValid: true, errors: [] };
  };

  // Stripe OAuth function
  const initiateStripeOAuth = () => {
    // Rate limiting: Max 3 attempts per 5 minutes
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    if (lastOauthAttempt && lastOauthAttempt > fiveMinutesAgo && oauthAttempts >= 3) {
      setSubmitMessage({
        type: 'error',
        message: 'Too many OAuth attempts. Please wait 5 minutes before trying again.'
      });
      return;
    }
    
    // Update rate limiting counters
    if (lastOauthAttempt && lastOauthAttempt > fiveMinutesAgo) {
      setOauthAttempts(prev => prev + 1);
    } else {
      setOauthAttempts(1);
    }
    setLastOauthAttempt(now);
    
    // Save current form data to session storage before OAuth
    sessionStorage.setItem('merchant_form_data', JSON.stringify(formData));
    
    // Generate secure random state parameter to prevent CSRF attacks
    const state = crypto.lib.WordArray.random(32).toString();
    sessionStorage.setItem('stripe_oauth_state', state);
    sessionStorage.setItem('stripe_oauth_timestamp', Date.now().toString());
    
    const params = querystring.stringify({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_STRIPE_CA_CLIENT_ID,
      scope: 'read_write',
      redirect_uri: window.location.origin + window.location.pathname,
      state: state, // CSRF protection
    });

    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?${params}`;
    
    // Open OAuth in same window to handle redirect properly
    window.location.href = stripeConnectUrl;
  };

  // Check for OAuth completion (called when page loads)
  useEffect(() => {
    const checkOAuthStatus = async () => {
      // Check if we have OAuth parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      
      if (code && state) {
        // Verify state parameter to prevent CSRF attacks
        const expectedState = sessionStorage.getItem('stripe_oauth_state');
        const oauthTimestamp = sessionStorage.getItem('stripe_oauth_timestamp');
        
        if (state !== expectedState) {
          console.error('Invalid state parameter - possible CSRF attack');
          setSubmitMessage({
            type: 'error',
            message: 'Security error: Invalid OAuth state. Please try again.'
          });
          return;
        }
        
        // Check if OAuth request is not too old (max 10 minutes)
        if (oauthTimestamp) {
          const requestTime = parseInt(oauthTimestamp);
          const now = Date.now();
          const tenMinutesAgo = now - (10 * 60 * 1000);
          
          if (requestTime < tenMinutesAgo) {
            console.error('OAuth request too old - possible replay attack');
            setSubmitMessage({
              type: 'error',
              message: 'Security error: OAuth request expired. Please try again.'
            });
            return;
          }
        }
        
        // OAuth successful, exchange code for account info
        try {
          console.log('Making request to:', `${process.env.NEXT_PUBLIC_BACKOFFICE_API_URL}/api/stripe/callback`);
          console.log('Request payload:', { code, state, timestamp: Date.now() });
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_API_URL}/api/stripe/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              code,
              state,
              timestamp: Date.now()
            })
          });
          console.log('response', response);
          console.log('response.ok:', response.ok);
          console.log('response.status:', response.status);
          console.log('response.statusText:', response.statusText);
          
          if (response.ok && response.status === 200) {
            const data = await response.json();
            console.log('Response data:', data);
            
            // Validate response data
            if (data.accountId && data.connected) {
              // Restore form data from session storage and update with OAuth result
              const savedFormData = sessionStorage.getItem('merchant_form_data');
              let updatedFormData = formData;
              
              if (savedFormData) {
                try {
                  updatedFormData = JSON.parse(savedFormData);
                } catch (error) {
                  console.error('Error parsing saved form data:', error);
                }
              }
              
              setFormData({
                ...updatedFormData,
                stripeConnected: true,
                stripeAccount: data.accountId
              });
              
              // Clean up URL and session storage
              window.history.replaceState({}, document.title, window.location.pathname);
              sessionStorage.removeItem('stripe_oauth_state');
              sessionStorage.removeItem('stripe_oauth_timestamp');
              sessionStorage.removeItem('merchant_form_data'); // Clean up saved form data
              
              setSubmitMessage({
                type: 'success',
                message: 'Stripe account connected successfully!'
              });
            } else {
              console.error('Invalid response structure:', data);
              console.error('Missing accountId or verified field');
              sessionStorage.removeItem('stripe_oauth_state');
              sessionStorage.removeItem('stripe_oauth_timestamp');
              throw new Error('Invalid response from server - missing accountId or verified field');
            }
          } else {
            console.error('Response not OK:', response.status, response.statusText);
            sessionStorage.removeItem('stripe_oauth_state');
            sessionStorage.removeItem('stripe_oauth_timestamp');
            
            let errorMessage = 'Failed to connect Stripe account';
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error('Error response data:', errorData);
            } catch (parseError) {
              console.error('Could not parse error response:', parseError);
              errorMessage = `Server error: ${response.status} ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          setSubmitMessage({
            type: 'error',
            message: 'Failed to connect Stripe account. Please try again.'
          });
          sessionStorage.removeItem('stripe_oauth_state');
          sessionStorage.removeItem('stripe_oauth_timestamp');
          // Don't remove merchant_form_data on error - let user retry with their data intact
        }
      } else if (error) {
        console.error('OAuth error:', error);
        setSubmitMessage({
          type: 'error',
          message: 'Stripe authorization was cancelled or failed.'
        });
        sessionStorage.removeItem('stripe_oauth_state');
        sessionStorage.removeItem('stripe_oauth_timestamp');
        // Don't remove merchant_form_data on cancellation - let user retry with their data intact
      }
    };

    checkOAuthStatus();
  }, [formData]);

  const mandatoryFields = useMemo(() => [
    'orgName', 'companyEmail', 'companyPhoneNumber', 
    'companyAddress', 'country', 'userName', 'password', 
    'verifyPassword', 'companyDescription'
  ], []);

  // Check if form is valid for submit button
  const isFormValid = useMemo(() => {
    // Check all mandatory fields
    const mandatoryFieldsValid = mandatoryFields.every(field => {
      const value = formData[field as keyof MerchantFormData];
      return typeof value === 'string' ? value.trim() !== '' : Boolean(value);
    });

    // Check email formats
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail);
    const userNameValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.userName);

    // Check password match and strength
    const passwordValidation = validatePassword(formData.password);
    const verifyPasswordValidation = validateVerifyPassword(formData.password, formData.verifyPassword);
    const passwordMatch = passwordValidation.isValid && verifyPasswordValidation.isValid;

    // Check phone number format
    const phoneValid = /^\+?[\d\s\-\(\)]+$/.test(formData.companyPhoneNumber);

    // Check custom Stripe account if selected
    const stripeValid = formData.usePlatformAccount || formData.stripeConnected;

    // Check optional URL fields if provided
    const websiteValid = !formData.website || /^https?:\/\/.+/.test(formData.website);
    const logoValid = !formData.logo || /^https?:\/\/.+/.test(formData.logo);

    return mandatoryFieldsValid && 
           emailValid && 
           userNameValid && 
           passwordMatch && 
           phoneValid && 
           stripeValid && 
           websiteValid && 
           logoValid;
  }, [formData, mandatoryFields]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate mandatory fields
    mandatoryFields.forEach(field => {
      const value = formData[field as keyof MerchantFormData];
      // For string fields, check for empty string after trim; for boolean, check for false
      if (
        (typeof value === 'string' && !value.trim()) ||
        (typeof value === 'boolean' && !value)
      ) {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
      }
    });

    // Email validation
    if (formData.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail)) {
      newErrors.companyEmail = 'Please enter a valid email address';
    }

    // Username validation (should be email format)
    if (formData.userName && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.userName)) {
      newErrors.userName = 'Username must be a valid email address';
    }

    // Password validation
    if (formData.password) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = `Password must contain ${passwordValidation.errors.join(', ')}`;
      }
    }

    // Password confirmation
    if (formData.verifyPassword) {
      const verifyPasswordValidation = validateVerifyPassword(formData.password, formData.verifyPassword);
      if (!verifyPasswordValidation.isValid) {
        newErrors.verifyPassword = verifyPasswordValidation.errors[0];
      }
    }

    // Phone number validation (basic)
    if (formData.companyPhoneNumber && !/^\+?[\d\s\-\(\)]+$/.test(formData.companyPhoneNumber)) {
      newErrors.companyPhoneNumber = 'Please enter a valid phone number';
    }

    // Website validation (optional but if provided should be valid)
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    // Logo URL validation (optional but if provided should be valid)
    if (formData.logo && !/^https?:\/\/.+/.test(formData.logo)) {
      newErrors.logo = 'Logo URL must start with http:// or https://';
    }

    // Custom Stripe account validation
    if (!formData.usePlatformAccount && !formData.stripeConnected) {
      newErrors.stripeAccount = 'Please connect your Stripe account or use platform account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof MerchantFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation for verify password
    if (field === 'verifyPassword' && typeof value === 'string') {
      const verifyPasswordValidation = validateVerifyPassword(formData.password, value);
      if (!verifyPasswordValidation.isValid) {
        setErrors(prev => ({ ...prev, verifyPassword: verifyPasswordValidation.errors[0] }));
      } else {
        setErrors(prev => ({ ...prev, verifyPassword: '' }));
      }
    }
    
    // Real-time validation for password (to update verify password if it exists)
    if (field === 'password' && typeof value === 'string' && formData.verifyPassword) {
      const verifyPasswordValidation = validateVerifyPassword(value, formData.verifyPassword);
      if (!verifyPasswordValidation.isValid) {
        setErrors(prev => ({ ...prev, verifyPassword: verifyPasswordValidation.errors[0] }));
      } else {
        setErrors(prev => ({ ...prev, verifyPassword: '' }));
      }
    }
    
    // Clear error when user starts typing (for other fields)
    if (field !== 'verifyPassword' && field !== 'password' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Prepare payload
      const payload = {
        orgName: formData.orgName,
        companyEmail: formData.companyEmail,
        companyPhoneNumber: formData.companyPhoneNumber,
        companyAddress: formData.companyAddress,
        country: formData.country,
        code: formData.code || undefined,
        userName: formData.userName,
        password: formData.password,
        verifyPassword: formData.verifyPassword,
        logo: formData.logo || undefined,
        website: formData.website || undefined,
        companyDescription: formData.companyDescription,
        stripeAccount: formData.usePlatformAccount ? 'platform' : (formData.stripeAccount || undefined),
      };

      // Remove undefined values
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined)
      );

      // Generate encrypted timestamp for security
      const timestamp = Date.now().toString();
      const encryptedTimestamp = crypto.AES.encrypt(timestamp, process.env.NEXT_PUBLIC_CRYPTO_KEY || '').toString();

      console.log('Submitting merchant registration:', cleanPayload);
      
      // Make API call to backoffice using fetch with security headers
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKOFFICE_API_URL}/backoffice/merchant/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Merchant-Request-Key': encryptedTimestamp,
        },
        body: JSON.stringify(cleanPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific security errors
        if (response.status === 400) {
          if (errorData.message?.includes('too old') || errorData.message?.includes('invalid key')) {
            throw new Error('Request expired or invalid. Please refresh the page and try again.');
          }
        }
        
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      await response.json();
      
      setSubmitMessage({
        type: 'success',
        message: 'Merchant registration submitted successfully! We will review your application and get back to you soon.'
      });

      // Reset form
      setFormData({
        orgName: '',
        companyEmail: '',
        companyPhoneNumber: '',
        companyAddress: '',
        country: 'Finland',
        code: '',
        userName: '',
        password: '',
        verifyPassword: '',
        logo: '',
        website: '',
        companyDescription: '',
        stripeAccount: '',
        usePlatformAccount: true,
        stripeConnected: false,
      });
      setErrors({});
      
      // Keep submit button disabled after success
      setIsSubmitting(true);

    } catch (error: unknown) {
      console.error('Registration error:', error);
      
      setSubmitMessage({
        type: 'error',
        message: (error instanceof Error ? error.message : 'Failed to submit registration. Please try again or contact support.')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Modern Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
          }}></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <FaBuilding className="mr-2" />
              <span className="text-sm font-medium">Merchant Portal</span>
            </div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
              Join Our Platform
            </h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              Start selling tickets for your events with our powerful merchant tools and reach thousands of potential customers
            </p>
          </div>
        </div>
      </section>

      {/* Modern Registration Form */}
      <section className="py-16 -mt-8 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Form Container with Glass Effect */}
            <div 
              className="relative rounded-3xl p-8 md:p-12 backdrop-blur-xl border"
              style={{ 
                background: 'var(--surface)', 
                color: 'var(--foreground)',
                borderColor: 'var(--border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-t-3xl"></div>
              
              <form onSubmit={handleSubmit} className="space-y-12">
                
                {/* Company Information - Card Style */}
                <div className="relative">
                  <div className="flex items-center mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white mr-4">
                      <FaBuilding className="text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Company Information</h2>
                      <p className="text-sm opacity-70">Tell us about your organization</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="orgName" className="block text-sm font-semibold">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        id="orgName"
                        value={formData.orgName}
                        onChange={(e) => handleInputChange('orgName', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.orgName ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="Your organization name"
                      />
                      {errors.orgName && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.orgName}
                      </p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="companyEmail" className="block text-sm font-semibold flex items-center">
                        <FaEnvelope className="mr-2 text-indigo-500" />
                        Company Email *
                      </label>
                      <input
                        type="email"
                        id="companyEmail"
                        value={formData.companyEmail}
                        onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.companyEmail ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="company@example.com"
                      />
                      {errors.companyEmail && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.companyEmail}
                      </p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="companyPhoneNumber" className="block text-sm font-semibold flex items-center">
                        <FaPhone className="mr-2 text-indigo-500" />
                        Company Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="companyPhoneNumber"
                        value={formData.companyPhoneNumber}
                        onChange={(e) => handleInputChange('companyPhoneNumber', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.companyPhoneNumber ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="+358445359448"
                      />
                      {errors.companyPhoneNumber && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.companyPhoneNumber}
                      </p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="code" className="block text-sm font-semibold">
                        Business Code
                      </label>
                      <input
                        type="text"
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="2589566-4"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="companyAddress" className="block text-sm font-semibold flex items-center">
                        <FaMapMarkerAlt className="mr-2 text-indigo-500" />
                        Company Address *
                      </label>
                      <input
                        type="text"
                        id="companyAddress"
                        value={formData.companyAddress}
                        onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.companyAddress ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="Laajavuorenkuja 3d 36"
                      />
                      {errors.companyAddress && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.companyAddress}
                      </p>}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="country" className="block text-sm font-semibold">
                          Country *
                        </label>
                        <CountryDropdown
                          value={formData.country}
                          onChange={(value) => handleInputChange('country', value)}
                          error={errors.country}
                        />
                        {errors.country && <p className="text-sm text-red-500 flex items-center mt-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                          {errors.country}
                        </p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="companyDescription" className="block text-sm font-semibold">
                          Company Description *
                        </label>
                        <textarea
                          id="companyDescription"
                          value={formData.companyDescription}
                          onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                          rows={3}
                          className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none ${
                            errors.companyDescription ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ 
                            background: 'var(--surface)', 
                            color: 'var(--foreground)'
                          }}
                          placeholder="Describe your company and what kind of events you organize..."
                        />
                        {errors.companyDescription && <p className="text-sm text-red-500 flex items-center mt-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                          {errors.companyDescription}
                        </p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Account Information - Card Style */}
                <div className="relative">
                  <div className="flex items-center mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white mr-4">
                      <FaUser className="text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">User Account</h2>
                      <p className="text-sm opacity-70">Create your system access credentials</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="userName" className="block text-sm font-semibold">
                        Username (Email) *
                      </label>
                      <input
                        type="email"
                        id="userName"
                        value={formData.userName}
                        onChange={(e) => handleInputChange('userName', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.userName ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="user@example.com"
                      />
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <FaInfoCircle className="mr-1" />
                        This will be your username to access the system
                      </div>
                      {errors.userName && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.userName}
                      </p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="password" className="block text-sm font-semibold">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                            errors.password ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ 
                            background: 'var(--surface)', 
                            color: 'var(--foreground)'
                          }}
                          placeholder="Enter a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.password}
                      </p>}
                      
                      {/* Password strength indicator */}
                      {formData.password && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-gray-600">Password requirements:</div>
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className="w-1 h-1 rounded-full mr-2" style={{backgroundColor: formData.password.length >= 8 ? '#10B981' : '#9CA3AF'}}></span>
                              At least 8 characters
                            </div>
                            <div className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className="w-1 h-1 rounded-full mr-2" style={{backgroundColor: /[A-Z]/.test(formData.password) ? '#10B981' : '#9CA3AF'}}></span>
                              One uppercase letter
                            </div>
                            <div className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className="w-1 h-1 rounded-full mr-2" style={{backgroundColor: /[a-z]/.test(formData.password) ? '#10B981' : '#9CA3AF'}}></span>
                              One lowercase letter
                            </div>
                            <div className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className="w-1 h-1 rounded-full mr-2" style={{backgroundColor: /\d/.test(formData.password) ? '#10B981' : '#9CA3AF'}}></span>
                              One number
                            </div>
                            <div className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600' : 'text-gray-400'}`}>
                              <span className="w-1 h-1 rounded-full mr-2" style={{backgroundColor: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '#10B981' : '#9CA3AF'}}></span>
                              One special character
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verifyPassword" className="block text-sm font-semibold">
                        Verify Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showVerifyPassword ? "text" : "password"}
                          id="verifyPassword"
                          value={formData.verifyPassword}
                          onChange={(e) => handleInputChange('verifyPassword', e.target.value)}
                          className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                            errors.verifyPassword ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ 
                            background: 'var(--surface)', 
                            color: 'var(--foreground)'
                          }}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          {showVerifyPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.verifyPassword && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.verifyPassword}
                      </p>}
                    </div>
                  </div>
                </div>

                {/* Additional Information - Card Style */}
                <div className="relative">
                  <div className="flex items-center mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white mr-4">
                      <FaGlobe className="text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Additional Information</h2>
                      <p className="text-sm opacity-70">Optional details to enhance your profile</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="website" className="block text-sm font-semibold">
                        Website
                      </label>
                      <input
                        type="url"
                        id="website"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.website ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="https://yourcompany.com"
                      />
                      {errors.website && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.website}
                      </p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="logo" className="block text-sm font-semibold">
                        Logo URL
                      </label>
                      <input
                        type="url"
                        id="logo"
                        value={formData.logo}
                        onChange={(e) => handleInputChange('logo', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                          errors.logo ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ 
                          background: 'var(--surface)', 
                          color: 'var(--foreground)'
                        }}
                        placeholder="https://example.com/logo.png"
                      />
                      {errors.logo && <p className="text-sm text-red-500 flex items-center mt-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                        {errors.logo}
                      </p>}
                    </div>
                  </div>
                </div>

                {/* Payment Information - Card Style */}
                <div className="relative">
                  <div className="flex items-center mb-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white mr-4">
                      <FaStripe className="text-lg" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Payment Setup</h2>
                      <p className="text-sm opacity-70">Configure your payment processing</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          formData.usePlatformAccount 
                            ? 'border-indigo-500 bg-indigo-50/50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleInputChange('usePlatformAccount', true)}
                        style={{ background: formData.usePlatformAccount ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface)' }}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="usePlatformAccount"
                            name="stripeOption"
                            checked={formData.usePlatformAccount}
                            onChange={() => handleInputChange('usePlatformAccount', true)}
                            className="mr-3"
                          />
                          <div>
                            <label htmlFor="usePlatformAccount" className="text-sm font-semibold cursor-pointer">
                              Use Platform Account
                            </label>
                            <p className="text-xs opacity-70 mt-1">Recommended for most merchants</p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          !formData.usePlatformAccount 
                            ? 'border-indigo-500 bg-indigo-50/50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleInputChange('usePlatformAccount', false)}
                        style={{ background: !formData.usePlatformAccount ? 'rgba(99, 102, 241, 0.05)' : 'var(--surface)' }}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="useCustomAccount"
                            name="stripeOption"
                            checked={!formData.usePlatformAccount}
                            onChange={() => handleInputChange('usePlatformAccount', false)}
                            className="mr-3"
                          />
                          <div>
                            <label htmlFor="useCustomAccount" className="text-sm font-semibold cursor-pointer">
                              Custom Stripe Account
                            </label>
                            <p className="text-xs opacity-70 mt-1">For advanced users</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!formData.usePlatformAccount && (
                      <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-xl border-2 border-dashed" style={{ 
                          background: 'var(--surface)', 
                          borderColor: formData.stripeConnected ? '#10B981' : 'var(--border)'
                        }}>
                          <div className="text-center">
                            {formData.stripeConnected ? (
                              <div className="space-y-3">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                  <span className="text-2xl">✅</span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-green-600">Stripe Account Connected!</h3>
                                  <p className="text-sm text-gray-600 mt-1">Your Stripe account has been successfully connected.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, stripeConnected: false, stripeAccount: '' }))}
                                  className="text-sm text-red-600 hover:text-red-700 underline"
                                >
                                  Disconnect Account
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                  <FaStripe className="text-2xl text-indigo-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold">Connect Your Stripe Account</h3>
                                  <p className="text-sm text-gray-600 mt-1">Click the button below to securely connect your Stripe account</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={initiateStripeOAuth}
                                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                                >
                                  <FaStripe className="mr-2" />
                                  Connect with Stripe
                                  <FaExternalLinkAlt className="ml-2 text-sm" />
                                </button>
                                <p className="text-xs text-gray-500">
                                  You&apos;ll be redirected to Stripe to authorize the connection
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {errors.stripeAccount && (
                          <p className="text-sm text-red-500 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {errors.stripeAccount}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-8">
                  {submitMessage && (
                    <div className={`mb-6 p-4 rounded-xl border ${
                      submitMessage.type === 'success' 
                        ? 'bg-green-50 text-green-800 border-green-200' 
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          submitMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        {submitMessage.message}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full py-4 px-8 font-semibold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-200 transform ${
                      isFormValid && !isSubmitting
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98]'
                        : isSubmitting && submitMessage?.type === 'success'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      submitMessage?.type === 'success' ? (
                        <div className="flex items-center justify-center">
                          <span className="mr-2">✅</span>
                          Registration Submitted Successfully!
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                          Submitting Registration...
                        </div>
                      )
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
