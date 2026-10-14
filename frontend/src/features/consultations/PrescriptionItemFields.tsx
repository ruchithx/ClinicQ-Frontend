'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Trash2, ChevronDown } from 'lucide-react';
import { listMedicines } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { DOSAGE_FORMS, FREQUENCY_PRESETS, QUANTITY_UNITS } from '@/lib/validation/schemas';
import {
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
import type { ConsultationFormValues } from '@/lib/validation/schemas';

interface ItemFieldsProps {
  index: number;
  onRemove: () => void;
  isSubmitting: boolean;
}

function MedicinePicker({
  onSelect,
  disabled,
}: {
  onSelect: (id: string, name: string, strength?: string, dosageForm?: string) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: queryKeys.medicines.list({ search, active: true }),
    queryFn: () => listMedicines({ search, active: true, size: 20 }),
    staleTime: 60_000,
    enabled: search.length >= 2,
  });

  return (
    <div className="relative space-y-1">
      <Input
        placeholder="Search medicines…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />
      {data && data.items.length > 0 && (
        <div className="absolute z-10 w-full rounded-md border bg-card shadow-md max-h-48 overflow-y-auto">
          {data.items.map((m) => (
            <button
              key={m.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(m.id, m.name, m.strength ?? undefined, m.dosageForm);
                setSearch('');
              }}
            >
              {m.name}{m.strength ? ` ${m.strength}` : ''} <span className="text-xs text-muted-foreground">{m.dosageForm}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PrescriptionItemFields({ index, onRemove, isSubmitting }: ItemFieldsProps) {
  const form = useFormContext<ConsultationFormValues>();
  const source = form.watch(`prescription.items.${index}.source`);
  const [showOptional, setShowOptional] = useState(false);

  const handleMedicineSelect = (
    id: string,
    name: string,
    strength?: string,
    dosageForm?: string,
  ) => {
    form.setValue(`prescription.items.${index}.medicineId`, id);
    form.setValue(`prescription.items.${index}.medicineName`, name);
    if (strength) form.setValue(`prescription.items.${index}.strength`, strength);
    if (dosageForm) {
      const df = DOSAGE_FORMS.find((f) => f === dosageForm);
      if (df) form.setValue(`prescription.items.${index}.dosageForm`, df);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Item {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={isSubmitting}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Source radio */}
      <div className="space-y-1">
        <Label>Source</Label>
        <RadioGroup
          value={source}
          onValueChange={(v: 'catalogue' | 'free') =>
            form.setValue(`prescription.items.${index}.source`, v)
          }
          className="flex gap-4"
          disabled={isSubmitting}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="catalogue" id={`src-catalogue-${index}`} />
            <Label htmlFor={`src-catalogue-${index}`}>Catalogue</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="free" id={`src-free-${index}`} />
            <Label htmlFor={`src-free-${index}`}>Free text</Label>
          </div>
        </RadioGroup>
      </div>

      {source === 'catalogue' ? (
        <FormField
          control={form.control}
          name={`prescription.items.${index}.medicineId`}
          render={() => (
            <FormItem>
              <FormLabel>Medicine</FormLabel>
              <FormControl>
                <MedicinePicker onSelect={handleMedicineSelect} disabled={isSubmitting} />
              </FormControl>
              {form.watch(`prescription.items.${index}.medicineName`) && (
                <p className="text-sm text-emerald-700">
                  Selected: {form.watch(`prescription.items.${index}.medicineName`)}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name={`prescription.items.${index}.medicineName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medicine name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`prescription.items.${index}.dose`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dose</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} placeholder="e.g. 500 mg" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`prescription.items.${index}.frequency`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FREQUENCY_PRESETS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                  <SelectItem value="_custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {field.value === '_custom' && (
                <Input
                  className="mt-1"
                  placeholder="Enter frequency"
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={isSubmitting}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`prescription.items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input {...field} disabled={isSubmitting} placeholder="e.g. 30" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`prescription.items.${index}.quantityUnit`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {QUANTITY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Optional fields toggle */}
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowOptional((p) => !p)}
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
        {showOptional ? 'Hide' : 'Show'} optional fields
      </button>

      {showOptional && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name={`prescription.items.${index}.strength`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strength</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`prescription.items.${index}.dosageForm`}
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
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOSAGE_FORMS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`prescription.items.${index}.durationDays`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    disabled={isSubmitting}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`prescription.items.${index}.instructions`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    rows={2}
                    disabled={isSubmitting}
                    placeholder="e.g. Take with food"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
