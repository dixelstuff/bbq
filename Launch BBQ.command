#!/bin/bash

cd /Users/andrew/bbq || exit 1
git pull origin main
npm install
npm run display
