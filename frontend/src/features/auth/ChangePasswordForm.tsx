'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import type { Route } from 'next';
import { changePassword } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/problem';
import { changePasswordSchema } from '@/lib/validation/schemas';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from './auth-context';
import { messages } from '@/messages/en';

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(
    async (values: ChangePasswordValues) => {
      try {
        await changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        toast.success(messages.auth.passwordChanged);
        const destination = user?.mustChangePassword ? '/login' : -1;
        if (destination === -1) {
          router.back();
        } else {
          router.replace(destination as Route);
        }
      } catch (err) {
        form.setValue('currentPassword', '');
        form.setValue('newPassword', '');
        form.setValue('confirmPassword', '');

        if (err instanceof ApiError) {
          if (err.code === 'CURRENT_PASSWORD_INCORRECT') {
            form.setError('currentPassword', { message: 'Current password is incorrect.' });
            return;
          }
          if (err.code === 'PASSWORD_POLICY_VIOLATION') {
            form.setError('newPassword', { message: 'Password does not meet requirements (min 12 characters).' });
            return;
          }
        }
        form.setError('root', { message: messages.errors.generic });
      }
    },
    [form, router, user],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{messages.auth.changePasswordTitle}</CardTitle>
        {user?.mustChangePassword && (
          <CardDescription>
            You must change your password before continuing.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {form.formState.errors.root && (
              <div
                className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {form.formState.errors.root.message}
              </div>
            )}

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
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
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {messages.auth.changePasswordTitle}
              </Button>
              {!user?.mustChangePassword && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
