const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BLOCKCHAIN_FILE = path.join(__dirname, '../database/blockchain.json');

/**
 * Blockchain Service - Web3 transaction tracking for medicine batches
 * Running in demo mode with local JSON storage
 */
class BlockchainService {
  constructor() {
    this.rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    this.contractAddress = process.env.BLOCKCHAIN_CONTRACT;
    this.isDemoMode = !this.rpcUrl || this.rpcUrl === 'https://mainnet.infura.io/v3/your_project_id';
    
    if (this.isDemoMode) {
      console.log('Blockchain: Running in demo mode (no RPC configured)');
      this.web3 = null;
    } else {
      this.web3 = new Web3(new Web3.providers.HttpProvider(this.rpcUrl));
    }
    
    // Load existing transactions
    this.transactions = this.loadTransactions();
  }

  /**
   * Load transactions from JSON file
   */
  loadTransactions() {
    try {
      if (fs.existsSync(BLOCKCHAIN_FILE)) {
        const data = JSON.parse(fs.readFileSync(BLOCKCHAIN_FILE, 'utf8'));
        return data.transactions || [];
      }
    } catch (error) {
      console.error('Error loading blockchain:', error.message);
    }
    return [];
  }

  /**
   * Save transactions to JSON file
   */
  saveTransactions() {
    try {
      const data = {
        transactions: this.transactions,
        metadata: {
          network: 'Ethereum (Demo Mode)',
          contractAddress: this.contractAddress || '0x0000000000000000000000000000000000000000',
          totalTransactions: this.transactions.length,
          lastBlockNumber: this.transactions.length > 0 
            ? this.transactions[this.transactions.length - 1].blockNumber 
            : 18500000,
          lastUpdated: new Date().toISOString()
        }
      };
      fs.writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving blockchain:', error.message);
    }
  }

  /**
   * Record a new transaction on blockchain
   */
  async recordTransaction(data) {
    const { medicineName, batchNumber, action, location, userId, metadata } = data;
    
    // Generate transaction hash
    const transactionHash = '0x' + uuidv4().replace(/-/g, '').substring(0, 64);
    const blockNumber = 18500000 + this.transactions.length + 1;
    
    const record = {
      id: 'tx_' + String(this.transactions.length + 1).padStart(3, '0'),
      medicineName,
      batchNumber,
      action,
      location,
      userId,
      metadata,
      timestamp: new Date().toISOString(),
      transactionHash,
      blockNumber,
      verified: true,
      result: metadata?.result || 'unknown',
      alertType: metadata?.alertType || null
    };
    
    this.transactions.push(record);
    this.saveTransactions();
    
    console.log(`[Blockchain] Recorded: ${action} for batch ${batchNumber}`);
    console.log(`[Blockchain] Transaction: ${transactionHash}`);
    
    return {
      success: true,
      transactionHash,
      blockNumber,
      timestamp: record.timestamp,
      demo: true
    };
  }

  /**
   * Verify batch exists on blockchain
   */
  async verifyBatch(batchNumber) {
    // Find transactions for this batch
    const batchTransactions = this.transactions.filter(t => 
      t.batchNumber === batchNumber
    );
    
    if (batchTransactions.length > 0) {
      const latest = batchTransactions[batchTransactions.length - 1];
      return {
        exists: true,
        verified: true,
        transactionHash: latest.transactionHash,
        lastAction: latest.action,
        timestamp: latest.timestamp,
        blockNumber: latest.blockNumber,
        result: latest.result,
        demo: true
      };
    }
    
    return {
      exists: false,
      verified: false,
      message: 'No blockchain records found for this batch'
    };
  }

  /**
   * Get transaction history for a batch
   */
  async getBatchHistory(batchNumber) {
    return this.transactions.filter(t => t.batchNumber === batchNumber);
  }

  /**
   * Get all transactions
   */
  getAllTransactions() {
    return this.transactions;
  }

  /**
   * Record verification action
   */
  async recordVerification(batchNumber, result, details) {
    return this.recordTransaction({
      batchNumber,
      action: 'VERIFICATION',
      metadata: { result, ...details }
    });
  }

  /**
   * Record alert action
   */
  async recordAlert(batchNumber, alertType, alertDetails) {
    return this.recordTransaction({
      batchNumber,
      action: 'ALERT',
      metadata: { alertType, ...alertDetails }
    });
  }
}

module.exports = new BlockchainService();