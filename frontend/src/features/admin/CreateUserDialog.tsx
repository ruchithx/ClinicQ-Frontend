'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import { createUser } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { createUserSchema } from '@/lib/validation/schemas';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CreateUserValues = z.infer<typeof createUserSchema>;

const ROLES = ['ADMIN', 'DOCTOR', 'PHARMACIST'] as const;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema) as Resolver<CreateUserValues>,
    defaultValues: {
      username: '',
      fullName: '',
      roles: [],
      registrationNumber: '',
      temporaryPassword: '',
      confirmTemporaryPassword: '',
    },
  });

  const onSubmit = useCallback(
    async (values: CreateUserValues) => {
      try {
        await createUser({
          username: values.username,
          fullName: values.fullName,
          roles: values.roles,
          professionalRegistrationNumber: values.registrationNumber ?? null,
          temporaryPassword: values.temporaryPassword,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
        toast.success(`User ${values.username} created.`);
        form.reset();
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'DUPLICATE_USERNAME') {
            form.setError('username', { message: 'This username is already taken.' });
            return;
          }
          applyFieldErrors(form, err);
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, queryClient, onOpenChange],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create staff account</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

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
                          id={`role-${role}`}
                          checked={field.value.includes(role)}
                          disabled={isSubmitting}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, role]
                              : field.value.filter((r) => r !== role);
                            field.onChange(next);
                          }}
                        />
                        <Label htmlFor={`role-${role}`}>{role.charAt(0) + role.slice(1).toLowerCase()}</Label>
                      </div>
                    ))}
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
                    <Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder="e.g. SLMC 12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temporaryPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" disabled={isSubmitting} autoComplete="new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmTemporaryPassword"
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create user
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
