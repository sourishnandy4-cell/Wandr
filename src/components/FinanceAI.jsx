import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, Loader2, Sparkles, HelpCircle, KeyRound } from 'lucide-react';
import { fetchItinerary } from '../lib/itineraryService';
import { fetchRecentExpenses, fetchTripMembers } from '../lib/expenseService';
import { calculateNetBalances } from '../lib/balanceCalculator';

// ── Lightweight inline markdown renderer ─────────────────────────────────────
const inlineMarkdown = (text) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-extrabold text-primary">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="bg-slate-100 text-primary font-mono text-xs px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
    return part;
  });
};

const renderMarkdown = (text) => {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-extrabold text-primary mt-3 mb-1 text-sm">{line.slice(4)}</h4>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-extrabold text-primary mt-3 mb-1">{line.slice(3)}</h3>);
      i++; continue;
    }
    if (line.match(/^[\*\-] /)) {
      const bullets = [];
      while (i < lines.length && lines[i].match(/^[\*\-] /)) {
        bullets.push(<li key={i} className="text-gray-700">{inlineMarkdown(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 text-sm">{bullets}</ul>);
      continue;
    }
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i} className="text-gray-700">{inlineMarkdown(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 text-sm">{items}</ol>);
      continue;
    }
    if (line.match(/^[-*]{3,}$/)) {
      elements.push(<hr key={i} className="border-gray-100 my-3" />); i++; continue;
    }
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />); i++; continue;
    }
    elements.push(<p key={i} className="text-sm leading-relaxed">{inlineMarkdown(line)}</p>);
    i++;
  }
  return elements;
};
// ─────────────────────────────────────────────────────────────────────────────

// Google Gemini API — free tier via Google AI Studio
// Get your free key at: https://aistudio.google.com/app/apikey
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS = [
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash (Best)' },
  { id: 'gemini-2.0-flash',               name: 'Gemini 2.0 Flash (Fast)' },
  { id: 'gemini-1.5-flash',               name: 'Gemini 1.5 Flash (Stable)' },
  { id: 'gemini-1.5-flash-8b',            name: 'Gemini 1.5 Flash 8B (Lite)' },
];

// API key — baked in at build time via VITE_GEMINI_API_KEY env var
// Falls back to empty string; component shows a setup prompt if missing
const BAKED_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const SUGGESTIONS = [
  'Am I over budget?',
  'Who owes the most?',
  'Summarize expenses by category.',
  'What should I plan for tomorrow?',
];

const LS_KEY = 'wandr_gemini_api_key';

export const FinanceAI = ({ tripId, tripName, tripDestination, totalBudget, currencySymbol = '₹' }) => {
  const [model, setModel]         = useState('gemini-2.5-flash-preview-05-20');
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [userKey, setUserKey]     = useState(() => localStorage.getItem(LS_KEY) || '');
  const [keyDraft, setKeyDraft]   = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef             = useRef(null);

  // Effective API key: baked-in env var takes priority, then user-saved key
  const apiKey = BAKED_KEY || userKey;

  // Welcome message on mount / trip change
  useEffect(() => {
    setMessages([{
      id: 'welcome', sender: 'ai',
      text: `Hi! I'm your **Wandr AI Advisor** 🤖\n\nI've loaded the live budget, itinerary, and balances for **"${tripName}"**. Ask me anything:\n* *"Am I over budget?"*\n* *"Who owes the most?"*\n* *"Summarize expenses by category."*\n* *"Suggest activities for tomorrow."*\n\n_Powered by Google Gemini — free via Google AI Studio._`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setError(null);
  }, [tripId, tripName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveUserKey = () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_KEY, trimmed);
    setUserKey(trimmed);
    setKeyDraft('');
    setShowKeyInput(false);
    setError(null);
  };

  const clearUserKey = () => {
    localStorage.removeItem(LS_KEY);
    setUserKey('');
    setShowKeyInput(false);
  };

  const buildSystemPrompt = async () => {
    try {
      const [iRes, eRes, mRes, bRes] = await Promise.all([
        fetchItinerary(tripId),
        fetchRecentExpenses(tripId),
        fetchTripMembers(tripId),
        calculateNetBalances(tripId),
      ]);
      const members   = (mRes.data || []).map(m => typeof m === 'string' ? m : m.name).filter(Boolean);
      const itinerary = (iRes.data || []).map(it =>
        `- ${new Date(it.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}: ${it.title} @ "${it.location || 'N/A'}" (${it.category_icon})`
      ).join('\n');
      const expenses  = (eRes.data || []).map(e =>
        `- ${e.description}: ${currencySymbol}${e.amount} paid by ${e.paid_by} [${e.category}]`
      ).join('\n');
      const balances  = (bRes.data || []).map(b =>
        `- ${b.from} owes ${b.to} ${currencySymbol}${b.amount}`
      ).join('\n');

      return `You are Wandr AI — a friendly, concise travel budget advisor.
Trip: ${tripName} | Destination: ${tripDestination || 'N/A'} | Budget: ${currencySymbol}${totalBudget}
Companions: ${members.join(', ') || 'Solo traveller'}

EXPENSES:
${expenses || 'None recorded yet.'}

BALANCES (unsettled):
${balances || 'All settled.'}

ITINERARY:
${itinerary || 'No activities planned yet.'}

Rules:
- Always use ${currencySymbol} for amounts.
- Be concise and helpful.
- Use markdown: **bold**, bullet lists, headers.
- Do not make up data; only use what is provided above.`;
    } catch {
      return `You are Wandr AI, a helpful travel budget advisor for the trip "${tripName}". Help the user manage their travel expenses and plans.`;
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    setInputText('');
    setError(null);

    const userMsg = {
      id: 'user-' + Date.now(), sender: 'user', text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const systemPrompt = await buildSystemPrompt();

      // Build Gemini conversation history (last 8 messages)
      const history = messages.slice(-8).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

      const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

      const body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...history,
          { role: 'user', parts: [{ text }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 400) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Invalid request. Check your API key.');
      }
      if (res.status === 403 || res.status === 401) {
        throw new Error('Invalid or expired API key. Click the key icon to update it.');
      }
      if (res.status === 429) {
        throw new Error('Rate limit reached. Gemini free tier allows 15 requests/min. Please wait a moment.');
      }
      if (!res.ok) {
        throw new Error(`Gemini API returned HTTP ${res.status}. Try again in a moment.`);
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        // Check if blocked by safety filters
        const reason = data?.candidates?.[0]?.finishReason;
        if (reason === 'SAFETY') throw new Error('Response blocked by Gemini safety filters. Try rephrasing your question.');
        throw new Error('The AI returned an empty response. Please try again.');
      }

      setMessages(prev => [...prev, {
        id: 'ai-' + Date.now(), sender: 'ai', text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleClear = () => {
    if (!window.confirm('Clear the conversation history?')) return;
    setMessages([{
      id: 'welcome-' + Date.now(), sender: 'ai',
      text: `Conversation cleared. How can I help you with **"${tripName}"**?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setError(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8 flex flex-col h-[calc(100vh-140px)] min-h-[450px] font-sans">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-white rounded-2xl shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-primary tracking-tight">AI Travel Advisor</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Powered by Google Gemini · Free via AI Studio
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model picker */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="text-[10px] font-bold bg-transparent border-none p-0 focus:ring-0 text-gray-600 focus:outline-none cursor-pointer"
            >
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Key button — only shown if no baked-in key */}
          {!BAKED_KEY && (
            <button
              onClick={() => setShowKeyInput(v => !v)}
              className={`p-2 rounded-xl transition-all ${userKey ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
              title={userKey ? 'API key saved — click to change' : 'Set your Gemini API key'}
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key setup panel — shown when no key is available or user clicks key icon */}
      {!BAKED_KEY && (showKeyInput || !userKey) && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-2">
            <KeyRound className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-extrabold">Gemini API Key Required</p>
              <p>Get a free key at{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                   className="underline font-bold hover:text-amber-900">
                  aistudio.google.com
                </a>{' '}
                — no credit card needed. Free tier: 15 req/min, 1M tokens/day.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveUserKey()}
              placeholder="Paste your AIza... key here"
              className="flex-1 text-xs rounded-xl border-amber-200 border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white font-mono"
            />
            <button
              onClick={saveUserKey}
              disabled={!keyDraft.trim()}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            {userKey && (
              <button
                onClick={clearUserKey}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-gray-600 text-xs font-bold rounded-xl transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {userKey && (
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
              Key saved locally in your browser
            </p>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 min-h-0">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border text-xs font-extrabold ${
              msg.sender === 'user'
                ? 'bg-slate-50 border-slate-100 text-primary'
                : 'bg-primary border-primary text-white'
            }`}>
              {msg.sender === 'user' ? (msg.text[0]?.toUpperCase() || 'U') : <Bot className="w-4 h-4" />}
            </div>
            <div className="space-y-1 min-w-0">
              <div className={`p-4 rounded-3xl shadow-sm border ${
                msg.sender === 'user'
                  ? 'bg-accent/15 border-accent/20 text-primary rounded-tr-none'
                  : 'bg-slate-50 border-slate-150 text-gray-700 rounded-tl-none'
              }`}>
                {msg.sender === 'ai'
                  ? <div className="space-y-1">{renderMarkdown(msg.text)}</div>
                  : <p className="text-sm leading-relaxed">{msg.text}</p>
                }
              </div>
              <p className={`text-[9px] text-gray-400 font-bold uppercase px-1.5 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-gray-500 font-bold animate-pulse">Analyzing your trip data…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-xs shadow-sm max-w-[90%] mx-auto">
            <HelpCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-red-600 mb-1">Couldn't get a response</p>
              <p className="text-red-500 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length === 1 && !loading && apiKey && (
        <div className="flex flex-wrap gap-2 pb-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs font-bold px-3 py-1.5 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 flex gap-2">
        <input
          type="text"
          disabled={loading || !apiKey}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={
            !apiKey ? 'Add your Gemini API key above to start chatting…'
            : loading ? 'Waiting for response…'
            : 'Ask about budgets, balances, or trip plans…'
          }
          className="flex-1 text-sm rounded-2xl border-gray-200 px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-transparent bg-white text-gray-800 transition-all font-sans disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim() || !apiKey}
          className="p-3.5 bg-primary hover:bg-primary/95 text-white rounded-2xl shadow hover:shadow-md flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Footer note */}
      <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
        Powered by{' '}
        <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer"
           className="underline hover:text-accent transition-colors">
          Google Gemini
        </a>{' '}
        · Free tier · 15 req/min · 1M tokens/day · Key stored locally
      </p>
    </div>
  );
};
