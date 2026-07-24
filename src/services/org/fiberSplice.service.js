'use strict';

const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const { PORT_STATUS } = require('../../config/constants');

const SPLICE_INCLUDES = [
  { association: 'endAStrand' },
  { association: 'endBStrand' },
  { association: 'endAPort' },
  { association: 'endBPort' },
];

/** Resolve + validate one splice endpoint, confirming it belongs to the given project. */
async function resolveEndpoint(models, projectId, endpoint) {
  if (!endpoint || (endpoint.type !== 'strand' && endpoint.type !== 'port')) {
    throw ApiError.badRequest('Each splice endpoint must be type "strand" or "port"');
  }

  if (endpoint.type === 'strand') {
    if (!endpoint.strandId) throw ApiError.badRequest('strandId is required for a strand endpoint');
    if (endpoint.side !== 'A' && endpoint.side !== 'Z') throw ApiError.badRequest('side must be "A" or "Z" for a strand endpoint');
    const strand = await models.FiberStrand.findByPk(endpoint.strandId, { include: [{ association: 'cable' }] });
    if (!strand) throw ApiError.badRequest('Strand not found');
    if (strand.cable.projectId !== projectId) throw ApiError.badRequest('Strand does not belong to this project');
    return { type: 'strand', strandId: strand.id, strandSide: endpoint.side, portId: null };
  }

  if (!endpoint.portId) throw ApiError.badRequest('portId is required for a port endpoint');
  const port = await models.EquipmentPort.findByPk(endpoint.portId, { include: [{ association: 'equipment' }] });
  if (!port) throw ApiError.badRequest('Port not found');
  if (port.equipment.projectId !== projectId) throw ApiError.badRequest('Port does not belong to this project');
  return { type: 'port', strandId: null, strandSide: null, portId: port.id };
}

async function listForProject(models, projectId) {
  return models.FiberSplice.findAll({ where: { projectId }, include: SPLICE_INCLUDES, order: [['createdAt', 'DESC']] });
}

async function create(models, { projectId, spliceAssetId, endA, endB, notes }) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.badRequest('Invalid project');

  if (spliceAssetId) {
    const spliceAsset = await models.NetworkAsset.findByPk(spliceAssetId);
    if (!spliceAsset) throw ApiError.badRequest('Splice location asset not found');
  }

  const a = await resolveEndpoint(models, projectId, endA);
  const b = await resolveEndpoint(models, projectId, endB);

  const splice = await models.FiberSplice.create({
    projectId,
    spliceAssetId: spliceAssetId || null,
    endAType: a.type,
    endAStrandId: a.strandId,
    endAStrandSide: a.strandSide,
    endAPortId: a.portId,
    endBType: b.type,
    endBStrandId: b.strandId,
    endBStrandSide: b.strandSide,
    endBPortId: b.portId,
    notes: notes || null,
  });

  // A splice referencing a port occupies it — strand status is never
  // auto-derived (no hardware feed exists to justify it), but a port's
  // free/connected state is a direct, mechanical consequence of splicing.
  const portIds = [a.portId, b.portId].filter(Boolean);
  if (portIds.length) {
    await models.EquipmentPort.update({ status: PORT_STATUS.CONNECTED }, { where: { id: { [Op.in]: portIds } } });
  }

  return models.FiberSplice.findByPk(splice.id, { include: SPLICE_INCLUDES });
}

async function remove(models, id) {
  const splice = await models.FiberSplice.findByPk(id);
  if (!splice) throw ApiError.notFound('Splice not found');

  const portIds = [splice.endAPortId, splice.endBPortId].filter(Boolean);
  await splice.destroy();

  for (const portId of portIds) {
    // eslint-disable-next-line no-await-in-loop
    const stillReferenced = await models.FiberSplice.count({
      where: { [Op.or]: [{ endAPortId: portId }, { endBPortId: portId }] },
    });
    if (!stillReferenced) {
      // eslint-disable-next-line no-await-in-loop
      await models.EquipmentPort.update({ status: PORT_STATUS.FREE }, { where: { id: portId } });
    }
  }

  return true;
}

/**
 * Impact/reachability trace: starting from a strand or port, walk every
 * splice touching the current frontier and collect everything reachable.
 * Deliberately NOT a strict ordered A-to-Z path — side (A/Z) is ignored when
 * deciding reachability, so this answers "what's affected" rather than
 * "the exact hop sequence." See plan notes for why.
 */
async function trace(models, { strandId, portId }) {
  if (!strandId && !portId) throw ApiError.badRequest('Provide strandId or portId to trace from');

  const visitedStrands = new Set();
  const visitedPorts = new Set();
  const frontier = [];

  if (strandId) {
    visitedStrands.add(strandId);
    frontier.push({ type: 'strand', id: strandId });
  }
  if (portId) {
    visitedPorts.add(portId);
    frontier.push({ type: 'port', id: portId });
  }

  while (frontier.length) {
    const node = frontier.pop();
    const where =
      node.type === 'strand'
        ? { [Op.or]: [{ endAStrandId: node.id }, { endBStrandId: node.id }] }
        : { [Op.or]: [{ endAPortId: node.id }, { endBPortId: node.id }] };

    // eslint-disable-next-line no-await-in-loop
    const splices = await models.FiberSplice.findAll({ where });

    splices.forEach((splice) => {
      const touchesA = node.type === 'strand' ? splice.endAStrandId === node.id : splice.endAPortId === node.id;
      const other = touchesA
        ? { type: splice.endBType, id: splice.endBType === 'strand' ? splice.endBStrandId : splice.endBPortId }
        : { type: splice.endAType, id: splice.endAType === 'strand' ? splice.endAStrandId : splice.endAPortId };

      if (!other.id) return;
      const visited = other.type === 'strand' ? visitedStrands : visitedPorts;
      if (visited.has(other.id)) return;
      visited.add(other.id);
      frontier.push(other);
    });
  }

  const [strands, ports] = await Promise.all([
    visitedStrands.size
      ? models.FiberStrand.findAll({
          where: { id: { [Op.in]: [...visitedStrands] } },
          include: [{ association: 'cable', attributes: ['id', 'assetType', 'symbologyId'] }, { association: 'assignedCustomer' }],
        })
      : [],
    visitedPorts.size
      ? models.EquipmentPort.findAll({
          where: { id: { [Op.in]: [...visitedPorts] } },
          include: [{ association: 'equipment', attributes: ['id', 'assetType', 'symbologyId'] }],
        })
      : [],
  ]);

  const cableAssetIds = [...new Set(strands.map((s) => s.networkAssetId))];
  const directCustomers = strands.map((s) => s.assignedCustomer).filter(Boolean);
  const linkedCustomers = cableAssetIds.length
    ? await models.Customer.findAll({ where: { networkAssetId: { [Op.in]: cableAssetIds } } })
    : [];

  const customersById = new Map();
  [...directCustomers, ...linkedCustomers].forEach((c) => customersById.set(c.id, c));

  return {
    strands,
    ports,
    cableAssetIds,
    customers: [...customersById.values()],
  };
}

module.exports = { listForProject, create, remove, trace };
