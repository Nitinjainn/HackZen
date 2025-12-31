import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';

export default function TwoFASetup({ token, onSuccess, onCancel }) {
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('initial'); // 'initial', 'qr', 'success'

  const start2FA = async () => {
    setError('');
    setLoading(true);
    try {
      console.log('Starting 2FA setup...');
      const res = await axios.post(`${API_BASE_URL}/api/users/2fa/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('2FA setup response:', res.data);
      setQr(res.data.qr);
      setSecret(res.data.secret);
      setStep('qr');
    } catch (err) {
      console.error('2FA generation error:', err);
      setError(err.response?.data?.message || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      console.log('Verifying 2FA code...');
      const res = await axios.post(`${API_BASE_URL}/api/users/2fa/verify`, 
        { token: code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('2FA verification response:', res.data);
      if (res.data.success) {
        setEnabled(true);
        setStep('success');
        if (onSuccess) onSuccess();
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError(err.response?.data?.message || 'Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    if (error) setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && code.length === 6) {
      verify2FA();
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto p-6 border rounded-lg bg-white shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2FA Enabled Successfully!</h3>
          <p className="text-gray-600 text-sm mb-4">
            Your account is now protected with two-factor authentication.
          </p>
          <button
            onClick={() => setStep('initial')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg bg-white shadow-lg">
      {step === 'initial' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Enable Two-Factor Authentication</h3>
          <p className="text-gray-600 text-sm mb-6">
            Add an extra layer of security to your account by enabling 2FA.
          </p>
          <div className="space-y-3">
            <button
              onClick={start2FA}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'qr' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan QR Code</h3>
            <p className="text-gray-600 text-sm mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="p-4 bg-white border rounded-lg">
              <img src={qr} alt="QR Code for 2FA" className="w-48 h-48" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Or manually enter this secret key:
            </p>
            <div className="bg-gray-100 p-3 rounded-lg">
              <code className="text-sm font-mono break-all">{secret}</code>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-digit verification code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <button
                onClick={verify2FA}
                disabled={loading || code.length !== 6}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
} 