#!/bin/bash

# Music Web App - Setup Script
# This script sets up and runs the Next.js music web application

set -e

echo "================================================"
echo "🎵 Music Web App - Setup & Run"
echo "================================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✓ Dependencies installed"
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  No .env.local file found!"
    echo "📝 Creating .env.local with placeholders..."
    echo "   You need to add Firebase credentials:"
    echo "   - NEXT_PUBLIC_FIREBASE_API_KEY"
    echo "   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
    echo "   - NEXT_PUBLIC_FIREBASE_DATABASE_URL"
    echo "   - NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    echo "   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
    echo "   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
    echo "   - NEXT_PUBLIC_FIREBASE_APP_ID"
    echo ""
    cat > .env.local << 'EOF'
# Firebase Configuration - Replace with your actual Firebase credentials
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
EOF
    echo "✓ .env.local created"
    echo ""
fi

# Check if Firebase is configured
if grep -q "^NEXT_PUBLIC_FIREBASE_API_KEY=$" .env.local; then
    echo "⚠️  WARNING: Firebase is not configured!"
    echo "   The app will run in DEMO MODE (UI only, no real-time sync)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    echo ""
fi

echo "🚀 Starting development server..."
echo "📱 The app will be available at: http://localhost:3000"
echo ""
echo "💡 Tip: Press Ctrl+C to stop the server"
echo ""

npm run dev
