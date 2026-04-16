const fs = require('fs');
const path = require('path');

const BATCHES_FILE = path.join(__dirname, '../database/batches.json');
const MEDICINES_FILE = path.join(__dirname, '../database/medicines.json');

/**
 * Batch Service - Manages medicine batches and database
 */
class BatchService {
  constructor() {
    this.ensureDatabaseFiles();
  }

  // Ensure database files exist
  ensureDatabaseFiles() {
    if (!fs.existsSync(BATCHES_FILE)) {
      fs.writeFileSync(BATCHES_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(MEDICINES_FILE)) {
      const defaultMedicines = [
        {
          id: 1,
          name: 'Azithromycin',
          company: 'Sun Pharmaceutical',
          dosage: '500mg',
          form: 'Tablet',
          referenceImages: ['sun-pharma_azithromycin.jpg']
        },
        {
          id: 2,
          name: 'Ciprofloxacin',
          company: 'Cipla',
          dosage: '500mg',
          form: 'Tablet',
          referenceImages: ['cipla_ciprofloxacin.jpg']
        },
        {
          id: 3,
          name: 'Omeprazole',
          company: 'Dr. Reddy\'s',
          dosage: '20mg',
          form: 'Capsule',
          referenceImages: ['dr-reddy_omeprazole.jpg']
        },
        {
          id: 4,
          name: 'Amoxicillin',
          company: 'Lupin',
          dosage: '500mg',
          form: 'Capsule',
          referenceImages: ['lupin_amoxicillin.jpg']
        },
        {
          id: 5,
          name: 'Azithromycin',
          company: 'Aurobindo Pharma',
          dosage: '250mg',
          form: 'Tablet',
          referenceImages: ['aurobind_azithromycin.jpg']
        }
      ];
      fs.writeFileSync(MEDICINES_FILE, JSON.stringify(defaultMedicines, null, 2));
    }
  }

  // Get all batches
  getAllBatches() {
    const data = fs.readFileSync(BATCHES_FILE, 'utf8');
    return JSON.parse(data);
  }

  // Get batch by ID
  getBatchById(id) {
    const batches = this.getAllBatches();
    return batches.find(b => b.id === id);
  }

  // Create new batch
  createBatch(batchData) {
    const batches = this.getAllBatches();
    const newBatch = {
      id: Date.now(),
      ...batchData,
      createdAt: new Date().toISOString()
    };
    batches.push(newBatch);
    fs.writeFileSync(BATCHES_FILE, JSON.stringify(batches, null, 2));
    return newBatch;
  }

  // Update batch
  updateBatch(id, updates) {
    const batches = this.getAllBatches();
    const index = batches.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error('Batch not found');
    }
    batches[index] = { ...batches[index], ...updates };
    fs.writeFileSync(BATCHES_FILE, JSON.stringify(batches, null, 2));
    return batches[index];
  }

  // Delete batch
  deleteBatch(id) {
    const batches = this.getAllBatches();
    const filtered = batches.filter(b => b.id !== id);
    fs.writeFileSync(BATCHES_FILE, JSON.stringify(filtered, null, 2));
    return { success: true };
  }

  // Get all medicines
  getAllMedicines() {
    const data = fs.readFileSync(MEDICINES_FILE, 'utf8');
    return JSON.parse(data);
  }

  // Get medicine by name
  getMedicineByName(name) {
    const medicines = this.getAllMedicines();
    return medicines.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
  }

  // Search medicines
  searchMedicines(query) {
    const medicines = this.getAllMedicines();
    const q = query.toLowerCase();
    return medicines.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.company.toLowerCase().includes(q)
    );
  }

  // Verify medicine against database
  verifyMedicine(analysisResult) {
    const medicines = this.getAllMedicines();
    
    // Match based on OCR medicine name and company
    const ocrMedicine = analysisResult.ocr?.medicineName;
    const ocrCompany = analysisResult.ocr?.companyName;
    const logoCompany = analysisResult.logo?.company;

    for (const medicine of medicines) {
      if (ocrMedicine && medicine.name.toLowerCase().includes(ocrMedicine.toLowerCase())) {
        if (ocrCompany && medicine.company.toLowerCase().includes(ocrCompany.toLowerCase())) {
          return { verified: true, medicine, matchType: 'exact' };
        }
        if (logoCompany && medicine.company.toLowerCase().includes(logoCompany.toLowerCase())) {
          return { verified: true, medicine, matchType: 'logo' };
        }
      }
    }

    return { verified: false, medicine: null, matchType: null };
  }
}

module.exports = new BatchService();