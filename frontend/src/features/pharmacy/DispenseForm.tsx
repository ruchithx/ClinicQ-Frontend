'use client';

import { useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { z } from 'zod';
import { dispensePrescription } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { useIdempotencyKey } from '@/lib/api/idempotency';
import { dispenseSchema } from '@/lib/validation/schemas';
import { formatQuantity } from '@/lib/format';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PrescriptionResponse } from '@/lib/api/types';

type DispenseValues = z.infer<typeof dispenseSchema>;

interface DispenseFormProps {
  prescription: PrescriptionResponse;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DispenseForm({ prescription, onSuccess, onCancel }: DispenseFormProps) {
  const queryClient = useQueryClient();
  const { key: idempotencyKey, renew } = useIdempotencyKey();

  const form = useForm<DispenseValues>({
    resolver: zodResolver(dispenseSchema) as Resolver<DispenseValues>,
    defaultValues: {
      notes: '',
      confirmed: undefined,
      items: prescription.items.map((item) => ({
        prescriptionItemId: item.id,
        dispensedQuantity: String(item.quantity),
        note: '',
      })),
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'items' });

  const onSubmit = useCallback(
    async (values: DispenseValues) => {
      try {
        await dispensePrescription(
          prescription.id,
          {
            notes: values.notes || undefined,
            items: values.items.map((item) => ({
              prescriptionItemId: item.prescriptionItemId,
              quantityDispensed: parseFloat(item.dispensedQuantity),
              note: item.note || undefined,
            })),
          },
          idempotencyKey,
        );
        renew();
        await queryClient.invalidateQueries({
          queryKey: queryKeys.prescriptions.detail(prescription.id),
        });
        toast.success('Prescription dispensed.');
        onSuccess();
      } catch (err) {
        if (err instanceof ApiError) {
          applyFieldErrors(form, err);
          if (err.code === 'INVALID_STATUS_TRANSITION') {
            form.setError('root', {
              message: 'Status has changed — please refresh and try again.',
            });
            return;
          }
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, prescription.id, idempotencyKey, renew, queryClient, onSuccess],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        {prescription.patient.knownAllergies && (
          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <strong>Known allergies:</strong> {prescription.patient.knownAllergies}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Label className="text-base font-semibold">Prescription items</Label>
          {fields.map((field, i) => {
            const item = prescription.items[i];
            if (!item) return null;
            return (
              <div key={field.id} className="rounded-lg border p-4 space-y-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {i + 1}. {item.medicineName}
                    {item.strength && ` ${item.strength}`}
                    {item.dosageForm && <span className="ml-1 text-muted-foreground">{item.dosageForm}</span>}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {item.dose} · {item.frequency}
                    {item.durationDays ? ` · ${item.durationDays} days` : ''}
                    {' · Prescribed: '}{formatQuantity(item.quantity, item.quantityUnit)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name={`items.${i}.dispensedQuantity`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Dispensed quantity ({item.quantityUnit})</FormLabel>
                        <FormControl>
                          <Input
                            {...f}
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${i}.note`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Note (required if dispensing less)</FormLabel>
                        <FormControl>
                          <Input
                            {...f}
                            value={f.value ?? ''}
                            disabled={isSubmitting}
                            placeholder="e.g. Out of stock"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dispensing notes <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmed"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-3 rounded-md border p-3">
                <FormControl>
                  <Checkbox
                    id="dispense-confirmed"
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true ? true : undefined)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel htmlFor="dispense-confirmed" className="cursor-pointer font-medium">
                    I confirm this prescription has been handed to the patient
                  </FormLabel>
                  <FormMessage />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm dispense
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
