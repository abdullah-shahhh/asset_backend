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
  const { geom, id, projectId, moduleId, assetType, geometryType, attributes, status, createdByUserId, reviewedByUserId, reviewedAt, createdAt, updatedAt } = a;
  return {
    type: 'Feature',
    id,
    geometry: geom || null,
    properties: {
      id,
      projectId,
      moduleId,
      assetType,
      geometryType,
      attributes: attributes || {},
      status,
      createdByUserId,
      reviewedByUserId,
      reviewedAt,
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

module.exports = { assetToFeature, assetsToFeatureCollection };
