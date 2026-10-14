export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    </div>
  );
}
