import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, KeyRound, Lock, Check, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { authApi } from '../services/authApi';

export const ResetPage: React.FC = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState<'phone' | 'otp' | 'set-pin' | 'success'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [userToken, setUserToken] = useState('');

    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await authApi.sendResetOtp(phone);

            if (response.status && response.verification_id) {
                setVerificationId(response.verification_id);
                setStep('otp');
            } else {
                setError(response.message || 'Failed to send OTP.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (otp.length < 4) {
            setError('Please enter a valid OTP.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await authApi.verifyResetOtp(phone, otp, verificationId);

            if (response.status && response.user) {
                // Store the token temporarily but don't log in yet
                setUserToken(response.user.token);
                // Clear the automatic login that happened in the API
                authApi.logout();
                // Move to PIN setting step
                setStep('set-pin');
            } else {
                setError(response.message || 'Invalid OTP. Please try again.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPin.length < 4) {
            setError('PIN must be at least 4 digits.');
            return;
        }

        if (newPin !== confirmPin) {
            setError('PINs do not match.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use the token from OTP verification to reset the password
            const response = await authApi.resetPassword(userToken, newPin);

            if (response.status) {
                setStep('success');
            } else {
                setError(response.message || 'Failed to reset PIN.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        setError(null);
        setOtp('');

        try {
            const response = await authApi.sendResetOtp(phone);

            if (response.status && response.verification_id) {
                setVerificationId(response.verification_id);
                setError(null);
            } else {
                setError(response.message || 'Failed to resend OTP.');
            }
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Success Screen
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center transform transition-all duration-500 hover:scale-[1.01]">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful</h2>
                    <p className="text-gray-600 mb-8">
                        Your PIN has been updated successfully. You can now log in with your new PIN.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/30"
                    >
                        Go to Login
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-6 text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                    <p className="text-blue-100 text-sm mt-1">
                        {step === 'phone'
                            ? 'Enter your phone number to receive OTP'
                            : step === 'otp'
                                ? 'Enter the OTP sent to your phone'
                                : 'Create a new PIN for your account'}
                    </p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Phone Number Step */}
                    {step === 'phone' && (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                                        placeholder="Enter 10-digit phone number"
                                        required
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending OTP...
                                    </>
                                ) : (
                                    <>
                                        Send OTP
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}

                    {/* OTP Verification Step */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <p className="text-sm text-blue-800 font-medium text-center">
                                    OTP sent to <span className="font-bold">{phone}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter OTP
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <KeyRound className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white text-center text-2xl tracking-widest"
                                        placeholder="Enter OTP"
                                        required
                                        maxLength={6}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        Verify OTP
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-between text-sm">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('phone');
                                        setOtp('');
                                        setError(null);
                                    }}
                                    className="text-gray-600 hover:text-gray-700 font-medium"
                                >
                                    Change Number
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={loading}
                                    className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                                >
                                    Resend OTP
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Set New PIN Step */}
                    {step === 'set-pin' && (
                        <form onSubmit={handleResetPin} className="space-y-6">
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <p className="text-sm text-blue-800 font-medium text-center">
                                    Resetting password for <span className="font-bold">{phone}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New PIN
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                                        placeholder="Enter new PIN"
                                        required
                                        minLength={4}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New PIN
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPin}
                                        onChange={(e) => setConfirmPin(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                                        placeholder="Confirm new PIN"
                                        required
                                        minLength={4}
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    <>
                                        Reset Password
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
