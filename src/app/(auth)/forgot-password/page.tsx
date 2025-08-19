'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { Flame, ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();
	const validateEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!email.trim()) {
			setError('Email is required');
			return;
		}

		if (!validateEmail(email)) {
			setError('Please enter a valid email address');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email: email.toLowerCase() }),
			});

			const data = await response.json();

			if (response.ok) {
				setEmailSent(true);
				toast.success('Password reset email sent successfully!');
				router.push('/login');
			} else {
				if (data.error === 'EMAIL_NOT_VERIFIED') {
					setError('Your email is not verified. Please verify your email first.');
					toast.error('Your email is not verified. Please verify your email first.');
				} else if (data.error === 'USER_NOT_FOUND') {
					setError('No account found with this email address');
					toast.error('No account found with this email address');
				} else {
					setError(data.message || 'Failed to send reset email');
					toast.error(data.message || 'Failed to send reset email');
				}
			}
		} catch (error) {
			console.error('Forgot password error:', error);
			setError('An error occurred. Please try again.');
			toast.error('An error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	if (emailSent) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<div className="w-full max-w-md">
					{/* Logo and Title */}
					<div className="text-center mb-8">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
							<Flame className="w-8 h-8 text-white" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">Gas Agency System</h1>
						<p className="text-gray-600">Password Reset</p>
					</div>

					{/* Success Card */}
					<Card className="shadow-xl">
						<CardHeader className="text-center pb-4">
							<div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
								<CheckCircle className="w-6 h-6 text-green-600" />
							</div>
							<CardTitle className="text-2xl font-semibold text-green-600">Email Sent!</CardTitle>
							<p className="text-gray-600">Check your email for reset instructions</p>
						</CardHeader>

						<CardContent className="text-center">
							<p className="text-sm text-gray-600 mb-4">
								We&apos;ve sent a password reset link to <strong>{email}</strong>
							</p>
							<p className="text-xs text-gray-500">
								If you don&apos;t see the email, check your spam folder or try again.
							</p>
						</CardContent>

						<CardFooter className="flex flex-col space-y-4">
							<Button
								onClick={() => setEmailSent(false)}
								variant="outline"
								className="w-full"
							>
								Send Another Email
							</Button>

							<div className="text-center">
								<Link
									href="/login"
									className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
								>
									Back to Login
								</Link>
							</div>
						</CardFooter>
					</Card>

					{/* Footer */}
					<div className="text-center mt-8">
						<p className="text-xs text-gray-500">
							© 2024 Gas Agency System. All rights reserved.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="w-full max-w-md">
				{/* Logo and Title */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
						<Flame className="w-8 h-8 text-white" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Gas Agency System</h1>
					<p className="text-gray-600">Reset your password</p>
				</div>

				{/* Forgot Password Card */}
				<Card className="shadow-xl">
					<CardHeader className="text-center pb-4">
						<CardTitle className="text-2xl font-semibold text-blue-600">Forgot Password?</CardTitle>
						<p className="text-gray-600">Enter your email to receive reset instructions</p>
					</CardHeader>

					<form onSubmit={handleSubmit}>
						<CardContent className="space-y-4">
							<Input
								label="Email Address"
								type="email"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (error) setError('');
								}}
								error={error}
								required
								autoComplete="email"
							/>

							{error && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-md">
									<p className="text-sm text-red-600">{error}</p>
								</div>
							)}
						</CardContent>

						<CardFooter className="flex flex-col space-y-4">
							<Button
								type="submit"
								className="w-full"
								loading={loading}
								disabled={loading}
							>
								{loading ? 'Sending...' : 'Send Reset Email'}
							</Button>

							<div className="text-center">
								<Link
									href="/login"
									className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 transition-colors"
								>
									<ArrowLeft className="w-4 h-4 mr-1" />
									Back to Login
								</Link>
							</div>
						</CardFooter>
					</form>
				</Card>

				{/* Footer */}
				<div className="text-center mt-8">
					<p className="text-xs text-gray-500">
						© 2024 Gas Agency System. All rights reserved.
					</p>
				</div>
			</div>
		</div>
	);
}
