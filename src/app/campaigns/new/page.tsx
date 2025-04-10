'use client';

    import { useState, FormEvent } from 'react';
    import { useRouter } from 'next/navigation'; // Use App Router's router
    import Link from 'next/link';

    export default function NewCampaignPage() {
      const [name, setName] = useState('');
      const [description, setDescription] = useState('');
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState('');
      const router = useRouter();

      const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        if (!name.trim()) {
          setError('Campaign name is required.');
          setIsLoading(false);
          return;
        }

        try {
          const response = await fetch('/api/campaigns', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create campaign');
          }

          // Redirect to the campaigns list page after successful creation
          router.push('/campaigns');
          // Optionally show a success message before redirecting or on the next page

        } catch (err: unknown) {
          console.error('Campaign creation error:', err);
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred.');
          }
        } finally {
          setIsLoading(false);
        }
      };

      return (
        <main className="flex min-h-screen flex-col items-center p-8 sm:p-12 md:p-24 bg-gray-50">
          <div className="w-full max-w-lg bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Create New Campaign</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="campaignName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer Sale 2025"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900" // Add text color
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="campaignDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="campaignDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe the purpose of this campaign"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900" // Add text color
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                 <Link href="/campaigns" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Cancel
                 </Link>
                 <button
                   type="submit"
                   disabled={isLoading}
                   className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isLoading ? 'Creating...' : 'Create Campaign'}
                 </button>
              </div>
            </form>
          </div>
        </main>
      );
    }
