@echo off
rem Serves the site at http://localhost:8080 (needs Python). Close this window to stop.
cd /d "%~dp0"
start "" http://localhost:8080/
python -m http.server 8080
