'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Pencil } from 'lucide-react';
import type { z } from 'zod';
import { listMedicines, createMedicine, updateMedicine } from '@/lib/api/endpoints';
import { ApiError, applyFieldErrors } from '@/lib/api/problem';
import { queryKeys } from '@/lib/api/query-keys';
import { medicineSchema, DOSAGE_FORMS } from '@/lib/validation/schemas';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import type { MedicineResponse } from '@/lib/api/types';

type MedicineValues = z.infer<typeof medicineSchema>;

interface MedicineFormDialogProps {
  medicine?: MedicineResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function MedicineFormDialog({ medicine, open, onOpenChange, onSaved }: MedicineFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!medicine;

  const form = useForm<MedicineValues>({
    resolver: zodResolver(medicineSchema) as Resolver<MedicineValues>,
    defaultValues: medicine
      ? {
          name: medicine.name,
          strength: medicine.strength ?? '',
          dosageForm: medicine.dosageForm,
          active: medicine.active,
          version: medicine.version,
        }
      : {
          name: '',
          strength: '',
          dosageForm: undefined,
          active: true,
          version: undefined,
        },
  });

  const onSubmit = useCallback(
    async (values: MedicineValues) => {
      try {
        if (isEdit && medicine) {
          await updateMedicine(medicine.id, {
            name: values.name,
            strength: values.strength ?? null,
            dosageForm: values.dosageForm ?? medicine.dosageForm,
            active: values.active ?? true,
            version: medicine.version,
          });
          toast.success('Medicine updated.');
        } else {
          await createMedicine({
            name: values.name,
            strength: values.strength ?? null,
            dosageForm: values.dosageForm ?? 'TABLET',
          });
          toast.success('Medicine added.');
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.medicines.list() });
        onSaved();
        onOpenChange(false);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'DUPLICATE_MEDICINE') {
            form.setError('name', { message: 'A medicine with this name already exists.' });
            return;
          }
          if (err.code === 'CONCURRENT_MODIFICATION') {
            form.setError('root', { message: 'Another user changed this record. Please close and re-open to refresh.' });
            return;
          }
          applyFieldErrors(form, err);
        }
        form.setError('root', {
          message: err instanceof ApiError ? err.title : 'Something went wrong.',
        });
      }
    },
    [form, isEdit, medicine, queryClient, onSaved, onOpenChange],
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit medicine' : 'New medicine'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {form.formState.errors.root.message}
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSubmitting} placeholder="e.g. Amoxicillin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strength <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} disabled={isSubmitting} placeholder="e.g. 500 mg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dosageForm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage form</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select form" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOSAGE_FORMS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f.charAt(0) + f.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                          id="medicine-active"
                        />
                      </FormControl>
                      <Label htmlFor="medicine-active">Active</Label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Add medicine'}
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

export function MedicineList() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState<MedicineResponse | undefined>(undefined);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.medicines.list({ search: submitted, active: showInactive ? undefined : true }),
    queryFn: () =>
      listMedicines({ search: submitted || undefined, active: showInactive ? undefined : true, size: 50 }),
    staleTime: 30_000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(search.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines…"
            className="max-w-xs"
            aria-label="Search medicines"
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm">Show inactive</Label>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New medicine
        </Button>
      </div>

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorPanel error={error} />}

      {data && data.items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No medicines found.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Strength</th>
                <th className="px-4 py-3 text-left font-medium">Form</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((m) => (
                <tr key={m.id} className="bg-card hover:bg-accent transition-colors">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.strength ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.dosageForm}</td>
                  <td className="px-4 py-3">
                    {m.active ? (
                      <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(m)}
                      aria-label={`Edit ${m.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MedicineFormDialog
        open={showNew}
        onOpenChange={setShowNew}
        onSaved={() => refetch()}
      />

      {selected && (
        <MedicineFormDialog
          medicine={selected}
          open={!!selected}
          onOpenChange={(o) => { if (!o) setSelected(undefined); }}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
}
