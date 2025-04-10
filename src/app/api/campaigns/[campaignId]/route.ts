import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Define context type for handlers
interface HandlerContext {
    params: { campaignId: string };
}

// GET /api/campaigns/[campaignId] - Get campaign details (incl links w/ counts) AND paginated clicks
export async function GET(request: NextRequest, context: HandlerContext) {
  const { params } = context;
  const campaignId = params.campaignId;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10); // Page for click pagination
  const limit = parseInt(searchParams.get('limit') || '15', 10); // Limit for click pagination
  const skip = (page - 1) * limit;

  if (!campaignId) return NextResponse.json({ error: 'Campaign ID missing' }, { status: 400 });

  try {
    // 1. Fetch Campaign Details *including* associated links and their click counts
    const campaignWithLinks = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        links: { // Include associated links
          select: { // Select fields needed for the "Links" tab
            id: true,
            shortCode: true,
            originalUrl: true,
            createdAt: true,
            androidAppUri: true, // Needed for edit modal
            androidFallbackUrl: true,
            iosAppUri: true,
            iosFallbackUrl: true,
            _count: { // Get total click count per link
              select: { clicks: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaignWithLinks) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // 2. Fetch Paginated Clicks for the Analytics Tab
    const clickWhereClause: Prisma.ClickWhereInput = {
        link: { campaignId: campaignId }
    };

    const clicks = await prisma.click.findMany({
        where: clickWhereClause,
        select: { // Select fields needed for the "Analytics" tab
            id: true,
            createdAt: true,
            userAgent: true,
            referrer: true,
            ipAddress: true,
            utmSource: true,
            country: true,
            link: { select: { shortCode: true } } // Link shortCode for context
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: limit,
    });

    // 3. Get Total Click Count for Pagination
    const totalClicks = await prisma.click.count({
        where: clickWhereClause,
    });

    const totalPages = Math.ceil(totalClicks / limit);

    // 4. Combine Campaign Info, Links List, and Paginated Click Data
    const responseData = {
        campaign: campaignWithLinks, // Includes the links list now
        clicks: {
            data: clicks,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalClicks: totalClicks,
                limit: limit,
            },
        }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error(`Error fetching campaign details/analytics for ${campaignId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[campaignId] - Update campaign details
export async function PUT(request: NextRequest, context: HandlerContext) {
  const { params } = context;
  const campaignId = params.campaignId;
  if (!campaignId) return NextResponse.json({ error: 'Campaign ID missing' }, { status: 400 });
  try {
    const body = await request.json();
    const { name, description } = body;

    // Validation... (keep as before)
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
        return NextResponse.json({ error: 'Campaign name cannot be empty' }, { status: 400 });
    }
    if (description !== undefined && typeof description !== 'string') {
        return NextResponse.json({ error: 'Invalid description format' }, { status: 400 });
    }

    const dataToUpdate: { name?: string; description?: string | null } = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (description !== undefined) dataToUpdate.description = description === null ? null : description.trim();

    if (Object.keys(dataToUpdate).length === 0) {
         return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    // Update only campaign fields, return only campaign fields
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: dataToUpdate,
      select: { id: true, name: true, description: true, createdAt: true } // Return limited fields
    });

    return NextResponse.json(updatedCampaign);
  } catch (error: unknown) {
     console.error(`Error updating campaign ${campaignId}:`, error);
     if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
     }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[campaignId] - Delete campaign and associated data
export async function DELETE(request: NextRequest, context: HandlerContext) {
  const { params } = context;
  const campaignId = params.campaignId;
  if (!campaignId) return NextResponse.json({ error: 'Campaign ID missing' }, { status: 400 });
  try {
    // Transaction to delete clicks, links, then campaign
    const linksToDelete = await prisma.link.findMany({
        where: { campaignId: campaignId },
        select: { id: true }
    });
    const linkIds = linksToDelete.map(link => link.id);

    await prisma.$transaction([
        prisma.click.deleteMany({ where: { linkId: { in: linkIds } } }),
        prisma.link.deleteMany({ where: { id: { in: linkIds } } }),
        prisma.campaign.delete({ where: { id: campaignId } })
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error(`Error deleting campaign ${campaignId}:`, error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
       return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
