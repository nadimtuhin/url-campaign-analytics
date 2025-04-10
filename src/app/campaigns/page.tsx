'use client';

    import { useState, useEffect } from 'react';
    import Link from 'next/link';
    import { Campaign } from '@prisma/client'; // Import the Campaign type

    // Removed redundant interface CampaignWithStats

    export default function CampaignsPage() {
      const [campaigns, setCampaigns] = useState<Campaign[]>([]); // Use Campaign type directly
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState('');

      useEffect(() => {
        const fetchCampaigns = async () => {
          setIsLoading(true);
          setError('');
          try {
            const response = await fetch('/api/campaigns');
            if (!response.ok) {
              throw new Error('Failed to fetch campaigns');
            }
            const data: Campaign[] = await response.json(); // Use Campaign type directly
            setCampaigns(data);
          } catch (err: unknown) {
            console.error('Error fetching campaigns:', err);
            if (err instanceof Error) {
              setError(err.message);
            } else {
              setError('An unexpected error occurred.');
            }
          } finally {
            setIsLoading(false);
          }
        };

        fetchCampaigns();
      }, []); // Empty dependency array means this runs once on mount

      return (
        <main className="flex min-h-screen flex-col items-center p-8 sm:p-12 md:p-24 bg-gray-50">
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">Campaigns</h1>
              <Link href="/campaigns/new" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium">
                  Create New Campaign
              </Link>
            </div>

            {isLoading && <p className="text-center text-gray-500">Loading campaigns...</p>}
            {error && <p className="text-center text-red-600">{error}</p>}

            {!isLoading && !error && (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul role="list" className="divide-y divide-gray-200">
                  {campaigns.length === 0 ? (
                     <li className="px-6 py-4 text-center text-gray-500">No campaigns found.</li>
                  ) : (
                    campaigns.map((campaign) => (
                      <li key={campaign.id}>
                        <Link href={`/campaigns/${campaign.id}`} className="block hover:bg-gray-50">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <p className="text-md font-medium text-indigo-600 truncate">{campaign.name}</p>
                              {/* Optional: Display quick stats like link count or total clicks if available */}
                              {/* <p className="ml-2 text-sm text-gray-500">{campaign.totalClicks ?? 0} clicks</p> */}
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  {campaign.description || <span className="italic">No description</span>}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <p>
                                  Created: {new Date(campaign.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </main>
      );
    }
