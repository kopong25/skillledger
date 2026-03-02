import { useState } from 'react';
import { Link } from 'react-router-dom';

const TABS = ['Terms of Service', 'Privacy Policy', 'Cookie Policy'];

export default function Legal() {
  const [tab, setTab] = useState('Terms of Service');

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link to="/" className="text-sm text-blue-600 hover:underline">← Back to SkillLedger</Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-4">Legal</h1>
        <p className="text-slate-500 mt-1">Last updated: March 2025</p>
      </div>

      <div className="flex gap-2 mb-8 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 text-sm font-medium border-b-2 transition-colors ' +
              (tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Terms of Service' && (
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm leading-7">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using SkillLedger ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Description of Service</h2>
            <p>SkillLedger is a recruitment intelligence platform that analyzes publicly available GitHub profiles to assess technical skills. The Service is intended for recruiters, hiring managers, and talent acquisition professionals.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Use of Public Data</h2>
            <p>SkillLedger analyzes publicly available information from GitHub. We do not access private repositories, private user data, or any information not publicly disclosed by the candidate. All analysis is based solely on public activity.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your account, use the Service for any unlawful purpose, or attempt to reverse-engineer or scrape the platform.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Platform Administration</h2>
            <p>Platform administrators may access usage data, account information, and activity logs for the purposes of security monitoring, abuse prevention, technical support, and platform improvement. This access is governed by our Privacy Policy.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Intellectual Property</h2>
            <p>All content, design, and code of SkillLedger is the property of Zion Compassion / SkillLedger. You may not reproduce or redistribute any part of the Service without written permission.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind. Skill assessments are automated estimates and should not be the sole basis for hiring decisions.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">8. Limitation of Liability</h2>
            <p>SkillLedger shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">9. Governing Law</h2>
            <p>These Terms are governed by the laws of the United States. Any disputes shall be resolved in the courts of the United States.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">10. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:koppong@zioncompassion.com" className="text-blue-600 hover:underline">koppong@zioncompassion.com</a>.</p>
          </section>
        </div>
      )}

      {tab === 'Privacy Policy' && (
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm leading-7">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Information We Collect</h2>
            <p>We collect the following information when you use SkillLedger:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account data:</strong> your name and email address when you register</li>
              <li><strong>Usage data:</strong> GitHub usernames you analyze, candidates you save, notes and status updates</li>
              <li><strong>Public GitHub data:</strong> repositories, languages, and activity of analyzed profiles</li>
              <li><strong>Technical data:</strong> IP address, browser type, and access logs</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and improve the Service</li>
              <li>To authenticate your account and maintain security</li>
              <li>To allow platform administrators to provide support and monitor for abuse</li>
              <li>To generate aggregated, anonymized analytics about platform usage</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Data Sharing</h2>
            <p>We do not sell your data to third parties. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Service providers:</strong> hosting (Render), database (PostgreSQL) — under confidentiality agreements</li>
              <li><strong>Law enforcement:</strong> if required by law or to protect our rights</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Data Retention</h2>
            <p>We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Security</h2>
            <p>We use industry-standard security measures including encrypted passwords, HTTPS, and access controls. No system is 100% secure, and we cannot guarantee absolute security.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at <a href="mailto:koppong@zioncompassion.com" className="text-blue-600 hover:underline">koppong@zioncompassion.com</a>.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Contact</h2>
            <p>Privacy questions: <a href="mailto:koppong@zioncompassion.com" className="text-blue-600 hover:underline">koppong@zioncompassion.com</a></p>
          </section>
        </div>
      )}

      {tab === 'Cookie Policy' && (
        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm leading-7">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website. SkillLedger uses browser storage (localStorage) rather than traditional cookies to maintain your session.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. What We Store</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Authentication token (sl_token):</strong> stored in localStorage to keep you logged in. This is essential for the Service to function and cannot be disabled.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Third-Party Services</h2>
            <p>We use the following third-party services which may set their own cookies or storage:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>GitHub API:</strong> used to fetch public profile data — governed by GitHub's privacy policy</li>
              <li><strong>Render:</strong> our hosting provider — may collect technical logs</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Managing Storage</h2>
            <p>You can clear your browser's localStorage at any time through your browser settings. This will log you out of SkillLedger.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Contact</h2>
            <p>Cookie questions: <a href="mailto:koppong@zioncompassion.com" className="text-blue-600 hover:underline">koppong@zioncompassion.com</a></p>
          </section>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} SkillLedger · Zion Compassion · United States</p>
        <p className="mt-1">Questions? <a href="mailto:koppong@zioncompassion.com" className="text-blue-600 hover:underline">koppong@zioncompassion.com</a></p>
      </div>
    </div>
  );
}