import React, { useState } from 'react';
import api from '../api/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      window.location.href = '/';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.form} onSubmit={handleSubmit}>
        <h2 style={styles.title}>Project Tracker</h2>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button}>Login</button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    background: '#fff',
    padding: 30,
    borderRadius: 8,
    width: 320,
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  },
  title: {
    marginBottom: 20,
    color: '#16a34a',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 12,
    borderRadius: 4,
    border: '1px solid #ddd',
  },
  button: {
    width: '100%',
    padding: 10,
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
};

export default Login;
