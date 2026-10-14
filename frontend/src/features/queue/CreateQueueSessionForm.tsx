'use client';

import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import { createQueueSession, listStaff } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { queueSessionSchema } from '@/lib/validation/schemas';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type QueueSessionValues = z.infer<typeof queueSessionSchema>;

function todayISO(): string {
  const d = new Date();
  return d.toISOString().split('T')[0] ?? d.toISOString().slice(0, 10);
}

interface CreateQueueSessionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateQueueSessionForm({ onSuccess, onCancel }: CreateQueueSessionFormProps) {
  const queryClient = useQueryClient();

  const { data: staff } = useQuery({
    queryKey: queryKeys.staff('DOCTOR'),
    queryFn: () => listStaff('DOCTOR'),
    staleTime: 60_000,
  });

  const form = useForm<QueueSessionValues>({
    resolver: zodResolver(queueSessionSchema) as Resolver<QueueSessionValues>,
    defaultValues: {
      sessionDate: todayISO(),
      name: '',
      assignedDoctorId: null,
    },
  });

  const onSubmit = useCallback(
    async (values: QueueSessionValues) => {
      try {
        await createQueueSession({
          sessionDate: values.sessionDate,
          name: values.name,
          assignedDoctorId: values.assignedDoctorId ?? null,
        });
        await queryClient.invalidateQueries({ queryKey: queryKeys.queueSessions.list() });
        toast.success('Queue session created.');
        onSuccess();
      } catch (err) {
        if (err instanceof ApiError) {
          applyFieldErrors(form, err);
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, queryClient, onSuccess],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        <FormField
          control={form.control}
          name="sessionDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input {...field} type="date" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session name</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} placeholder="e.g. Morning OPD" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedDoctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned doctor <span className="text-muted-foreground">(optional)</span></FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v === '' ? null : v)}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {staff?.items.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create session
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
