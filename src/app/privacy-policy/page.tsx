'use client';

import React from 'react';
import { Shield, ArrowLeft, Mail, Info, Trash2, Eye } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans selection:bg-emerald-100">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-zinc-900 tracking-tight">
              AiChat<span className="text-emerald-600">Suite</span>
            </span>
          </div>
          <a
            href="/login"
            className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <article className="prose prose-zinc max-w-none">
          <div className="mb-10 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight mb-3">
              Privacy Policy
            </h1>
            <p className="text-zinc-500 text-sm">
              Last updated: June 21, 2026
            </p>
          </div>

          <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 mb-10 flex gap-4 items-start">
            <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800 leading-relaxed">
              We respect your privacy and are committed to protecting it. This Privacy Policy explains how <strong>AiChat Suite</strong> collects, processes, and protects your information, especially when you connect your Meta (Facebook/Instagram) accounts to our platform.
            </div>
          </div>

          <section className="space-y-12">
            {/* Section 1 */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-zinc-500" />
                1. Information We Collect
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                When you register and use AiChat Suite, we collect the following types of information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 text-sm">
                <li><strong>Account Information:</strong> Your name, email address, password, and profile preferences when you register.</li>
                <li><strong>Connected Page Tokens:</strong> If you connect Facebook Pages, Instagram accounts, or other integrations, we store OAuth tokens provided by Meta to fetch and send messages on your behalf.</li>
                <li><strong>Omnichannel Messages:</strong> We temporarily cache and store incoming and outgoing messages, comments, and lead details from your connected social platforms in order to display them on your inbox dashboard.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-zinc-500" />
                2. How We Use Your Information
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-3">
                Your data is only used to deliver and improve our services. Specifically, we use it to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 text-sm">
                <li>Provide the unified Omnichannel Inbox service, allowing you to reply to customers in real-time.</li>
                <li>Analyze and display Meta Ads and campaign insights for your configured accounts.</li>
                <li>Automate conversations using AI agents according to your dashboard settings.</li>
              </ul>
              <p className="text-zinc-600 text-sm mt-3 font-medium">
                We do not sell, rent, or trade your personal data to third parties.
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-3">
                <Trash2 className="w-5 h-5 text-zinc-500" />
                3. User Data Deletion Policy (Meta Compliant)
              </h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                You have full control over your data. In compliance with Meta Platform Policies, we provide easy options to delete your data at any time:
              </p>
              <div className="bg-zinc-100 rounded-xl p-5 border border-zinc-200 space-y-4">
                <div>
                  <h4 className="font-semibold text-zinc-800 text-sm">Disconnecting Pages:</h4>
                  <p className="text-zinc-600 text-xs mt-1">
                    You can instantly disconnect any Facebook Page or Ad Account from the <strong>Integrations</strong> page in your dashboard. Disconnecting a page immediately deletes our cached access tokens for that page.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-800 text-sm">Requesting Full Deletion:</h4>
                  <p className="text-zinc-600 text-xs mt-1">
                    If you wish to completely remove your account and all associated Facebook/Google integration data from our systems, please send a deletion request to <strong className="text-zinc-900">support@aichatsuite.com</strong>. We will permanently delete your records within 48 hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-zinc-500" />
                4. Contact Us
              </h2>
              <p className="text-zinc-600 leading-relaxed text-sm">
                If you have any questions or concerns regarding this Privacy Policy or data processing, you can contact us at:
              </p>
              <div className="mt-3 text-sm text-zinc-900 font-medium">
                Email: support@aichatsuite.com
              </div>
            </div>
          </section>
        </article>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-200 text-center text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} AiChat Suite. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
