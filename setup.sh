#!/bin/bash

# ZeroPass Firewall Simulator Setup Script

echo "🚀 Setting up ZeroPass Firewall Simulator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ and try again."
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "🐍 Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt
cd ..

# Create environment file
if [ ! -f .env.local ]; then
    echo "⚙️ Creating environment configuration..."
    cat > .env.local << EOF
# Backend API Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional: Add other environment variables here
EOF
    echo "✅ Created .env.local file"
else
    echo "⚠️ .env.local already exists, skipping..."
fi

echo ""
echo "🎉 Setup complete! To start the application:"
echo ""
echo "1. Start the backend server:"
echo "   cd backend && python3 main.py"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to http://localhost:3000"
echo ""
echo "📚 For more information, see the README.md file" 