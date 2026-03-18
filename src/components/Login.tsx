import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import leftImage from '../assets/leftImage.png';

// Enhanced SVG icons with better styling
const AtSymbolIcon = () => (
  <svg className="h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const LockClosedIcon = () => (
  <svg className="h-5 w-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg className="h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
  </svg>
);

type LoginProps = {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
};

const Login: React.FC<LoginProps> = ({ setMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const validateEmail = (email: string) => {
  return /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email);
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!validateEmail(email)) {
      setLoading(false);
      setError('Please enter a valid email address with a valid domain (e.g., .com, .ca, .net, etc.).');
      return;
    }
    try {
      const res = await fetch('https://digital-timetable-backend-production-49c7.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log('Login response:', data); // Debug log
      
      // Handle backend logical status (backend always returns 200 HTTP with a status field)
      if (typeof data.status === 'number' && data.status !== 200) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        // Store user role for dashboard routing
        if (data.role) {
          localStorage.setItem('role', data.role);
          console.log('Role stored:', data.role); // Debug log
        } else {
          // Default to USER role if not provided
          localStorage.setItem('role', 'USER');
          console.log('No role provided, defaulting to USER'); // Debug log
        }
        // Store userId for notification ownership checks
        if (data.userId) {
          localStorage.setItem('userId', data.userId.toString());
          console.log('UserId stored:', data.userId); // Debug log
        }
        setMessage({ type: 'success', text: 'Login successful!' });
        console.log('Navigating to /dashboard'); // Debug log
        navigate('/dashboard', { replace: true });
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err); // Debug log
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#004aad] dark:bg-neutral-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Left side - Image */}
      <div className="hidden md:block md:flex-1 relative z-10">
        <img
          src={leftImage}
          alt="Digital Timetable"
          className="absolute inset-0 w-full h-full object-cover md:rounded-r-[48px] shadow-2xl"
        />
      </div>

      {/* Right side - Login form */}
      <div className="w-full md:flex-1 flex items-center justify-center relative z-10 p-4 md:p-8">
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl shadow-strong animate-bounce-in max-w-sm mx-auto dark:bg-neutral-900 dark:text-neutral-100 dark:border dark:border-neutral-800">
            {/* Logo/Brand */}
            <div className="text-center mb-6"> 
              <h2 className="text-2xl font-bold text-[#004aad] mb-1">Welcome Back to Digital Timetable</h2>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl animate-slide-down">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-danger-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-danger-700 font-medium">{error}</span>
                </div>
              </div>
            )}

          {/* Email Field */}
          <div className="mb-4">
            <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Email Address</label>
            <div className="relative">
               
              <input
                type="email"
                className="input pl-4"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Password</label>
            <div className="relative">
               
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pl-4 pr-12"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full btn-primary py-3 text-base font-semibold mb-4"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="spinner w-5 h-5 mr-3"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Register Link */}
          <div className="text-center">
            <span className="text-neutral-600 dark:text-neutral-300">Don't have an account? </span>
            <a 
              href="/register" 
              className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-colors"
            >
              Create Account
            </a>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 