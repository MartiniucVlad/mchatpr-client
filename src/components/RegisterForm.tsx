// src/components/RegisterForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, type UserRegisterData } from '../services/registerapi.ts'; // Removed .ts extension for import safety

// --- MUI Imports ---
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Container,
  CssBaseline,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';

// --- MUI Icons ---
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const RegisterForm = () => {
  const navigate = useNavigate();

  // State
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userData: UserRegisterData = { username, email, password };
      // Assuming registerUser returns the profile on success
      const profile = await registerUser(userData);

      setSuccess(`Account created for ${profile.username}! Redirecting to login...`);

      // Optional: Auto-redirect after 2 seconds
      setTimeout(() => navigate('/login'), 2000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* --- Icon Header --- */}
        <Box
          sx={{
            m: 1,
            bgcolor: '#3390ec',
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(51, 144, 236, 0.4)'
          }}
        >
          <HowToRegIcon sx={{ color: 'white', fontSize: 32 }} />
        </Box>

        <Typography component="h1" variant="h5" fontWeight="700" sx={{ mt: 1, mb: 3 }}>
          Create Account
        </Typography>

        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3
          }}
        >
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <TextField
              required
              fullWidth
              id="username"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#3390ec' },
                '& label.Mui-focused': { color: '#3390ec' }
              }}
            />

            {/* Email */}
            <TextField
              required
              fullWidth
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mt: 2,
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#3390ec' },
                '& label.Mui-focused': { color: '#3390ec' }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password */}
            <TextField
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mt: 2,
                '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#3390ec' },
                '& label.Mui-focused': { color: '#3390ec' }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 4,
                py: 1.5,
                bgcolor: '#3390ec',
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(51, 144, 236, 0.4)',
                '&:hover': { bgcolor: '#287abf' }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
            </Button>
          </Box>
        </Paper>

        {/* --- Redirect Link Section --- */}
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          Already have an account?{' '}
          <Button
            onClick={() => navigate('/login')}
            sx={{ textTransform: 'none', fontWeight: 'bold', color: '#3390ec' }}
          >
            Log In
          </Button>
        </Typography>

      </Box>
    </Container>
  );
};

export default RegisterForm;