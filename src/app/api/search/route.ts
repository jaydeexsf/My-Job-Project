import { NextRequest, NextResponse } from 'next/server';
import { searchQuran } from '@/lib/quranApi';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('Searching Quran for:', query);
    const results = await searchQuran(query, page, perPage);
    
    console.log('Search API Response:', results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json(
      { error: 'Failed to search Quran' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, page = 1, perPage = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log('Searching Quran for:', query);
    const results = await searchQuran(query, page, perPage);
    
    console.log('Search API Response:', results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json(
      { error: 'Failed to search Quran' },
      { status: 500 }
    );
  }
}
