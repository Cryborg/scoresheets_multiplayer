import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Page non trouvée</p>
        <Link 
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}