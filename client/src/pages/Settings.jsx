import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Settings() {
  const [form, setForm] = useState({
    company_name: '',
    logo_url: '',
    website: '',
    contact_email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompanySettings()
      .then(data => setForm({
        company_name: data.company_name || '',
        logo_url: data.logo_url || '',
        website: data.website || '',
        contact_email: data.contact_email || '',
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-3">
          Company Details
        </h2>
        <p className="text-sm text-slate-500">These details appear on PDF reports you generate for your team.</p>

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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo URL</label>
          <input
            type="url"
            placeholder="https://yourcompany.com/logo.png"
            value={form.logo_url}
            onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {form.logo_url && (
            <div className="mt-2 flex items-center gap-2">
              <img src={form.logo_url} alt="Logo preview" className="h-8 object-contain rounded" onError={e => e.target.style.display='none'} />
              <span className="text-xs text-slate-400">Preview</span>
            </div>
          )}
        </div>

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

        <div className="pt-2">
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
