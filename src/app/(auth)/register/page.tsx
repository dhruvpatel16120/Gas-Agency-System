"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { validatePassword, generateUserId } from "@/lib/utils";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    userId: "",
    email: "",
    phone: "",
    address: "",
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

  const router = useRouter();

  // Auto-generate User ID on component mount
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      userId: generateUserId(),
    }));
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // User ID validation (auto-generated, just check if exists)
    if (!formData.userId.trim()) {
      newErrors.userId = "User ID is required";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation (Indian format)
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 10) {
      newErrors.address = "Address must be at least 10 characters";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordStrength.isValid) {
      newErrors.password = "Password does not meet requirements";
    }

    // Confirm password validation
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

  const regenerateUserId = () => {
    setFormData((prev) => ({
      ...prev,
      userId: generateUserId(),
    }));
    // Clear any existing User ID errors
    if (errors.userId) {
      setErrors((prev) => ({ ...prev, userId: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          userId: formData.userId.trim(),
          email: formData.email.toLowerCase(),
          phone: formData.phone.replace(/\s/g, ""),
          address: formData.address.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "EMAIL_EXISTS") {
          setErrors({ email: "An account with this email already exists" });
          toast.error("An account with this email already exists");
        } else if (data.error === "USER_ID_EXISTS") {
          setErrors({ userId: "This User ID is already taken" });
          toast.error("This User ID is already taken");
        } else {
          toast.error(data.message || "Registration failed");
        }
        return;
      }

      toast.success("Registration successful! Please sign in.");
      router.push("/login");
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Handle password strength validation
    if (field === "password") {
      handlePasswordChange(value);
    }
  };

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
          <p className="text-gray-600">Create your account</p>
        </div>

        {/* Registration Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-blue-600">
              Join Us
            </CardTitle>
            <p className="text-gray-600">
              Fill in your details to create an account
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Name Input */}
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                error={errors.name}
                required
                autoComplete="name"
              />

              {/* User ID Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    User ID
                  </label>
                  <button
                    type="button"
                    onClick={regenerateUserId}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="Auto-generated User ID"
                  value={formData.userId}
                  onChange={(e) => handleInputChange("userId", e.target.value)}
                  error={errors.userId}
                  required
                  disabled
                  helperText="Your unique identifier (auto-generated)"
                />
              </div>

              {/* Email Input */}
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
              />

              {/* Phone Input */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                error={errors.phone}
                required
                autoComplete="tel"
              />

              {/* Address Input */}
              <Input
                label="Address"
                type="text"
                placeholder="Enter your complete address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                error={errors.address}
                required
                autoComplete="street-address"
              />

              {/* Password Input */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  error={errors.password}
                  required
                  autoComplete="new-password"
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
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  error={errors.confirmPassword}
                  required
                  autoComplete="new-password"
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
                {loading ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
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
