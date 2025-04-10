'use client'; // This needs to be a client component for state and form handling

import { useState, FormEvent, useEffect } from 'react';
import { Campaign } from '@prisma/client'; // Import Campaign type

export default function HomePage() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [shortUrl, setShortUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [error, setError] = useState('');
  const [campaignError, setCampaignError] = useState('');

  // Add state for new fields
  const [androidAppUri, setAndroidAppUri] = useState('');
  const [androidFallbackUrl, setAndroidFallbackUrl] = useState('');
  const [iosAppUri, setIosAppUri] = useState('');
  const [iosFallbackUrl, setIosFallbackUrl] = useState('');

  // Fetch campaigns on component mount
  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoadingCampaigns(true);
      setCampaignError('');
      try {
        const response = await fetch('/api/campaigns');
        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const data: Campaign[] = await response.json();
        setCampaigns(data);
      } catch (err: unknown) {
        console.error('Error fetching campaigns:', err);
        if (err instanceof Error) {
          setCampaignError(err.message);
        } else {
          setCampaignError('An unexpected error occurred while loading campaigns.');
        }
      } finally {
        setIsLoadingCampaigns(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setShortUrl('');

    if (!originalUrl) {
      setError('Please enter a URL to shorten.');
      setIsLoading(false);
      return;
    }

    // Prepare payload, include all fields
    const payload: {
        url: string;
        campaignId?: string;
        androidAppUri?: string;
        androidFallbackUrl?: string;
        iosAppUri?: string;
        iosFallbackUrl?: string;
     } = { url: originalUrl };

    if (selectedCampaignId) payload.campaignId = selectedCampaignId;
    if (androidAppUri.trim()) payload.androidAppUri = androidAppUri.trim();
    if (androidFallbackUrl.trim()) payload.androidFallbackUrl = androidFallbackUrl.trim();
    if (iosAppUri.trim()) payload.iosAppUri = iosAppUri.trim();
    if (iosFallbackUrl.trim()) payload.iosFallbackUrl = iosFallbackUrl.trim();


    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to shorten URL');
      }

      setShortUrl(data.shortUrl);
      // Optionally reset form fields
      // setOriginalUrl('');
      // setSelectedCampaignId('');
      // setAndroidAppUri('');
      // setAndroidFallbackUrl('');
      // setIosAppUri('');
      // setIosFallbackUrl('');

    } catch (err: unknown) {
      console.error('Shortening error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shortUrl) {
      navigator.clipboard.writeText(shortUrl)
        .then(() => {
          alert('Short URL copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          setError('Failed to copy URL to clipboard.');
        });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-50">
      <div className="z-10 w-full max-w-lg items-center justify-between font-mono text-sm lg:flex flex-col bg-white p-8 rounded-xl shadow-lg"> {/* Increased max-w */}
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">URL Shortener</h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* URL Input */}
          <div>
            <label htmlFor="urlInput" className="block text-sm font-medium text-gray-900 mb-1">
              Original URL <span className="text-red-600">*</span>
            </label>
            <input
              id="urlInput"
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              placeholder="https://example.com/very/long/url/to/shorten"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
              disabled={isLoading}
            />
          </div>

          {/* Campaign Select */}
          <div>
            <label htmlFor="campaignSelect" className="block text-sm font-medium text-gray-900 mb-1">
              Assign to Campaign (Optional)
            </label>
            {campaignError && <p className="text-xs text-red-500 mb-1">{campaignError}</p>}
            <select
              id="campaignSelect"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 disabled:bg-gray-100"
              disabled={isLoadingCampaigns || isLoading}
            >
              <option value="">-- No Campaign --</option>
              {isLoadingCampaigns ? (
                <option disabled>Loading campaigns...</option>
              ) : (
                campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))
              )}
            </select>
             {campaigns.length === 0 && !isLoadingCampaigns && !campaignError && (
                 <p className="text-xs text-gray-500 mt-1">No campaigns available. <a href="/campaigns/new" className="text-violet-600 hover:underline">Create one?</a></p>
             )}
          </div>

          {/* Android Fields */}
          <fieldset className="border border-gray-200 p-3 rounded-md">
             <legend className="text-sm font-medium text-gray-700 px-1">Android Targeting (Optional)</legend>
             <div className="space-y-3 mt-1">
                <div>
                    <label htmlFor="androidAppUri" className="block text-xs font-medium text-gray-600 mb-1">App URI (e.g., myapp://product/123)</label>
                    <input id="androidAppUri" type="text" value={androidAppUri} onChange={(e) => setAndroidAppUri(e.target.value)} placeholder="myapp://path/to/content" className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isLoading} />
                </div>
                <div>
                    <label htmlFor="androidFallbackUrl" className="block text-xs font-medium text-gray-600 mb-1">Fallback URL (if app not installed)</label>
                    <input id="androidFallbackUrl" type="url" value={androidFallbackUrl} onChange={(e) => setAndroidFallbackUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isLoading} />
                </div>
             </div>
          </fieldset>

          {/* iOS Fields */}
           <fieldset className="border border-gray-200 p-3 rounded-md">
             <legend className="text-sm font-medium text-gray-700 px-1">iOS Targeting (Optional)</legend>
             <div className="space-y-3 mt-1">
                <div>
                    <label htmlFor="iosAppUri" className="block text-xs font-medium text-gray-600 mb-1">App URI (e.g., myapp://product/123)</label>
                    <input id="iosAppUri" type="text" value={iosAppUri} onChange={(e) => setIosAppUri(e.target.value)} placeholder="myapp://path/to/content" className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isLoading} />
                </div>
                <div>
                    <label htmlFor="iosFallbackUrl" className="block text-xs font-medium text-gray-600 mb-1">Fallback URL (if app not installed)</label>
                    <input id="iosFallbackUrl" type="url" value={iosFallbackUrl} onChange={(e) => setIosFallbackUrl(e.target.value)} placeholder="https://apps.apple.com/us/app/..." className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isLoading} />
                </div>
             </div>
          </fieldset>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isLoadingCampaigns}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Shortening...' : 'Shorten URL'}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <p className="mt-4 text-center text-red-600 text-sm">{error}</p>
        )}

        {/* Result Display */}
        {shortUrl && (
          <div className="mt-6 p-4 bg-indigo-50 rounded-md border border-indigo-200 w-full text-center">
            <p className="text-sm text-gray-700 mb-2">Your shortened URL:</p>
            <div className="flex items-center justify-center space-x-2">
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-700 font-medium break-all hover:underline"
              >
                {shortUrl}
              </a>
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                className="p-1 text-gray-500 hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-violet-500 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
