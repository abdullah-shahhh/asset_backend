'use strict';

const ApiError = require('../../utils/ApiError');
const { STRAND_STATUS, STRAND_ROLE } = require('../../config/constants');

// TIA-598 standard 12-color fiber identification cycle, used industry-wide
// for both individual strands within a buffer tube and the tubes themselves.
const TIA598_COLORS = [
  'Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White',
  'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua',
];

const STRANDS_PER_TUBE = 12;
const ALLOWED_STRAND_COUNTS = [12, 24, 48, 96, 144, 288];

const CABLE_INCLUDE = [{ association: 'symbology' }];
const STRAND_INCLUDES = [{ association: 'assignedCustomer', attributes: ['id', 'name', 'email', 'phone'] }];

async function getCableAsset(models, assetId) {
  const asset = await models.NetworkAsset.findByPk(assetId, { include: CABLE_INCLUDE });
  if (!asset) throw ApiError.notFound('Network asset not found');
  return asset;
}

async function generate(models, assetId, strandCount) {
  const asset = await getCableAsset(models, assetId);
  if (!asset.symbology?.isCable) throw ApiError.badRequest('This asset type does not carry fiber strands');
  if (!ALLOWED_STRAND_COUNTS.includes(strandCount)) {
    throw ApiError.badRequest(`Strand count must be one of: ${ALLOWED_STRAND_COUNTS.join(', ')}`);
  }

  const existing = await models.FiberStrand.count({ where: { networkAssetId: assetId } });
  if (existing > 0) throw ApiError.badRequest('Strands have already been generated for this cable');

  const rows = Array.from({ length: strandCount }, (_, i) => {
    const strandNumber = i + 1;
    return {
      networkAssetId: assetId,
      strandNumber,
      tubeNumber: Math.ceil(strandNumber / STRANDS_PER_TUBE),
      color: TIA598_COLORS[(strandNumber - 1) % TIA598_COLORS.length],
      status: STRAND_STATUS.AVAILABLE,
    };
  });

  await models.FiberStrand.bulkCreate(rows);
  return listForAsset(models, assetId);
}

async function listForAsset(models, assetId) {
  return models.FiberStrand.findAll({
    where: { networkAssetId: assetId },
    include: STRAND_INCLUDES,
    order: [['strandNumber', 'ASC']],
  });
}

async function getStrand(models, assetId, strandId) {
  const strand = await models.FiberStrand.findOne({
    where: { id: strandId, networkAssetId: assetId },
    include: STRAND_INCLUDES,
  });
  if (!strand) throw ApiError.notFound('Fiber strand not found');
  return strand;
}

async function update(models, assetId, strandId, { status, role, assignedCustomerId, notes }) {
  const strand = await getStrand(models, assetId, strandId);
  const patch = {};

  if (status !== undefined) {
    if (!Object.values(STRAND_STATUS).includes(status)) throw ApiError.badRequest('Invalid strand status');
    patch.status = status;
  }
  if (role !== undefined) {
    if (role !== null && !Object.values(STRAND_ROLE).includes(role)) throw ApiError.badRequest('Invalid strand role');
    patch.role = role;
  }
  if (assignedCustomerId !== undefined) {
    if (assignedCustomerId) {
      const customer = await models.Customer.findByPk(assignedCustomerId);
      if (!customer) throw ApiError.badRequest('Assigned customer not found');
    }
    patch.assignedCustomerId = assignedCustomerId || null;
  }
  if (notes !== undefined) {
    patch.notes = notes || null;
  }

  await strand.update(patch);
  return getStrand(models, assetId, strandId);
}

module.exports = { generate, listForAsset, getStrand, update, ALLOWED_STRAND_COUNTS };
