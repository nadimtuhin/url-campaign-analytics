import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { headers } from 'next/headers'; // Import headers

// Define props type including searchParams
interface ShortCodePageProps {
  params: { shortCode: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// This Server Component handles the redirection logic directly
export default async function ShortCodePage({ params, searchParams }: ShortCodePageProps) {
  const { shortCode } = params;
  // searchParams prop is now available directly

  // Read User-Agent from headers - Try awaiting headers()
  const headersList = await headers(); // Explicitly await (workaround for potential TS issue)
  const userAgent = headersList.get('user-agent') || '';
  const isAndroid = /android/i.test(userAgent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(global as any).MSStream; // Standard iOS check

  if (!shortCode || typeof shortCode !== 'string') {
    return redirect('/');
  }

  let link;
  try {
    // Find the link, including the new mobile fields
    link = await prisma.link.findUnique({
      where: { shortCode },
      // Select all relevant fields now
      select: {
          originalUrl: true,
          id: true,
          androidAppUri: true,
          androidFallbackUrl: true,
          iosAppUri: true,
          iosFallbackUrl: true,
      }
    });
  } catch (error) {
    console.error(`Error finding link for short code ${shortCode}:`, error);
    return redirect('/?error=lookup_failed');
  }

  if (!link) {
    // Render the "Not Found" content
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Link Not Found</h1>
          <p className="text-lg text-gray-600 mb-6">
            The short link <code className="bg-gray-200 p-1 rounded text-red-700 font-mono">/{shortCode}</code> does not exist or has expired.
          </p>
          <Link href="/" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              Go to Homepage
          </Link>
        </div>
      </main>
    );
  }

  // Record the click event (fire-and-forget)
  prisma.click.create({
    data: {
      linkId: link.id,
      userAgent: userAgent, // Use the detected userAgent
      referrer: headersList.get('referer') || 'N/A', // Try to get referrer
      ipAddress: headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'N/A', // Try to get IP
      // Get utm_source from the searchParams prop
      utmSource: typeof searchParams.utm_source === 'string' ? searchParams.utm_source : null,
      country: 'N/A', // Placeholder for country - requires GeoIP lookup
    },
  }).catch(err => {
      console.error(`Background click recording failed for ${shortCode}:`, err);
  });

  // Determine the redirect target based on OS and available fields
  let targetUrl = link.originalUrl; // Default target

  if (isAndroid) {
    // Prefer Android App URI if available
    if (link.androidAppUri) {
      targetUrl = link.androidAppUri;
      // Note: Redirecting to custom URI schemes might require client-side logic
      // or specific server configurations depending on the desired behavior
      // (e.g., attempting to open the app, falling back if it fails).
      // A simple server-side redirect might not always trigger the app directly.
      // For simplicity here, we redirect; more complex logic might be needed.
    } else if (link.androidFallbackUrl) {
      // Use Android fallback URL if App URI is not set but fallback is
      targetUrl = link.androidFallbackUrl;
    }
  } else if (isIOS) {
    // Prefer iOS App URI if available
    if (link.iosAppUri) {
      targetUrl = link.iosAppUri;
      // Similar note as Android regarding custom URI scheme redirects
    } else if (link.iosFallbackUrl) {
      // Use iOS fallback URL if App URI is not set but fallback is
      targetUrl = link.iosFallbackUrl;
    }
  }

  // Redirect to the determined target URL
  redirect(targetUrl);
}

// Metadata function
export async function generateMetadata() {
   return {
     title: `Redirecting...`,
   };
}
