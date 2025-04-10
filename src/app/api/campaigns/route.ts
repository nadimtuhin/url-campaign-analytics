import { NextRequest, NextResponse } from 'next/server';
    import prisma from '@/lib/prisma';

    // GET /api/campaigns - List all campaigns
    // Removed unused parameter: request
    export async function GET() {
      try {
        const campaigns = await prisma.campaign.findMany({
          orderBy: { createdAt: 'desc' }, // Optional: order by creation date
          // You might want to add pagination here for large numbers of campaigns
        });
        return NextResponse.json(campaigns);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }

    // POST /api/campaigns - Create a new campaign
    export async function POST(request: NextRequest) {
      try {
        const body = await request.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
          return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
        }

        // Optional: Validate description if provided
        if (description && typeof description !== 'string') {
          return NextResponse.json({ error: 'Invalid description format' }, { status: 400 });
        }

        const newCampaign = await prisma.campaign.create({
          data: {
            name: name.trim(),
            description: description?.trim() || null,
          },
        });

        return NextResponse.json(newCampaign, { status: 201 });

      } catch (error) {
        console.error('Error creating campaign:', error);
        // Handle potential unique constraint errors if needed
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }
