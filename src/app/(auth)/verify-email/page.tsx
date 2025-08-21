"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { Flame, CheckCircle, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

function VerifyEmailContent() {
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error" | "expired"
  >("loading");
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [token, setToken] = useState<string>("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (!tokenParam) {
      setVerificationStatus("error");
      toast.error("Invalid verification link");
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam || "");
    verifyEmailToken(tokenParam);
  }, [searchParams]);

  const verifyEmailToken = async (verificationToken: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationStatus("success");
        toast.success("Email verified successfully!");
      } else {
        if (data.error === "TOKEN_EXPIRED") {
          setVerificationStatus("expired");
        } else {
          setVerificationStatus("error");
        }
        toast.error(data.message || "Email verification failed");
      }
    } catch (error) {
      console.error("Email verification error:", error);
      setVerificationStatus("error");
      toast.error("Failed to verify email");
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      toast.error("Email address not found");
      return;
    }

    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification email sent successfully!");
      } else {
        toast.error(data.message || "Failed to send verification email");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error("Failed to send verification email");
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case "loading":
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verifying Email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-600 mb-6">
              Your email address has been successfully verified. You can now
              access all features of the Gas Agency System.
            </p>
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">Continue to Login</Button>
              </Link>
            </div>
          </div>
        );

      case "expired":
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-semibold text-yellow-600 mb-2">
              Verification Link Expired
            </h2>
            <p className="text-gray-600 mb-6">
              The verification link has expired. Please request a new
              verification email.
            </p>
            <div className="space-y-3">
              <Button
                onClick={resendVerificationEmail}
                loading={resending}
                disabled={resending}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                {resending ? "Sending..." : "Resend Verification Email"}
              </Button>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-red-600 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600 mb-6">
              The verification link is invalid or has already been used. Please
              try again or contact support.
            </p>
            <div className="space-y-3">
              {email && (
                <Button
                  onClick={resendVerificationEmail}
                  loading={resending}
                  disabled={resending}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {resending ? "Sending..." : "Request New Verification"}
                </Button>
              )}
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gas Agency System</h1>
          <p className="text-gray-600">Email Verification</p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">{renderContent()}</CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">© 2024 Gas Agency System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
