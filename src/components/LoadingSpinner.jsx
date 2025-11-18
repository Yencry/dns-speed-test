export default function LoadingSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="spinner">
        <div className="dot dot-1"></div>
        <div className="dot dot-2"></div>
        <div className="dot dot-3"></div>
      </div>
      {message && (
        <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
          {message}
        </p>
      )}
    </div>
  );
}
