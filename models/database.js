const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'medicheck.db'),
  logging: false
});

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('pharmacist', 'admin', 'inspector'),
    defaultValue: 'pharmacist'
  },
  pharmacyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

// Analysis Audit Log Model
const AnalysisLog = sequelize.define('AnalysisLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' }
  },
  medicineName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ocrText: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  detectedCompany: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verificationResult: {
    type: DataTypes.ENUM('genuine', 'suspicious', 'counterfeit', 'unknown'),
    defaultValue: 'unknown'
  },
  Genuinity: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  flags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  grokAnalysis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cdscoVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  processingTime: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

// CDSCO Alert Model
const CDSCOAlert = sequelize.define('CDSCOAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  alertId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  medicineName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  alertType: {
    type: DataTypes.ENUM('spurious', 'counterfeit', 'substandard', 'recall', 'warning'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    defaultValue: 'medium'
  },
  issuedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'CDSCO'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Medicine Reference Model
const MedicineReference = sequelize.define('MedicineReference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  form: {
    type: DataTypes.STRING,
    allowNull: true
  },
  activeIngredients: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  manufacturerLicense: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  referenceImages: {
    type: DataTypes.JSON,
    defaultValue: []
  }
});

// Sync database
const initDatabase = async () => {
  await sequelize.sync({ alter: true });
  console.log('Database synchronized');
};

// Create default admin user
const createDefaultAdmin = async () => {
  const bcrypt = require('bcryptjs');
  
  const adminExists = await User.findOne({ where: { email: 'admin@medicheck.com' } });
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      email: 'admin@medicheck.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'admin',
      pharmacyName: 'MediCheck HQ'
    });
    console.log('Default admin created: admin@medicheck.com / admin123');
  }
};

module.exports = {
  sequelize,
  User,
  AnalysisLog,
  CDSCOAlert,
  MedicineReference,
  initDatabase,
  createDefaultAdmin
};