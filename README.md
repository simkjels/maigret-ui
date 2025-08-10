# Maigret OSINT Tool - Modern Frontend

A beautiful, modern frontend for the Maigret OSINT tool built with Next.js and chadcn/ui components.

## Features

- 🎨 **Modern UI**: Beautiful interface built with chadcn/ui components
- 🔍 **Advanced Search**: Comprehensive search options with tag filtering
- 📊 **Real-time Progress**: Live search progress tracking
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🎯 **Results Visualization**: Interactive results display with export options
- ⚡ **Fast Performance**: Built with Next.js 14 and optimized for speed

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **chadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **Lucide React** - Beautiful icons

### Backend
- **FastAPI** - Modern Python web framework
- **Maigret** - OSINT search engine integration
- **Uvicorn** - ASGI server

## Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.10+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd maigret-ui
   ```

2. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up the backend**
   ```bash
   cd ../backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Start the development servers**

   **Backend (Terminal 1):**
   ```bash
   cd backend
   source venv/bin/activate
   python main.py
   ```

   **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Usage

### Basic Search

1. Navigate to the search page
2. Enter one or more usernames (separated by spaces or commas)
3. Configure search options:
   - **Number of Sites**: How many sites to check (default: 500)
   - **Timeout**: Request timeout in seconds (default: 30)
   - **Tags**: Filter sites by categories (gaming, coding, social, etc.)
   - **Specific Sites**: Choose particular sites to search

### Advanced Options

- **Search All Sites**: Check all available sites (may take longer)
- **Use Cookies**: Enable cookie support for sites that require it
- **Disable Recursive Search**: Skip finding additional usernames
- **Disable Information Extraction**: Skip extracting personal data
- **Proxy Settings**: Configure HTTP, TOR, or I2P proxies

### Viewing Results

- **Profiles Found**: Shows only sites where the username was found
- **All Results**: Shows results for all checked sites
- **Export Options**: Download results in CSV, JSON, PDF, or HTML format

## Project Structure

```
maigret-ui/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and API client
│   │   └── types/           # TypeScript definitions
│   └── package.json
├── backend/                  # FastAPI server
│   ├── main.py              # Main application
│   ├── requirements.txt     # Python dependencies
│   └── venv/                # Virtual environment
└── README.md
```

## API Endpoints

### Search
- `POST /api/search` - Start a new search
- `GET /api/search/{sessionId}` - Get search status
- `GET /api/results/{sessionId}` - Get search results

### Data
- `GET /api/sites` - Get available sites
- `GET /api/tags` - Get available tags

### Export
- `POST /api/export` - Export results
- `GET /api/reports/{filename}` - Download report file

### Health
- `GET /api/health` - API health check

## Development

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Backend Development

```bash
cd backend
source venv/bin/activate
python main.py       # Start development server
```

### Adding New Components

The project uses chadcn/ui components. To add new components:

```bash
cd frontend
npx shadcn@latest add <component-name>
```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Maigret](https://github.com/soxoj/maigret) - The original OSINT tool
- [chadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Note**: This tool is intended for educational and lawful purposes only. Please ensure compliance with all applicable laws and regulations in your jurisdiction.
