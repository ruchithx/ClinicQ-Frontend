'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, UserRound } from 'lucide-react';
import type { Route } from 'next';
import { searchPatients } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { formatAge, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorPanel } from '@/components/ErrorPanel';
import type { PatientSummary } from '@/lib/api/types';

function PatientRow({ patient }: { patient: PatientSummary }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/doctor/patients/${patient.id}` as Route)}
      className="w-full rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center gap-3">
        <UserRound className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{patient.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {patient.patientNumber} · {patient.sex} · {formatAge(patient.dateOfBirth, patient.dateOfBirthEstimated)} · DOB {formatDate(patient.dateOfBirth)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function PatientSearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.patients.search({ search: submitted }),
    queryFn: () => searchPatients({ search: submitted, size: 20 }),
    enabled: submitted.length > 0,
    staleTime: 30_000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or patient number…"
          className="max-w-md"
          aria-label="Patient search"
        />
        <Button type="submit" disabled={!query.trim()}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/doctor/patients/new' as Route)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New patient
        </Button>
      </form>

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorPanel error={error} />}

      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            {data.totalItems === 0
              ? 'No patients found.'
              : `${data.totalItems} patient${data.totalItems !== 1 ? 's' : ''} found`}
          </p>
          <div className="space-y-2">
            {data.items.map((p) => (
              <PatientRow key={p.id} patient={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
