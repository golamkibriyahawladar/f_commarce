'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Webhook, 
  FileText, 
  Check, 
  Copy, 
  Lock, 
  Key, 
  Code2, 
  HelpCircle,
  MessageSquare,
  Users,
  Settings,
  ShieldCheck,
  Zap,
  ArrowRight,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Setup basic Client-side Supabase to check if user is logged in for nav links
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'webhooks' | 'api' | 'security'>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true);
      }
    });
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const nodeJsExample = `const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// 1. GET Handshake Verification (challenge-response)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const MY_VERIFY_TOKEN = 'your_verify_token_here'; // Must match verify token in Autozy
  
  if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    return res.status(200).send(challenge);
  }
  
  return res.status(403).send('Forbidden');
});

// 2. POST Event Handler (message.created)
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const verifyToken = 'your_verify_token_here'; // Used as key for signature check
  
  // Compute HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', verifyToken);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
  
  if (signature !== digest) {
    console.error('Invalid signature! Rejecting payload.');
    return res.status(401).send('Invalid signature');
  }
  
  // Event logic
  const { event, timestamp, data } = req.body;
  console.log(\`Received event \${event} at \${timestamp}:\`, data);
  
  res.status(200).send('EVENT_RECEIVED');
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));`;

  const pythonExample = `from flask import Flask, request, abort
import hmac
import hashlib
import json

app = Flask(__name__)
VERIFY_TOKEN = "your_verify_token_here"

@app.route('/webhook', methods=['GET'])
def verify():
    mode = request.args.get('hub.mode')
    token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')
    
    if mode == 'subscribe' and token == VERIFY_TOKEN:
        return challenge, 200
    return "Forbidden", 403

@app.route('/webhook', methods=['POST'])
def handle_event():
    signature = request.headers.get('X-Webhook-Signature')
    if not signature:
        abort(400, "Missing signature header")
        
    # Verify payload signature
    payload = request.data
    computed_sig = hmac.new(
        VERIFY_TOKEN.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, computed_sig):
        abort(401, "Invalid signature")
        
    event_data = request.json
    print(f"Received event: {event_data.get('event')}")
    # Process event_data['data'] here...
    
    return "EVENT_RECEIVED", 200

if __name__ == '__main__':
    app.run(port=3000)`;

  const phpExample = `<?php
define('VERIFY_TOKEN', 'your_verify_token_here');

// 1. GET Handshake Verification
if (\$_SERVER['REQUEST_METHOD'] === 'GET') {
    \$mode = \$_GET['hub_mode'] ?? '';
    \$token = \$_GET['hub_verify_token'] ?? '';
    \$challenge = \$_GET['hub_challenge'] ?? '';
    
    if (\$mode === 'subscribe' && \$token === VERIFY_TOKEN) {
        header('Content-Type: text/plain');
        echo \$challenge;
        exit(0);
    }
    http_response_code(403);
    echo "Forbidden";
    exit(1);
}

// 2. POST Event Handler
if (\$_SERVER['REQUEST_METHOD'] === 'POST') {
    \$headers = getallheaders();
    \$signature = \$headers['X-Webhook-Signature'] ?? '';
    
    \$payload = file_get_contents('php://input');
    \$computed_sig = hash_hmac('sha256', \$payload, VERIFY_TOKEN);
    
    if (\$signature !== \$computed_sig) {
        http_response_code(401);
        echo "Invalid signature";
        exit(1);
    }
    
    \$data = json_decode(\$payload, true);
    // Process event (\$data['event'] and \$data['data'])
    
    http_response_code(200);
    echo "EVENT_RECEIVED";
    exit(0);
}`;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans selection:bg-emerald-100">
      
      {/* Standalone Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <img src="/logo.svg" alt="Autozy" className="h-7 w-auto" />
          </a>
          <a
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold shadow-sm"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Intro Section */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight flex items-center justify-center md:justify-start gap-2">
            Developer Documentation
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Configure outgoing webhooks, access messaging APIs, and understand Autozy integrations.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <div className="space-y-1.5 lg:sticky lg:top-24 self-start">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all ${
                activeTab === 'overview' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 shadow-sm'
              }`}
            >
              <Zap className="w-4 h-4" />
              Platform Overview
            </button>
            
            <button 
              onClick={() => setActiveTab('webhooks')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all ${
                activeTab === 'webhooks' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 shadow-sm'
              }`}
            >
              <Webhook className="w-4 h-4" />
              Outgoing Webhooks
            </button>

            <button 
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all ${
                activeTab === 'api' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 shadow-sm'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Send Message API
            </button>

            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all ${
                activeTab === 'security' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10' 
                  : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 shadow-sm'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Signature Security
            </button>
          </div>

          {/* Main Content Pane */}
          <div className="lg:col-span-3">
            
            {/* Overview Section */}
            {activeTab === 'overview' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">Platform Overview</h2>
                  <p className="text-sm text-zinc-650 leading-relaxed">
                    Autozy is a premium conversational commerce suite. It brings messaging threads from multiple provider platforms (Facebook Pages, Messenger, Instagram, WhatsApp) into a single, unified database and dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-zinc-950 text-sm">Omnichannel Inbox</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">Syncs real-time chats from connected social pages directly to team agents.</p>
                  </div>

                  <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-zinc-950 text-sm">CRM & Delivery Map</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">Link conversation profiles to shipping details and manage logistics pipelines.</p>
                  </div>

                  <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-zinc-950 text-sm">Developer Integrations</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">Listen to messages via custom webhooks or trigger messages programmatically.</p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-6 space-y-4">
                  <h3 className="font-bold text-zinc-900 text-base">Key Architecture Flows</h3>
                  <div className="relative border-l-2 border-zinc-200 pl-6 space-y-6 py-2 ml-3">
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white ring-2 ring-emerald-100" />
                      <h5 className="font-bold text-xs text-zinc-800 uppercase tracking-wide">1. Customer Messages</h5>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        A customer writes a message to your Facebook page. Our Meta webhook captures the event and registers the customer, conversation, and message in our database.
                      </p>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white ring-2 ring-blue-100" />
                      <h5 className="font-bold text-xs text-zinc-800 uppercase tracking-wide">2. Outgoing Webhooks Trigger</h5>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        Autozy immediately dispatches a <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 font-mono text-[10px]">message.created</code> event via POST to your verified custom webhook endpoint.
                      </p>
                    </div>

                    <div className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-white ring-2 ring-purple-100" />
                      <h5 className="font-bold text-xs text-zinc-800 uppercase tracking-wide">3. Agent Reply / Automation Response</h5>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        Your support agent responds from the Omnichannel Inbox dashboard (or you trigger a programmatic reply via our HTTP API). The message is sent back to the customer's DM via Meta Graph APIs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Webhooks Section */}
            {activeTab === 'webhooks' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">Outgoing Webhooks</h2>
                  <p className="text-sm text-zinc-655 leading-relaxed">
                    Webhooks allow you to receive real-time JSON payloads whenever a message event occurs in your Autozy workspace. Use this to sync chats with external database systems, trigger custom CRM actions, or integrate automated AI bots.
                  </p>
                </div>

                <div className="p-5 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-3">
                  <h3 className="font-bold text-amber-955 text-sm flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    Meta-style Handshake Verification Protocol
                  </h3>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    To prevent spam, Autozy verifies your webhook URL during setup or modification. We send a <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">GET</code> request to your endpoint with the following parameters:
                  </p>
                  <ul className="text-xs text-amber-900/90 space-y-1 list-disc list-inside pl-2">
                    <li><strong className="font-mono">hub.mode</strong>: Always set to <code className="font-mono">subscribe</code></li>
                    <li><strong className="font-mono">hub.verify_token</strong>: The verify token you specified on integration configuration</li>
                    <li><strong className="font-mono">hub.challenge</strong>: A random cryptographic string generated by Autozy</li>
                  </ul>
                  <p className="text-xs text-amber-900/90 leading-relaxed font-semibold">
                    ⚠️ Your server MUST response with HTTP status code 200 and return the raw value of the <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-950">hub.challenge</code> parameter verbatim.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-zinc-900 text-base">Payload Schema (Event: <code className="font-mono bg-zinc-100 text-zinc-800 text-xs px-1.5 py-0.5 rounded">message.created</code>)</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    When a message is sent or received, our system fires a `POST` request with the following JSON schema:
                  </p>
                  <div className="bg-zinc-955 rounded-xl p-4 font-mono text-xs text-zinc-300 relative overflow-hidden">
                    <button 
                      onClick={() => copyToClipboard(JSON.stringify({
                        event: "message.created",
                        company_id: "7b4c9520-22c6-43b9-a411-eb6b5df9a202",
                        timestamp: "2026-06-25T00:50:00.000Z",
                        data: {
                          id: "e58b1fa0-8fca-44b2-a4e9-6f9f60cb0050",
                          conversation_id: "c8c49504-2041-482a-8742-0fbc19c00b0f",
                          sender_type: "customer",
                          message_type: "text",
                          content: "Hello, I want to purchase the item!",
                          created_at: "2026-06-25T00:49:59.000Z"
                        }
                      }, null, 2), 'payload_json')}
                      className="absolute right-3 top-3 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-zinc-300 transition-colors"
                      title="Copy Payload"
                    >
                      {copiedId === 'payload_json' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <pre className="overflow-x-auto text-[11px] leading-relaxed">
{`{
  "event": "message.created",
  "company_id": "7b4c9520-22c6-43b9-a411-eb6b5df9a202",
  "timestamp": "2026-06-25T00:50:00.000Z",
  "data": {
    "id": "e58b1fa0-8fca-44b2-a4e9-6f9f60cb0050",
    "conversation_id": "c8c49504-2041-482a-8742-0fbc19c00b0f",
    "sender_type": "customer", // customer | agent | system | ai
    "message_type": "text",
    "content": "Hello, I want to purchase the item!",
    "created_at": "2026-06-25T00:49:59.000Z"
  }
}`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <h3 className="font-bold text-zinc-900 text-base">Example Implementations</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Node.js (Express)</span>
                      <button 
                        onClick={() => copyToClipboard(nodeJsExample, 'nodejs')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        {copiedId === 'nodejs' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Code
                      </button>
                    </div>
                    <div className="bg-zinc-955 rounded-xl p-4 font-mono text-xs text-zinc-300 max-h-72 overflow-y-auto">
                      <pre className="text-[11px] leading-relaxed">{nodeJsExample}</pre>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Python (Flask)</span>
                      <button 
                        onClick={() => copyToClipboard(pythonExample, 'python')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        {copiedId === 'python' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Code
                      </button>
                    </div>
                    <div className="bg-zinc-955 rounded-xl p-4 font-mono text-xs text-zinc-300 max-h-72 overflow-y-auto">
                      <pre className="text-[11px] leading-relaxed">{pythonExample}</pre>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">PHP (Vanilla)</span>
                      <button 
                        onClick={() => copyToClipboard(phpExample, 'php')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        {copiedId === 'php' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Code
                      </button>
                    </div>
                    <div className="bg-zinc-955 rounded-xl p-4 font-mono text-xs text-zinc-300 max-h-72 overflow-y-auto">
                      <pre className="text-[11px] leading-relaxed">{phpExample}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API Reference Section */}
            {activeTab === 'api' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">Send Message API Reference</h2>
                  <p className="text-sm text-zinc-650 leading-relaxed">
                    Integrate your custom CRM system, e-commerce automation scripts, or conversational logic triggers. You can send replies back to social channels by calling our message endpoint.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-3.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-md font-bold uppercase tracking-wide">POST</span>
                    <span className="font-mono font-bold text-zinc-800">/api/messages</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">Sends an outgoing text reply to a customer via the channel integration linked to the conversation thread.</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-zinc-900 text-sm">Request Body (JSON)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-400 font-bold">
                          <th className="py-2.5">Field</th>
                          <th className="py-2.5">Type</th>
                          <th className="py-2.5">Required</th>
                          <th className="py-2.5">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-700">
                        <tr>
                          <td className="py-2.5 font-mono text-zinc-900 font-semibold">conversationId</td>
                          <td className="py-2.5 font-mono text-zinc-500">string (UUID)</td>
                          <td className="py-2.5 text-red-600 font-semibold">Yes</td>
                          <td className="py-2.5">The Autozy conversation identifier.</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-mono text-zinc-900 font-semibold">companyId</td>
                          <td className="py-2.5 font-mono text-zinc-500">string (UUID)</td>
                          <td className="py-2.5 text-red-600 font-semibold">Yes</td>
                          <td className="py-2.5">The ID of your workspace company.</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 font-mono text-zinc-900 font-semibold">content</td>
                          <td className="py-2.5 font-mono text-zinc-500">string</td>
                          <td className="py-2.5 text-red-600 font-semibold">Yes</td>
                          <td className="py-2.5">Text message content to send.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Request Example</h4>
                    <div className="bg-zinc-955 rounded-xl p-4 font-mono text-xs text-zinc-300 relative">
                      <button 
                        onClick={() => copyToClipboard(JSON.stringify({
                          conversationId: "c8c49504-2041-482a-8742-0fbc19c00b0f",
                          companyId: "7b4c9520-22c6-43b9-a411-eb6b5df9a202",
                          content: "Hello! Your package has been handed over to delivery."
                        }, null, 2), 'req_example')}
                        className="absolute right-3 top-3 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-zinc-300 transition-colors"
                      >
                        {copiedId === 'req_example' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <pre className="text-[10px] leading-relaxed">
{`{
  "conversationId": "c8c49504-20...",
  "companyId": "7b4c9520-22c6...",
  "content": "Hello! Your package has..."
}`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Response Example (HTTP 200)</h4>
                    <div className="bg-zinc-955 rounded-xl p-4 font-mono text-xs text-zinc-300">
                      <pre className="text-[10px] leading-relaxed">
{`{
  "success": true,
  "message": {
    "id": "f5822f77-22f1-4899...",
    "conversation_id": "c8c49504...",
    "sender_type": "agent",
    "message_type": "text",
    "content": "Hello! Your package has...",
    "created_at": "2026-06-25T00:52:12.339Z"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Security Section */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">Signature Security</h2>
                  <p className="text-sm text-zinc-650 leading-relaxed">
                    Because webhooks are open endpoints listening on the public internet, you must confirm that a webhook POST request came from Autozy and has not been intercepted or modified.
                  </p>
                </div>

                <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-3.5">
                  <h3 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    HMAC-SHA256 Payload Signature
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    We generate a signature using the HMAC algorithm. We compute the hash of the raw JSON body using your custom Webhook Verify Token as the secret key.
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
                    This signature is passed to your webhook server in the <code className="bg-zinc-150 px-1 py-0.5 rounded font-mono text-zinc-800">X-Webhook-Signature</code> header.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-900 text-sm">How to Validate the Signature</h3>
                  <ol className="text-xs text-zinc-600 list-decimal list-inside space-y-3 pl-2 leading-relaxed">
                    <li>Retrieve the raw request body text (avoid parsing it to JSON first, since formatting differences will produce different hashes).</li>
                    <li>Extract the <code className="bg-zinc-100 px-1 rounded font-mono text-zinc-800">X-Webhook-Signature</code> header value from the request.</li>
                    <li>Initialize an HMAC digest using <code className="bg-zinc-100 px-1 rounded font-mono text-zinc-800">sha256</code> algorithm and your webhook's Verify Token.</li>
                    <li>Pass the raw request body string to update the hash, and output the digest as a hex string.</li>
                    <li>Compare your computed signature to the header signature. (We recommend using a constant-time string comparison function to prevent timing attacks).</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
