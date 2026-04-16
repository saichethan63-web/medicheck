const axios = require('axios');

/**
 * Grok API Service - Real-time intelligence for medicine analysis
 */
class GrokService {
  constructor() {
    this.apiKey = process.env.GROK_API_KEY;
    this.apiUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
    this.model = 'grok-2';
  }

  /**
   * Analyze medicine data with Grok AI
   */
  async analyzeMedicine(analysisData) {
    if (!this.apiKey || this.apiKey === 'your_grok_api_key_here') {
      console.log('Grok API key not configured, skipping AI analysis');
      return null;
    }

    try {
      const prompt = this.buildAnalysisPrompt(analysisData);
      
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a pharmaceutical expert AI assistant helping verify medicines for counterfeit detection in India. Analyze the provided data and provide insights about authenticity, potential red flags, and recommendations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        analysis: response.data.choices[0].message.content,
        model: this.model,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Grok API Error:', error.message);
      return null;
    }
  }

  /**
   * Build analysis prompt from medicine data
   */
  buildAnalysisPrompt(data) {
    let prompt = 'Analyze the following medicine verification data:\n\n';
    
    if (data.medicineName) {
      prompt += `- Medicine Name: ${data.medicineName}\n`;
    }
    if (data.company) {
      prompt += `- Company: ${data.company}\n`;
    }
    if (data.batchNumber) {
      prompt += `- Batch Number: ${data.batchNumber}\n`;
    }
    if (data.ocrText) {
      prompt += `- OCR Extracted Text: ${data.ocrText.substring(0, 500)}\n`;
    }
    if (data.detectedCompany) {
      prompt += `- Detected Company from Logo: ${data.detectedCompany}\n`;
    }
    if (data.cdscoVerified !== undefined) {
      prompt += `- CDSCO Database Verified: ${data.cdscoVerified}\n`;
    }
    if (data.existingAlerts && data.existingAlerts.length > 0) {
      prompt += `- Related CDSCO Alerts: ${JSON.stringify(data.existingAlerts)}\n`;
    }

    prompt += '\nProvide:\n';
    prompt += '1. Authenticity assessment (genuine/suspicious/counterfeit)\n';
    prompt += '2. Genuinity level (0-100%)\n';
    prompt += '3. Red flags to investigate\n';
    prompt += '4. Recommended actions\n';

    return prompt;
  }

  /**
   * Check batch number against known counterfeit patterns
   */
  async checkBatchPatterns(batchNumber, medicineName) {
    if (!this.apiKey || this.apiKey === 'your_grok_api_key_here') {
      return null;
    }

    try {
      const prompt = `Check if batch number "${batchNumber}" for medicine "${medicineName}" matches any known counterfeit patterns in India. Provide a brief yes/no answer with reasoning.`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a pharmaceutical expert. Answer briefly.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Grok batch check error:', error.message);
      return null;
    }
  }

  /**
   * Get drug interaction warnings
   */
  async getDrugWarnings(medicineName, otherMedicines = []) {
    if (!this.apiKey || this.apiKey === 'your_grok_api_key_here') {
      return null;
    }

    try {
      const prompt = `List any known drug interaction warnings or contraindications for ${medicineName}${otherMedicines.length > 0 ? ` when taken with: ${otherMedicines.join(', ')}` : ''}. Keep response brief.`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a pharmacovigilance expert. Provide accurate, brief warnings.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 200
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Grok drug warnings error:', error.message);
      return null;
    }
  }
}

module.exports = new GrokService();