# Windows Setup

## Prerequisites
- Node.js 22+
- Git
- PowerShell
- Optional: Ollama

## Install Ollama
```powershell
irm https://ollama.com/install.ps1 | iex
ollama pull qwen3:4b
```

## App
```powershell
npm install
copy .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

If the local model is unavailable:
```powershell
$env:OLLAMA_ENABLED="false"
npm run dev
```
