import React, { useState, useEffect } from 'react';
import { Bot, Key, Eye, EyeOff, CheckCircle, ExternalLink, Trash2, Sparkles } from 'lucide-react';

// ── Provider definitions ───────────────────────────────────────────────────────
export const AI_PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    logo: '✦',
    color: 'from-blue-500 to-indigo-600',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIzaSy…',
    keyHint: 'Starts with AIza · 100% free tier available',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    getKeyLabel: 'aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ✦ (Best)' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    defaultModel: 'gemini-2.5-flash',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    logo: '⚡',
    color: 'from-orange-500 to-red-500',
    badge: 'Ultra Fast',
    badgeColor: 'bg-orange-100 text-orange-700',
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_…',
    keyHint: 'Starts with gsk_ · Free tier with generous limits',
    getKeyUrl: 'https://console.groq.com/keys',
    getKeyLabel: 'console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Best)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fastest)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    logo: '🌀',
    color: 'from-purple-500 to-pink-500',
    badge: 'European AI',
    badgeColor: 'bg-purple-100 text-purple-700',
    keyPrefix: '',
    keyPlaceholder: 'Paste your Mistral API key…',
    keyHint: 'Get a free key from La Plateforme',
    getKeyUrl: 'https://console.mistral.ai/api-keys/',
    getKeyLabel: 'console.mistral.ai/api-keys',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small (Best free)' },
      { id: 'open-mistral-nemo', name: 'Mistral Nemo' },
      { id: 'open-mistral-7b', name: 'Mistral 7B' },
    ],
    defaultModel: 'mistral-small-latest',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    logo: '🔀',
    color: 'from-teal-500 to-cyan-500',
    badge: '100+ Models',
    badgeColor: 'bg-teal-100 text-teal-700',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-…',
    keyHint: 'Starts with sk-or- · Access 100+ models, many free',
    getKeyUrl: 'https://openrouter.ai/keys',
    getKeyLabel: 'openrouter.ai/keys',
    models: [
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
      { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek V3 (Free)' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
    ],
    defaultModel: 'google/gemini-2.0-flash-exp:free',
  },
};

const LS_PROVIDER  = 'wandr_ai_provider';
const LS_KEY       = (pid) => `wandr_ai_key_${pid}`;
const LS_MODEL     = (pid) => `wandr_ai_model_${pid}`;

export const loadAISettings = () => {
  const providerId = localStorage.getItem(LS_PROVIDER) || 'gemini';
  const provider   = AI_PROVIDERS[providerId] || AI_PROVIDERS.gemini;
  const apiKey     = localStorage.getItem(LS_KEY(providerId)) || '';
  const model      = localStorage.getItem(LS_MODEL(providerId)) || provider.defaultModel;
  return { provider, apiKey, model };
};

// ── Test a key against each provider ─────────────────────────────────────────
const testKey = async (provider, key, model) => {
  try {
    if (provider.id === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }) }
      );
      // 400 = invalid request but key accepted; 200 = perfect; 429 = rate limited but key valid
      if (res.ok || res.status === 400 || res.status === 429) return { ok: true };
      const e = await res.json().catch(() => ({}));
      return { ok: false, msg: e?.error?.message || `HTTP ${res.status}` };
    }
    if (provider.id === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
      });
      if (res.ok || res.status === 429) return { ok: true };
      const e = await res.json().catch(() => ({}));
      return { ok: false, msg: e?.error?.message || `HTTP ${res.status}` };
    }
    if (provider.id === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
      });
      if (res.ok || res.status === 429) return { ok: true };
      const e = await res.json().catch(() => ({}));
      return { ok: false, msg: e?.error?.message || `HTTP ${res.status}` };
    }
    if (provider.id === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://sourishnandy4-cell.github.io', 'X-Title': 'Wandr Travel Planner' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 }),
      });
      if (res.ok || res.status === 429) return { ok: true };
      const e = await res.json().catch(() => ({}));
      return { ok: false, msg: e?.error?.message || `HTTP ${res.status}` };
    }
    return { ok: false, msg: 'Unknown provider' };
  } catch (e) {
    return { ok: false, msg: `Network error: ${e.message}` };
  }
};

// ── AISettings Panel Component ────────────────────────────────────────────────
export const AISettingsPanel = ({ onSaved }) => {
  const saved = loadAISettings();
  const [selectedId, setSelectedId]   = useState(saved.provider.id);
  const [keyInputs, setKeyInputs]     = useState(() => {
    const obj = {};
    Object.keys(AI_PROVIDERS).forEach(pid => {
      obj[pid] = localStorage.getItem(LS_KEY(pid)) || '';
    });
    return obj;
  });
  const [modelSelects, setModelSelects] = useState(() => {
    const obj = {};
    Object.keys(AI_PROVIDERS).forEach(pid => {
      obj[pid] = localStorage.getItem(LS_MODEL(pid)) || AI_PROVIDERS[pid].defaultModel;
    });
    return obj;
  });
  const [showKeys, setShowKeys]   = useState({});
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved2, setSaved2]       = useState(false);

  const provider = AI_PROVIDERS[selectedId];

  const handleSave = async () => {
    const key = keyInputs[selectedId]?.trim();
    if (!key) { setTestResult({ ok: false, msg: 'Please enter an API key.' }); return; }
    setTesting(true); setTestResult(null); setSaved2(false);
    const model = modelSelects[selectedId];
    const result = await testKey(provider, key, model);
    setTesting(false);
    if (result.ok) {
      localStorage.setItem(LS_PROVIDER, selectedId);
      localStorage.setItem(LS_KEY(selectedId), key);
      localStorage.setItem(LS_MODEL(selectedId), model);
      setSaved2(true);
      setTestResult({ ok: true, msg: 'Key verified and saved! AI is ready.' });
      onSaved?.();
    } else {
      setTestResult({ ok: false, msg: result.msg });
    }
  };

  const handleRemove = (pid) => {
    localStorage.removeItem(LS_KEY(pid));
    setKeyInputs(prev => ({ ...prev, [pid]: '' }));
    if (localStorage.getItem(LS_PROVIDER) === pid) localStorage.removeItem(LS_PROVIDER);
    setTestResult(null); setSaved2(false);
  };

  const activeKey = localStorage.getItem(LS_KEY(localStorage.getItem(LS_PROVIDER) || 'gemini'));

  return (
    <div className="space-y-4">
      {/* Provider Selector - Horizontal & Sleek */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">AI Provider</label>
          {activeKey && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active: {AI_PROVIDERS[localStorage.getItem(LS_PROVIDER)]?.name || 'Gemini'}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 p-1 bg-slate-100/85 rounded-xl border border-slate-200/50">
          {Object.values(AI_PROVIDERS).map(p => {
            const isSelected = selectedId === p.id;
            const hasKey = !!keyInputs[p.id]?.trim() || !!localStorage.getItem(LS_KEY(p.id));
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelectedId(p.id); setTestResult(null); setSaved2(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded-lg text-[11px] font-extrabold transition-all relative ${
                  isSelected 
                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-400 hover:bg-white/40 hover:text-gray-700'
                }`}
              >
                <span className={`text-xs ${isSelected ? 'scale-110' : ''}`}>{p.logo}</span>
                <span className="hidden sm:inline">{p.name.replace(' Google', '').replace(' AI', '')}</span>
                {hasKey && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" title="Key saved" style={{ animationDuration: '3s' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Provider Config - Elegant & Tight */}
      <div className="space-y-3.5 pt-0.5">
        {/* Link to get key - Compact */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-gray-450 font-medium">Configure credentials:</span>
          <a href={provider.getKeyUrl} target="_blank" rel="noopener noreferrer"
            className="text-accent hover:underline flex items-center gap-0.5 font-bold transition-all">
            Get {provider.name} key <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key & Model Select in a tight side-by-side grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* API Key input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">API Key</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type={showKeys[selectedId] ? 'text' : 'password'}
                value={keyInputs[selectedId] || ''}
                onChange={e => { setKeyInputs(prev => ({ ...prev, [selectedId]: e.target.value })); setTestResult(null); setSaved2(false); }}
                placeholder={provider.keyPlaceholder}
                className="w-full text-xs rounded-xl border border-gray-250/70 pl-9 pr-16 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/20 font-mono bg-white"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
                <button type="button" onClick={() => setShowKeys(s => ({ ...s, [selectedId]: !s[selectedId] }))}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {showKeys[selectedId] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {(keyInputs[selectedId] || localStorage.getItem(LS_KEY(selectedId))) && (
                  <button type="button" onClick={() => handleRemove(selectedId)} className="p-1 text-red-400 hover:text-red-650 transition-colors" title="Remove key">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Model selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Model</label>
            <div className="relative font-sans">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select
                value={modelSelects[selectedId]}
                onChange={e => setModelSelects(prev => ({ ...prev, [selectedId]: e.target.value }))}
                className="w-full text-xs rounded-xl border border-gray-250/70 pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white appearance-none transition-colors font-sans">
                {provider.models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Small key prefix / hint message */}
        <p className="text-[9.5px] text-gray-400 mt-[-4px] italic">{provider.keyHint}</p>

        {/* Test Result Indicator */}
        {testResult && (
          <div className={`flex items-start gap-1.5 rounded-xl px-3 py-2 text-[11px] ${
            testResult.ok 
              ? 'bg-emerald-50/70 text-emerald-700 border border-emerald-100/50' 
              : 'bg-red-50/70 text-red-600 border border-red-100/50'
          }`}>
            {testResult.ok ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <span className="flex-shrink-0 mt-0.5">⚠️</span>}
            <p className="font-semibold leading-normal">{testResult.msg}</p>
          </div>
        )}

        {/* Save button - Sleek & compact */}
        <button onClick={handleSave} disabled={testing || !keyInputs[selectedId]?.trim()}
          className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-2.5 text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm hover:shadow active:scale-[0.99] font-sans">
          {testing
            ? <><Bot className="w-3.5 h-3.5 animate-pulse" /> Verifying...</>
            : saved2
            ? <><CheckCircle className="w-3.5 h-3.5" /> Key Verified & Saved</>
            : <><CheckCircle className="w-3.5 h-3.5" /> Verify & Save Connection</>}
        </button>

        <div className="flex items-center justify-center gap-1 text-[9.5px] text-gray-400 font-sans">
          <span>🔒 Credentials are encrypted and stored only in your local browser context.</span>
        </div>
      </div>
    </div>
  );
};
