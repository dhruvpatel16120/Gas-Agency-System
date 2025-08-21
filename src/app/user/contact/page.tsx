"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import UserNavbar from "@/components/UserNavbar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
} from "@/components/ui";
import { toast } from "react-hot-toast";

export default function ContactPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    category: "General",
    priority: "Normal",
    relatedBookingId: "",
    preferredContact: "Email",
    message: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          setForm((prev) => ({
            ...prev,
            name: data.name || prev.name,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
          }));
        }
      } catch {
        // no-op
      }
    };
    void loadProfile();
  }, [session, status, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.message.trim() || form.message.trim().length < 10)
      e.message = "Message should be at least 10 characters";
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Enter a valid 10-digit phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject.trim(),
          message: form.message.trim(),
          category: form.category,
          priority: form.priority,
          relatedBookingId: form.relatedBookingId || undefined,
          preferredContact: form.preferredContact,
          phone: form.phone || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message || "Failed to submit");
        return;
      }
      toast.success("Message sent! Our team will reply as soon as possible.");
      setForm((prev) => ({
        ...prev,
        subject: "",
        message: "",
        relatedBookingId: "",
      }));
    } catch (err) {
      console.error("Contact submit error", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Your Name" value={form.name} disabled />
                  <Input
                    label="Your Email"
                    type="email"
                    value={form.email}
                    disabled
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Phone (optional)"
                    placeholder="10-digit phone number"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    error={errors.phone}
                  />
                  <Input
                    label="Related Booking ID (optional)"
                    placeholder="Paste a booking ID if relevant"
                    value={form.relatedBookingId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        relatedBookingId: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, category: e.target.value }))
                      }
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <option>General</option>
                      <option>Billing</option>
                      <option>Booking</option>
                      <option>Delivery</option>
                      <option>Technical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, priority: e.target.value }))
                      }
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <option>Low</option>
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Contact
                    </label>
                    <select
                      value={form.preferredContact}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          preferredContact: e.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <option>Email</option>
                      <option>Phone</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Subject"
                  placeholder="How can we help you?"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  error={errors.subject}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={6}
                    value={form.message}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, message: e.target.value }))
                    }
                    placeholder="Describe your issue or question in detail..."
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={loading}
                >
                  Submit
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
