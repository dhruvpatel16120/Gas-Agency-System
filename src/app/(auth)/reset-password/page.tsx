"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui";
import {
  Flame,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { validatePassword } from "@/lib/utils";

function ResetPasswordContent() {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: false, errors: [] });
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [token, setToken] = useState<string>("");

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast.error("Invalid reset link");
      router.push("/forgot-password");
      return;
    }
    setToken(tokenParam);
    validateResetToken(tokenParam);
  }, [searchParams, router]);

  const validateResetToken = async (resetToken: string) => {
    try {
      const response = await fetch("/api/auth/validate-reset-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: resetToken }),
      });

      if (response.ok) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        toast.error("Invalid or expired reset link");
      }
    } catch {
      setTokenValid(false);
      toast.error("Failed to validate reset link");
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordStrength.isValid) {
      newErrors.password = "Password does not meet requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = (password: string) => {
    const strength = validatePassword(password);
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password reset successfully!");
        router.push("/login");
      } else {
        if (data.error === "INVALID_TOKEN") {
          toast.error("Invalid or expired reset link");
          router.push("/forgot-password");
        } else {
          toast.error(data.message || "Failed to reset password");
        }
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "password") {
      handlePasswordChange(value);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Invalid Reset Link
            </h1>
            <p className="text-gray-600">
              The reset link is invalid or has expired
            </p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="text-center py-8">
              <p className="text-gray-600 mb-6">
                Please request a new password reset link.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gas Agency System
          </h1>
          <p className="text-gray-600">Reset your password</p>
        </div>

        {/* Reset Password Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-blue-600">
              Set New Password
            </CardTitle>
            <p className="text-gray-600">Enter your new password below</p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Password Input */}
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  error={errors.password}
                  required
                  autoComplete="new-password"
                  icon={<Lock className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Password Requirements:
                  </p>
                  <div className="space-y-1">
                    {[
                      {
                        condition: formData.password.length >= 8,
                        text: "At least 8 characters",
                      },
                      {
                        condition: /[A-Z]/.test(formData.password),
                        text: "One uppercase letter",
                      },
                      {
                        condition: /[a-z]/.test(formData.password),
                        text: "One lowercase letter",
                      },
                      {
                        condition: /\d/.test(formData.password),
                        text: "One number",
                      },
                      {
                        condition: /[!@#$%^&*(),.?":{}|<>]/.test(
                          formData.password,
                        ),
                        text: "One special character",
                      },
                    ].map((req, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {req.condition ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span
                          className={`text-sm ${req.condition ? "text-green-600" : "text-red-600"}`}
                        >
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Password Input */}
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  error={errors.confirmPassword}
                  required
                  autoComplete="new-password"
                  icon={<Lock className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Error Alert */}
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">
                    Please fix the errors above to continue
                  </p>
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
                {loading ? "Resetting Password..." : "Reset Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
