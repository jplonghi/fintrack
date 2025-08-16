# FinTrack - Personal Expense Tracker

A full-stack expense tracking application with FastAPI backend and React frontend.

## Features

- Import expenses from bank statements
- Automatic expense categorization using configurable rules
- Budget tracking and progress visualization
- Multi-currency support (CRC/USD)
- Real-time expense monitoring

## Architecture

- **Backend**: FastAPI with MongoDB
- **Frontend**: React with Material-UI
- **Database**: MongoDB

## Prerequisites

- Python 3.7+
- Node.js and npm
- MongoDB (running locally on port 27017)

## Running the Application

### 1. Backend Setup (FastAPI)

Navigate to the backend directory:

```bash
cd fintracker
```

Create and activate a virtual environment:

```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

The backend API will be available at `http://127.0.0.1:8000`

### 2. Frontend Setup (React)

Open a new terminal and navigate to the frontend directory:

```bash
cd web-ui
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

The React app will be available at `http://localhost:3000`

### 3. Database Setup

Ensure MongoDB is running locally on the default port (27017). The application will automatically create the necessary collections.

## Development

### VS Code Debug Configuration

Use the included VS Code launch configuration to debug the FastAPI backend:

- Press `F5` or go to Run > Start Debugging
- Select "Python Debugger: FastAPI"

### API Documentation

With the backend running, visit `http://127.0.0.1:8000/docs` for interactive API documentation.

## Usage

1. **Import Expenses**: Use the `/import` endpoint with base64-encoded bank statement data
2. **Categorize**: Expenses are automatically categorized based on rules in `app/config.json`
3. **Budget Tracking**: Set budgets per category and monitor spending progress
4. **Recalculate**: Update categories after modifying rules using `/recalculate-categories`

## Configuration

Edit `fintracker/app/config.json` to:

- Add new expense categories
- Update keyword matching rules
- Modify category colors
- Define budget periods

## API Endpoints

- `GET /expenses` - Fetch all expenses
- `POST /import` - Import expenses from bank statements
- `POST /budget` - Create/update budgets
- `GET /budget/{period}` - Get budget summary
- `POST /recalculate-categories` - Recalculate expense categories

## Roadmap

- [ ] Improve UI/UX design
- [ ] Add authentication and user management
- [ ] Implement recurring expenses
- [ ] Enhance reporting and analytics
- [ ] Mobile app development

## Acknowledgements

- Inspired by personal finance management needs
- Built with passion and dedication

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
