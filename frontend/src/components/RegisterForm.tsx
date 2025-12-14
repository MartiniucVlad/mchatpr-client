// src/components/RegisterForm.tsx
import React, { useState } from 'react';
// Remove the .js extension so it resolves the .ts file
import { registerUser, type UserRegisterData } from '../services/api';

const RegisterForm = () => {
  // TypeScript automatically infers these are strings, but you can be explicit:
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 'React.FormEvent' is the specific type for form submissions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const userData: UserRegisterData = { username, email, password };
      const profile = await registerUser(userData);
      setSuccess(`Success! Welcome, ${profile.username}. You can now log in.`);
    } catch (err: unknown) {
      // In TypeScript, errors in catch blocks are 'unknown'.
      // We must check if it's an Error object before accessing .message
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 border border-gray-200 rounded-lg shadow-xl bg-white">
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600">Create Your Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Username Field */}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />

        {/* Email Field */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />

        {/* Password Field */}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
        />

        {/* Error/Success Messages */}
        {error && <p className="text-red-600 font-medium">{error}</p>}
        {success && <p className="text-green-600 font-medium">{success}</p>}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition duration-150"
        >
          Register
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;