'use strict';

/**
 * Permission catalog (MAIN db). A fixed set of capability keys (e.g.
 * 'organizations.create') seeded from PERMISSION_CATALOG. Roles are granted
 * permissions via the role_permissions join.
 */
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    'Permission',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      group: { type: DataTypes.STRING, allowNull: false },
      label: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: 'permissions',
      underscored: true,
      timestamps: true,
    }
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: 'permissionId',
      otherKey: 'roleId',
      as: 'roles',
    });
  };

  return Permission;
};
