"use client";

import { useEffect, useState } from "react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import { apiClient, ApiError } from "../../lib/api/client";
import { AppUser } from "../../lib/types";
import { getUser } from "../../lib/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", role: "VIEWER" });
  const currentUser = getUser();

  const load = () => {
    setLoading(true);
    apiClient
      .get<AppUser[]>("/users")
      .then(setUsers)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post("/users", form);
      setShowForm(false);
      setForm({ fullName: "", username: "", email: "", password: "", role: "VIEWER" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await apiClient.patch(`/users/${id}`, { role });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update role");
    }
  };

  const handleToggleActive = async (u: AppUser) => {
    try {
      await apiClient.patch(`/users/${u._id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    }
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <ProtectedShell>
        <p className="text-sm text-red-600">You do not have permission to view this page.</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900">Users</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-900"
        >
          {showForm ? "Cancel" : "New User"}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
          <input
            required
            placeholder="Full Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="VIEWER">Viewer</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="rounded-md bg-navy-800 px-3 py-2 text-sm text-white hover:bg-navy-900">
            Create User
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Username</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Email</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Role</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{u.fullName}</td>
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {u.isActive ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800">Active</span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-800">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProtectedShell>
  );
}
