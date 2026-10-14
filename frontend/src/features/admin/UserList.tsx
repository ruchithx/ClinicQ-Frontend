'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Plus, Search } from 'lucide-react';
import { listUsers } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { CreateUserDialog } from './CreateUserDialog';
import type { UserResponse } from '@/lib/api/types';

function UserRow({ user }: { user: UserResponse }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/admin/users/${user.id}` as Route)}
      className="w-full flex items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{user.fullName}</span>
          {!user.enabled && <Badge variant="secondary">Disabled</Badge>}
          {user.mustChangePassword && (
            <Badge variant="outline" className="text-amber-700 border-amber-300">Must change pw</Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground font-mono">{user.username}</p>
      </div>
      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
        {user.roles.map((r) => (
          <Badge key={r} variant="secondary" className="text-xs">
            {r.charAt(0) + r.slice(1).toLowerCase()}
          </Badge>
        ))}
      </div>
    </button>
  );
}

export function UserList() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.users.list({ search: submitted, role: roleFilter || undefined }),
    queryFn: () =>
      listUsers({
        search: submitted || undefined,
        role: roleFilter || undefined,
        size: 50,
      }),
    staleTime: 30_000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(search.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="max-w-xs"
            aria-label="Search users"
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="DOCTOR">Doctor</SelectItem>
            <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New user
        </Button>
      </div>

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorPanel error={error} />}

      {data && data.items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}

      <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
