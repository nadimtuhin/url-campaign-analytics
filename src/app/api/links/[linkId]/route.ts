import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Define context type for handlers
interface HandlerContext {
    params: { linkId: string };
}

// Basic URL validation (can be improved)
function isValidUrl(url: string): boolean {
  // Allow empty strings or null/undefined as valid (for optional fields)
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// PUT /api/links/[linkId] - Update link details
export async function PUT(request: NextRequest, context: HandlerContext) {
  const { params } = context;
  const linkId = params.linkId;

  if (!linkId) {
    return NextResponse.json({ error: 'Link ID missing' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
        originalUrl,
        campaignId, // Allow changing campaign association
        androidAppUri,
        androidFallbackUrl,
        iosAppUri,
        iosFallbackUrl
    } = body;

    // --- Input Validation ---
    if (originalUrl !== undefined && (typeof originalUrl !== 'string' || !isValidUrl(originalUrl))) {
      return NextResponse.json({ error: 'Invalid Original URL format' }, { status: 400 });
    }
    if (campaignId !== undefined && campaignId !== null && typeof campaignId !== 'string') {
       return NextResponse.json({ error: 'Invalid Campaign ID format' }, { status: 400 });
    }
    // Validate optional URLs if provided
    if (androidAppUri !== undefined && typeof androidAppUri !== 'string') { // Allow empty string
        return NextResponse.json({ error: 'Invalid Android App URI format' }, { status: 400 });
    }
    if (androidFallbackUrl !== undefined && !isValidUrl(androidFallbackUrl)) {
        return NextResponse.json({ error: 'Invalid Android Fallback URL format' }, { status: 400 });
    }
     if (iosAppUri !== undefined && typeof iosAppUri !== 'string') { // Allow empty string
        return NextResponse.json({ error: 'Invalid iOS App URI format' }, { status: 400 });
    }
    if (iosFallbackUrl !== undefined && !isValidUrl(iosFallbackUrl)) {
        return NextResponse.json({ error: 'Invalid iOS Fallback URL format' }, { status: 400 });
    }
    // --- End Validation ---


    // Check if the target campaign exists if campaignId is being changed
    if (campaignId) {
        const campaignExists = await prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaignExists) {
            return NextResponse.json({ error: 'Target campaign not found' }, { status: 404 });
        }
    }

    // Prepare data for update (only include fields that are present in the body)
    const dataToUpdate: Record<string, any> = {};
    if (originalUrl !== undefined) dataToUpdate.originalUrl = originalUrl;
    // Allow setting campaignId to null to disassociate
    if (campaignId !== undefined) dataToUpdate.campaignId = campaignId;
    if (androidAppUri !== undefined) dataToUpdate.androidAppUri = androidAppUri || null;
    if (androidFallbackUrl !== undefined) dataToUpdate.androidFallbackUrl = androidFallbackUrl || null;
    if (iosAppUri !== undefined) dataToUpdate.iosAppUri = iosAppUri || null;
    if (iosFallbackUrl !== undefined) dataToUpdate.iosFallbackUrl = iosFallbackUrl || null;


    if (Object.keys(dataToUpdate).length === 0) {
         return NextResponse.json({ error: 'No update data provided' }, { status: 400 });
    }

    const updatedLink = await prisma.link.update({
      where: { id: linkId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedLink);

  } catch (error: unknown) {
     console.error(`Error updating link ${linkId}:`, error);
     if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'Link not found' }, { status: 404 });
     }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/links/[linkId] - Delete a link
export async function DELETE(request: NextRequest, context: HandlerContext) {
  const { params } = context;
  const linkId = params.linkId;

  if (!linkId) {
    return NextResponse.json({ error: 'Link ID missing' }, { status: 400 });
  }

  try {
    // Need to delete associated clicks first due to relation constraint
    await prisma.click.deleteMany({
        where: { linkId: linkId },
    });

    // Now delete the link
    await prisma.link.delete({
      where: { id: linkId },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error: unknown) {
    console.error(`Error deleting link ${linkId}:`, error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
       return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
