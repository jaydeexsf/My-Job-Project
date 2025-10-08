// Quran Search API using furqan-api.vercel.app
const QURAN_API_BASE = 'https://furqan-api.vercel.app';

export interface QuranSearchResult {
  surah_number: number;
  surah_name: string;
  surah_name_arabic: string;
  verse_number: number;
  verse_id: number;
  arabic_text: string;
  translation: string;
  transliteration: string;
  relevance_score?: number;
  juz?: number;
  sajdah?: string | null;
}

export interface QuranSearchResponse {
  total_matches: number;
  query: string;
  search_field: string;
  exact_match: boolean;
  results: QuranSearchResult[];
}

export interface SurahInfo {
  surah_number: number;
  surah_name: string;
  surah_name_arabic: string;
  total_verses: number;
  revelation_type: string;
  juz: number;
}

// Search in all fields (translation, Arabic, and transliteration)
export async function searchQuranAll(query: string): Promise<QuranSearchResponse> {
  console.log('🔍 Searching Quran in all fields:', query);
  
  try {
    const response = await fetch(`${QURAN_API_BASE}/api/search/all?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Quran search results:', data);
    console.log('📝 Found', data.total_matches, 'matches');
    console.log('🎯 Top result:', data.results[0]);
    
    return data;
  } catch (error) {
    console.error('❌ Quran search error:', error);
    throw error;
  }
}

// Search in Arabic text only
export async function searchQuranArabic(query: string): Promise<QuranSearchResponse> {
  console.log('🔍 Searching Quran in Arabic:', query);
  
  try {
    const response = await fetch(`${QURAN_API_BASE}/api/search/arabic?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Arabic search failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Arabic search results:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Arabic search error:', error);
    throw error;
  }
}

// Search in English translation only
export async function searchQuranTranslation(query: string): Promise<QuranSearchResponse> {
  console.log('🔍 Searching Quran in translation:', query);
  
  try {
    const response = await fetch(`${QURAN_API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Translation search failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Translation search results:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Translation search error:', error);
    throw error;
  }
}

// Get specific verse
export async function getVerse(surah: number, verse: number): Promise<QuranSearchResult> {
  console.log(`📖 Getting verse ${surah}:${verse}`);
  
  try {
    const response = await fetch(`${QURAN_API_BASE}/api/${surah}/${verse}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get verse: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Verse details:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Get verse error:', error);
    throw error;
  }
}

// Get full surah
export async function getSurah(surah: number): Promise<QuranSearchResult[]> {
  console.log(`📖 Getting surah ${surah}`);
  
  try {
    const response = await fetch(`${QURAN_API_BASE}/api/${surah}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get surah: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Surah details:', data);
    console.log('📝 Total verses:', data.length);
    
    return data;
  } catch (error) {
    console.error('❌ Get surah error:', error);
    throw error;
  }
}

// Get Quran statistics
export async function getQuranStats(): Promise<any> {
  console.log('📊 Getting Quran statistics');
  
  try {
    const response = await fetch(`${QURAN_API_BASE}/api/`);
    
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Quran statistics:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Get stats error:', error);
    throw error;
  }
}

// Smart search - tries multiple search methods
export async function smartQuranSearch(query: string): Promise<QuranSearchResponse> {
  console.log('🧠 Smart Quran search for:', query);
  
  try {
    // First try: Search in all fields
    console.log('🔄 Trying search in all fields...');
    let results = await searchQuranAll(query);
    
    if (results.total_matches > 0) {
      console.log('✅ Found results in all fields search');
      return results;
    }
    
    // Second try: Search in Arabic only
    console.log('🔄 Trying Arabic-only search...');
    results = await searchQuranArabic(query);
    
    if (results.total_matches > 0) {
      console.log('✅ Found results in Arabic search');
      return results;
    }
    
    // Third try: Search in translation only
    console.log('🔄 Trying translation-only search...');
    results = await searchQuranTranslation(query);
    
    if (results.total_matches > 0) {
      console.log('✅ Found results in translation search');
      return results;
    }
    
    console.log('❌ No results found in any search method');
    return {
      total_matches: 0,
      query,
      search_field: 'all',
      exact_match: false,
      results: []
    };
    
  } catch (error) {
    console.error('❌ Smart search error:', error);
    throw error;
  }
}
