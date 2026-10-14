'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import type { Route } from 'next';
import { createBooking, listQueueSessions } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { useIdempotencyKey } from '@/lib/api/idempotency';
import { bookingSchema } from '@/lib/validation/schemas';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorPanel } from '@/components/ErrorPanel';

type BookingValues = z.infer<typeof bookingSchema>;

export function BookingForm() {
  const router = useRouter();
  const { key: idempotencyKey, renew } = useIdempotencyKey();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<BookingValues | null>(null);
  const [sessionError, setSessionError] = useState(false);

  const { data: sessionsPage, isLoading: sessionsLoading, error: sessionsError } = useQuery({
    queryKey: queryKeys.queueSessions.list({ status: 'OPEN' }),
    queryFn: () => listQueueSessions({ status: 'OPEN', size: 50 }),
    staleTime: 30_000,
  });

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      patientName: '',
      contactPhone: '',
      channel: 'WALK_IN',
      notes: '',
    },
  });

  const doSubmit = useCallback(
    async (values: BookingValues, allowDuplicate = false) => {
      if (!selectedSessionId) {
        setSessionError(true);
        return;
      }
      setSessionError(false);

      try {
        const entry = await createBooking(
          selectedSessionId,
          {
            patientName: values.patientName,
            contactPhone: values.contactPhone ?? undefined,
            channel: values.channel,
            notes: values.notes ?? undefined,
            allowDuplicate,
          },
          idempotencyKey,
        );
        renew();
        toast.success(`Booked! Queue number: #${entry.queueNumber}`);
        router.replace(`/queue/${selectedSessionId}` as Route);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'DUPLICATE_BOOKING') {
          setPendingValues(values);
          setShowDuplicateDialog(true);
          return;
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong. Please try again.',
        });
      }
    },
    [selectedSessionId, idempotencyKey, renew, form, router],
  );

  const onSubmit = useCallback(
    (values: BookingValues) => doSubmit(values, false),
    [doSubmit],
  );

  const confirmDuplicate = useCallback(async () => {
    if (!pendingValues) return;
    setShowDuplicateDialog(false);
    await doSubmit(pendingValues, true);
  }, [pendingValues, doSubmit]);

  const isSubmitting = form.formState.isSubmitting;

  if (sessionsError) return <ErrorPanel error={sessionsError} />;

  const sessions = sessionsPage?.items ?? [];

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {form.formState.errors.root && (
            <div
              className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Queue session selector */}
          <div className="space-y-2">
            <Label htmlFor="session-select">Queue session <span aria-hidden>*</span></Label>
            <Select
              value={selectedSessionId}
              onValueChange={(v) => { setSelectedSessionId(v); setSessionError(false); }}
              disabled={sessionsLoading || isSubmitting}
            >
              <SelectTrigger id="session-select" aria-required="true">
                <SelectValue placeholder={sessionsLoading ? 'Loading…' : 'Select a session'} />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.sessionDate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sessionError && (
              <p className="text-sm font-medium text-destructive">Please select a queue session.</p>
            )}
          </div>

          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="name"
                    disabled={isSubmitting}
                    placeholder="Full name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact phone <span className="text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="tel"
                    autoComplete="tel"
                    disabled={isSubmitting}
                    placeholder="+94 77 000 0000"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                    disabled={isSubmitting}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="WALK_IN" id="channel-walkin" />
                      <Label htmlFor="channel-walkin">Walk-in</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="PHONE" id="channel-phone" />
                      <Label htmlFor="channel-phone">Phone</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    disabled={isSubmitting}
                    rows={3}
                    placeholder="Any relevant notes…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to queue
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        title="Possible duplicate booking"
        description="This patient name already has a booking in this session. Add them again?"
        confirmLabel="Add anyway"
        onConfirm={confirmDuplicate}
      />
    </>
  );
}
