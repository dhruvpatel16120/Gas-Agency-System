"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import Link from "next/link";
import { Users, UserPlus, RefreshCw, Filter, Search, SortAsc, SortDesc } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  userId: string;
  phone: string;
  address: string;
  role: "USER" | "ADMIN";
  remainingQuota: number;
  createdAt: string;
  _count: { bookings: number };
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"ALL" | "USER" | "ADMIN">("ALL");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    "createdAt" | "name" | "email" | "remainingQuota"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    const normalizedSearch = search.trim();
    if (normalizedSearch) params.set("search", normalizedSearch);
    if (role !== "ALL") params.set("role", role);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    const res = await fetch(`/api/admin/users?${params.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.success) {
      setUsers(json.data.data);
      setTotal(json.data.pagination.total);
    }
    setLoading(false);
  };

  const totalPages = useMemo(
    () => Math.ceil(total / limit) || 1,
    [total, limit],
  );

  const refresh = () => fetchUsers();
  const listDepsKey = `${page}|${limit}|${role}|${sortBy}|${sortOrder}|${search.trim()}`;

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listDepsKey]);

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-sm text-gray-600">
                Manage system users and their permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href="/admin/users/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <UserPlus className="w-4 h-4" />
                New User
              </Link>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                title: "Total Users",
                value: total,
                icon: Users,
                color: "text-blue-600",
              },
              {
                title: "Admins",
                value: users.filter((u) => u.role === "ADMIN").length,
                icon: Users,
                color: "text-purple-600",
              },
              {
                title: "Low Quota (≤2)",
                value: users.filter((u) => u.remainingQuota <= 2).length,
                icon: Users,
                color: "text-orange-600",
              },
              {
                title: "Page Size",
                value: limit,
                icon: Users,
                color: "text-gray-600",
              },
            ].map((s, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {s.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {s.value}
                      </p>
                    </div>
                    <s.icon className={`w-8 h-8 ${s.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-72"
                      placeholder="Search name, email, userId, phone"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setPage(1);
                        }
                      }}
                    />
                  </div>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    value={role}
                    onChange={(e) => { setRole(e.target.value as 'ALL' | 'USER' | 'ADMIN'); setPage(1); }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      value={sortBy}
                      onChange={(e) => { setSortBy(e.target.value as 'createdAt' | 'name' | 'email' | 'remainingQuota'); setPage(1); }}
                    >
                      <option value="createdAt">Created Date</option>
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="remainingQuota">Quota</option>
                    </select>
                    <button
                      onClick={() => {
                        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                        setPage(1);
                      }}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {sortOrder === "asc" ? (
                        <SortAsc className="w-4 h-4" />
                      ) : (
                        <SortDesc className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    value={limit}
                    onChange={(e) => {
                      setLimit(parseInt(e.target.value, 10));
                      setPage(1);
                    }}
                  >
                    {[5, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quota
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td className="px-6 py-12 text-center" colSpan={6}>
                          <div className="flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                            <span className="text-gray-600">
                              Loading users...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td className="px-6 py-12 text-center" colSpan={6}>
                          <div className="text-center">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No users found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-purple-600">
                                    {u.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {u.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {u.userId} •{" "}
                                  {new Date(u.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {u.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.role === "ADMIN"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {u._count.bookings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.remainingQuota <= 2
                                  ? "bg-red-100 text-red-800"
                                  : u.remainingQuota <= 5
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {u.remainingQuota}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <Link
                              className="text-purple-600 hover:text-purple-900 hover:underline"
                              href={`/admin/users/${u.id}`}
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{page}</span>{" "}
                      of <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
