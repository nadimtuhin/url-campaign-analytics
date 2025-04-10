import { NextRequest, NextResponse } from 'next/server';
    import prisma from '@/lib/prisma';
    import { nanoid } from 'nanoid';

    // Basic URL validation (can be improved)
    function isValidUrl(url: string): boolean {
      try {
        new URL(url);
        return true;
      } catch { // Remove the unused variable name
        return false;
      }
    }

    export async function POST(request: NextRequest) {
      try {
        const body = await request.json();
        // Destructure new fields from the body
        const {
            url: originalUrl,
            campaignId,
            androidAppUri,
            androidFallbackUrl,
            iosAppUri,
            iosFallbackUrl
        } = body;

        if (!originalUrl || typeof originalUrl !== 'string' || !isValidUrl(originalUrl)) {
          return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 });
        }

        // Optional: Validate campaignId if provided
        if (campaignId && typeof campaignId !== 'string') {
           return NextResponse.json({ error: 'Invalid campaign ID format' }, { status: 400 });
        }
        if (campaignId) {
            const campaignExists = await prisma.campaign.findUnique({ where: { id: campaignId } });
            if (!campaignExists) {
                return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
            }
        }

        // Generate a unique short code (e.g., 6 characters long)
        // Ensure uniqueness (though collisions are rare with nanoid)
        let shortCode: string;
        let attempts = 0;
        const maxAttempts = 5; // Prevent infinite loops in extreme collision cases

        do {
          shortCode = nanoid(6); // Generate a 6-character code
          const existing = await prisma.link.findUnique({ where: { shortCode } });
          if (!existing) break; // Found a unique code
          attempts++;
        } while (attempts < maxAttempts);

        if (attempts === maxAttempts) {
           console.error("Failed to generate a unique short code after multiple attempts.");
           return NextResponse.json({ error: 'Failed to generate unique short code' }, { status: 500 });
        }


        // Save the link to the database
        const newLink = await prisma.link.create({
          data: {
            originalUrl,
            shortCode,
            campaignId: campaignId || null,
            // Add new fields to the create call (use null if empty/undefined)
            androidAppUri: androidAppUri || null,
            androidFallbackUrl: androidFallbackUrl || null,
            iosAppUri: iosAppUri || null,
            iosFallbackUrl: iosFallbackUrl || null,
          },
        });

        // Construct the short URL
        // Use NEXT_PUBLIC_BASE_URL for production, fallback to request headers for dev/local
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
        const shortUrl = `${baseUrl}/${newLink.shortCode}`;

        return NextResponse.json({ shortUrl }, { status: 201 });

      } catch (error) {
        console.error('Error creating short link:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }
