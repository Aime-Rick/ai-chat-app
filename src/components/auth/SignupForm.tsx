import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { auth } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SignupFormProps {
  onSwitchMode: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchMode }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await auth.signUp(email, password, name);
      if (error) {
        // Handle specific error cases
        if (error.message.includes('User already registered')) {
          setError('An account with this email already exists. Please sign in instead.');
          toast.error('Account already exists');
        } else if (error.message.includes('Password should be at least')) {
          setError('Password must be at least 6 characters long.');
          toast.error('Password too short');
        } else if (error.message.includes('Invalid email')) {
          setError('Please enter a valid email address.');
          toast.error('Invalid email');
        } else {
          setError(error.message);
          toast.error(error.message);
        }
      } else if (data.user) {
        if (data.user.email_confirmed_at) {
          // User is immediately confirmed
          setSuccess('Account created successfully! You can now sign in.');
          toast.success('Account created successfully!');
          setTimeout(() => onSwitchMode(), 2000);
        } else {
          // User needs to confirm email
          setSuccess('Account created! Please check your email for a confirmation link.');
          toast.success('Please check your email to confirm your account');
        }
        setError(null);
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
        <p className="text-gray-600">Create your account to start chatting</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium mb-1">Sign up failed</p>
            <p>{error}</p>
            {error.includes('already exists') && (
              <p className="mt-2 text-red-600">
                Already have an account?{' '}
                <button
                  onClick={onSwitchMode}
                  className="underline hover:no-underline font-medium"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium mb-1">Success!</p>
            <p>{success}</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="text"
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User className="w-4 h-4 text-gray-400" />}
          placeholder="Enter your full name"
          required
        />

        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-4 h-4 text-gray-400" />}
          placeholder="Enter your email"
          required
        />

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4 text-gray-400" />}
            placeholder="Create a password (min. 6 characters)"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          disabled={!name || !email || !password || password.length < 6}
        >
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchMode}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Account Setup</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Use a valid email address for account verification</li>
          <li>• Choose a strong password with at least 6 characters</li>
          <li>• Check your email for confirmation if required</li>
        </ul>
      </div>
    </motion.div>
  );
};