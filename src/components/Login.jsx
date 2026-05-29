import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, Globe, UserCheck, Eye, EyeOff } from 'lucide-react';
import { supabase, isMockMode } from '../lib/supabaseClient';
import { login, signUp } from '../lib/authService';

const getRegionDetails = (regionCode) => {
  switch (regionCode) {
    case 'US': return { currencySymbol: '$', currencyCode: 'USD', name: 'United States' };
    case 'EU': return { currencySymbol: '€', currencyCode: 'EUR', name: 'Europe' };
    case 'UK': return { currencySymbol: '£', currencyCode: 'GBP', name: 'United Kingdom' };
    case 'JP': return { currencySymbol: '¥', currencyCode: 'JPY', name: 'Japan' };
    case 'IN':
    default:   return { currencySymbol: '₹', currencyCode: 'INR', name: 'India' };
  }
};

export const Login = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp]           = useState(false);
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [name, setName]                   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion]               = useState('IN');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const hasPendingInvite = !!(
    localStorage.getItem('wandr_pending_join') ||
    localStorage.getItem('wandr_pending_invite')
  );

  const validateForm = () => {
    if (!email || !password) { setError('Please fill in all required fields.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return false; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
    if (isSignUp) {
      if (!name) { setError('Please enter your name.'); return false; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return false; }
    }
    return true;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { currencySymbol, currencyCode } = getRegionDetails(region);
      if (isMockMode()) {
        let result;
        if (isSignUp) {
          result = await signUp({ email, password, username: name, region, currencySymbol, currencyCode });
        } else {
          result = await login({ email, password });
        }
        sessionStorage.setItem('wandr_session_token', result.sessionToken);
        
        const mockUserSession = {
          id: result.user.id,
          email,
          name: result.user.username || email.split('@')[0],
          initials: (result.user.username || name || email.split('@')[0])
            .split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3),
          role: 'Trip Member',
          region: result.user.region || region,
          currencySymbol: result.user.currencySymbol || currencySymbol,
          currencyCode: result.user.currencyCode || currencyCode,
          avatar: result.user.avatar || null,
          avatarColorClass: result.user.avatarColorClass || null,
        };
        localStorage.setItem('wandr_user', JSON.stringify(mockUserSession));
        onLoginSuccess(mockUserSession);
      } else {
        if (isSignUp) {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email, password,
            options: { data: { name, region, currencySymbol, currencyCode } }
          });
          if (signUpErr) throw signUpErr;
          if (!data.session) throw new Error('Please check your email to verify your account.');
          const userProfile = {
            id: data.user.id, email: data.user.email, name,
            initials: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3),
            role: 'Trip Member', region, currencySymbol, currencyCode,
          };
          localStorage.setItem('wandr_user', JSON.stringify(userProfile));
          onLoginSuccess(userProfile);
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
          const fullName    = data.user.user_metadata?.name || email.split('@')[0];
          const userRegion  = data.user.user_metadata?.region || 'IN';
          const { currencySymbol: uSym, currencyCode: uCode } = getRegionDetails(userRegion);
          const userProfile = {
            id: data.user.id, email: data.user.email, name: fullName,
            initials: fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3),
            role: 'Trip Member', region: userRegion, currencySymbol: uSym, currencyCode: uCode,
            avatar: data.user.user_metadata?.avatar || null,
            avatarColorClass: data.user.user_metadata?.avatarColorClass || null,
          };
          localStorage.setItem('wandr_user', JSON.stringify(userProfile));
          onLoginSuccess(userProfile);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };


  // ── Inline styles for the travel background + glassmorphism ─────────────────
  const bgStyle = {
    backgroundImage: `
      radial-gradient(ellipse at 15% 40%, rgba(16,100,80,0.95) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 20%, rgba(251,150,30,0.55) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 70%, rgba(10,60,120,0.85) 0%, transparent 55%),
      radial-gradient(ellipse at 30% 80%, rgba(20,80,60,0.8) 0%, transparent 50%),
      linear-gradient(160deg, #0a2a4a 0%, #0e4d3a 30%, #1a3a6b 60%, #0d2535 100%)
    `,
  };

  const glassCard = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 8px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    backdropFilter: 'blur(8px)',
  };

  // Generate animated stars
  const starsContainerRef = useRef(null);
  useEffect(() => {
    const container = starsContainerRef.current;
    if (!container) return;
    const count = 60;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 2.5 + 1;
      Object.assign(star.style, {
        position: 'absolute',
        width: size + 'px',
        height: size + 'px',
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        background: '#fff',
        borderRadius: '50%',
        opacity: '0',
        animation: `twinkle ${(Math.random() * 3 + 2)}s ease-in-out infinite`,
        animationDelay: `${(Math.random() * 4)}s`,
      });
      container.appendChild(star);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={bgStyle}>

      {/* Animated starfield */}
      <div ref={starsContainerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Dark overlay for readability */}
      {/* ── SVG Scenery (pure CSS, no external images) ── */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        {/* Sky glow / sunset */}
        <radialGradient id="sunGlow" cx="70%" cy="30%" r="40%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5"/>
          <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <rect width="1440" height="900" fill="url(#sunGlow)"/>
        {/* Water */}
        <rect x="0" y="560" width="1440" height="340" fill="#0c4a6e" opacity="0.85"/>
        <rect x="0" y="558" width="1440" height="18" fill="#0e7490" opacity="0.5"/>
        {/* Water shimmer lines */}
        {[580,610,640,670,700,740,780].map((y,i) => (
          <line key={i} x1={i*80} y1={y} x2={i*80+220} y2={y} stroke="#38bdf8" strokeOpacity="0.08" strokeWidth="1.5"/>
        ))}
        {/* Far mountains */}
        <polygon points="0,560 180,360 360,560" fill="#134e4a" opacity="0.9"/>
        <polygon points="200,560 450,310 700,560" fill="#0f3d38" opacity="0.95"/>
        <polygon points="600,560 820,340 1040,560" fill="#115e59" opacity="0.85"/>
        <polygon points="900,560 1100,380 1300,560" fill="#0d4d48" opacity="0.9"/>
        <polygon points="1100,560 1280,420 1440,560" fill="#134e4a" opacity="0.8"/>
        {/* Closer hills with buildings */}
        <ellipse cx="300" cy="560" rx="280" ry="90" fill="#166534" opacity="0.95"/>
        <ellipse cx="1100" cy="560" rx="260" ry="80" fill="#14532d" opacity="0.9"/>
        {/* Buildings left cluster */}
        <rect x="200" y="490" width="28" height="70" rx="2" fill="#d4c5a0" opacity="0.9"/>
        <polygon points="200,490 214,468 228,490" fill="#8b6914" opacity="0.9"/>
        <rect x="238" y="505" width="20" height="55" rx="2" fill="#c9b896" opacity="0.85"/>
        <rect x="268" y="498" width="24" height="62" rx="2" fill="#d4c5a0" opacity="0.9"/>
        <polygon points="268,498 280,478 292,498" fill="#7c5e10" opacity="0.9"/>
        <rect x="160" y="510" width="32" height="50" rx="2" fill="#c2b48e" opacity="0.8"/>
        {/* Church tower */}
        <rect x="310" y="480" width="18" height="80" rx="1" fill="#d4c5a0" opacity="0.95"/>
        <polygon points="305,480 319,455 333,480" fill="#92400e" opacity="0.95"/>
        <rect x="312" y="496" width="6" height="10" fill="#0c4a6e" opacity="0.7"/>
        {/* Buildings right cluster */}
        <rect x="980" y="500" width="26" height="60" rx="2" fill="#d4c5a0" opacity="0.85"/>
        <rect x="1014" y="492" width="22" height="68" rx="2" fill="#c9b896" opacity="0.9"/>
        <polygon points="1014,492 1025,470 1036,492" fill="#854d0e" opacity="0.9"/>
        <rect x="1044" y="508" width="30" height="52" rx="2" fill="#d4c5a0" opacity="0.8"/>
        {/* Sailboats */}
        <g opacity="0.7">
          <ellipse cx="400" cy="618" rx="28" ry="7" fill="#e2d5b0"/>
          <line x1="400" y1="611" x2="400" y2="570" stroke="#e2d5b0" strokeWidth="1.5"/>
          <polygon points="400,572 400,610 428,610" fill="rgba(255,255,255,0.45)"/>
        </g>
        <g opacity="0.6">
          <ellipse cx="980" cy="610" rx="22" ry="6" fill="#e2d5b0"/>
          <line x1="980" y1="604" x2="980" y2="568" stroke="#e2d5b0" strokeWidth="1.5"/>
          <polygon points="980,570 980,604 1004,604" fill="rgba(255,255,255,0.4)"/>
        </g>
        <g opacity="0.5">
          <ellipse cx="680" cy="640" rx="18" ry="5" fill="#e2d5b0"/>
          <line x1="680" y1="635" x2="680" y2="603" stroke="#e2d5b0" strokeWidth="1"/>
          <polygon points="680,605 680,635 700,635" fill="rgba(255,255,255,0.35)"/>
        </g>
        {/* Stars */}
        {[[100,80],[220,50],[350,120],[500,60],[650,90],[800,40],[950,70],[1100,55],[1250,85],[1380,65],[150,160],[420,140],[730,110],[1050,130],[1300,150]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={i%3===0?1.5:1} fill="white" opacity={0.3+Math.sin(i)*0.3}/>
        ))}
        {/* Compass rose decoration */}
        <g transform="translate(1320,100)" opacity="0.12">
          <circle cx="0" cy="0" r="40" fill="none" stroke="white" strokeWidth="1"/>
          <circle cx="0" cy="0" r="28" fill="none" stroke="white" strokeWidth="0.5"/>
          <polygon points="0,-40 4,-8 0,0 -4,-8" fill="white"/>
          <polygon points="0,40 4,8 0,0 -4,8" fill="white" opacity="0.5"/>
          <polygon points="-40,0 -8,4 0,0 -8,-4" fill="white" opacity="0.5"/>
          <polygon points="40,0 8,4 0,0 8,-4" fill="white" opacity="0.5"/>
        </g>
      </svg>

      {/* Floating glow orbs */}
      <div className="absolute top-8 left-8 w-20 h-20 rounded-full bg-yellow-400/10 blur-2xl animate-pulse" />
      <div className="absolute bottom-16 right-12 w-32 h-32 rounded-full bg-sky-400/10 blur-3xl animate-pulse" style={{animationDelay:'1.5s'}} />




      {/* Pending invite banner */}
      {hasPendingInvite && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-20">
          <div className="flex items-start gap-2 rounded-2xl px-4 py-2.5 text-emerald-200 text-xs"
            style={{ background:'rgba(0,80,40,0.55)', border:'1px solid rgba(52,211,153,0.35)', backdropFilter:'blur(12px)' }}>
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-300" />
            <span><strong>You've been invited to a trip!</strong> Sign in or create an account and the trip will load automatically.</span>
          </div>
        </div>
      )}

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl p-8 space-y-6" style={glassCard}>

        {/* Brand */}
        <div className="text-center space-y-2">
          {/* Compass icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-1"
            style={{ background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.3)', boxShadow:'0 4px 24px rgba(0,0,0,0.2)' }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="rgba(251,191,36,0.8)" stroke="rgba(251,191,36,1)" strokeWidth="0.5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{fontFamily:'Georgia, serif', letterSpacing:'-0.02em'}}>
            Wandr
          </h1>
          <p className="text-sm text-white/60 font-light tracking-wide">Plan, collaborate, and settle travel expenses beautifully.</p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-2xl p-1 gap-1" style={{background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.1)'}}>
          {['Sign In','Create Account'].map((label, i) => (
            <button key={label} onClick={() => { setIsSignUp(i===1); setError(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
              style={(!isSignUp && i===0) || (isSignUp && i===1)
                ? { background:'rgba(255,255,255,0.2)', color:'#fff', boxShadow:'0 2px 12px rgba(0,0,0,0.2)' }
                : { color:'rgba(255,255,255,0.5)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs text-red-200"
            style={{background:'rgba(180,0,0,0.35)', border:'1px solid rgba(255,100,100,0.3)'}}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-300" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">

          {isSignUp && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input type="text" required value={name} onChange={e=>setName(e.target.value)}
                  placeholder="e.g. Sarah J."
                  className="w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-none placeholder-white/30 transition-all focus:border-white/50"
                  style={inputStyle} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-none placeholder-white/30 transition-all focus:border-white/50"
                style={inputStyle} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full text-sm pl-10 pr-10 py-3 rounded-xl outline-none placeholder-white/30 transition-all focus:border-white/50"
                style={inputStyle} />
              <button type="button" onClick={()=>setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>

          {isSignUp && (
            <>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input type={showConfirm?'text':'password'} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full text-sm pl-10 pr-10 py-3 rounded-xl outline-none placeholder-white/30 transition-all"
                    style={inputStyle} />
                  <button type="button" onClick={()=>setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">Region / Currency</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10 pointer-events-none" />
                  <select value={region} onChange={e=>setRegion(e.target.value)}
                    className="w-full text-sm pl-10 pr-4 py-3 rounded-xl outline-none appearance-none transition-all"
                    style={{...inputStyle, color:'rgba(255,255,255,0.85)'}}>
                    <option value="IN" style={{background:'#1e293b'}}>🇮🇳 India (₹ / INR)</option>
                    <option value="US" style={{background:'#1e293b'}}>🇺🇸 United States ($ / USD)</option>
                    <option value="EU" style={{background:'#1e293b'}}>🇪🇺 Europe (€ / EUR)</option>
                    <option value="UK" style={{background:'#1e293b'}}>🇬🇧 United Kingdom (£ / GBP)</option>
                    <option value="JP" style={{background:'#1e293b'}}>🇯🇵 Japan (¥ / JPY)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 mt-2"
            style={{
              background: loading
                ? 'rgba(255,255,255,0.15)'
                : 'linear-gradient(135deg, rgba(56,189,248,0.8) 0%, rgba(99,102,241,0.8) 100%)',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(56,189,248,0.35)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Authenticating…</span></>
              : <>{isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight className="w-4 h-4"/></>
            }
          </button>
        </form>

        {/* Footer note */}
        <p className="text-[10px] text-white/35 text-center">
          {isMockMode()
            ? '🔒 Password hashed with SHA-256 — never sent anywhere'
            : '🔒 Secured by Supabase Auth'}
        </p>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-center">
        <p className="text-white/30 text-xs tracking-widest uppercase font-light">Your next adventure awaits</p>
      </div>
    </div>
  );
};
