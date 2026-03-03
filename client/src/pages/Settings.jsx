import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

export default function Settings() {
  const [form, setForm] = useState({
    company_name: '',
    logo_base64: '',
    website: '',
    contact_email: '',
    address: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.getCompanySettings()
      .then(data => {
        setForm({
          company_name: data.company_name || '',
          logo_base64: data.logo_base64 || '',
          website: data.website || '',
          contact_email: data.contact_email || '',
          address: data.address || '',
          phone: data.phone || '',
        });
        if (data.logo_base64) setLogoPreview(data.logo_base64);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setLogoPreview(base64);
      setForm(f => ({ ...f, logo_base64: base64 }));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoPreview('');
    setForm(f => ({ ...f, logo_base64: '' }));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await api.updateCompanySettings(form);
      setSuccess('Settings saved! Your PDF reports will now include these details.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your company details for PDF reports</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="font-semibold text-slate-800 text-lg">Company Details</h2>
          <p className="text-sm text-slate-500 mt-0.5">These details appear on PDF reports you generate for your team.</p>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {logoPreview ? 'Change logo' : 'Upload logo'}
              </label>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
          <input
            type="text"
            placeholder="Acme Corp"
            value={form.company_name}
            onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
          <textarea
            placeholder="123 Main Street, City, Country"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Phone & Email side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Email</label>
            <input
              type="email"
              placeholder="hiring@yourcompany.com"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label>
          <input
            type="url"
            placeholder="https://yourcompany.com"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
