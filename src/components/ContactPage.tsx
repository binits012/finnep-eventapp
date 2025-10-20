'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/apiClient';

interface ContactPageProps {
  data?: {
    setting?: Array<{
      contactInfo?: {
        email?: string;
        phone?: string;
        address?: string;
      };
      socialMedia?: {
        fb?: string;
        x?: string;
        in?: string;
        ln?: string;
        tk?: string;
      };
    }>;
  };
}

export default function ContactPage({ data }: ContactPageProps) {
  const settings = data?.setting?.[0] || {};
  const contactInfo = settings?.contactInfo || {};

  // Captcha state
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaCorrect, setCaptchaCorrect] = useState(false);
  const [userCaptchaInput, setUserCaptchaInput] = useState('');

  // Generate a new captcha question
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = Math.random() > 0.5 ? '+' : '-';
    
    let question = '';
    let answer = 0;
    
    if (operation === '+') {
      question = `${num1} + ${num2} = ?`;
      answer = num1 + num2;
    } else {
      // Ensure result is positive
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      question = `${larger} - ${smaller} = ?`;
      answer = larger - smaller;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
    setCaptchaCorrect(false);
    setUserCaptchaInput('');
  };

  // Generate captcha on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  // Check captcha answer
  const checkCaptcha = (input: string) => {
    setUserCaptchaInput(input);
    setCaptchaCorrect(input === captchaAnswer);
  };

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaCorrect) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await api.post('/sendFeedback', formData);
      setSubmitStatus('success');
      
      // Reset form and generate new captcha
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        subject: '',
        message: ''
      });
      generateCaptcha();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Contact Us
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full mx-auto mb-6"></div>
          <p className="text-lg opacity-80 max-w-2xl mx-auto" style={{ color: 'var(--foreground)' }}>
            Get in touch with us. We&apos;d love to hear from you and answer any questions you may have.
          </p>
        </div>

        {/* Success/Error Messages */}
        {submitStatus === 'success' && (
          <div className="mb-8 p-6 rounded-lg border" style={{ 
            backgroundColor: 'var(--surface)', 
            borderColor: 'var(--border)' 
          }}>
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Message Sent!</h3>
                <p className="opacity-80" style={{ color: 'var(--foreground)' }}>Thank you for your message. We&apos;ll get back to you as soon as possible.</p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-8 p-6 rounded-lg border" style={{ 
            backgroundColor: 'var(--surface)', 
            borderColor: 'var(--border)' 
          }}>
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Submission Failed</h3>
                <p className="opacity-80" style={{ color: 'var(--foreground)' }}>There was an error sending your message. Please try again.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Get in Touch</h2>
              
              {/* Contact Details */}
              <div className="space-y-6">
                {contactInfo.email && (
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
                      <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Email</h3>
                      <a 
                        href={`mailto:${contactInfo.email}`}
                        className="opacity-80 hover:opacity-100 transition-colors"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>
                )}

                {contactInfo.phone && (
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
                      <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Phone</h3>
                      <a 
                        href={`tel:${contactInfo.phone}`}
                        className="opacity-80 hover:opacity-100 transition-colors"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {contactInfo.phone}
                      </a>
                    </div>
                  </div>
                )}

                {contactInfo.address && (
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
                      <svg className="w-6 h-6 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Address</h3>
                      <p className="opacity-80" style={{ color: 'var(--foreground)' }}>
                        {contactInfo.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Social Media */}
            {settings.socialMedia && (
              <div>
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Follow Us</h3>
                <div className="flex space-x-4">
                  {settings.socialMedia?.fb && (
                    <a
                      href={settings?.socialMedia.fb}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'var(--surface)' }}
                    >
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  
                  {settings.socialMedia.x && (
                    <a
                      href={settings.socialMedia.x}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors"
                    >
                      <svg className="w-6 h-6 text-sky-500 dark:text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  )}
                  
                  {settings.socialMedia.in && (
                    <a
                      href={settings.socialMedia.in}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center hover:bg-pink-100 dark:hover:bg-pink-900 transition-colors"
                    >
                      <svg className="w-6 h-6 text-pink-500 dark:text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281H7.83c-.49 0-.875.385-.875.875v7.83c0 .49.385.875.875.875h8.449c.49 0 .875-.385.875-.875v-7.83c0-.49-.385-.875-.875-.875z"/>
                      </svg>
                    </a>
                  )}
                  
                    {settings.socialMedia.ln && (
                      <a
                        href={settings.socialMedia.ln}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'var(--surface)' }}
                      >
                        <svg className="w-6 h-6 text-blue-700 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}

                    {settings.socialMedia.tk && (
                      <a
                        href={settings.socialMedia.tk}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: 'var(--surface)' }}
                      >
                        <svg className="w-6 h-6 text-teal-500 dark:text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297z"/>
                        </svg>
                      </a>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                    style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                    placeholder="Your first name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                    style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                    placeholder="Your last name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder="What&apos;s this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors resize-none"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder="Tell us how we can help you..."
                />
              </div>

              {/* Captcha */}
              <div>
                <label htmlFor="captcha" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Security Check
                </label>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 p-3 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <span className="text-sm font-mono" style={{ color: 'var(--foreground)' }}>
                        {captchaQuestion}
                      </span>
                      <button
                        type="button"
                        onClick={generateCaptcha}
                        className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        title="Generate new question"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      id="captcha"
                      name="captcha"
                      value={userCaptchaInput}
                      onChange={(e) => checkCaptcha(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors text-center"
                      style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                      placeholder="?"
                      required
                    />
                  </div>
                </div>
                {userCaptchaInput && (
                  <div className="mt-2 text-xs">
                    {captchaCorrect ? (
                      <span className="text-green-600 dark:text-green-400">✓ Correct!</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">✗ Incorrect answer</span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!captchaCorrect || isSubmitting}
                className="w-full bg-gradient-to-r from-slate-600 to-slate-800 text-white py-3 px-6 rounded-lg font-semibold hover:from-slate-700 hover:to-slate-900 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}