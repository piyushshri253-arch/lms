'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Code2,
  Download,
  Trash2,
  Edit,
  Sparkles,
  CheckCircle2,
  Layers,
  Key,
  ExternalLink
} from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('DIGITAL_PRODUCT');
  const [price, setPrice] = useState('999');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState('TEMPLATE');
  const [version, setVersion] = useState('1.0.0');
  const [licenseType, setLicenseType] = useState('SINGLE_USER');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      if (json.products) {
        setProducts(json.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          price: Number(price),
          description,
          shortDescription,
          category,
          version,
          licenseType
        })
      });

      if (res.ok) {
        setShowCreateModal(false);
        // Reset form
        setName('');
        setDescription('');
        setShortDescription('');
        fetchProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create product');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating product');
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
              <ShoppingBag className="w-8 h-8 text-indigo-400" />
              Universal Digital Products & Software Studio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create and manage software code, design templates, UI kits, e-books, and digital downloads.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Create Product
          </button>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-900/40 rounded-2xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800/80 p-8">
            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No products created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Start selling digital products, software licenses, or design templates in your branded store.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-indigo-600 rounded-xl text-white font-bold text-xs shadow-lg"
            >
              + Create First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/40 transition">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      p.type === 'SOFTWARE'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {p.type}
                    </span>
                    <span className="text-emerald-400 font-bold">ACTIVE</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">{p.description || 'Digital product asset'}</p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Price: </span>
                    <span className="text-base font-bold text-white">
                      {p.pricings?.[0]?.price !== undefined ? `₹${p.pricings[0].price}` : 'FREE'}
                    </span>
                  </div>
                  <span className="text-slate-500">{p._count?.orderItems || 0} Sales</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Product Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-1">Create Universal Product</h3>
              <p className="text-xs text-slate-400 mb-6">
                Publish a digital download, template, software codebase, or e-book.
              </p>

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. AI SaaS Next.js Boilerplate or Figma Design System"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Product Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="DIGITAL_PRODUCT">Digital Product / Asset</option>
                      <option value="SOFTWARE">Software / Code License</option>
                      <option value="TEMPLATE">Template / UI Kit</option>
                      <option value="EBOOK">E-book / Publication</option>
                      <option value="COURSE">Course Bundle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Price (₹ INR)</label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="999"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {type === 'SOFTWARE' && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <div>
                      <label className="block text-purple-300 font-semibold mb-1">Software Version</label>
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full p-2.5 bg-slate-950 border border-purple-500/30 rounded-xl text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-300 font-semibold mb-1">License Model</label>
                      <select
                        value={licenseType}
                        onChange={(e) => setLicenseType(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-purple-500/30 rounded-xl text-slate-200"
                      >
                        <option value="SINGLE_USER">Single User (1 device)</option>
                        <option value="MULTI_USER">Multi-User (5 devices)</option>
                        <option value="ENTERPRISE">Enterprise (25 devices)</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Short Description</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Brief 1-line value proposition"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Comprehensive details, features, inclusions, and system requirements..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                  >
                    {submitting ? 'Publishing...' : 'Publish Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
