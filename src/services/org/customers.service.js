'use strict';

const { paginate } = require('../../helpers/pagination.helper');
const ApiError = require('../../utils/ApiError');

const ASSET_INCLUDE = {
  association: 'asset',
  attributes: ['id', 'assetType', 'projectId'],
  include: [{ association: 'project', attributes: ['id', 'name'] }, { association: 'symbology', attributes: ['id', 'name', 'color'] }],
};

async function list(models, query) {
  const where = {};
  if (query.networkAssetId) where.networkAssetId = query.networkAssetId;
  const { rows, pagination } = await paginate(models.Customer, query, { where, include: [ASSET_INCLUDE] });
  return { customers: rows, pagination };
}

async function getById(models, id) {
  const customer = await models.Customer.findByPk(id, { include: [ASSET_INCLUDE] });
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

async function create(models, { name, email, phone, address, networkAssetId }) {
  if (networkAssetId) {
    const asset = await models.NetworkAsset.findByPk(networkAssetId);
    if (!asset) throw ApiError.badRequest('Invalid linked asset');
  }
  const customer = await models.Customer.create({ name, email: email || null, phone: phone || null, address: address || null, networkAssetId: networkAssetId || null });
  return getById(models, customer.id);
}

async function update(models, id, { name, email, phone, address, networkAssetId }) {
  const customer = await getById(models, id);
  if (networkAssetId) {
    const asset = await models.NetworkAsset.findByPk(networkAssetId);
    if (!asset) throw ApiError.badRequest('Invalid linked asset');
  }
  await customer.update({
    ...(name != null && { name }),
    ...(email !== undefined && { email: email || null }),
    ...(phone !== undefined && { phone: phone || null }),
    ...(address !== undefined && { address: address || null }),
    ...(networkAssetId !== undefined && { networkAssetId: networkAssetId || null }),
  });
  return getById(models, id);
}

async function remove(models, id) {
  const customer = await getById(models, id);
  await customer.destroy();
  return true;
}

module.exports = { list, getById, create, update, remove };
