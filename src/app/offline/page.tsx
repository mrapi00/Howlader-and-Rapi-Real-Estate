"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re Offline</h1>
        <p className="text-sm text-gray-500 mb-6">
          Check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
