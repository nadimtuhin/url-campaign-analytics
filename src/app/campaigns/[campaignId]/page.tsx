'use client';

import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from 'react'; // Add useMemo
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Campaign, Link as PrismaLink, Click } from '@prisma/client';
// Import Recharts components
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// --- Types ---
interface ClickDetails extends Omit<Click, 'linkId' | 'link'> {
    link: { shortCode: string | null } | null;
}
interface LinkWithCount extends Omit<PrismaLink, 'campaignId' | 'campaign' | 'clicks'> {
     _count: { clicks: number };
}
interface CampaignWithLinks extends Campaign {
    links: LinkWithCount[];
}
interface CampaignPageData {
    campaign: CampaignWithLinks;
    clicks: {
        data: ClickDetails[];
        pagination: { currentPage: number; totalPages: number; totalClicks: number; limit: number; };
    };
}
type EditableLink = Omit<LinkWithCount, '_count' | 'createdAt' | 'shortCode'> & {
    campaignId: string | null;
};
// Type for aggregated data
type ClicksByDate = { date: string; clicks: number };
type ClicksBySource = { name: string; value: number };


// --- Component ---
export default function CampaignDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParamsHook = useSearchParams();

  const campaignId = params?.campaignId as string;
  const currentTab = searchParamsHook.get('tab') || 'links';
  const currentPage = parseInt(searchParamsHook.get('page') || '1', 10);

  // --- State ---
  const [campaign, setCampaign] = useState<CampaignWithLinks | null>(null);
  const [links, setLinks] = useState<LinkWithCount[]>([]);
  const [clicks, setClicks] = useState<ClickDetails[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalClicks: 0, limit: 15 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // ... (other state variables remain the same) ...
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [editCampaignName, setEditCampaignName] = useState('');
  const [editCampaignDescription, setEditCampaignDescription] = useState('');
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isDeletingCampaign, setIsDeletingCampaign] = useState(false);
  const [editingLink, setEditingLink] = useState<EditableLink | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isDeletingLink, setIsDeletingLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState('');

  // --- Effects ---
  useEffect(() => {
    // ... (fetchCampaignData logic remains the same) ...
     if (!campaignId) {
        setError('Campaign ID not found in URL.');
        setIsLoading(false);
        return;
    };
    const fetchCampaignData = async () => {
      setIsLoading(true);
      setError('');
      const apiParams = new URLSearchParams({ page: currentPage.toString(), limit: pagination.limit.toString() });
      try {
        const response = await fetch(`/api/campaigns/${campaignId}?${apiParams.toString()}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('Campaign not found');
          throw new Error('Failed to fetch campaign data');
        }
        const data: CampaignPageData = await response.json();
        setCampaign(data.campaign);
        setClicks(data.clicks.data);
        setPagination(data.clicks.pagination);
        if (!campaign) {
             setEditCampaignName(data.campaign.name);
             setEditCampaignDescription(data.campaign.description || '');
        }
        // Set links from the campaign data directly
        if (data.campaign && data.campaign.links) {
             setLinks(data.campaign.links);
        }
      } catch (err: unknown) {
        handleError(err, setError);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaignData();
  }, [campaignId, currentPage, pagination.limit]); // Removed currentTab dependency

  // --- Data Processing for Charts (using useMemo) ---
  const clicksByDate = useMemo(() => {
    if (!clicks || clicks.length === 0) return [];
    const counts: Record<string, number> = {};
    clicks.forEach(click => {
        const date = new Date(click.createdAt).toLocaleDateString(); // Group by day
        counts[date] = (counts[date] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([date, count]) => ({ date, clicks: count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
  }, [clicks]);

  const clicksBySource = useMemo(() => {
    if (!clicks || clicks.length === 0) return [];
    const counts: Record<string, number> = {};
    clicks.forEach(click => {
        const source = click.utmSource || 'Direct/Unknown';
        counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts)
        .map(([name, count]) => ({ name, value: count }))
        .sort((a, b) => b.value - a.value); // Sort descending by count
  }, [clicks]);

  // --- Helper Functions ---
  const handleError = (err: unknown, errorSetter: (msg: string) => void) => { /* ... */
      console.error('Operation error:', err);
      if (err instanceof Error) { errorSetter(err.message); }
      else { errorSetter('An unexpected error occurred.'); }
  };
  const formatDate = (dateString: Date | string) => new Date(dateString).toLocaleString();

  // --- Campaign Handlers ---
  const handleSaveCampaign = async (event: FormEvent<HTMLFormElement>) => { /* ... */
     event.preventDefault(); setIsSavingCampaign(true); setError('');
     if (!editCampaignName.trim()) { setError('Campaign name cannot be empty.'); setIsSavingCampaign(false); return; }
     try {
         const response = await fetch(`/api/campaigns/${campaignId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editCampaignName.trim(), description: editCampaignDescription.trim() || null }), });
         const updatedCampaignData = await response.json();
         if (!response.ok) throw new Error(updatedCampaignData.error || 'Failed to update campaign');
         setCampaign(prev => prev ? { ...prev, ...updatedCampaignData } : null);
         setIsEditingCampaign(false);
     } catch (err: unknown) { handleError(err, setError); }
     finally { setIsSavingCampaign(false); }
  };
  const handleDeleteCampaign = async () => { /* ... */
      if (!window.confirm(`DELETE campaign "${campaign?.name}"? This will also delete ALL associated links and their click data. This cannot be undone.`)) return;
      setIsDeletingCampaign(true); setError('');
      try {
          const response = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
          if (!response.ok && response.status !== 204) { const data = await response.json(); throw new Error(data.error || 'Failed to delete campaign'); }
          router.push('/campaigns?deleted=true');
      } catch (err: unknown) { handleError(err, setError); setIsDeletingCampaign(false); }
  };

  // --- Link Handlers ---
  const handleEditLinkClick = (link: LinkWithCount) => { /* ... */
      setLinkError('');
      setEditingLink({ id: link.id, originalUrl: link.originalUrl, campaignId: campaignId, androidAppUri: link.androidAppUri || '', androidFallbackUrl: link.androidFallbackUrl || '', iosAppUri: link.iosAppUri || '', iosFallbackUrl: link.iosFallbackUrl || '', });
  };
  const handleLinkInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { /* ... */
      if (!editingLink) return; const { name, value } = e.target; setEditingLink(prev => prev ? { ...prev, [name]: value } : null);
  };
  const handleSaveLink = async (event: FormEvent<HTMLFormElement>) => { /* ... */
      event.preventDefault(); if (!editingLink) return; setIsSavingLink(true); setLinkError('');
      const linkId = editingLink.id;
      const payload = { originalUrl: editingLink.originalUrl, androidAppUri: editingLink.androidAppUri || null, androidFallbackUrl: editingLink.androidFallbackUrl || null, iosAppUri: editingLink.iosAppUri || null, iosFallbackUrl: editingLink.iosFallbackUrl || null, };
      try {
          const response = await fetch(`/api/links/${linkId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), });
          const updatedLinkData = await response.json();
          if (!response.ok) throw new Error(updatedLinkData.error || 'Failed to update link');
          setCampaign(prev => { // Update link within campaign state
              if (!prev) return null;
              const updatedLinks = prev.links.map(l => l.id === linkId ? { ...l, ...updatedLinkData } : l );
              return { ...prev, links: updatedLinks };
          });
          setEditingLink(null);
      } catch (err: unknown) { handleError(err, setLinkError); }
      finally { setIsSavingLink(false); }
  };
 const handleDeleteLink = async (linkId: string, shortCode: string) => { /* ... */
      if (!window.confirm(`DELETE link "/${shortCode}"? This cannot be undone.`)) return;
      setIsDeletingLink(linkId); setLinkError('');
      try {
          const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
          if (!response.ok && response.status !== 204) { const data = await response.json(); throw new Error(data.error || 'Failed to delete link'); }
          setCampaign(prev => { // Remove link from campaign state
              if (!prev) return null;
              const updatedLinks = prev.links.filter(l => l.id !== linkId);
              return { ...prev, links: updatedLinks };
          });
          // Refetch analytics data
          const apiParams = new URLSearchParams({ page: '1', limit: pagination.limit.toString() });
          const analyticsResponse = await fetch(`/api/campaigns/${campaignId}?${apiParams.toString()}`);
          const analyticsData: CampaignPageData = await analyticsResponse.json();
          setClicks(analyticsData.clicks.data);
          setPagination(analyticsData.clicks.pagination);
      } catch (err: unknown) { handleError(err, setLinkError); }
      finally { setIsDeletingLink(null); }
  };

  // --- Pagination & Tab Handlers ---
   const handlePageChange = (newPage: number) => { /* ... */
        const params = new URLSearchParams(searchParamsHook); params.set('page', newPage.toString()); params.set('tab', 'analytics'); router.push(`${pathname}?${params.toString()}`);
    };
   const handleTabChange = (tab: 'links' | 'analytics') => { /* ... */
        const params = new URLSearchParams(searchParamsHook); params.set('tab', tab); params.set('page', '1'); router.push(`${pathname}?${params.toString()}`);
   };

  // --- Render Logic ---
  if (isLoading && !campaign) return <p className="text-center p-10">Loading campaign details...</p>;
  if (error && !campaign) return <p className="text-center text-red-600 p-10">{error}</p>;
  if (!campaign) return <p className="text-center p-10">Campaign data is unavailable.</p>;

  const linksToDisplay = campaign.links || []; // Use links from campaign state

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-12 md:p-24 bg-gray-50">
      <div className="w-full max-w-6xl">
        <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">&larr; Back to Campaigns</Link>

        {/* Campaign Info/Edit Section */}
         {isEditingCampaign ? ( /* ... Campaign Edit Form ... */
             <form onSubmit={handleSaveCampaign} className="bg-white p-6 rounded-lg shadow mb-8 space-y-4"><h1 className="text-2xl font-bold text-gray-800 mb-4">Edit Campaign</h1><div><label htmlFor="editCampaignName" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-600">*</span></label><input id="editCampaignName" type="text" value={editCampaignName} onChange={(e) => setEditCampaignName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" disabled={isSavingCampaign} /></div><div><label htmlFor="editCampaignDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea id="editCampaignDescription" value={editCampaignDescription} onChange={(e) => setEditCampaignDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" disabled={isSavingCampaign} /></div>{error && <p className="text-red-600 text-sm">{error}</p>}<div className="flex justify-end space-x-3"><button type="button" onClick={() => setIsEditingCampaign(false)} disabled={isSavingCampaign} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={isSavingCampaign} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{isSavingCampaign ? 'Saving...' : 'Save Changes'}</button></div></form>
         ) : ( /* ... Campaign Display Info ... */
          <div className="bg-white p-6 rounded-lg shadow mb-8"><div className="flex justify-between items-start"><div><h1 className="text-3xl font-bold text-gray-800">{campaign.name}</h1><p className="mt-1 text-md text-gray-600">{campaign.description || <span className="italic">No description</span>}</p><p className="mt-2 text-sm text-gray-500">Created: {new Date(campaign.createdAt).toLocaleString()}</p><p className="mt-1 text-sm text-gray-500">Total Clicks: <span className="font-semibold">{pagination.totalClicks}</span></p></div><div className="flex space-x-2 flex-shrink-0 mt-1"><button onClick={() => setIsEditingCampaign(true)} className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Edit</button><button onClick={handleDeleteCampaign} disabled={isDeletingCampaign} className="px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{isDeletingCampaign ? 'Deleting...' : 'Delete'}</button></div></div>{error && <p className="mt-4 text-red-600 text-sm">{error}</p>}</div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
            {/* ... Tab Navigation Buttons ... */}
             <nav className="-mb-px flex space-x-8" aria-label="Tabs"><button onClick={() => handleTabChange('links')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'links' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Links ({linksToDisplay.length})</button><button onClick={() => handleTabChange('analytics')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${currentTab === 'analytics' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Analytics ({pagination.totalClicks})</button></nav>
        </div>

        {/* Tab Content */}
        {currentTab === 'links' && ( /* ... Links List ... */
            <div className="bg-white shadow overflow-hidden sm:rounded-lg"><h2 className="sr-only">Associated Links</h2>{linkError && <p className="px-4 py-2 text-red-600 text-sm bg-red-50 border-b border-gray-200">{linkError}</p>}<ul role="list" className="divide-y divide-gray-200">{isLoading && linksToDisplay.length === 0 ? (<li className="px-6 py-4 text-center text-gray-500">Loading links...</li>) : linksToDisplay.length === 0 ? (<li className="px-6 py-4 text-center text-gray-500">No links associated with this campaign yet.</li>) : (linksToDisplay.map((link) => (<li key={link.id} className="px-4 py-4 sm:px-6"><div className="flex items-start justify-between flex-wrap gap-y-2 gap-x-4"><div className="flex-1 min-w-[200px]"><a href={`/${link.shortCode}`} target="_blank" rel="noopener noreferrer" className="text-md font-medium text-indigo-600 hover:underline truncate block">{`${typeof window !== 'undefined' ? window.location.origin : ''}/${link.shortCode}`}</a><p className="text-sm text-gray-500 truncate" title={link.originalUrl}>Original: {link.originalUrl}</p><p className="mt-1 text-xs text-gray-400">Created: {new Date(link.createdAt).toLocaleDateString()}</p><p className="text-xs text-gray-400">Clicks: {link._count.clicks}</p></div><div className="flex space-x-2 flex-shrink-0 self-center"><button onClick={() => handleEditLinkClick(link)} className="px-2 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50" disabled={isDeletingLink === link.id}>Edit</button><button onClick={() => handleDeleteLink(link.id, link.shortCode)} disabled={isDeletingLink === link.id} className="px-2 py-1 border border-transparent rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">{isDeletingLink === link.id ? '...' : 'Delete'}</button></div></div></li>)))}</ul></div>
        )}

        {currentTab === 'analytics' && (
             <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Total Clicks</h3>
                        <p className="mt-1 text-3xl font-semibold text-gray-900">{pagination.totalClicks}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Top Source</h3>
                        <p className="mt-1 text-xl font-semibold text-gray-900 truncate" title={clicksBySource[0]?.name || 'N/A'}>
                            {clicksBySource[0]?.name || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">({clicksBySource[0]?.value || 0} clicks)</p>
                    </div>
                     <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-sm font-medium text-gray-500">Links in Campaign</h3>
                        <p className="mt-1 text-3xl font-semibold text-gray-900">{linksToDisplay.length}</p>
                    </div>
                </div>

                {/* Charts */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Clicks Over Time */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-medium text-gray-700 mb-3">Clicks Over Time</h3>
                        {clicksByDate.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={clicksByDate} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="clicks" stroke="#4f46e5" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-gray-500 py-10">Not enough data for time chart.</p>
                        )}
                    </div>

                    {/* Clicks by Source */}
                    <div className="bg-white p-4 rounded-lg shadow">
                         <h3 className="text-lg font-medium text-gray-700 mb-3">Clicks by Source</h3>
                         {clicksBySource.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={clicksBySource.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}> {/* Show top 10 */}
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                                    <YAxis dataKey="name" type="category" width={80} fontSize={10} interval={0} />
                                    <Tooltip />
                                    {/* <Legend /> */}
                                    <Bar dataKey="value" fill="#6366f1" name="Clicks" />
                                </BarChart>
                            </ResponsiveContainer>
                         ) : (
                             <p className="text-center text-gray-500 py-10">No UTM source data available.</p>
                         )}
                    </div>
                 </div>


                {/* Click Data Table */}
                <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
                    <h3 className="text-lg font-medium text-gray-700 px-4 py-4 sm:px-6 border-b border-gray-200">Click Log</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link (Short)</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTM Source</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading clicks...</td></tr>
                            ) : clicks.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No click data found for this campaign.</td></tr>
                            ) : (
                                clicks.map((click) => (
                                    <tr key={click.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(click.createdAt)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{click.link?.shortCode ? `/${click.link.shortCode}` : 'N/A'}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{click.utmSource || <span className="italic text-gray-400">None</span>}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{click.country || <span className="italic text-gray-400">N/A</span>}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={click.referrer || ''}>{click.referrer || <span className="italic text-gray-400">None</span>}</td>
                                        <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate" title={click.userAgent || ''}>{click.userAgent || <span className="italic text-gray-400">N/A</span>}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                {!isLoading && pagination.totalPages > 1 && (
                    <div className="mt-6 flex justify-between items-center">
                        <span className="text-sm text-gray-700">Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalClicks} total clicks)</span>
                        <div className="space-x-2">
                            <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage <= 1} className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                            <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages} className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        </div>
                    </div>
                )}
            </>
        )}

      </div>

      {/* Edit Link Modal */}
      {editingLink && ( /* ... Edit Link Modal Form ... */
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50"><form onSubmit={handleSaveLink} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"><h2 className="text-xl font-bold text-gray-800">Edit Link Details</h2>{linkError && <p className="text-red-600 text-sm">{linkError}</p>}<div><label htmlFor="editLinkOriginalUrl" className="block text-sm font-medium text-gray-700 mb-1">Original URL <span className="text-red-600">*</span></label><input id="editLinkOriginalUrl" name="originalUrl" type="url" value={editingLink.originalUrl} onChange={handleLinkInputChange} required className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isSavingLink} /></div><fieldset className="border border-gray-200 p-3 rounded-md"><legend className="text-sm font-medium text-gray-700 px-1">Android Targeting</legend><div className="space-y-3 mt-1"><div><label htmlFor="editLinkAndroidAppUri" className="block text-xs font-medium text-gray-600 mb-1">App URI</label><input id="editLinkAndroidAppUri" name="androidAppUri" type="text" value={editingLink.androidAppUri || ''} onChange={handleLinkInputChange} placeholder="myapp://path" className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isSavingLink} /></div><div><label htmlFor="editLinkAndroidFallbackUrl" className="block text-xs font-medium text-gray-600 mb-1">Fallback URL</label><input id="editLinkAndroidFallbackUrl" name="androidFallbackUrl" type="url" value={editingLink.androidFallbackUrl || ''} onChange={handleLinkInputChange} placeholder="https://play.google.com/..." className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isSavingLink} /></div></div></fieldset><fieldset className="border border-gray-200 p-3 rounded-md"><legend className="text-sm font-medium text-gray-700 px-1">iOS Targeting</legend><div className="space-y-3 mt-1"><div><label htmlFor="editLinkIosAppUri" className="block text-xs font-medium text-gray-600 mb-1">App URI</label><input id="editLinkIosAppUri" name="iosAppUri" type="text" value={editingLink.iosAppUri || ''} onChange={handleLinkInputChange} placeholder="myapp://path" className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isSavingLink} /></div><div><label htmlFor="editLinkIosFallbackUrl" className="block text-xs font-medium text-gray-600 mb-1">Fallback URL</label><input id="editLinkIosFallbackUrl" name="iosFallbackUrl" type="url" value={editingLink.iosFallbackUrl || ''} onChange={handleLinkInputChange} placeholder="https://apps.apple.com/..." className="w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm sm:text-sm text-gray-900" disabled={isSavingLink} /></div></div></fieldset><div className="flex justify-end space-x-3 pt-3"><button type="button" onClick={() => setEditingLink(null)} disabled={isSavingLink} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={isSavingLink} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{isSavingLink ? 'Saving...' : 'Save Link Changes'}</button></div></form></div>
      )}
    </main>
  );
}
