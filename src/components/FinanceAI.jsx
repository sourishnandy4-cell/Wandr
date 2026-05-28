import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Trash2, Loader2, HelpCircle,
  Cloud, Map, DollarSign, MessageCircle, Globe,
  TrendingUp, Compass, Lightbulb, Settings,
} from 'lucide-react';
import { fetchItinerary, addItineraryItem } from '../lib/itineraryService';
import { fetchRecentExpenses, fetchTripMembers, addExpense } from '../lib/expenseService';
import { calculateNetBalances } from '../lib/balanceCalculator';
import { loadAISettings, AI_PROVIDERS } from './AISettings';

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

// ── No-provider setup screen ──────────────────────────────────────────────────
const NoProviderSetup = ({ onGoToSettings }) => (
  <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center space-y-6">
    <div className="p-4 bg-primary/10 rounded-3xl">
      <Bot className="w-8 h-8 text-primary" />
    </div>
    <div className="space-y-2 max-w-sm">
      <h2 className="font-extrabold text-xl text-primary">Set Up Your AI Provider</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        Wandr AI supports <strong>Gemini, Groq, Mistral, and OpenRouter</strong>.
        Go to <strong>Settings</strong> to choose a provider and add your free API key.
      </p>
    </div>
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-3 w-full max-w-sm">
      <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Available Providers</p>
      {Object.values(AI_PROVIDERS).map(p => (
        <div key={p.id} className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>{p.logo}</div>
          <div>
            <p className="text-sm font-bold text-gray-700">{p.name}</p>
            <p className="text-xs text-gray-400">{p.keyHint}</p>
          </div>
        </div>
      ))}
    </div>
    <button
      onClick={onGoToSettings}
      className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl px-6 py-3 text-sm transition-all"
    >
      <Settings className="w-4 h-4" /> Go to Settings
    </button>
    <p className="text-[10px] text-gray-400 max-w-xs">
      🔒 Your API key is stored only in your browser. Never uploaded to any server.
    </p>
  </div>
);

// ── Multi-provider API call ───────────────────────────────────────────────────
const callProviderAPI = async (provider, apiKey, model, systemPrompt, history, userText) => {
  if (provider.id === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [...history, { role: 'user', parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 2000 },
        }),
      }
    );
    if (res.status === 401 || res.status === 403) throw new Error('Gemini API key rejected (403). Check key restrictions at aistudio.google.com/app/apikey.');
    if (res.status === 429) throw new Error('Rate limited — please wait a moment and try again.');
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      if (data?.candidates?.[0]?.finishReason === 'SAFETY') throw new Error('Blocked by safety filters. Try rephrasing.');
      throw new Error('Empty response. Please try again.');
    }
    return reply;
  }

  // OpenAI-compatible providers (Groq, Mistral, OpenRouter)
  const endpoints = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    mistral: 'https://api.mistral.ai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  };
  const url = endpoints[provider.id];
  if (!url) throw new Error('Unknown provider.');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.parts?.[0]?.text || m.content || '' })),
    { role: 'user', content: userText },
  ];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://sourishnandy4-cell.github.io';
    headers['X-Title'] = 'Wandr Travel Planner';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.75 }),
  });
  if (res.status === 401 || res.status === 403) throw new Error(`${provider.name} API key rejected. Check your key in Settings.`);
  if (res.status === 429) throw new Error('Rate limited — please wait a moment and try again.');
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('Empty response. Please try again.');
  return reply;
};

// ── Main FinanceAI component ───────────────────────────────────────────────────
export const FinanceAI = ({ tripId, tripName, tripDestination, startDate, endDate, totalBudget, currencySymbol = '₹', memberName = 'Traveller', onGoToSettings, onDashboardUpdate }) => {
  const [aiSettings, setAiSettings] = useState(() => loadAISettings());
  const messagesEndRef = useRef(null);
  const CHAT_KEY = `wandr_ai_chat_${tripId}`;

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`wandr_ai_chat_${tripId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [inputText, setInputText]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const [error, setError]           = useState(null);

  const { provider, apiKey, model } = aiSettings;

  // Re-read settings whenever user focuses the tab (so Settings changes take effect)
  useEffect(() => {
    const onFocus = () => setAiSettings(loadAISettings());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ── Persist messages to localStorage on every change ──────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-120)));
    } catch {}
  }, [messages, CHAT_KEY]);

  // ── Show welcome message only if no saved history exists ──────────────────
  useEffect(() => {
    if (!apiKey) return;
    setMessages(prev => {
      if (prev.length > 0) return prev; // restore saved chat — don't reset
      return [{
        id: 'welcome', sender: 'ai',
        text: `Hi! I'm your **Wandr AI Advisor** 🤖\n\nI have full access to your trip **"${tripName}"** and can answer any travel question:\n* 💰 Budget, expenses & balances\n* 🗓️ Full itinerary & locations\n* 🌤️ Live weather for ${tripDestination || 'your destination'}\n* 🗺️ Mapped stops & coordinates\n* 📋 **I can also build your full itinerary and add it to the dashboard!**\n* 🌍 Visa, currency, culture, food, safety & more\n\n_Ask me anything — powered by **${provider.name}**._`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }];
    });
    setError(null);
  }, [tripId, tripName, apiKey, provider.id]);

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

TRIP: ${tripName} | Destination: ${tripDestination||'Not set'} | Dates: ${startDate||'TBD'} to ${endDate||'TBD'} | Budget: ${currencySymbol}${totalBudget}
Spent: ${currencySymbol}${totalSpent.toFixed(2)} (${budgetPct}%) | Remaining: ${currencySymbol}${budgetRemaining.toFixed(2)}
Companions: ${members.join(', ')||'Solo'} | Today: ${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}

EXPENSES:\n${expenses||'None yet.'}
BALANCES:\n${balances||'All settled.'}
ITINERARY:\n${itinerary||'None yet.'}
${coordsContext?`COORDINATES:\n${coordsContext}`:''}
${weatherContext?`WEATHER (${tripDestination}):\n${weatherContext}`:''}
${mapContext?`MAP:\n${mapContext}`:''}

━━━ DASHBOARD UPDATE CAPABILITY ━━━
When the user asks you to plan a trip, add activities, hotel stays, dining, sightseeing, expenses, or any other dashboard data — you MUST include a <WANDR_ACTION> JSON block at the VERY END of your response (after all text). This will automatically save items to their dashboard.

Required JSON format inside the block:
{
  "itinerary": [
    { "title": "Activity name", "location": "Full address or landmark", "start_time": "YYYY-MM-DDTHH:MM:00Z", "notes": "Useful details", "category_icon": "activity" }
  ],
  "expenses": [
    { "description": "What was spent on", "amount": 5000, "category": "Accommodation", "paid_by": "${memberName}" }
  ]
}

Rules:
- category_icon must be one of: transport | food | activity | music | accommodation
- expense category must be one of: Accommodation | Food & Drinks | Transport | Activities | Shopping | Miscellaneous
- Use the trip's actual start_date (${startDate||'use trip start date'}) and end_date (${endDate||'use trip end date'}) for scheduling. Spread activities across the full trip duration.
- For a FULL trip plan (e.g. "plan 7 days in Japan"), generate ALL days with multiple stops each day. Include hotel check-in as accommodation, dining stops as food, sightseeing as activity, flights/trains as transport.
- If adding expenses, set paid_by to "${memberName}".
- ONLY include the <WANDR_ACTION> block when the user explicitly wants to add something to their dashboard. For general Q&A, omit it.
- Wrap the JSON in <WANDR_ACTION> and </WANDR_ACTION> tags exactly.

RULES: Use ${currencySymbol} for amounts. Be friendly. Use markdown. Give specific actionable advice. Always be positive.`;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const current = loadAISettings(); // Always read fresh settings
    setAiSettings(current);
    setInputText(''); setError(null);
    const userMsg = { id: 'user-'+Date.now(), sender: 'user', text, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true); setLoadingLabel('Thinking…');
    try {
      const systemPrompt = await buildSystemPrompt(text);
      // Build history in Gemini format (used for Gemini; converted for others inside callProviderAPI)
      const history = messages.slice(-12).map(m => ({ role: m.sender==='user'?'user':'model', parts: [{ text: m.text }] }));
      const reply = await callProviderAPI(current.provider, current.apiKey, current.model, systemPrompt, history, text);

      // ── Parse WANDR_ACTION blocks and execute dashboard updates ─────────
      const actionMatch = reply.match(/<WANDR_ACTION>([\s\S]*?)<\/WANDR_ACTION>/);
      const cleanReply  = reply.replace(/<WANDR_ACTION>[\s\S]*?<\/WANDR_ACTION>/g, '').trim();
      let actionSummary = '';

      if (actionMatch) {
        try {
          setLoadingLabel('Updating dashboard…');
          const jsonStr = actionMatch[1].trim();
          const actions = JSON.parse(jsonStr);
          let addedItems = 0, addedExpenses = 0, failedItems = 0;

          if (Array.isArray(actions.itinerary)) {
            for (const item of actions.itinerary) {
              const { error: err } = await addItineraryItem(tripId, {
                title: item.title || 'Untitled',
                location: item.location || '',
                start_time: item.start_time,
                notes: item.notes || '',
                category_icon: item.category_icon || 'activity',
              });
              if (err) failedItems++;
              else addedItems++;
            }
          }

          if (Array.isArray(actions.expenses)) {
            for (const exp of actions.expenses) {
              const { error: err } = await addExpense(tripId, {
                description: exp.description || 'AI-added expense',
                amount: Number(exp.amount) || 0,
                category: exp.category || 'Miscellaneous',
                paid_by: exp.paid_by || memberName,
              });
              if (err) failedItems++;
              else addedExpenses++;
            }
          }

          const parts = [];
          if (addedItems > 0) parts.push(`**${addedItems} itinerary ${addedItems === 1 ? 'activity' : 'activities'}**`);
          if (addedExpenses > 0) parts.push(`**${addedExpenses} ${addedExpenses === 1 ? 'expense' : 'expenses'}**`);
          if (parts.length > 0) {
            actionSummary = `\n\n✅ **Dashboard Updated!** Added ${parts.join(' and ')} to your trip. Switch to the **Dashboard** or **Itinerary** tab to see them.`;
            onDashboardUpdate?.();
          }
          if (failedItems > 0) actionSummary += `\n⚠️ ${failedItems} item(s) failed to save.`;
        } catch (parseErr) {
          console.error('WANDR_ACTION parse error:', parseErr);
          actionSummary = '\n\n⚠️ Dashboard update failed — please try again.';
        }
      }

      const finalText = cleanReply + actionSummary;
      setMessages(prev => [...prev, { id: 'ai-'+Date.now(), sender: 'ai', text: finalText, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }]);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(inputText); };
  const handleClear = () => {
    if (!window.confirm('Clear conversation? This will permanently delete your chat history for this trip.')) return;
    try { localStorage.removeItem(CHAT_KEY); } catch {}
    const welcomeMsg = { id: 'welcome-'+Date.now(), sender: 'ai', text: `Cleared! Ask me anything about **"${tripName}"**.`, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) };
    setMessages([welcomeMsg]);
    setError(null);
  };

  const CHIPS = [
    { icon: DollarSign,    label: 'Budget & Expenses', q: "Summarize all expenses by category and tell me if I'm over budget." },
    { icon: Cloud,         label: 'Weather Forecast',  q: "How's the weather this week? What should I pack?" },
    { icon: Map,           label: 'Map & Locations',   q: 'List all my trip locations. Give me a Google Maps link for the destination.' },
    { icon: MessageCircle, label: 'Travel Tips',       q: `Give me top 5 travel tips for ${tripDestination||'my destination'}.` },
    { icon: Globe,         label: 'Visa & Entry',      q: `What are the visa requirements for ${tripDestination||'my destination'}?` },
    { icon: TrendingUp,    label: 'Budget Hacks',      q: 'Give me money-saving tips and how to split costs fairly.' },
    { icon: Compass,       label: 'Plan Full Trip',    q: `Plan a detailed day-by-day itinerary for my entire trip to ${tripDestination||'my destination'} with hotel stays, dining, sightseeing, and transportation. Add all of it to my dashboard with estimated expenses.` },
    { icon: Lightbulb,     label: 'Local Customs',     q: `What local customs and cultural tips should I know for ${tripDestination||'my destination'}?` },
  ];

  // ── No key set → redirect to Settings ────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="bg-white rounded-3xl shadow-md border border-gray-100/50 p-6 md:p-8 flex flex-col h-[calc(100vh-140px)] min-h-[500px] font-sans">
        <NoProviderSetup onGoToSettings={onGoToSettings} />
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
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {provider.name} · {provider.models.find(m => m.id === model)?.name || model}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider badge */}
          <div className={`hidden sm:flex items-center gap-1.5 bg-gradient-to-br ${provider.color} px-2.5 py-1.5 rounded-xl`}>
            <span className="text-white text-sm">{provider.logo}</span>
            <span className="text-[10px] font-bold text-white">{provider.name}</span>
          </div>
          {/* Settings link */}
          <button onClick={onGoToSettings} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all" title="AI Settings">
            <Settings className="w-4 h-4" />
          </button>
          {/* Clear */}
          <button onClick={handleClear} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Clear conversation">
            <Trash2 className="w-4 h-4" />
          </button>
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
              <div className={`p-4 rounded-3xl shadow-sm border ${msg.sender==='user'?'bg-accent/15 border-accent/20 text-primary rounded-tr-none':'bg-slate-50 border-slate-100 text-gray-700 rounded-tl-none'}`}>
                {msg.sender==='ai' ? <div className="space-y-1">{renderMarkdown(msg.text)}</div> : <p className="text-sm leading-relaxed">{msg.text}</p>}
              </div>
              <p className={`text-[9px] text-gray-400 font-bold uppercase px-1.5 ${msg.sender==='user'?'text-right':'text-left'}`}>{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm flex-shrink-0"><Bot className="w-4 h-4" /></div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
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
              <button onClick={onGoToSettings} className="mt-2 text-xs font-bold text-primary underline">
                Check AI Settings →
              </button>
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
                className="text-[11px] font-bold px-2.5 py-1 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors border border-accent/10">{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-4 flex gap-2">
        <input type="text" disabled={loading} value={inputText} onChange={e => setInputText(e.target.value)}
          placeholder={loading ? loadingLabel : 'Ask about budget, weather, visa, culture, maps, or anything…'}
          className="flex-1 text-sm rounded-2xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-transparent bg-white text-gray-800 transition-all font-sans disabled:opacity-60" />
        <button type="submit" disabled={loading || !inputText.trim()}
          className="p-3.5 bg-primary hover:bg-primary/95 text-white rounded-2xl shadow hover:shadow-md flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />
        </button>
      </form>

      <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
        Powered by <strong>{provider.name}</strong>
        {' '}· Key stored in your browser only ·{' '}
        <button onClick={onGoToSettings} className="underline hover:text-accent">Change in Settings</button>
      </p>
    </div>
  );
};
