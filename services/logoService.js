/**
 * Logo Service - Detects pharmaceutical company logos from Vision API results
 */
class LogoService {
  constructor() {
    // Known pharmaceutical companies with logo variations
    this.companyPatterns = {
      'Sun Pharmaceutical': ['sun pharma', 'sunpharma', 'sun-pharma'],
      'Cipla': ['cipla'],
      'Dr. Reddy\'s': ['dr. reddy', 'dr reddy', 'drreddy'],
      'Lupin': ['lupin'],
      'Aurobindo Pharma': ['aurobindo', 'aurobind'],
      'Mankind': ['mankind'],
      'Zydus': ['zydus', 'zydus cadila'],
      'Alkem': ['alkem'],
      'Abbott': ['abbott'],
      'Novartis': ['novartis'],
      'Pfizer': ['pfizer'],
      'GSK': ['gsk', 'glaxo'],
      'Merck': ['merck'],
      'Bayer': ['bayer']
    };
  }

  /**
   * Detect company logo from Vision API result
   */
  detectLogo(visionResult) {
    const logos = visionResult?.logos || [];
    const labels = visionResult?.labels || [];
    const text = visionResult?.text?.text || '';

    // Check logos first
    for (const logo of logos) {
      const match = this.matchCompany(logo.description);
      if (match) {
        return {
          detected: true,
          company: match,
          source: 'logo_detection',
          Genuinity: logo.score,
          logoName: logo.description
        };
      }
    }

    // Check labels
    for (const label of labels) {
      const match = this.matchCompany(label.description);
      if (match) {
        return {
          detected: true,
          company: match,
          source: 'label_detection',
          Genuinity: label.score,
          label: label.description
        };
      }
    }

    // Check OCR text for company names
    const textMatch = this.extractCompanyFromText(text);
    if (textMatch) {
      return {
        detected: true,
        company: textMatch.company,
        source: 'text_extraction',
        Genuinity: textMatch.Genuinity,
        matchedText: textMatch.matchedText
      };
    }

    return {
      detected: false,
      company: null,
      source: null,
      Genuinity: 0
    };
  }

  /**
   * Match company name against known patterns
   */
  matchCompany(input) {
    if (!input) return null;
    
    const lowerInput = input.toLowerCase();
    
    for (const [company, patterns] of Object.entries(this.companyPatterns)) {
      for (const pattern of patterns) {
        if (lowerInput.includes(pattern)) {
          return company;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract company name from OCR text
   */
  extractCompanyFromText(text) {
    if (!text) return null;

    const lines = text.split('\n');
    
    for (const line of lines) {
      const match = this.matchCompany(line);
      if (match) {
        return {
          company: match,
          Genuinity: 0.7,
          matchedText: line.trim()
        };
      }
    }

    return null;
  }

  /**
   * Get all supported companies
   */
  getSupportedCompanies() {
    return Object.keys(this.companyPatterns);
  }
}

module.exports = new LogoService();