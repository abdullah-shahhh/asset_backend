'use strict';

const { TICKET_STATUS, TICKET_PRIORITY } = require('../../config/constants');

/** Ticket (TENANT db) — a support request against a Customer. */
module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define(
    'Ticket',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
      subject: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: TICKET_STATUS.OPEN,
      },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: TICKET_PRIORITY.MEDIUM,
      },
    },
    {
      tableName: 'tickets',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['customer_id'] }, { fields: ['status'] }],
    }
  );

  Ticket.associate = (models) => {
    Ticket.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
  };

  return Ticket;
};
