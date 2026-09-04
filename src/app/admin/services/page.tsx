'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  MessageSquare,
  FileText
} from 'lucide-react';

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('DEVELOPMENT');
  const [price, setPrice] = useState('4999');
  const [deliveryDays, setDeliveryDays] = useState('3');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services');
      const json = await res.json();
      if (json.services) {
        setServices(json.services);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          deliveryDays: Number(deliveryDays),
          description,
          shortDescription
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        setName('');
        setDescription('');
        setShortDescription('');
        fetchServices();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create service');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating service');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-pink-400" />
              Bespoke Services & Client Bookings Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create service offerings, define packages, and manage client project requirements and deliverable handoffs.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-pink-600/30 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Create Service
          </button>
        </div>

        {/* Services List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-900/40 rounded-2xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800/80 p-8">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No services listed yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Offer logo design, fullstack development, SEO audits, or 1-on-1 advisory sessions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-pink-600 rounded-xl text-white font-bold text-xs shadow-lg"
            >
              + Create First Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div key={s.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:border-pink-500/40 transition">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-bold text-[10px]">
                      {s.category}
                    </span>
                    <span className="text-slate-400 font-medium">{s.deliveryDays} Days</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{s.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">{s.shortDescription || s.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Price: </span>
                    <span className="text-base font-bold text-white">₹{s.price.toLocaleString()}</span>
                  </div>
                  <span className="text-pink-400 font-semibold">{s.bookings?.length || 0} Bookings</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Service Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-1">Create Bespoke Service</h3>
              <p className="text-xs text-slate-400 mb-6">
                Offer consulting, design, coding, marketing, or custom project solutions.
              </p>

              <form onSubmit={handleCreateService} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Service Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Next.js SaaS Fullstack Architecture & Development"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    >
                      <option value="DEVELOPMENT">Development & Code</option>
                      <option value="DESIGN">Design & Branding</option>
                      <option value="CONSULTING">Consulting & Advisory</option>
                      <option value="MARKETING">Marketing & SEO</option>
                      <option value="VIDEO">Video & Animation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Starting Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="4999"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Delivery (Days)</label>
                    <input
                      type="number"
                      required
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      placeholder="3"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Short Description</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Punchy one-line value proposition"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Service Scope & Deliverables *</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details on project inclusions, revision policy, and deliverable format..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-600/30"
                  >
                    {submitting ? 'Creating...' : 'Publish Service'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
