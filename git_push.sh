#!/bin/bash

echo "=== Mary & Chima Wedding Website Git Setup ==="
cd /Users/macair/Downloads/Mary_Chima_Wedding_Site

echo "1. Configuring Git user..."
git config user.name "Mary & Chima Wedding"
git config user.email "maryandchima@example.com"

echo "2. Checking Git status..."
git status

echo "3. Adding all files..."
git add .

echo "4. Creating commit..."
git commit -m "Complete wedding website with RSVP system and dynamic features" || echo "Commit may already exist"

echo "5. Setting up remote..."
git remote remove origin 2>/dev/null || echo "No existing origin to remove"
git remote add origin https://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@github.com/AnyaChima1/mary-chima-wedding.git

echo "6. Pushing to GitHub..."
git push -u origin main

echo "7. Verifying push..."
git remote -v
git status

echo "=== Git setup complete! ==="