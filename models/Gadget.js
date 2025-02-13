const { DataTypes } = require('sequelize');
const sequelize = require('../db'); 

const Gadget = sequelize.define('Gadget', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Available', 'Deployed', 'Destroyed', 'Decommissioned'),
        allowNull: false,
    },
    decommissionedAt: {
        type: DataTypes.DATE, // Store timestamp when decommissioned
        allowNull: true,
      },
}, {
    tableName: 'gadgets', 
    timestamps: false, 
});

module.exports = Gadget;
