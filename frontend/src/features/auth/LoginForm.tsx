'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import type { Route } from 'next';
import { useAuth } from './auth-context';
import { ApiError } from '@/lib/api/problem';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { loginSchema } from '@/lib/validation/schemas';
import { messages } from '@/messages/en';

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  reason?: string | null;
}

export function LoginForm({ reason }: LoginFormProps) {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = useCallback(
    async (values: LoginValues) => {
      try {
        await login(values);
        const destination =
          nextParam && /^\/[^/]/.test(nextParam) ? nextParam : '/';
        router.replace(destination as Route);
      } catch (err) {
        // Clear password field on any error
        form.setValue('password', '');

        if (err instanceof ApiError) {
          if (err.code === 'INVALID_CREDENTIALS') {
            form.setError('root', { message: messages.errors.generic });
            return;
          }
          if (err.code === 'ACCOUNT_LOCKED') {
            const lockedUntil = err.extra['lockedUntil'] as string | undefined;
            const time = lockedUntil ? formatDateTime(lockedUntil) : '';
            form.setError('root', {
              message: `Account locked${time ? ` until ${time}` : ''}. Try again later.`,
            });
            return;
          }
          if (err.code === 'ACCOUNT_DISABLED') {
            form.setError('root', { message: 'Account disabled. Contact your administrator.' });
            return;
          }
          if (err.code === 'RATE_LIMITED') {
            const secs = err.extra['retryAfterSeconds'] as number | undefined;
            form.setError('root', {
              message: `Too many attempts. Please wait${secs ? ` ${secs}s` : ''} and try again.`,
            });
            return;
          }
        }
        form.setError('root', { message: messages.errors.generic });
      }
    },
    [login, router, nextParam, form],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.signInButton}</CardTitle>
      </CardHeader>
      <CardContent>
        {reason === 'expired' && (
          <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            {messages.auth.sessionExpired}
          </div>
        )}
        {reason === 'idle' && (
          <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            {messages.auth.idleLogout}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </div>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{messages.auth.username}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="username"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{messages.auth.password}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {messages.auth.signInButton}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
