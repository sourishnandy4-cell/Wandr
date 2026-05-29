@echo off
cd /d C:\Projects\Wandr
npm run build
git add -A
git commit -m "feat-touch-plane-for-mobile-and-cursor-plane-css"
git push origin main
echo Done.
