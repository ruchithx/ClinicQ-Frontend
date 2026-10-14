'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import { getUser, updateUser, resetUserPassword } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { updateUserSchema, resetPasswordSchema } from '@/lib/validation/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { PageHeader } from '@/components/PageHeader';
import { formatDateTime } from '@/lib/format';
import type { UserResponse } from '@/lib/api/types';

const ROLES = ['ADMIN', 'DOCTOR', 'PHARMACIST'] as const;

type UpdateUserValues = z.infer<typeof updateUserSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function EditUserForm({ user, onSaved }: { user: UserResponse; onSaved: (updated: UserResponse) => void }) {
  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(updateUserSchema) as Resolver<UpdateUserValues>,
    defaultValues: {
      fullName: user.fullName,
      roles: user.roles,
      enabled: user.enabled,
      registrationNumber: user.professionalRegistrationNumber ?? '',
      version: user.version,
    },
  });

  const onSubmit = useCallback(
    async (values: UpdateUserValues) => {
      try {
        const updated = await updateUser(user.id, {
          fullName: values.fullName,
          roles: values.roles,
          enabled: values.enabled,
          professionalRegistrationNumber: values.registrationNumber ?? null,
          version: user.version,
        });
        toast.success('User updated.');
        onSaved(updated);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'CONCURRENT_MODIFICATION') {
            form.setError('root', { message: 'Record changed by another user. Please refresh.' });
            return;
          }
          applyFieldErrors(form, err);
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, user, onSaved],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg" noValidate>
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Roles</FormLabel>
              <div className="flex gap-4">
                {ROLES.map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-role-${role}`}
                      checked={field.value.includes(role)}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...field.value, role]
                          : field.value.filter((r) => r !== role);
                        field.onChange(next);
                      }}
                    />
                    <Label htmlFor={`edit-role-${role}`}>{role.charAt(0) + role.slice(1).toLowerCase()}</Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    id="user-enabled"
                  />
                </FormControl>
                <Label htmlFor="user-enabled">Account enabled</Label>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registrationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration number <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </Form>
  );
}

function ResetPasswordForm({ userId }: { userId: string }) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema) as Resolver<ResetPasswordValues>,
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(
    async (values: ResetPasswordValues) => {
      try {
        await resetUserPassword(userId, { temporaryPassword: values.newPassword });
        toast.success('Password reset. The user must change it on next login.');
        form.reset();
      } catch (err) {
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, userId],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm" noValidate>
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New temporary password</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={isSubmitting} autoComplete="new-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input {...field} type="password" disabled={isSubmitting} autoComplete="new-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset password
        </Button>
      </form>
    </Form>
  );
}

interface UserDetailProps {
  userId: string;
}

export function UserDetail({ userId }: UserDetailProps) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, isError } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => getUser(userId),
    staleTime: 60_000,
  });

  const handleSaved = useCallback(
    (updated: UserResponse) => {
      queryClient.setQueryData(queryKeys.users.detail(userId), updated);
    },
    [queryClient, userId],
  );

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!user) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.fullName}
        breadcrumb={<Link href="/admin/users" className="hover:underline">Users</Link>}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">{user.username}</span>
        <span>·</span>
        <span>Created {formatDateTime(user.createdAt)}</span>
        {user.mustChangePassword && (
          <Badge variant="outline" className="text-amber-700 border-amber-300">Must change password</Badge>
        )}
        {!user.enabled && <Badge variant="secondary">Disabled</Badge>}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Account details</h2>
        <EditUserForm user={user} onSaved={handleSaved} />
      </div>

      <Separator />

      <div>
        <h2 className="mb-2 text-lg font-semibold">Reset password</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Sets a new temporary password. The user will be required to change it on next login.
        </p>
        <ResetPasswordForm userId={userId} />
      </div>
    </div>
  );
}
