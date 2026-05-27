import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Trash2, Loader2, Sparkles, HelpCircle,
  Cloud, Map, DollarSign, MessageCircle, Globe,
  TrendingUp, Compass, Lightbulb, Key, Eye, EyeOff,
  ExternalLink, CheckCircle, X,
} from 'lucide-react';
import { fetchItinerary } from '../lib/itineraryService';
import { fetchRecentExpenses, fetchTripMembers } from '../lib/expenseService';
import { calculateNetBalances } from '../lib/balanceCalculator';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const LS_KEY = 'wandr_gemini_api_key';

// ── Lightweight markdown renderer ─────────────────────────────────────────────
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
    if (line.startsWith('### ')) { elements.push(<h4 key={i} className="font-extrabold text-primary mt-3 mb-1 text-sm">{line.slice(4)}</h4>); i++; continue; }
    if (line.startsWith('## '))  { elements.push(<h3 key={i} className="font-extrabold text-primary mt-3 mb-1">{line.slice(3)}</h3>); i++; continue; }
    if (line.match(/^[\*\-] /)) {
      const bullets = [];
      while (i < lines.length && lines[i].match(/^[\*\-] /)) { bullets.push(<li key={i} className="text-gray-700">{inlineMarkdown(lines[i].slice(2))}</li>); i++; }
      elements.push(<ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 text-sm">{bullets}</ul>); continue;
    }
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={i} className="text-gray-700">{inlineMarkdown(lines[i].replace(/^\d+\. /, ''))}</li>); i++; }
      elements.push(<ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 text-sm">{items}</ol>); continue;
    }
    if (line.match(/^[-*]{3,}$/)) { elements.push(<hr key={i} className="border-gray-100 my-3" />); i++; continue; }
    if (line.trim() === '') { elements.push(<div key={i} className="h-1" />); i++; continue; }
    elements.push(<p key={i} className="text-sm leading-relaxed">{inlineMarkdown(line)}</p>);
    i++;
  }
  return elements;
};

// ── WMO weather codes ─────────────────────────────────────────────────────────
const WMO_DESC = {
  0:'Clear Sky',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',
  45:'Foggy',48:'Icy Fog',51:'Light Drizzle',53:'Moderate Drizzle',55:'Dense Drizzle',
  61:'Slight Rain',63:'Moderate Rain',65:'Heavy Rain',71:'Light Snow',73:'Moderate Snow',
  75:'Heavy Snow',80:'Slight Showers',81:'Moderate Showers',82:'Violent Showers',
  95:'Thunderstorm',96:'Thunderstorm+Hail',99:'Heavy Hail Storm',
};

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ✦' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];

const SUGGESTIONS = [
  'Am I over budget?', "How's the weather this week?", 'Who owes the most?',
  'What should I pack?', 'Best day to go sightseeing?', 'Summarize all expenses.',
  'Do I need a visa?', 'What currency should I use?', 'Best local food to try?',
];

const isGeneralQuestion = (text) =>
  /\b(visa|passport|currency|exchange rate|language|culture|customs|etiquette|safety|crime|religion|history|famous|capital|population|timezone|flight|airport|transport|train|bus|taxi|food|cuisine|dish|restaurant|hotel|hostel|sim card|emergency|hospital|embassy|tip|tipping|plug|socket|vaccination|insurance|best time|season|festival|holiday|shopping|market|souvenir|phrase|wifi|atm|cash|card|climate|geography|recommend|suggest|advice|what is|who is|explain|how does|compare|best|top|popular|tourist|attraction|landmark|museum|beach|mountain|nature|park)\b/i.test(text);

// ── API helper functions ───────────────────────────────────────────────────────
const fetchWeatherContext = async (destination) => {
  if (!destination) return 'No destination set.';
  try {
    const city = destination.split(',')[0].trim();
    const gRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const gData = await gRes.json();
    if (!gData.results?.length) return `No weather data for "${destination}".`;
    const { latitude: lat, longitude: lng, name, country } = gData.results[0];
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto&forecast_days=7`);
    const wData = await wRes.json();
    if (!wData.daily) return 'Weather data unavailable.';
    const cur = wData.current;
    const currentLine = cur ? `Current: ${Math.round(cur.temperature_2m)}°C, ${WMO_DESC[cur.weather_code]||'Unknown'}, Wind ${Math.round(cur.wind_speed_10m)} km/h, Humidity ${cur.relative_humidity_2m}%` : '';
    const days = wData.daily.time.map((date, i) => {
      const label = i === 0 ? 'Today' : new Date(date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });
      return `  ${label}: ${WMO_DESC[wData.daily.weather_code[i]]||'Unknown'}, High ${Math.round(wData.daily.temperature_2m_max[i])}°C / Low ${Math.round(wData.daily.temperature_2m_min[i])}°C, Rain ${wData.daily.precipitation_probability_max[i]}%`;
    }).join('\n');
    return `Location: ${name}, ${country}\n${currentLine}\n7-Day Forecast:\n${days}`;
  } catch (e) { return `Weather fetch failed: ${e.message}`; }
};

const fetchMapContext = async (tripId, destination) => {
  try {
    const { data } = await fetchItinerary(tripId);
    const items = data || [];
    if (!items.length) return 'No itinerary stops added yet.';
    const stops = items.filter(it => it.location?.trim()).map((it, idx) => {
      const dt = new Date(it.start_time);
      return `  Stop ${idx+1}: ${it.title} @ ${it.location} on ${dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'})} at ${dt.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})}`;
    });
    const noLoc = items.filter(it => !it.location?.trim()).map(it => `  - ${it.title} (no location)`);
    let result = `Destination: ${destination||'N/A'}\nMapped stops (${stops.length}):\n${stops.join('\n')||'  None yet.'}`;
    if (noLoc.length) result += `\nWithout locations:\n${noLoc.join('\n')}`;
    return result;
  } catch (e) { return `Map fetch failed: ${e.message}`; }
};

const fetchDestinationCoords = async (destination) => {
  if (!destination) return null;
  try {
    const city = destination.split(',')[0].trim();
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const data = await res.json();
    if (!data.results?.length) return null;
    const { latitude, longitude, name, country, admin1 } = data.results[0];
    return { lat: latitude, lng: longitude, name, country, admin1 };
  } catch (e) { return null; }
};

// ── API Key Setup Screen ───────────────────────────────────────────────────────
const ApiKeySetup = ({ onKeySaved }) => {
  const [input, setInput]     = useState('');
  const [show, setShow]       = useState(false);
  const [testing, setTesting] = useState(false);
  const [err, setErr]         = useState('');

  const handleSave = async () => {
    const key = input.trim();
    if (!key.startsWith('AIza') || key.length < 30) {
      setErr('That doesn\'t look like a valid Gemini API key. It should start with "AIza".');
      return;
    }
    setTesting(true); setErr('');
    try {
      const res = await fetch(`${GEMINI_API_BASE}/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }),
      });
      if (res.status === 400 || res.ok) {
        // 400 = model params issue but key is valid; ok = works perfectly
        localStorage.setItem(LS_KEY, key);
        onKeySaved(key);
      } else if (res.status === 403 || res.status === 401) {
        setErr('Key rejected (403/401). Make sure the key has no HTTP referrer restrictions. See instructions below.');
      } else {
        setErr(`Unexpected response: HTTP ${res.status}. Please try again.`);
      }
    } catch (e) {
      setErr('Network error testing key. Please try again.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center space-y-6">
      {/* Icon */}
      <div className="p-4 bg-primary/10 rounded-3xl">
        <Key className="w-8 h-8 text-primary" />
      </div>

      {/* Title */}
      <div className="space-y-2 max-w-sm">
        <h2 className="font-extrabold text-xl text-primary">Add Your Gemini API Key</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Wandr AI uses Google Gemini. Each user brings their own <strong>free</strong> API key —
          it stays on your device only, never sent to any server.
        </p>
      </div>

      {/* Steps */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 w-full max-w-sm">
        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">How to get your free key</p>
        {[
          { n: '1', t: 'Open Google AI Studio', sub: 'aistudio.google.com/app/apikey', link: 'https://aistudio.google.com/app/apikey' },
          { n: '2', t: 'Click "Create API key"', sub: 'Then "Create API key in new project"' },
          { n: '3', t: 'Copy & paste it below', sub: 'Starts with AIza… · 100% free' },
        ].map(({ n, t, sub, link }) => (
          <div key={n} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</div>
            <div>
              <p className="text-sm font-bold text-gray-700">{t}</p>
              {link
                ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">{sub} <ExternalLink className="w-3 h-3" /></a>
                : <p className="text-xs text-gray-400">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="w-full max-w-sm space-y-2">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={input}
            onChange={e => { setInput(e.target.value); setErr(''); }}
            placeholder="AIzaSy…"
            className="w-full text-sm rounded-2xl border border-gray-200 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-transparent font-mono"
          />
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {err && <p className="text-xs text-red-500 text-left px-1">{err}</p>}
        <button onClick={handleSave} disabled={testing || !input.trim()}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-3 text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
          {testing ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying key…</> : <><CheckCircle className="w-4 h-4" /> Save & Activate AI</>}
        </button>
      </div>

      <p className="text-[10px] text-gray-400 max-w-xs">
        🔒 Your key is stored only in your browser's localStorage. It is never uploaded anywhere.
      </p>
    </div>
  );
};

// ── Main FinanceAI component ───────────────────────────────────────────────────
export const FinanceAI = ({ tripId, tripName, tripDestination, totalBudget, currencySymbol = '₹' }) => {
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem(LS_KEY) || '');
  const [model, setModel]         = useState('gemini-2.5-flash');
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading]     = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const [error, setError]         = useState(null);
  const [showKeyEdit, setShowKeyEdit] = useState(false);
  const messagesEndRef             = useRef(null);

  const handleKeySaved = (key) => { setApiKey(key); setShowKeyEdit(false); };
  const handleRemoveKey = () => {
    if (!window.confirm('Remove your API key? You\'ll need to re-enter it to use the AI.')) return;
    localStorage.removeItem(LS_KEY);
    setApiKey('');
    setMessages([]);
  };

  useEffect(() => {
    if (!apiKey) return;
    setMessages([{
      id: 'welcome', sender: 'ai',
      text: `Hi! I'm your **Wandr AI Advisor** 🤖\n\nI have full access to your trip **"${tripName}"** and can answer any travel question:\n* 💰 Budget, expenses & balances\n* 🗓️ Full itinerary & locations\n* 🌤️ Live weather for ${tripDestination || 'your destination'}\n* 🗺️ Mapped stops & coordinates\n* 🌍 Visa, currency, culture, food, safety & more\n\n_Ask me anything — powered by Google Gemini._`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
    setError(null);
  }, [tripId, tripName, apiKey]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const buildSystemPrompt = async (userText) => {
    const needsWeather = /weather|rain|temperature|forecast|pack|umbrella|hot|cold|sunny|wind|humid|climate|snow|storm|season/i.test(userText);
    const needsMap     = /map|location|where|stop|place|address|landmark|route|distance|nearby|pin|coordinates|navigate/i.test(userText);
    const needsCoords  = /coordinates|lat|lng|map link|google maps|navigate to/i.test(userText);
    const isGeneral    = isGeneralQuestion(userText);

    setLoadingLabel('Loading trip data…');
    const [iRes, eRes, mRes, bRes] = await Promise.allSettled([
      fetchItinerary(tripId), fetchRecentExpenses(tripId),
      fetchTripMembers(tripId), calculateNetBalances(tripId),
    ]);

    const members   = (mRes.value?.data || []).map(m => typeof m === 'string' ? m : m.name).filter(Boolean);
    const itinerary = (iRes.value?.data || []).map(it =>
      `- ${new Date(it.start_time).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})}: ${it.title} @ "${it.location||'no location'}" [${it.category_icon}]${it.notes?` — ${it.notes}`:''}`
    ).join('\n');
    const expenses  = (eRes.value?.data || []).map(e => `- ${e.description}: ${currencySymbol}${e.amount} paid by ${e.paid_by} [${e.category}]`).join('\n');
    const balances  = (bRes.value?.data || []).map(b => `- ${b.from} owes ${b.to} ${currencySymbol}${b.amount}`).join('\n');
    const totalSpent = (eRes.value?.data || []).reduce((s, e) => s + Number(e.amount || 0), 0);
    const budgetRemaining = Number(totalBudget) - totalSpent;
    const budgetPct = totalBudget > 0 ? ((totalSpent / Number(totalBudget)) * 100).toFixed(1) : 0;

    let weatherContext = '', mapContext = '', coordsContext = '';
    if (needsWeather || isGeneral) { setLoadingLabel('Fetching live weather…'); weatherContext = await fetchWeatherContext(tripDestination); }
    if (needsMap) { setLoadingLabel('Loading map data…'); mapContext = await fetchMapContext(tripId, tripDestination); }
    if (needsCoords || needsMap) {
      const coords = await fetchDestinationCoords(tripDestination);
      if (coords) coordsContext = `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}\nGoogle Maps: https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    }
    setLoadingLabel('Generating response…');

    return `You are Wandr AI — a friendly travel assistant in the Wandr group travel app.
You have TWO roles:
1. TRIP ADVISOR: Answer questions about this trip using the data below.
2. GENERAL TRAVEL EXPERT: Answer ANY travel question — visa, currency, culture, food, safety, transport, packing, attractions, etc.
NEVER say "I don't have access to that." You are a full travel expert.

TRIP: ${tripName} | Destination: ${tripDestination||'Not set'} | Budget: ${currencySymbol}${totalBudget}
Spent: ${currencySymbol}${totalSpent.toFixed(2)} (${budgetPct}%) | Remaining: ${currencySymbol}${budgetRemaining.toFixed(2)}
Companions: ${members.join(', ')||'Solo'} | Today: ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}

EXPENSES:\n${expenses||'None yet.'}
BALANCES:\n${balances||'All settled.'}
ITINERARY:\n${itinerary||'None yet.'}
${coordsContext?`COORDINATES:\n${coordsContext}`:''}
${weatherContext?`WEATHER (${tripDestination}):\n${weatherContext}`:''}
${mapContext?`MAP:\n${mapContext}`:''}

RULES: Use ${currencySymbol} for amounts. Be friendly. Use markdown. Give specific actionable advice. Always be positive.`;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setInputText(''); setError(null);
    const userMsg = { id: 'user-'+Date.now(), sender: 'user', text, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true); setLoadingLabel('Thinking…');
    try {
      const systemPrompt = await buildSystemPrompt(text);
      const history = messages.slice(-12).map(m => ({ role: m.sender==='user'?'user':'model', parts: [{ text: m.text }] }));
      const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [...history, { role: 'user', parts: [{ text }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 2000 },
        }),
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error('API key rejected (403). Your key may have HTTP referrer restrictions. Remove them at aistudio.google.com/app/apikey or create a new unrestricted key.');
      }
      if (res.status === 429) throw new Error('Too many requests — please wait a moment and try again.');
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!reply) {
        if (data?.candidates?.[0]?.finishReason === 'SAFETY') throw new Error('Blocked by safety filters. Try rephrasing.');
        throw new Error('Empty response. Please try again.');
      }
      setMessages(prev => [...prev, { id: 'ai-'+Date.now(), sender: 'ai', text: reply, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(inputText); };
  const handleClear  = () => {
    if (!window.confirm('Clear conversation?')) return;
    setMessages([{ id: 'welcome-'+Date.now(), sender: 'ai', text: `Cleared! Ask me anything about **"${tripName}"**.`, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }]);
    setError(null);
  };

  const CHIPS = [
    { icon: DollarSign,    label: 'Budget & Expenses', q: "Summarize all expenses by category and tell me if I'm over budget." },
    { icon: Cloud,         label: 'Weather Forecast',  q: "How's the weather this week? What should I pack?" },
    { icon: Map,           label: 'Map & Locations',   q: 'List all my trip locations. Give me a Google Maps link for the destination.' },
    { icon: MessageCircle, label: 'Travel Tips',       q: `Give me top 5 travel tips for ${tripDestination||'my destination'}.` },
    { icon: Globe,         label: 'Visa & Entry',      q: `What are the visa requirements for ${tripDestination||'my destination'}?` },
    { icon: TrendingUp,    label: 'Budget Hacks',      q: 'Give me money-saving tips and how to split costs fairly.' },
    { icon: Compass,       label: 'Best Day Out',      q: 'Based on the weather forecast, which day is best for outdoor sightseeing?' },
    { icon: Lightbulb,     label: 'Local Customs',     q: `What local customs and cultural tips should I know for ${tripDestination||'my destination'}?` },
  ];

  // ── No key set → show setup screen ──────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8 flex flex-col h-[calc(100vh-140px)] min-h-[500px] font-sans">
        <ApiKeySetup onKeySaved={handleKeySaved} />
      </div>
    );
  }

  // ── Key edit mode ────────────────────────────────────────────────────────────
  if (showKeyEdit) {
    return (
      <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8 flex flex-col h-[calc(100vh-140px)] min-h-[500px] font-sans">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
          <h2 className="font-extrabold text-primary">Update API Key</h2>
          <button onClick={() => setShowKeyEdit(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <ApiKeySetup onKeySaved={handleKeySaved} />
      </div>
    );
  }

  // ── Main chat UI ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8 flex flex-col h-[calc(100vh-140px)] min-h-[500px] font-sans">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-white rounded-2xl shadow-sm"><Bot className="w-5 h-5" /></div>
          <div>
            <h2 className="font-extrabold text-lg text-primary tracking-tight">AI Travel Advisor</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Budget · Weather · Map · Visa · Culture · Q&A</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <select value={model} onChange={e => setModel(e.target.value)} className="text-[10px] font-bold bg-transparent border-none p-0 focus:ring-0 text-gray-600 focus:outline-none cursor-pointer">
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {/* Key button */}
          <button onClick={() => setShowKeyEdit(true)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="Update API key"><Key className="w-4 h-4" /></button>
          {/* Clear */}
          <button onClick={handleClear} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Clear conversation"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 max-w-[88%] ${msg.sender==='user'?'ml-auto flex-row-reverse':'mr-auto'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border text-xs font-extrabold ${msg.sender==='user'?'bg-slate-50 border-slate-100 text-primary':'bg-primary border-primary text-white'}`}>
              {msg.sender==='user' ? (msg.text[0]?.toUpperCase()||'U') : <Bot className="w-4 h-4" />}
            </div>
            <div className="space-y-1 min-w-0">
              <div className={`p-4 rounded-3xl shadow-sm border ${msg.sender==='user'?'bg-accent/15 border-accent/20 text-primary rounded-tr-none':'bg-slate-50 border-slate-150 text-gray-700 rounded-tl-none'}`}>
                {msg.sender==='ai' ? <div className="space-y-1">{renderMarkdown(msg.text)}</div> : <p className="text-sm leading-relaxed">{msg.text}</p>}
              </div>
              <p className={`text-[9px] text-gray-400 font-bold uppercase px-1.5 ${msg.sender==='user'?'text-right':'text-left'}`}>{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm flex-shrink-0"><Bot className="w-4 h-4" /></div>
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-gray-500 font-bold animate-pulse">{loadingLabel}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-xs shadow-sm max-w-[92%] mx-auto">
            <HelpCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-red-600 mb-1">Couldn't get a response</p>
              <p className="text-red-500 leading-relaxed">{error}</p>
              {error.includes('403') && (
                <button onClick={() => setShowKeyEdit(true)} className="mt-2 text-xs font-bold text-primary underline">Update API key →</button>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chips & suggestions — welcome only */}
      {messages.length === 1 && !loading && (
        <div className="py-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CHIPS.map(({ icon: Icon, label, q }) => (
              <button key={label} onClick={() => sendMessage(q)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-accent/10 border border-slate-100 hover:border-accent/30 rounded-xl transition-all text-left group">
                <Icon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="text-[11px] font-bold text-gray-600 group-hover:text-accent leading-tight">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-[11px] font-bold px-2.5 py-1 bg-accent/8 text-accent rounded-lg hover:bg-accent/20 transition-colors border border-accent/10">{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 flex gap-2">
        <input type="text" disabled={loading} value={inputText} onChange={e => setInputText(e.target.value)}
          placeholder={loading ? loadingLabel : 'Ask about budget, weather, visa, culture, maps, or anything…'}
          className="flex-1 text-sm rounded-2xl border-gray-200 px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-transparent bg-white text-gray-800 transition-all font-sans disabled:opacity-60" />
        <button type="submit" disabled={loading || !inputText.trim()}
          className="p-3.5 bg-primary hover:bg-primary/95 text-white rounded-2xl shadow hover:shadow-md flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />
        </button>
      </form>

      <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
        Powered by <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">Google Gemini</a>
        {' '}· Your key stays on your device only ·{' '}
        <button onClick={() => setShowKeyEdit(true)} className="underline hover:text-accent">Change key</button>
      </p>
    </div>
  );
};
