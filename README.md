# MediCheck Backend

Medicine verification and analysis system with OCR and Google Vision API integration.

## Project Structure

```
medicheck-backend/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── .env                   # Environment variables
├── routes/
│   └── analysis.js        # API routes
├── controllers/
│   └── analysisController.js  # Request handlers
├── services/
│   ├── ocrService.js      # Tesseract.js OCR
│   ├── visionService.js   # Google Vision API
│   ├── batchService.js    # Database management
│   └── logoService.js     # Logo detection
├── utils/
│   └── imageProcessor.js  # Image preprocessing
├── database/
│   ├── batches.json       # Batch storage
│   └── medicines.json     # Medicine reference data
├── reference_images/      # Reference medicine images
├── uploads/               # Uploaded images (auto-created)
└── frontend/
    └── index.html         # Web interface
```

## Setup

1. **Install Dependencies**
   ```bash
   cd medicheck-backend
   npm install
   ```

2. **Configure Environment**
   - Edit `.env` file
   - Add your Google Vision API key (optional - works without it)

3. **Start Server**
   ```bash
   npm start
   ```

4. **Access API**
   - API: http://localhost:3000/api
   - Frontend: Open `frontend/index.html` in browser

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/analyze` | Analyze medicine image |
| GET | `/api/analysis/batches` | Get all batches |
| GET | `/api/analysis/medicines` | Get all medicines |
| POST | `/api/analysis/batch` | Create new batch |
| GET | `/api/health` | Health check |

## Features

- **OCR Text Extraction** - Extract text from medicine images using Tesseract.js
- **Logo Detection** - Identify pharmaceutical company from logos/labels
- **Image Analysis** - Google Vision API for labels and object detection
- **Medicine Database** - Pre-loaded with common medicines
- **Batch Management** - Track analyzed medicine batches

## Dependencies

- `express` - Web framework
- `multer` - File uploads
- `cors` - Cross-origin support
- `dotenv` - Environment variables
- `sharp` - Image processing
- `tesseract.js` - OCR engine
- `@google-cloud/vision` - Vision API (optional)