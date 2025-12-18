// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Create Form Data format
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // 1. Send credentials to backend (Updated for Form Data)
      const response = await fetch("http://127.0.0.1:8000/users/login", {
        method: "POST",
        headers: {
            // "application/json" -> "application/x-www-form-urlencoded"
            "Content-Type": "application/x-www-form-urlencoded"
        },
        // Send the form data object, NOT JSON.stringify
        body: formData,
      });

      if (!response.ok) throw new Error("Invalid credentials");

      const data = await response.json();

      // 2. SAVE THE TOKEN (This is how we "log in")
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', username);

      // 3. Redirect to the Chats page
      navigate('/chats');

    } catch (err) {
      setError("Login failed. Check your username/password.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border border-gray-200 rounded-lg shadow-xl bg-white">
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
            type="text" placeholder="Username" value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
        />
        <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700">
          Login
        </button>
      </form>
    </div>
  );
};

export default LoginForm;