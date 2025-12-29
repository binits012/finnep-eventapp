/**
 * PlaceId Decoder Utility
 * Decodes encoded placeIds back to position data
 * Format: VENUE_PREFIX(4) + SECTION_B64(variable) + "|" + TIER_CODE(1) + "|" + POSITION_CODE(6-8) + "|" + AVAILABLE_FLAG(1) + "|" + TAGS_CODE(variable)
 */

interface DecodedPlaceId {
  section: string;
  tierCode: string; // Pricing tier code
  row: number;
  seat: number;
  x: number;
  y: number;
  available?: boolean; // Available flag (new format)
  tags?: string[]; // Tags array (new format)
}

/**
 * Decode placeId back to position data
 * @param placeId - Encoded place ID
 * @returns Decoded data or null if invalid
 */
export function decodePlaceId(placeId: string): DecodedPlaceId | null {
  try {
    if (!placeId || typeof placeId !== 'string') {
      return null;
    }

    // Check if new format (with | separators) or old format
    if (placeId.includes('|')) {
      const parts = placeId.split('|');

      // New format with available and tags: VENUE_PREFIX + SECTION_B64 + "|" + TIER_CODE + "|" + POSITION_CODE + "|" + AVAILABLE_FLAG + "|" + TAGS_CODE
      if (parts.length === 5) {
        const venuePrefix = parts[0].substring(0, 4);
        const sectionB64 = parts[0].substring(4);
        const tierCode = parts[1];
        const positionCode = parts[2];
        const availableFlag = parts[3];
        const tagsCode = parts[4];

        // Decode section from base64url
        const section = base64UrlDecode(sectionB64);

        // Decode position code
        const position = decodePosition(positionCode);
        if (!position) {
          return null;
        }

        // Decode tags if present
        let tags: string[] = [];
        if (tagsCode) {
          try {
            const decodedTags = base64UrlDecode(tagsCode);
            tags = decodedTags ? decodedTags.split(',').filter(Boolean) : [];
          } catch (err) {
            console.warn('Error decoding tags:', err);
          }
        }

        return {
          section: section,
          tierCode: tierCode,
          row: position.row,
          seat: position.seat,
          x: position.x,
          y: position.y,
          available: availableFlag === '1',
          tags: tags
        };
      }
      // Legacy format: VENUE_PREFIX + SECTION_B64 + "|" + TIER_CODE + "|" + POSITION_CODE
      else if (parts.length === 3) {
        const venuePrefix = parts[0].substring(0, 4);
        const sectionB64 = parts[0].substring(4);
        const tierCode = parts[1];
        const positionCode = parts[2];

        // Decode section from base64url
        const section = base64UrlDecode(sectionB64);

        // Decode position code
        const position = decodePosition(positionCode);
        if (!position) {
          return null;
        }

        return {
          section: section,
          tierCode: tierCode,
          row: position.row,
          seat: position.seat,
          x: position.x,
          y: position.y,
          available: true,
          tags: []
        };
      } else {
        return null;
      }
    } else {
      // Old format: VENUE_PREFIX + SECTION_CHAR + TIER_CODE + POSITION_CODE
      if (placeId.length < 12) {
        return null;
      }
      const venuePrefix = placeId.substring(0, 4);
      const sectionChar = placeId.substring(4, 5);
      const tierCode = placeId.substring(5, 6);
      const positionCode = placeId.substring(6);

      // Decode position code
      const position = decodePosition(positionCode);
      if (!position) {
        return null;
      }

      return {
        section: sectionChar,
        tierCode: tierCode,
        row: position.row,
        seat: position.seat,
        x: position.x,
        y: position.y,
        available: true,
        tags: []
      };
    }
  } catch (err) {
    console.error(`Error decoding placeId ${placeId}:`, err);
    return null;
  }
}

/**
 * Base64 URL-safe decode
 * @param str - Base64URL encoded string
 * @returns Decoded string
 */
function base64UrlDecode(str: string): string {
  try {
    // Add padding if needed
    let paddedStr = str.replace(/-/g, '+').replace(/_/g, '/');
    while (paddedStr.length % 4 !== 0) {
      paddedStr += '=';
    }
    return Buffer.from(paddedStr, 'base64').toString('utf8');
  } catch (err) {
    console.error('Error decoding base64:', err);
    return str; // Return original if decoding fails
  }
}

/**
 * Decode position code back to row, seat, x, y
 * Reverse of encoding: (row * 2^48) + (seat * 2^32) + (x * 2^16) + (y)
 * @param positionCode - Base36 encoded position code
 * @returns Decoded position or null if invalid
 */
function decodePosition(positionCode: string): { row: number; seat: number; x: number; y: number } | null {
  try {
    // Convert base36 to number
    const combinedValue = parseInt(positionCode, 36);
    if (isNaN(combinedValue)) {
      return null;
    }

    // Extract components using division and bitwise operations
    // row: bits 48-63, seat: bits 32-47, x: bits 16-31, y: bits 0-15
    const row16 = Math.floor(combinedValue / Math.pow(2, 48)) & 0xFFFF;
    const seat16 = Math.floor(combinedValue / Math.pow(2, 32)) & 0xFFFF;
    const x16 = Math.floor(combinedValue / Math.pow(2, 16)) & 0xFFFF;
    const y16 = combinedValue & 0xFFFF;

    return {
      row: row16,
      seat: seat16,
      x: x16,
      y: y16
    };
  } catch (err) {
    console.error(`Error decoding position code ${positionCode}:`, err);
    return null;
  }
}

/**
 * Match encoded placeIds with places array from venue manifest
 * Uses decoded section/row/seat to find matching place
 * @param encodedPlaceIds - Array of encoded place IDs
 * @param places - Array of places from venue manifest
 * @returns Array of matched places with encoded placeId
 */
export function matchPlaceIdsWithPlaces(
  encodedPlaceIds: string[],
  places: Array<{
    placeId?: string;
    section?: string | null;
    row?: string | number | null;
    seat?: string | number | null;
    x?: number | null;
    y?: number | null;
    [key: string]: any;
  }>
): Array<{
  placeId: string;
  x: number | null;
  y: number | null;
  row: string | null;
  seat: string | null;
  section: string | null;
  [key: string]: any;
}> {
  const matchedPlaces: Array<{
    placeId: string;
    x: number | null;
    y: number | null;
    row: string | null;
    seat: string | null;
    section: string | null;
    [key: string]: any;
  }> = [];

  for (const encodedPlaceId of encodedPlaceIds) {
    // Decode the placeId
    const decoded = decodePlaceId(encodedPlaceId);

    let matchedPlace: any = null;

    if (decoded) {
      // Try to find matching place in venue manifest by section + row + seat
      for (const place of places) {
        const placeSection = (place.section || '').charAt(0).toUpperCase();
        const placeRow = extractNumericPart(place.row);
        const placeSeat = extractNumericPart(place.seat);

        const decodedRow = String(decoded.row);
        const decodedSeat = String(decoded.seat);

        if (placeSection === decoded.section &&
            placeRow === decodedRow &&
            placeSeat === decodedSeat) {
          matchedPlace = place;
          break;
        }
      }
    }

    // If no match found, use decoded coordinates
    if (!matchedPlace) {
      matchedPlace = {
        placeId: encodedPlaceId,
        section: decoded?.section || null,
        row: decoded?.row?.toString() || null,
        seat: decoded?.seat?.toString() || null,
        x: decoded?.x || null,
        y: decoded?.y || null,
        status: 'available',
        available: decoded?.available !== undefined ? decoded.available : true,
        tags: decoded?.tags || [],
        wheelchairAccessible: decoded?.tags?.includes('wheelchair') || false
      };
    } else {
      // Use matched place but update placeId to encoded version and merge decoded available/tags
      matchedPlace = {
        ...matchedPlace,
        placeId: encodedPlaceId, // Use encoded placeId for consistency
        // Override with decoded values if available (decoded values are authoritative)
        available: decoded?.available !== undefined ? decoded.available : (matchedPlace.available !== undefined ? matchedPlace.available : true),
        tags: decoded?.tags || matchedPlace.tags || [],
        wheelchairAccessible: decoded?.tags?.includes('wheelchair') || matchedPlace.wheelchairAccessible || false
      };
    }

    matchedPlaces.push(matchedPlace);
  }

  return matchedPlaces;
}

/**
 * Extract numeric part from row/seat string (e.g., "R1" -> "1", "A1" -> "1")
 */
function extractNumericPart(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const numericPart = str.replace(/\D/g, '');
  return numericPart || '';
}

