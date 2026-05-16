/**
 * ============================================================
 * POI (Points of Interest) Service — Map-based zone detection
 * ============================================================
 *
 * Uses OpenStreetMap Overpass API to detect schools, hospitals,
 * and junctions near the current GPS location. Used for
 * driving-friendly zone alerts (School zone, Hospital zone, Junction).
 * ============================================================
 */

const logger = require('../middleware/logger');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const DEFAULT_RADIUS_M = 150;

/**
 * Query Overpass API for POIs near (lat, lon).
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radiusMeters - Search radius in meters
 * @returns {Promise<{ zoneType: string|null, zoneLabel: string|null }>}
 */
async function getNearbyZone(lat, lon, radiusMeters = DEFAULT_RADIUS_M) {
  const radius = Math.round(Math.min(radiusMeters, 500));

  // Overpass: node(around:radius, lat, lon)[tag=value]; out;
  const query = `
    [out:json][timeout:8];
    (
      node(around:${radius},${lat},${lon})["amenity"="school"];
      node(around:${radius},${lat},${lon})["amenity"="college"];
      node(around:${radius},${lat},${lon})["amenity"="university"];
      node(around:${radius},${lat},${lon})["amenity"="hospital"];
      node(around:${radius},${lat},${lon})["amenity"="clinic"];
      node(around:${radius},${lat},${lon})["highway"="traffic_signals"];
      node(around:${radius},${lat},${lon})["highway"="crossing"];
    );
    out center;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) return { zoneType: null, zoneLabel: null };

    const json = await res.json();
    const elements = json.elements || [];

    let school = false;
    let hospital = false;
    let junction = false;

    for (const el of elements) {
      const tags = el.tags || {};
      const amenity = (tags.amenity || '').toLowerCase();
      const highway = (tags.highway || '').toLowerCase();

      if (amenity === 'school' || amenity === 'college' || amenity === 'university') school = true;
      if (amenity === 'hospital' || amenity === 'clinic') hospital = true;
      if (highway === 'traffic_signals' || highway === 'crossing') junction = true;
    }

    // Priority: school > hospital > junction (most caution first)
    if (school) return { zoneType: 'school', zoneLabel: 'School zone' };
    if (hospital) return { zoneType: 'hospital', zoneLabel: 'Hospital zone' };
    if (junction) return { zoneType: 'junction', zoneLabel: 'Junction' };

    return { zoneType: null, zoneLabel: null };
  } catch (err) {
    logger.debug('POI Overpass query failed:', err.message);
    return { zoneType: null, zoneLabel: null };
  }
}

module.exports = { getNearbyZone };
