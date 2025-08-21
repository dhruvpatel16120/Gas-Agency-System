"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui";
import { User, Mail, Phone, MapPin, Save, ArrowLeft } from "lucide-react";
import UserNavbar from "@/components/UserNavbar";
import { toast } from "react-hot-toast";

export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    void loadUserProfile();
  }, [session, status, router]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const json = await response.json();
        const userData = json.data || {};
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          address: userData.address || "",
        });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 10) {
      newErrors.address = "Address must be at least 10 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.replace(/\s/g, ""),
          address: formData.address.trim(),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Profile updated successfully!");
        router.push("/user/profile");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update profile error:", error);
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
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <button
              onClick={() => router.push("/user/profile")}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Profile
            </button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  error={errors.name}
                  required
                  autoComplete="name"
                  icon={<User className="w-4 h-4" />}
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  disabled
                  autoComplete="email"
                  icon={<Mail className="w-4 h-4" />}
                  helperText="Email cannot be changed"
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  error={errors.phone}
                  required
                  autoComplete="tel"
                  icon={<Phone className="w-4 h-4" />}
                />

                <Input
                  label="Address"
                  type="text"
                  placeholder="Enter your complete address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  error={errors.address}
                  required
                  autoComplete="street-address"
                  icon={<MapPin className="w-4 h-4" />}
                />
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
