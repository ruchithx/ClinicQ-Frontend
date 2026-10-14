'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { z } from 'zod';
import { getPrescription, startPrescription, cancelPrescription } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { cancelReasonSchema } from '@/lib/validation/schemas';
import { formatDateTime, formatQuantity } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DispenseForm } from './DispenseForm';
import { useAuth } from '@/features/auth/auth-context';

type CancelValues = z.infer<typeof cancelReasonSchema>;

interface PharmacistPrescriptionDetailProps {
  prescriptionId: string;
}

export function PharmacistPrescriptionDetail({ prescriptionId }: PharmacistPrescriptionDetailProps) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);
  const [showDispenseForm, setShowDispenseForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: prescription, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.prescriptions.detail(prescriptionId),
    queryFn: () => getPrescription(prescriptionId),
    staleTime: 0,
  });

  const cancelForm = useForm<CancelValues>({
    resolver: zodResolver(cancelReasonSchema) as Resolver<CancelValues>,
    defaultValues: { reason: '' },
  });

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    setActionError(null);
    try {
      await startPrescription(prescriptionId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.prescriptions.detail(prescriptionId),
      });
      setShowDispenseForm(true);
      toast.success('Prescription started.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_STATUS_TRANSITION') {
        setActionError('Status has changed — please refresh.');
        await refetch();
      } else {
        setActionError(err instanceof ApiError ? err.title : 'Something went wrong.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [prescriptionId, queryClient, refetch]);

  const handleCancelSubmit = useCallback(
    async (values: CancelValues) => {
      setActionError(null);
      try {
        await cancelPrescription(prescriptionId, { reason: values.reason });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.prescriptions.detail(prescriptionId),
        });
        setShowCancelForm(false);
        toast.success('Prescription cancelled.');
      } catch (err) {
        if (err instanceof ApiError) {
          applyFieldErrors(cancelForm, err);
          if (err.code === 'INVALID_STATUS_TRANSITION') {
            cancelForm.setError('root', {
              message: 'Status has changed — please refresh.',
            });
            await refetch();
            return;
          }
        }
        cancelForm.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [prescriptionId, queryClient, cancelForm, refetch],
  );

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError) return <ErrorPanel error={error} />;
  if (!prescription) return null;

  const startedByMe = prescription.startedBy?.id === user?.id;
  const showFormDirectly =
    prescription.status === 'IN_PROGRESS' && startedByMe && !showDispenseForm && !showCancelForm;

  return (
    <div className="space-y-6">
      <PageHeader
        title={prescription.prescriptionNumber}
        breadcrumb={
          <Link href="/pharmacist/prescriptions" className="hover:underline">
            Prescriptions
          </Link>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {actionError && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {actionError}
        </div>
      )}

      {/* Header card */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Prescription</CardTitle>
              <StatusBadge status={prescription.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{formatDateTime(prescription.submittedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prescribed by</span>
              <span>{prescription.prescribedBy.fullName}</span>
            </div>
            {prescription.notes && (
              <p className="mt-2 text-muted-foreground italic">{prescription.notes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{prescription.patient.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Number</span>
              <span className="font-mono">{prescription.patient.patientNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Age</span>
              <span>{prescription.patient.ageYears}{prescription.patient.dateOfBirthEstimated ? ' (est.)' : ''} y</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {prescription.patient.knownAllergies && (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <strong>Known allergies:</strong> {prescription.patient.knownAllergies}
          </div>
        </div>
      )}

      {/* Items */}
      {!showDispenseForm && !showFormDirectly && (
        <div>
          <Label className="text-base font-semibold">Items</Label>
          <div className="mt-2 divide-y rounded-lg border">
            {prescription.items.map((item, i) => (
              <div key={item.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">
                    {i + 1}. {item.medicineName}
                    {item.strength && ` ${item.strength}`}
                  </span>
                  {item.dosageForm && (
                    <span className="text-xs text-muted-foreground">{item.dosageForm}</span>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {item.dose} · {item.frequency}
                  {item.durationDays ? ` · ${item.durationDays} days` : ''}
                  {' · '}{formatQuantity(item.quantity, item.quantityUnit)}
                </p>
                {item.instructions && (
                  <p className="text-xs italic text-muted-foreground">{item.instructions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispensed info */}
      {prescription.status === 'DISPENSED' && prescription.dispensing && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dispensed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispensed by</span>
              <span>{prescription.dispensing.pharmacist.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispensed at</span>
              <span>{formatDateTime(prescription.dispensing.dispensedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outcome</span>
              <span>{prescription.dispensing.outcome}</span>
            </div>
            {prescription.dispensing.notes && (
              <p className="mt-2 text-muted-foreground">{prescription.dispensing.notes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancelled info */}
      {prescription.status === 'CANCELLED' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {prescription.cancelledBy && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelled by</span>
                <span>{prescription.cancelledBy.fullName}</span>
              </div>
            )}
            {prescription.cancelledAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelled at</span>
                <span>{formatDateTime(prescription.cancelledAt)}</span>
              </div>
            )}
            {prescription.cancelReason && (
              <p className="mt-2 text-muted-foreground">{prescription.cancelReason}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {prescription.status === 'PENDING' && !showDispenseForm && !showCancelForm && (
        <div className="flex gap-3">
          <Button onClick={() => void handleStart()} disabled={isStarting}>
            {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start dispensing
          </Button>
          <Button variant="outline" onClick={() => setShowCancelForm(true)}>
            Cancel prescription
          </Button>
        </div>
      )}

      {prescription.status === 'IN_PROGRESS' && !showDispenseForm && !showFormDirectly && !showCancelForm && (
        <div className="flex gap-3">
          <Button onClick={() => setShowDispenseForm(true)}>
            Dispense
          </Button>
          <Button variant="outline" onClick={() => setShowCancelForm(true)}>
            Cancel prescription
          </Button>
        </div>
      )}

      {(showDispenseForm || showFormDirectly) && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Dispense prescription</h2>
          <DispenseForm
            prescription={prescription}
            onSuccess={() => {
              setShowDispenseForm(false);
              router.push('/pharmacist/prescriptions' as Route);
            }}
            onCancel={() => setShowDispenseForm(false)}
          />
        </div>
      )}

      {showCancelForm && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Cancel prescription</h2>
          <Form {...cancelForm}>
            <form onSubmit={cancelForm.handleSubmit(handleCancelSubmit)} className="space-y-4" noValidate>
              {cancelForm.formState.errors.root && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                  {cancelForm.formState.errors.root.message}
                </div>
              )}
              <FormField
                control={cancelForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for cancellation</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        disabled={cancelForm.formState.isSubmitting}
                        placeholder="Enter reason…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={cancelForm.formState.isSubmitting}
                >
                  {cancelForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Confirm cancellation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={cancelForm.formState.isSubmitting}
                  onClick={() => setShowCancelForm(false)}
                >
                  Back
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
