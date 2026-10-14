'use client';

import { useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { z } from 'zod';
import type { Route } from 'next';
import { createConsultation, getPatient } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { useIdempotencyKey } from '@/lib/api/idempotency';
import { consultationSchema } from '@/lib/validation/schemas';
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
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PrescriptionItemFields } from './PrescriptionItemFields';

type ConsultationValues = z.infer<typeof consultationSchema>;

const DEFAULT_ITEM = () => ({
  source: 'catalogue' as const,
  medicineId: '',
  medicineName: '',
  strength: '',
  dosageForm: undefined,
  dose: '',
  frequency: '',
  durationDays: null,
  quantity: '',
  quantityUnit: 'tablets',
  instructions: '',
});

interface NewConsultationFormProps {
  patientId: string;
}

export function NewConsultationForm({ patientId }: NewConsultationFormProps) {
  const router = useRouter();
  const { key: idempotencyKey, renew } = useIdempotencyKey();

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: queryKeys.patients.detail(patientId),
    queryFn: () => getPatient(patientId),
    staleTime: 60_000,
  });

  const form = useForm<ConsultationValues>({
    resolver: zodResolver(consultationSchema) as Resolver<ConsultationValues>,
    defaultValues: {
      presentingComplaint: '',
      clinicalNotes: '',
      diagnoses: [{ conditionText: '', icd10Code: '' }],
      hasPrescription: false,
      prescription: null,
    },
  });

  const { fields: diagnoses, append: addDiagnosis, remove: removeDiagnosis } = useFieldArray({
    control: form.control,
    name: 'diagnoses',
  });

  const hasPrescription = useWatch({ control: form.control, name: 'hasPrescription' });
  const prescriptionItems = useWatch({ control: form.control, name: 'prescription.items' }) ?? [];

  const { fields: items, append: addItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'prescription.items',
  });

  const onSubmit = useCallback(
    async (values: ConsultationValues) => {
      try {
        const consultation = await createConsultation(
          {
            patientId,
            presentingComplaint: values.presentingComplaint ?? undefined,
            clinicalNotes: values.clinicalNotes ?? undefined,
            diagnoses: values.diagnoses.map((d) => ({
              conditionText: d.conditionText,
              icd10Code: d.icd10Code || undefined,
            })),
            prescription:
              values.hasPrescription && values.prescription
                ? {
                    notes: values.prescription.notes ?? undefined,
                    items: values.prescription.items.map((item) => ({
                      medicineId: item.source === 'catalogue' ? item.medicineId : undefined,
                      medicineName: item.source === 'free' ? item.medicineName : undefined,
                      strength: item.strength ?? undefined,
                      dosageForm: item.dosageForm ?? undefined,
                      dose: item.dose,
                      frequency: item.frequency,
                      durationDays: item.durationDays ?? undefined,
                      quantity: parseFloat(item.quantity),
                      quantityUnit: item.quantityUnit,
                      instructions: item.instructions ?? undefined,
                    })),
                  }
                : null,
          },
          idempotencyKey,
        );
        renew();
        toast.success('Consultation created.');
        router.replace(`/doctor/consultations/${consultation.id}` as Route);
      } catch (err) {
        if (err instanceof ApiError) {
          applyFieldErrors(form, err);
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, router, patientId, idempotencyKey, renew],
  );

  const isSubmitting = form.formState.isSubmitting;

  if (patientLoading) return <LoadingSkeleton variant="card" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        {patient && (
          <div className="rounded-md bg-muted px-4 py-3 text-sm">
            Patient: <strong>{patient.fullName}</strong> · {patient.patientNumber}
          </div>
        )}

        <FormField
          control={form.control}
          name="presentingComplaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Presenting complaint</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={3}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clinicalNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Clinical notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={4}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Diagnoses */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Diagnoses</Label>
          {diagnoses.map((field, i) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <FormField
                  control={form.control}
                  name={`diagnoses.${i}.conditionText`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...f} disabled={isSubmitting} placeholder="Condition or diagnosis" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`diagnoses.${i}.icd10Code`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...f} value={f.value ?? ''} disabled={isSubmitting} placeholder="ICD-10 code (optional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {diagnoses.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDiagnosis(i)}
                  disabled={isSubmitting}
                  aria-label="Remove diagnosis"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {diagnoses.length < 10 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addDiagnosis({ conditionText: '', icd10Code: '' })}
              disabled={isSubmitting}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add diagnosis
            </Button>
          )}
        </div>

        {/* Prescription toggle */}
        <FormField
          control={form.control}
          name="hasPrescription"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (checked && !form.getValues('prescription')) {
                        form.setValue('prescription', {
                          notes: '',
                          items: [DEFAULT_ITEM()],
                        });
                      }
                    }}
                    disabled={isSubmitting}
                    id="has-prescription"
                  />
                </FormControl>
                <FormLabel htmlFor="has-prescription" className="cursor-pointer">
                  Include prescription
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {hasPrescription && (
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold">Prescription</h3>

            <FormField
              control={form.control}
              name="prescription.notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {items.map((item, i) => (
              <PrescriptionItemFields
                key={item.id}
                index={i}
                onRemove={() => removeItem(i)}
                isSubmitting={isSubmitting}
              />
            ))}

            {prescriptionItems.length < 30 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(DEFAULT_ITEM())}
                disabled={isSubmitting}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add item
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save consultation
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
