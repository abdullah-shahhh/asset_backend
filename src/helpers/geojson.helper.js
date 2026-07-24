'use strict';

/**
 * Sequelize's GEOMETRY type reads/writes PostGIS columns as GeoJSON-like
 * geometry objects already ({ type: 'Point', coordinates: [lng, lat] }), so
 * these helpers just wrap that into standard GeoJSON Feature/FeatureCollection
 * shapes for API responses — no coordinate transformation needed.
 */

/** Turn a NetworkAsset instance (or plain object) into a GeoJSON Feature. */
function assetToFeature(asset) {
  const a = typeof asset.toJSON === 'function' ? asset.toJSON() : asset;
  const { geom, id, projectId, project, symbologyId, symbology, assetType, geometryType, attributes, status, operationalStatus, ipAddress, createdByUserId, createdBy, reviewedByUserId, reviewedAt, rejectionReason, media, createdAt, updatedAt } = a;
  return {
    type: 'Feature',
    id,
    geometry: geom || null,
    properties: {
      id,
      projectId,
      project: project ? { id: project.id, name: project.name } : null,
      symbologyId,
      symbology: symbology
        ? { id: symbology.id, name: symbology.name, key: symbology.key, color: symbology.color, icon: symbology.icon || null, iconUrl: symbology.iconUrl || null, isEquipment: !!symbology.isEquipment, isCable: !!symbology.isCable, fields: symbology.fields || [] }
        : null,
      // Denormalized for map styling — flat properties are safe to reference
      // from MapLibre style expressions; a nested object is not (`['get',
      // 'color', ['get', 'symbology']]` throws when symbology is null).
      color: symbology?.color || null,
      icon: symbology?.icon || null,
      iconUrl: symbology?.iconUrl || null,
      assetType,
      geometryType,
      attributes: attributes || {},
      status,
      operationalStatus: operationalStatus || null,
      ipAddress: ipAddress || null,
      createdByUserId,
      createdBy: createdBy ? { id: createdBy.id, name: [createdBy.firstName, createdBy.lastName].filter(Boolean).join(' '), email: createdBy.email } : null,
      reviewedByUserId,
      reviewedAt,
      rejectionReason: rejectionReason || null,
      media: (media || []).map((m) => ({ id: m.id, url: m.url, mimeType: m.mimeType || null, sizeBytes: m.sizeBytes || null, createdAt: m.createdAt })),
      createdAt,
      updatedAt,
    },
  };
}

/** Turn an array of NetworkAsset instances into a GeoJSON FeatureCollection. */
function assetsToFeatureCollection(assets) {
  return {
    type: 'FeatureCollection',
    features: assets.map(assetToFeature),
  };
}

function distanceSq(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

/** A single point standing in for a geometry, with no awareness of anything
 * else — the start vertex for lines, the mean vertex for polygons. */
function naiveRepresentativePoint(geom) {
  if (!geom) return null;
  if (geom.type === 'Point') return geom.coordinates;
  if (geom.type === 'LineString') return geom.coordinates[0];
  if (geom.type === 'Polygon') {
    const ring = (geom.coordinates && geom.coordinates[0]) || [];
    const points = ring.slice(0, -1); // drop the closing duplicate vertex
    if (!points.length) return null;
    const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
  }
  return null;
}

/** The point on `geom` closest to `otherPoint` — for a LineString this picks
 * whichever end is nearer, so a connection line reads as running "into" the
 * cable it's linked to rather than always starting at its first vertex. */
function representativePoint(geom, otherPoint) {
  if (!geom) return null;
  if (geom.type === 'LineString' && otherPoint) {
    const coords = geom.coordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];
    return distanceSq(start, otherPoint) <= distanceSq(end, otherPoint) ? start : end;
  }
  return naiveRepresentativePoint(geom);
}

/** Turn a NetworkConnection instance (with fromAsset/toAsset included) into a
 * GeoJSON LineString Feature between a representative point of each end —
 * this is a graph edge, not a physical cable route, so it deliberately
 * ignores the real geometry of either asset beyond picking where to anchor. */
function connectionToFeature(connection) {
  const c = typeof connection.toJSON === 'function' ? connection.toJSON() : connection;
  const { id, projectId, fromAssetId, toAssetId, label, fromAsset, toAsset } = c;

  const fromNaive = naiveRepresentativePoint(fromAsset?.geom);
  const toNaive = naiveRepresentativePoint(toAsset?.geom);
  const fromPoint = representativePoint(fromAsset?.geom, toNaive);
  const toPoint = representativePoint(toAsset?.geom, fromNaive);

  return {
    type: 'Feature',
    id,
    geometry: fromPoint && toPoint ? { type: 'LineString', coordinates: [fromPoint, toPoint] } : null,
    properties: { id, projectId, fromAssetId, toAssetId, label: label || null },
  };
}

function connectionsToFeatureCollection(connections) {
  return { type: 'FeatureCollection', features: connections.map(connectionToFeature) };
}

module.exports = { assetToFeature, assetsToFeatureCollection, connectionToFeature, connectionsToFeatureCollection };
