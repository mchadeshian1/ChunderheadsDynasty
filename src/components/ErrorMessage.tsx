interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-100 transition-colors hover:bg-gray-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
