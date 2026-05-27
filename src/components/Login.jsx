import React, { useState } from 'react';
import { Plane, Mail, Lock, User, ArrowRight, AlertCircle, Sparkles, Globe, UserCheck } from 'lucide-react';
import { supabase, isMockMode } from '../lib/supabaseClient';

const getRegionDetails = (regionCode) => {
  switch (regionCode) {
    case 'US':
      return { currencySymbol: '$', currencyCode: 'USD', name: 'United States' };
    case 'EU':
      return { currencySymbol: '€', currencyCode: 'EUR', name: 'Europe' };
    case 'UK':
      return { currencySymbol: '£', currencyCode: 'GBP', name: 'United Kingdom' };
    case 'JP':
      return { currencySymbol: '¥', currencyCode: 'JPY', name: 'Japan' };
    case 'IN':
    default:
      return { currencySymbol: '₹', currencyCode: 'INR', name: 'India' };
  }
};

export const Login = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('IN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect if there's a pending invite stashed by App.jsx
  const hasPendingInvite = !!(
    localStorage.getItem('wandr_pending_join') ||
    localStorage.getItem('wandr_pending_invite')
  );

  const demoUsers = [
    { name: 'Sarah J.', initials: 'SJ', email: 'sarah@example.com', role: 'Trip Organizer' },
    { name: 'Mike', initials: 'M', email: 'mike@example.com', role: 'Trip Member' },
    { name: 'Chloe', initials: 'C', email: 'chloe@example.com', role: 'Trip Member' },
  ];

  const validateForm = () => {
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (isSignUp) {
      if (!name) {
        setError('Please enter your name.');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
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
      if (isMockMode) {
        // High fidelity Mock Auth Flow
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3) : email[0].toUpperCase();
        const mockUserSession = {
          id: email,
          email,
          name: isSignUp ? name : email.split('@')[0],
          initials,
          role: 'Trip Member',
          region,
          currencySymbol,
          currencyCode,
        };
        
        // Wait briefly to simulate server response
        await new Promise(resolve => setTimeout(resolve, 800));
        
        localStorage.setItem('wandr_user', JSON.stringify(mockUserSession));
        onLoginSuccess(mockUserSession);
      } else {
        // Real Supabase Auth Flow
        if (isSignUp) {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: name,
                region: region,
                currencySymbol,
                currencyCode,
              }
            }
          });
          if (signUpErr) throw signUpErr;

          if (!data.session) {
            throw new Error('Please check your email to verify your account, or try signing in if you already have an account.');
          }
          
          const userProfile = {
            id: data.user.id,
            email: data.user.email,
            name: name,
            initials: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3),
            role: 'Trip Member',
            region,
            currencySymbol,
            currencyCode,
          };
          localStorage.setItem('wandr_user', JSON.stringify(userProfile));
          onLoginSuccess(userProfile);
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInErr) throw signInErr;
          
          const fullName = data.user.user_metadata?.name || email.split('@')[0];
          const userRegion = data.user.user_metadata?.region || 'IN';
          const { currencySymbol: userSymbol, currencyCode: userCode } = getRegionDetails(userRegion);
          const userProfile = {
            id: data.user.id,
            email: data.user.email,
            name: fullName,
            initials: fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3),
            role: 'Trip Member',
            region: userRegion,
            currencySymbol: userSymbol,
            currencyCode: userCode,
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

  const handleQuickDemoLogin = (user, demoRegion) => {
    setError(null);
    setLoading(true);
    
    const { currencySymbol, currencyCode } = getRegionDetails(demoRegion);
    const updatedUser = {
      ...user,
      region: demoRegion,
      currencySymbol,
      currencyCode,
    };

    // Simulate instantaneous, premium transition
    setTimeout(() => {
      localStorage.setItem('wandr_user', JSON.stringify(updatedUser));
      onLoginSuccess(updatedUser);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100/50 p-6 md:p-8 space-y-6 hover:shadow-2xl transition-shadow duration-300 relative overflow-hidden">
        {/* Top Decorative Sparkle */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-16 h-16 text-accent" />
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-primary text-white rounded-2xl shadow-md transform hover:rotate-6 transition-all duration-300">
            <Plane className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight">Wandr</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Plan, collaborate, and settle travel expenses beautifully.
          </p>
        </div>

        {/* Pending invite banner */}
        {hasPendingInvite && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-800 text-sm">
            <UserCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-bold text-emerald-800 text-xs">You've been invited to a trip!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Sign in or create an account below and the trip will load automatically.</p>
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200/50">
          <button
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              !isSignUp ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              isSignUp ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-primary'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3.5 text-red-650 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sarah J."
                  className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
              />
            </div>
          </div>

          {isSignUp && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Region Selector for Sign Up */}
              <div className="space-y-1 animate-fadeIn">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Region / Base Currency</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="w-full text-sm rounded-xl border-gray-200 pl-11 pr-4 py-3 border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white text-gray-800 transition-all duration-200"
                  >
                    <option value="IN">🇮🇳 India (₹ / INR)</option>
                    <option value="US">🇺🇸 United States ($ / USD)</option>
                    <option value="EU">🇪🇺 Europe (€ / EUR)</option>
                    <option value="UK">🇬🇧 United Kingdom (£ / GBP)</option>
                    <option value="JP">🇯🇵 Japan (¥ / JPY)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Quick Demo Section */}
        <div className="space-y-3.5">
          <div className="relative flex items-center justify-between py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-250/60"></div>
            </div>
            <span className="relative px-3.5 bg-white text-xs font-semibold text-gray-450 uppercase tracking-wider">
              Quick-Demo Login
            </span>
            
            {/* Quick Demo Region Selector */}
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="relative px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-extrabold text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
            >
              <option value="IN">🇮🇳 INR (₹)</option>
              <option value="US">🇺🇸 USD ($)</option>
              <option value="EU">🇪🇺 EUR (€)</option>
              <option value="UK">🇬🇧 GBP (£)</option>
              <option value="JP">🇯🇵 JPY (¥)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleQuickDemoLogin(user, region)}
                className="flex flex-col items-center p-3 rounded-xl border border-gray-100 hover:border-accent/40 bg-slate-50/50 hover:bg-accent/5 transition-all duration-200 shadow-sm hover:shadow"
              >
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-bold text-primary text-xs mb-1.5 shadow-sm">
                  {user.initials}
                </div>
                <span className="font-bold text-[10px] text-gray-700 truncate max-w-full text-center">
                  {user.name}
                </span>
                <span className="text-[8px] text-gray-400 font-medium truncate max-w-full text-center mt-0.5">
                  {user.role.split(' ')[1]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
