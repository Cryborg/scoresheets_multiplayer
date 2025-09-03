/**
 * API Response Helpers - Centralize common patterns
 */

import { NextResponse } from 'next/server';

/**
 * Add no-cache headers to response
 */
export function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

/**
 * Create a success JSON response with no-cache headers
 */
export function createSuccessResponse(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  return addNoCacheHeaders(response);
}

/**
 * Create an error JSON response with fallback data and no-cache headers
 */
export function createErrorResponse(
  error: unknown,
  fallbackData: unknown = {},
  status: number = 500
): NextResponse {
  const response = NextResponse.json({
    ...fallbackData,
    error: 'Erreur serveur',
    details: error instanceof Error ? error.message : 'Unknown error'
  }, { status });
  
  return addNoCacheHeaders(response);
}