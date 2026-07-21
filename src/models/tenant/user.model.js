'use strict';

const bcrypt = require('bcryptjs');
const { USER_STATUS } = require('../../config/constants');

/**
 * Org staff user (TENANT db) — client admins/reviewers today, and the future
 * mobile field surveyor tomorrow (via the seeded Surveyor role). Access is
 * governed by a dynamic Role (roleId).
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      roleId: { type: DataTypes.UUID, allowNull: false, field: 'role_id' },
      firstName: { type: DataTypes.STRING, allowNull: false, field: 'first_name' },
      lastName: { type: DataTypes.STRING, allowNull: true, field: 'last_name' },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM(...Object.values(USER_STATUS)),
        allowNull: false,
        defaultValue: USER_STATUS.ACTIVE,
      },
      // True for surveyors who self-registered via the org join code (status
      // starts PENDING, needs admin approval); false for users an admin added
      // directly (active immediately).
      isSelfRegistered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_self_registered' },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    },
    {
      tableName: 'users',
      underscored: true,
      timestamps: true,
      paranoid: true,
      defaultScope: { attributes: { exclude: ['password'] } },
      scopes: { withPassword: { attributes: { include: ['password'] } } },
    }
  );

  const hashPassword = async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  };
  User.beforeCreate(hashPassword);
  User.beforeUpdate(hashPassword);

  User.prototype.comparePassword = function comparePassword(plain) {
    return bcrypt.compare(plain, this.password);
  };

  User.prototype.isActive = function isActive() {
    return this.status === USER_STATUS.ACTIVE;
  };

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
    User.hasMany(models.RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
    User.hasMany(models.NetworkAsset, { foreignKey: 'createdByUserId', as: 'createdAssets' });
    User.belongsToMany(models.Project, { through: models.ProjectSurveyor, foreignKey: 'userId', otherKey: 'projectId', as: 'assignedProjects' });
  };

  return User;
};
