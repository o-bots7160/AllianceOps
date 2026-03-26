'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/use-auth';
import { getApiBase } from '../../lib/api-base';
import type { AdminStats, AdminUserListItem } from '@allianceops/shared';
import { DataTable, type ColumnDef } from '../../components/data-table';
import { LoadingSpinner } from '../../components/loading-spinner';
import { StatusBanner } from '../../components/status-banner';

type SortField = 'createdAt' | 'email' | 'displayName';
type SortDir = 'asc' | 'desc';

const userColumns: ColumnDef<AdminUserListItem>[] = [
  {
    key: 'displayName',
    header: 'Name',
    sortable: true,
    render: (row) => (
      <span className="text-gray-900 dark:text-white font-medium">
        {row.displayName || '—'}
      </span>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400">{row.email || '—'}</span>
    ),
  },
  {
    key: 'teams',
    header: 'Teams',
    render: (row) =>
      row.teams.length === 0 ? (
        <span className="text-gray-400 dark:text-gray-500">None</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {row.teams.map((t) => (
            <span
              key={t.teamId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
            >
              {t.teamNumber} · {t.role.toLowerCase()}
            </span>
          ))}
        </div>
      ),
  },
  {
    key: 'createdAt',
    header: 'Joined',
    sortable: true,
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400">
        {new Date(row.createdAt).toLocaleDateString()}
      </span>
    ),
  },
];

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/site-admin/stats`, { redirect: 'manual' });
      if (!res.ok) return;
      const result = await res.json();
      setStats(result.data);
    } catch {
      // Stats are non-critical; silently fail
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
      });
      if (search) params.set('search', search);

      const res = await fetch(`${getApiBase()}/site-admin/users?${params}`, { redirect: 'manual' });
      if (res.type === 'opaqueredirect' || res.status === 302) {
        setError('Authentication required');
        return;
      }
      if (res.status === 403) {
        setError('Admin access required');
        return;
      }
      if (!res.ok) {
        setError(`API error: ${res.status}`);
        return;
      }
      const result = await res.json();
      setUsers(result.data.users);
      setTotal(result.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortBy, sortDir]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchStats();
      fetchUsers();
    }
  }, [authLoading, isAdmin, fetchStats, fetchUsers]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  // Auth loading state
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin</h1>
        <p className="text-gray-500 dark:text-gray-400">Please log in to access this page.</p>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400">
          You do not have admin privileges to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Total Teams" value={stats.totalTeams} />
          <StatCard label="Admins" value={stats.totalAdmins} />
          <StatCard label="Signups (7d)" value={stats.recentSignups} />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {total} user{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error state */}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          data={users}
          columns={userColumns}
          keyExtractor={(row) => row.id}
          sortColumn={sortBy}
          sortDirection={sortDir}
          onSort={(col) => handleSort(col as SortField)}
          emptyMessage={search ? 'No users match your search.' : 'No users found.'}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
