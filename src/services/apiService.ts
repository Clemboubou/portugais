import axios from 'axios';

// API endpoints
const TATOEBA_API = 'https://tatoeba.org/api_v0';
const FREE_DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries';
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const FORVO_API = 'https://apifree.forvo.com'; // Note: requires API Key

// Interfaces for API responses
interface TatoebaResult {
  id: number;
  text: string;
  translations: {
    id: number;
    text: string;
    language: string;
  }[];
}

interface TranslationResult {
  sourceText: string;
  translatedText: string;
  examples?: {
    source: string;
    target: string;
  }[];
}

/**
 * Search for sentences in Portuguese with French translations from Tatoeba
 */
export async function searchTatoebaSentences(query: string, from: string = 'por', to: string = 'fra', limit: number = 10): Promise<TranslationResult[]> {
  try {
    const response = await axios.get(`${TATOEBA_API}/search`, {
      params: {
        query,
        from,
        to,
        limit
      }
    });
    
    return response.data.results.map((result: TatoebaResult) => {
      return {
        sourceText: result.text,
        translatedText: result.translations.find(t => t.language === to)?.text || '',
      };
    });
  } catch (error) {
    console.error('Error fetching from Tatoeba API:', error);
    return [];
  }
}

/**
 * Get translation using MyMemory API (free translation API)
 */
export async function translateText(text: string, from: string = 'pt', to: string = 'fr'): Promise<string> {
  try {
    const response = await axios.get(MYMEMORY_API, {
      params: {
        q: text,
        langpair: `${from}|${to}`
      }
    });
    
    if (response.data.responseStatus === 200) {
      return response.data.responseData.translatedText;
    }
    
    return '';
  } catch (error) {
    console.error('Error translating text:', error);
    return '';
  }
}

/**
 * Get word definition from Free Dictionary API
 * Note: This API supports limited languages including Portuguese
 */
export async function getWordDefinition(word: string, language: string = 'pt') {
  try {
    const response = await axios.get(`${FREE_DICTIONARY_API}/${language}/${encodeURIComponent(word)}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching word definition:', error);
    return null;
  }
}

/**
 * Search for multiple translations of a term
 */
export async function searchMultipleTranslations(text: string, from: string = 'pt', to: string = 'fr', limit: number = 5): Promise<string[]> {
  try {
    // Use batch translation or multiple sources
    const translation = await translateText(text, from, to);
    const tatoebaResults = await searchTatoebaSentences(text, from.substring(0, 3), to.substring(0, 3), limit);
    
    const results = new Set<string>();
    
    if (translation) {
      results.add(translation);
    }
    
    tatoebaResults.forEach(result => {
      if (result.translatedText) {
        results.add(result.translatedText);
      }
    });
    
    return Array.from(results);
  } catch (error) {
    console.error('Error fetching multiple translations:', error);
    return [];
  }
}

/**
 * Get audio pronunciation URL
 * Note: For a real implementation, you would need a Forvo API key
 * Alternatively, use browser's SpeechSynthesis API
 */
export function getAudioPronunciation(word: string, language: string = 'pt') {
  // Using browser's SpeechSynthesis as a fallback (no API key required)
  return new Promise<string>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = language === 'pt' ? 'pt-PT' : 'fr-FR'; // Portuguese or French
    
    // Return a blob URL that can be played or null
    // For a real implementation with Forvo API, you would return the actual audio URL
    resolve('');
  });
}

/**
 * Generate audio using browser's speech synthesis
 * Returns a function that will speak the text when called
 */
export function generateSpeech(text: string, language: string = 'pt-PT') {
  return () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  };
}

/**
 * Get example sentences with translations
 */
export async function getExampleSentences(word: string, from: string = 'por', to: string = 'fra', limit: number = 5): Promise<TranslationResult[]> {
  return searchTatoebaSentences(word, from, to, limit);
}
