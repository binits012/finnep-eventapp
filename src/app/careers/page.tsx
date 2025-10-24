'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/apiClient';
import { useTranslation } from '@/hooks/useTranslation';

export default function CareersPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    coverLetter: '',
    resume: null as File | null,
    portfolio: '',
    linkedin: '',
    availability: '',
    salary: '',
    relocate: '',
    additionalInfo: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      resume: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaCorrect) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Create FormData for file upload
      const submitData = new FormData();

      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'resume' && value instanceof File) {
          submitData.append('resume', value);
        } else if (value !== null && value !== '') {
          submitData.append(key, value.toString());
        }
      });

      // Submit to backend
        await api.post('/sendCareerApplication', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSubmitStatus('success');

      // Reset form and generate new captcha
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        experience: '',
        coverLetter: '',
        resume: null,
        portfolio: '',
        linkedin: '',
        availability: '',
        salary: '',
        relocate: '',
        additionalInfo: ''
      });
      generateCaptcha();
    } catch (error) {
      console.error('Error submitting application:', error);
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
            {t('careers.title')}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mx-auto mb-6"></div>
          <p className="text-lg opacity-80 max-w-2xl mx-auto" style={{ color: 'var(--foreground)' }}>
            {t('careers.subtitle')}
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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{t('careers.applicationSubmitted')}</h3>
                <p className="opacity-80" style={{ color: 'var(--foreground)' }}>{t('careers.applicationSubmittedText')}</p>
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
                <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{t('careers.submissionFailed')}</h3>
                <p className="opacity-80" style={{ color: 'var(--foreground)' }}>{t('careers.submissionFailedText')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="rounded-2xl p-8 shadow-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--foreground)' }}>
              <svg className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('careers.personalInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  {t('careers.firstName')} *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.firstNamePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  {t('careers.lastName')} *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.lastNamePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  {t('careers.emailAddress')} *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  {t('careers.phoneNumber')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.phonePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="rounded-2xl p-8 shadow-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--foreground)' }}>
              <svg className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
              </svg>
              {t('careers.professionalInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="position" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  {t('careers.positionApplied')} *
                </label>
                <select
                  id="position"
                  name="position"
                  required
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                >
                  <option value="">{t('careers.selectPosition')}</option>
                  <option value="frontend-developer">{t('careers.positionFrontend')}</option>
                  <option value="backend-developer">{t('careers.positionBackend')}</option>
                  <option value="fullstack-developer">{t('careers.positionFullstack')}</option>
                  <option value="ui-ux-designer">{t('careers.positionUiUx')}</option>
                  <option value="product-manager">{t('careers.positionProduct')}</option>
                  <option value="marketing-specialist">{t('careers.positionMarketing')}</option>
                  <option value="data-analyst">{t('careers.positionData')}</option>
                  <option value="devops-engineer">{t('careers.positionDevops')}</option>
                  <option value="sales-manager">{t('careers.positionSales')}</option>
                  <option value="customer-service">{t('careers.positionCustomer')}</option>
                  <option value="other">{t('careers.positionOther')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  {t('careers.yearsExperience')} *
                </label>
                <select
                  id="experience"
                  name="experience"
                  required
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                >
                  <option value="">{t('careers.selectExperience')}</option>
                  <option value="0-1">{t('careers.experience0-1')}</option>
                  <option value="1-3">{t('careers.experience1-3')}</option>
                  <option value="3-5">{t('careers.experience3-5')}</option>
                  <option value="5-7">{t('careers.experience5-7')}</option>
                  <option value="7-10">{t('careers.experience7-10')}</option>
                  <option value="10+">{t('careers.experience10plus')}</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="coverLetter" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                {t('careers.coverLetter')} *
              </label>
              <textarea
                id="coverLetter"
                name="coverLetter"
                rows={6}
                required
                value={formData.coverLetter}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
                placeholder={t('careers.coverLetterPlaceholder')}
              />
            </div>
          </div>

          {/* Resume & Portfolio */}
          <div className="rounded-2xl p-8 shadow-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--foreground)' }}>
              <svg className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('careers.resumePortfolio')}
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="resume" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  {t('careers.resumeCV')} *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="resume"
                    name="resume"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  />
                </div>
                <p className="text-sm opacity-70 mt-1" style={{ color: 'var(--foreground)' }}>{t('careers.fileHint')}</p>
              </div>

              <div>
                <label htmlFor="portfolio" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  {t('careers.portfolioURL')}
                </label>
                <input
                  type="url"
                  id="portfolio"
                  name="portfolio"
                  value={formData.portfolio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.portfolioPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  {t('careers.linkedinProfile')}
                </label>
                <input
                  type="url"
                  id="linkedin"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.linkedinPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="rounded-2xl p-8 shadow-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--foreground)' }}>
              <svg className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('careers.additionalInformation')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="availability" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  {t('careers.availability')}
                </label>
                <select
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                >
                  <option value="">{t('careers.selectAvailability')}</option>
                  <option value="immediate">{t('careers.availImmediate')}</option>
                  <option value="2-weeks">{t('careers.avail2Weeks')}</option>
                  <option value="1-month">{t('careers.avail1Month')}</option>
                  <option value="2-months">{t('careers.avail2Months')}</option>
                  <option value="flexible">{t('careers.availFlexible')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="salary" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                  {t('careers.salaryRange')}
                </label>
                <input
                  type="text"
                  id="salary"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.salaryPlaceholder')}
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="relocate" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                {t('careers.relocate')}
              </label>
              <select
                id="relocate"
                name="relocate"
                value={formData.relocate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
              >
                <option value="">{t('careers.selectOption')}</option>
                <option value="yes">{t('careers.relocateYes')}</option>
                <option value="no">{t('careers.relocateNo')}</option>
                <option value="maybe">{t('careers.relocateMaybe')}</option>
              </select>
            </div>

            <div className="mt-6">
              <label htmlFor="additionalInfo" className="block text-sm font-medium style={{ color: 'var(--foreground)' }} mb-2">
                {t('careers.additionalInfo')}
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                rows={4}
                value={formData.additionalInfo}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none"
                style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
                placeholder={t('careers.additionalInfoPlaceholder')}
              />
            </div>
          </div>

          {/* Captcha */}
          <div className="mt-8">
            <label htmlFor="captcha" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              {t('careers.securityCheck')}
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
                    title={t('careers.generateNew')}
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
                  className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-center"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                  placeholder={t('careers.answerPlaceholder')}
                  required
                />
              </div>
            </div>
            {userCaptchaInput && (
              <div className="mt-2 text-xs">
                {captchaCorrect ? (
                  <span className="text-green-600 dark:text-green-400">✓ {t('careers.correct')}</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">✗ {t('careers.incorrect')}</span>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting || !captchaCorrect}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('careers.submittingButton')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {t('careers.submitButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
