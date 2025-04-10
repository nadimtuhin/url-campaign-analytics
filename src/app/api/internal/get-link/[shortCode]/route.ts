    import { NextResponse } from 'next/server';
    import prisma from '@/lib/prisma';

    export const runtime = 'nodejs'; // Force Node.js runtime

    // Removed unused interface RouteParams

    // Define context type
    interface HandlerContext {
        params: { shortCode: string };
    }

    // This route is intended for internal use by the middleware
    export async function GET(request: Request, context: HandlerContext) {
      const { params } = context; // Destructure params from context
      const { shortCode } = params;

      // Optional: Add security check here if needed (e.g., check a secret header)
      // const internalSecret = request.headers.get('X-Internal-Secret');
      // if (internalSecret !== process.env.INTERNAL_API_SECRET) {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      if (!shortCode) {
        return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
      }

      try {
        const link = await prisma.link.findUnique({
          where: { shortCode },
          select: { originalUrl: true, id: true }, // Only select needed fields
        });

        if (!link) {
          return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }

        return NextResponse.json(link);
      } catch (error) {
        console.error(`Internal API Error fetching link ${shortCode}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }
