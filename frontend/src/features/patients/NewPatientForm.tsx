'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';
import type { Route } from 'next';
import { createPatient } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { useIdempotencyKey } from '@/lib/api/idempotency';
import { createPatientSchema } from '@/lib/validation/schemas';
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

type CreatePatientValues = z.infer<typeof createPatientSchema>;

export function NewPatientForm() {
  const router = useRouter();
  const { key: idempotencyKey, renew } = useIdempotencyKey();
  const [dobMode, setDobMode] = useState<'exact' | 'estimated'>('exact');

  const form = useForm<CreatePatientValues>({
    resolver: zodResolver(createPatientSchema) as Resolver<CreatePatientValues>,
    defaultValues: {
      patientNumber: '',
      fullName: '',
      sex: 'UNKNOWN',
      dobMode: 'exact',
      dateOfBirth: '',
      estimatedAgeYears: undefined,
      phoneNumber: '',
      address: '',
      knownAllergies: '',
    },
  });

  const onSubmit = useCallback(
    async (values: CreatePatientValues) => {
      try {
        const patient = await createPatient(
          {
            patientNumber: values.patientNumber,
            fullName: values.fullName,
            sex: values.sex,
            dateOfBirth: values.dobMode === 'exact' ? values.dateOfBirth : undefined,
            estimatedAgeYears:
              values.dobMode === 'estimated' ? values.estimatedAgeYears : undefined,
            phoneNumber: values.phoneNumber ?? undefined,
            address: values.address ?? undefined,
            knownAllergies: values.knownAllergies ?? undefined,
          },
          idempotencyKey,
        );
        renew();
        toast.success(`Patient ${patient.fullName} registered.`);
        router.replace(`/doctor/patients/${patient.id}` as Route);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'DUPLICATE_PATIENT_NUMBER') {
            form.setError('patientNumber', { message: 'This patient number is already registered.' });
            return;
          }
          applyFieldErrors(form, err);
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong. Please try again.',
        });
      }
    },
    [form, router, idempotencyKey, renew],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-w-lg" noValidate>
        {form.formState.errors.root && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patientNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient number</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} placeholder="e.g. P-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sex"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sex</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                    <SelectItem value="UNKNOWN">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} autoComplete="name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* DOB mode radio */}
        <div className="space-y-2">
          <Label>Date of birth</Label>
          <RadioGroup
            value={dobMode}
            onValueChange={(v: 'exact' | 'estimated') => {
              setDobMode(v);
              form.setValue('dobMode', v);
              form.clearErrors(['dateOfBirth', 'estimatedAgeYears']);
            }}
            className="flex gap-6"
            disabled={isSubmitting}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="exact" id="dob-exact" />
              <Label htmlFor="dob-exact">Exact date</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="estimated" id="dob-estimated" />
              <Label htmlFor="dob-estimated">Estimated age</Label>
            </div>
          </RadioGroup>
        </div>

        {dobMode === 'exact' ? (
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input {...field} type="date" disabled={isSubmitting} max={new Date().toISOString().split('T')[0]} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="estimatedAgeYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated age (years)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    max={130}
                    disabled={isSubmitting}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} type="tel" disabled={isSubmitting} placeholder="+94 77 000 0000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="knownAllergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Known allergies <span className="text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} rows={2} disabled={isSubmitting} placeholder="e.g. Penicillin, Sulfa drugs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register patient
          </Button>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
