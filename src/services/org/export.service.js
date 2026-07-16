'use strict';

const { assetsToFeatureCollection } = require('../../helpers/geojson.helper');
const { NETWORK_ASSET_STATUS } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

/** GeoJSON export of a project's approved assets (doc §4.3 GIS export). */
async function exportProjectGeoJSON(models, projectId) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  const assets = await models.NetworkAsset.findAll({
    where: { projectId, status: NETWORK_ASSET_STATUS.APPROVED },
    include: [{ association: 'symbology' }],
    order: [['createdAt', 'ASC']],
  });
  return assetsToFeatureCollection(assets);
}

module.exports = { exportProjectGeoJSON };
