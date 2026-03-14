export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-6 text-red-300">
      <p className="font-medium">Error</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}
