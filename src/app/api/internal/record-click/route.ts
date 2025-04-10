import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs'; // Force Node.js runtime

// This route is intended for internal use by the middleware to record clicks
    export async function POST(request: NextRequest) {
      try {
        const body = await request.json();
        const { linkId, userAgent, referrer, ipAddress } = body;

        // Optional: Add security check here if needed (e.g., check a secret header)

        if (!linkId) {
          return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
        }

        // Perform the create operation asynchronously
        await prisma.click.create({
          data: {
            linkId,
            userAgent: userAgent || 'N/A',
            referrer: referrer || 'N/A',
            ipAddress: ipAddress || 'N/A',
          },
        });

        // Return success response immediately, don't need to wait for DB write confirmation
        // if we want fire-and-forget behavior from the middleware.
        // If confirmation is needed, await the prisma.click.create call.
        return NextResponse.json({ success: true }, { status: 202 }); // 202 Accepted

      } catch (error) {
        console.error('Internal API Error recording click:', error);
        // Avoid sending detailed errors back if it's just for internal logging
        return NextResponse.json({ error: 'Failed to record click' }, { status: 500 });
      }
    }
