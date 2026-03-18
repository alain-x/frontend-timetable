import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import leftImage from '../assets/leftImage.png';

// Enhanced SVG icons with better styling
const AtSymbolIcon = () => (
  <svg className="h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-5 w-5 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const LockClosedIcon = () => (
  <svg className="h-5 w-5 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UserGroupIcon = () => (
  <svg className="h-5 w-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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

type RegisterProps = {
  setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
};

const roles = [
  { label: 'Student', value: 'USER', description: 'Regular student access' }, 
];

const Register: React.FC<RegisterProps> = ({ setMessage }) => {
  const [form, setForm] = useState({
    email: '',
    name: '',
    phoneNumber: '',
    password: '',
    role: 'USER',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateEmail = (email: string) => {
  // Accepts most common TLDs and ccTLDs, adjust as needed
  return /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email);
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    // Validate all fields before API call
    if (!form.name.trim()) {
      setLoading(false);
      setError('Name is required.');
      return;
    }
    if (!validateEmail(form.email)) {
      setLoading(false);
      setError('Please enter a valid email address with a valid domain (e.g., .com, .ca, .net, etc.).');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setLoading(false);
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!form.phoneNumber.trim()) {
      setLoading(false);
      setError('Phone number is required.');
      return;
    }
    try {
      const res = await fetch('http://localhost:8091/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.status === 200) {
        setSuccess('Registration successful! You can now login.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
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

      {/* Right side - Register form */}
      <div className="w-full md:flex-1 flex items-center justify-center relative z-10 p-4 md:p-8">
        <div className="w-full max-w-lg">
        <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl shadow-strong animate-bounce-in max-w-sm mx-auto dark:bg-neutral-900 dark:text-neutral-100 dark:border dark:border-neutral-800">
          {/* Logo/Brand */}
          <div className="text-center mb-2"> 
            <h2 className="text-2xl font-bold text-[#004aad] mb-1">Join Our Community</h2> 
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

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl animate-slide-down">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-success-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-success-700 font-medium">{success}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Field */}
            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Email Address</label>
              <div className="relative">
                
                <input
                  type="email"
                  name="email"
                  className="input pl-4"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Full Name</label>
              <div className="relative">
                 
                <input
                  type="text"
                  name="name"
                  className="input pl-4"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Phone Number</label>
              <div className="relative">
                 
                <input
                  type="tel"
                  name="phoneNumber"
                  className="input pl-4"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Password</label>
              <div className="relative">
                 
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="input pl-4 pr-12"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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

            {/* Role Field */}
            <div className="md:col-span-2">
              <label className="block mb-2 font-semibold text-neutral-700 dark:text-neutral-200">Role</label>
              <div className="relative">
                 
                <select
                  name="role"
                  className="input pl-4"
                  value={form.role}
                  onChange={handleChange}
                  required
                >
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {roles.find(r => r.value === form.role)?.description}
              </p>
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
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Login Link */}
          <div className="text-center">
            <span className="text-neutral-600">Already have an account? </span>
            <a 
              href="/login" 
              className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-colors"
            >
              Sign In
            </a>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Register; 