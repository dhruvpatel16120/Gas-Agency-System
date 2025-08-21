"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  Archive,
  Mail,
  Phone,
  Calendar,
  Tag,
  Flag,
  Send,
  Edit3,
  Save,
  X,
  MessageSquare,
} from "lucide-react";

type Reply = {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

type ContactDetail = {
  id: string;
  subject: string;
  message: string;
  category?: string | null;
  priority?: string | null;
  relatedBookingId?: string | null;
  preferredContact?: string | null;
  phone?: string | null;
  status: "NEW" | "OPEN" | "RESOLVED" | "ARCHIVED";
  createdAt: string;
  lastRepliedAt?: string | null;
  user: { id: string; name: string; email: string };
  replies: Reply[];
};

const statusConfig = {
  NEW: {
    label: "New",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock,
    bg: "bg-blue-50",
  },
  OPEN: {
    label: "Open",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertCircle,
    bg: "bg-orange-50",
  },
  RESOLVED: {
    label: "Resolved",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
    bg: "bg-green-50",
  },
  ARCHIVED: {
    label: "Archived",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: Archive,
    bg: "bg-gray-50",
  },
};

const priorityConfig = {
  HIGH: { label: "High", color: "bg-red-100 text-red-800 border-red-200" },
  MEDIUM: {
    label: "Medium",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  LOW: { label: "Low", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

export default function AdminContactDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "",
    category: "",
    priority: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/contacts/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (json.success) {
      setData(json.data);
      setEditForm({
        status: json.data.status,
        category: json.data.category || "",
        priority: json.data.priority || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) void fetchData();
  }, [id, fetchData]);

  const onUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const onReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const body = String(formData.get("body") || "");
    if (!body.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/admin/contacts/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.success) {
        form.reset();
        await fetchData();
      } else {
        alert(json.message || "Failed to send reply");
      }
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const IconComponent = config?.icon || Clock;
    return <IconComponent className="w-4 h-4" />;
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/contacts"
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Contacts
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Contact Details
                </h1>
                <p className="text-gray-600">
                  Manage customer inquiry and responses
                </p>
              </div>
            </div>
            {data && (
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${statusConfig[data.status].color}`}
                >
                  {getStatusIcon(data.status)}
                  {statusConfig[data.status].label}
                </span>
              </div>
            )}
          </div>

          {loading || !data ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <span className="ml-4 text-gray-500">
                Loading contact details...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Main Content - Message & Conversation */}
              <div className="xl:col-span-3 space-y-6">
                {/* Original Message */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {data.subject}
                      </h2>
                      <div className="flex items-center gap-2">
                        {data.priority &&
                          priorityConfig[
                            data.priority as keyof typeof priorityConfig
                          ] && (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${priorityConfig[data.priority as keyof typeof priorityConfig].color}`}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              {
                                priorityConfig[
                                  data.priority as keyof typeof priorityConfig
                                ].label
                              }{" "}
                              Priority
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(data.createdAt)}
                      </div>
                      {data.category && (
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          {data.category}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {data.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Conversation History
                    </h3>
                    <p className="text-sm text-gray-600">
                      View the complete conversation thread
                    </p>
                  </div>
                  <div className="p-6">
                    {data.replies.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No replies yet
                        </h3>
                        <p className="text-gray-500">
                          Be the first to respond to this inquiry
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {data.replies.map((reply, index) => (
                          <div
                            key={reply.id}
                            className={`relative ${reply.isAdmin ? "ml-8" : "mr-8"}`}
                          >
                            <div
                              className={`flex ${reply.isAdmin ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-2xl rounded-2xl p-4 ${
                                  reply.isAdmin
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                      reply.isAdmin
                                        ? "bg-purple-700 text-white"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                  >
                                    {reply.author.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-sm font-medium">
                                    {reply.author.name}
                                  </span>
                                  <span
                                    className={`text-xs ${reply.isAdmin ? "text-purple-200" : "text-gray-500"}`}
                                  >
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">
                                  {reply.body}
                                </p>
                              </div>
                            </div>
                            {index < data.replies.length - 1 && (
                              <div
                                className={`absolute top-4 w-0.5 h-8 bg-gray-200 ${
                                  reply.isAdmin
                                    ? "right-0 translate-x-2"
                                    : "left-0 -translate-x-2"
                                }`}
                              ></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Send Reply
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your response will be emailed to the customer
                    </p>
                  </div>
                  <form onSubmit={onReply} className="p-6">
                    <div className="mb-4">
                      <textarea
                        name="body"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 resize-none"
                        placeholder="Type your response here..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Replying to:{" "}
                        <span className="font-medium text-gray-700">
                          {data.user.name}
                        </span>
                      </p>
                      <button
                        disabled={replying}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                      >
                        {replying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sidebar - Details & Actions */}
              <div className="xl:col-span-1 space-y-6">
                {/* User Information */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Customer Information
                    </h3>
                    <p className="text-sm text-gray-600">
                      Contact and account details
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-semibold">
                        {data.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {data.user.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {data.user.email}
                        </p>
                      </div>
                    </div>
                    {data.phone && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{data.phone}</span>
                      </div>
                    )}
                    {data.preferredContact && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>Prefers: {data.preferredContact}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Quick Actions
                    </h3>
                    <p className="text-sm text-gray-600">
                      Manage ticket status and details
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    {editing ? (
                      <form onSubmit={onUpdate} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            name="status"
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                status: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                          >
                            <option value="NEW">New</option>
                            <option value="OPEN">Open</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                          </label>
                          <input
                            name="category"
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                category: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                            placeholder="e.g., Technical, Billing, General"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <select
                            name="priority"
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                priority: e.target.value,
                              }))
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                          >
                            <option value="">Select Priority</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Save
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Status</span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[data.status].color}`}
                          >
                            {getStatusIcon(data.status)}
                            {statusConfig[data.status].label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Category
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {data.category || "General"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Priority
                          </span>
                          {data.priority &&
                          priorityConfig[
                            data.priority as keyof typeof priorityConfig
                          ] ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${priorityConfig[data.priority as keyof typeof priorityConfig].color}`}
                            >
                              {
                                priorityConfig[
                                  data.priority as keyof typeof priorityConfig
                                ].label
                              }
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Not set
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setEditing(true)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Information */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Ticket Information
                    </h3>
                    <p className="text-sm text-gray-600">
                      Timeline and metadata
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Created</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(data.createdAt)}
                      </span>
                    </div>
                    {data.lastRepliedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Last Reply
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(data.lastRepliedAt)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Replies</span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {data.replies.length}
                      </span>
                    </div>
                    {data.relatedBookingId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Related Booking
                        </span>
                        <span className="text-sm font-medium text-purple-600">
                          #{data.relatedBookingId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
