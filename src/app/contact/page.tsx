'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import Icon from '@/components/ui/Icon';
import Link from 'next/link';

function ContactFormInner() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: 'General Inquiry',
    organizationName: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialType === 'school' || initialType === 'institution') {
      setFormData((prev) => ({
        ...prev,
        inquiryType: 'School / Institution Partnership',
        subject: 'Inquiry for Morena Teach for Schools (CPD & Solutions)',
      }));
    } else if (initialType === 'instructor') {
      setFormData((prev) => ({
        ...prev,
        inquiryType: 'Instructor Application',
        subject: 'Application to Teach on Morena Teach',
      }));
    }
  }, [initialType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          organizationType: formData.inquiryType,
          organizationName: formData.organizationName,
          subject: formData.subject || `${formData.inquiryType} from ${formData.name}`,
          message: formData.message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit inquiry. Please try again.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-50 text-[#5022c3] mb-3">
          Get in Touch
        </span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1c1d1f] tracking-tight mb-4">
          How Can We Help You?
        </h1>
        <p className="text-base sm:text-lg text-[#6a6f73] leading-relaxed">
          Whether you are an individual educator advancing your skills, an institution seeking customized CPD training, or have questions about our certifications, our advisory team is here for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Contact Cards & Accreditation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#f7f9fa] border border-[#d1d7dc] rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-[#1c1d1f] border-b border-gray-200 pb-3">
              Direct Contact Details
            </h2>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-100 text-[#5022c3] flex items-center justify-center shrink-0">
                <Icon name="mail" size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">Email Us</h3>
                <a
                  href="mailto:support@morenateach.com"
                  className="text-base font-bold text-[#1c1d1f] hover:text-[#5022c3] transition-colors"
                >
                  support@morenateach.com
                </a>
                <p className="text-xs text-[#6a6f73] mt-0.5">We typically reply within 24 business hours.</p>
              </div>
            </div>

            {/* Phone & WhatsApp */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                <Icon name="phone" size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">Phone & WhatsApp</h3>
                <a
                  href="tel:+919111444521"
                  className="text-base font-bold text-[#1c1d1f] hover:text-[#5022c3] transition-colors"
                >
                  +91 91114 44521
                </a>
                <p className="text-xs text-[#6a6f73] mt-0.5">Mon – Sat: 9:30 AM to 6:30 PM (IST)</p>
              </div>
            </div>

            {/* Head Office */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Icon name="location_on" size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">Head Office</h3>
                <p className="text-sm font-semibold text-[#1c1d1f]">
                  Morena Teach Education Platform
                </p>
                <p className="text-xs text-[#6a6f73] mt-0.5 leading-relaxed">
                  Bhopal / Indore, Madhya Pradesh, India
                </p>
              </div>
            </div>
          </div>

          {/* Institutional Note */}
          <div className="bg-gradient-to-br from-[#1c1d1f] to-[#2d2f31] text-white rounded-2xl p-6 sm:p-8 shadow-md">
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-300">
              For Schools & Academies
            </span>
            <h3 className="text-lg font-bold mt-1 mb-2">Strengthen Teaching. Transform Your School.</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
              Looking for bulk teacher training, tailored curriculum workshops, or customized institutional certification? Select <strong>School / Institution Partnership</strong> in the form to connect directly with our institutional director.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gray-300 border-t border-gray-700 pt-3">
              <span className="flex items-center gap-1.5">
                <Icon name="check_circle" size={14} className="text-emerald-400" />
                Custom Modules
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check_circle" size={14} className="text-emerald-400" />
                CPD Certification
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check_circle" size={14} className="text-emerald-400" />
                School Audits
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check_circle" size={14} className="text-emerald-400" />
                Faculty Mentorship
              </span>
            </div>
          </div>

          {/* Trust Certifications Banner */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white text-xs text-gray-600 space-y-2">
            <div className="font-bold text-[#1c1d1f] uppercase tracking-wide text-[11px]">
              Recognized & Verified Standards
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-gray-700">
              <span className="px-2.5 py-1 bg-gray-100 rounded">ISO 21001:2018 Certified</span>
              <span className="px-2.5 py-1 bg-gray-100 rounded">ISO 27001:2022 Secure</span>
              <span className="px-2.5 py-1 bg-gray-100 rounded">MSME Registered</span>
              <span className="px-2.5 py-1 bg-gray-100 rounded">NSDC Partner (TP361612)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Form */}
        <div className="lg:col-span-7 bg-white border border-[#d1d7dc] rounded-2xl p-6 sm:p-10 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
                <Icon name="check_circle" size={36} />
              </div>
              <h2 className="text-2xl font-bold text-[#1c1d1f]">Message Received!</h2>
              <p className="text-sm text-[#6a6f73] max-w-md mx-auto leading-relaxed">
                Thank you for contacting Morena Teach. A member of our academic team will review your message and reach out to you via email or phone shortly.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      inquiryType: 'General Inquiry',
                      organizationName: '',
                      subject: '',
                      message: '',
                    });
                  }}
                  className="px-5 py-2.5 border border-[#2d2f31] text-[#2d2f31] font-bold text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Send Another Message
                </button>
                <Link
                  href="/courses"
                  className="px-6 py-2.5 bg-[#5022c3] text-white font-bold text-sm rounded hover:bg-[#401b9c] transition-colors"
                >
                  Explore Courses
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1c1d1f] mb-1">Send us an Inquiry</h2>
                <p className="text-xs text-[#6a6f73]">Fill out the form below and we will respond promptly.</p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                  <Icon name="error" size={18} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Inquiry Type */}
              <div>
                <label htmlFor="inquiryType" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                  Inquiry Purpose <span className="text-red-500">*</span>
                </label>
                <select
                  id="inquiryType"
                  name="inquiryType"
                  value={formData.inquiryType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] focus:ring-2 focus:ring-[#5022c3] focus:outline-none"
                >
                  <option value="General Inquiry">General Question / Support</option>
                  <option value="School / Institution Partnership">School / Institution Partnership (Morena Teach for Schools)</option>
                  <option value="Course Enrollment">Course Enrollment / Certification</option>
                  <option value="Instructor Application">Teach on Morena Teach (Instructor Hub)</option>
                  <option value="Billing & Invoicing">Billing / Payment Support</option>
                </select>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#5022c3] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="priya@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#5022c3] focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone & Organization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#5022c3] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="organizationName" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                    School / Organization Name {formData.inquiryType.includes('School') && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required={formData.inquiryType.includes('School')}
                    placeholder="e.g. St. Xavier International School"
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#5022c3] focus:outline-none"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="Summary of your inquiry..."
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#5022c3] focus:outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-[#2d2f31] mb-1.5">
                  Your Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  placeholder="Tell us about your requirements, questions, or training goals..."
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-[#2d2f31] rounded-lg text-sm text-[#1c1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#5022c3] focus:outline-none resize-y"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#5022c3] text-white font-bold text-sm sm:text-base rounded-lg hover:bg-[#401b9c] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending your message...</span>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={18} />
                    <span>Send Inquiry</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="bg-white text-[#1c1d1f] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />
      <main className="flex-grow">
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#5022c3] border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ContactFormInner />
        </Suspense>
      </main>
      <UdemyFooter />
    </div>
  );
}
