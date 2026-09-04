'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function OrgContactPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { showToast } = useApp();

  const [org, setOrg] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchOrg();
  }, [slug]);

  const fetchOrg = async () => {
    try {
      const res = await fetch(`/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setOrg(data.organization);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/org/${slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit message');

      setSubmitted(true);
      showToast({
        title: 'Message Sent!',
        description: 'Thank you for reaching out. We will get back to you shortly.',
        type: 'success'
      });
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = org?.primaryColor || '#4f46e5';

  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      <header className="border-b border-white/10 bg-[#080c1e]/90 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={`/org/${slug}`} className="flex items-center gap-3">
            {org?.logo ? (
              <img src={org.logo} alt={org.name} className="h-8 w-auto object-contain rounded" />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md"
              >
                {org?.name?.charAt(0) || 'A'}
              </div>
            )}
            <span className="font-extrabold text-base text-white tracking-tight">{org?.name || 'Academy Portal'}</span>
          </Link>
          <Link href={`/org/${slug}`} className="text-xs font-bold text-slate-300 hover:text-white">
            ← Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 w-full space-y-10 flex-1">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase font-bold text-emerald-400">Get In Touch</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white">Contact {org?.name || 'Our Academy'}</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Have questions regarding admissions, masterclass curricula, or cohort dates?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Contact Details Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-[#0c1126] border border-white/10 space-y-4">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
                  <Icon name="mail" size={20} />
                </div>
                <h3 className="font-bold text-sm text-white">Email Inquiries</h3>
                <p className="text-xs text-slate-400">{org?.contactEmail || 'admissions@academy.com'}</p>
              </div>

              <div className="space-y-1 pt-3 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                  <Icon name="call" size={20} />
                </div>
                <h3 className="font-bold text-sm text-white">Phone Support</h3>
                <p className="text-xs text-slate-400">{org?.contactPhone || '+91 9876543210'}</p>
              </div>

              <div className="space-y-1 pt-3 border-t border-white/5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                  <Icon name="location_on" size={20} />
                </div>
                <h3 className="font-bold text-sm text-white">Headquarters</h3>
                <p className="text-xs text-slate-400">{org?.address ? `${org.address}, ${org.country}` : 'Global Online Academy'}</p>
              </div>
            </div>
          </div>

          {/* Interactive Form Column */}
          <div className="md:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1126] border border-white/10 shadow-2xl">
              {submitted ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Icon name="check_circle" size={28} />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Message Sent Successfully!</h3>
                  <p className="text-xs text-slate-400">Our faculty admissions team will reply to your email shortly.</p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-xs font-bold text-indigo-400 hover:underline pt-2 cursor-pointer"
                  >
                    Send another inquiry →
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Phone (Optional)</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Inquiry Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Cohort admission question"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Your Message</label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your inquiry or question..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full py-3 text-xs font-bold text-white rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Icon name={isSubmitting ? 'sync' : 'send'} size={16} className={isSubmitting ? 'animate-spin' : ''} />
                    <span>{isSubmitting ? 'Sending Message...' : 'Submit Inquiry'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-[#04060f] py-6 px-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} {org?.name || 'Academy'}. All rights reserved.
      </footer>
    </div>
  );
}
