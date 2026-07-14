'use strict';

/** Persisted refresh tokens (MAIN db) so they can be revoked/rotated server-side. */
module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
      // Store a SHA-256 hash of the token, never the raw token.
      tokenHash: { type: DataTypes.STRING, allowNull: false, field: 'token_hash' },
      expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
      userAgent: { type: DataTypes.STRING, allowNull: true, field: 'user_agent' },
      ip: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: 'refresh_tokens',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['token_hash'] }, { fields: ['user_id'] }],
    }
  );

  RefreshToken.prototype.isActive = function isActive() {
    return !this.revokedAt && new Date(this.expiresAt) > new Date();
  };

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return RefreshToken;
};
