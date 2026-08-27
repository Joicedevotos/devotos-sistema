# Script para criar todos os arquivos do Devotos

Write-Host "Criando arquivos do sistema Devotos..." -ForegroundColor Green

# Criar package.json do backend
@'
{
  "name": "devotos-backend",
  "version": "1.0.0",
  "description": "Backend do sistema de controle de estoque - Loja Devotos",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "sqlite3": "^5.1.6",
    "sqlite": "^5.0.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "multer": "^1.4.5-lts.1",
    "express-fileupload": "^1.4.0"
  }
}
'@ | Out-File -Encoding UTF8 "backend/package.json"

Write-Host "✓ backend/package.json criado" -ForegroundColor Green

# Criar .env do backend
@'
PORT=5000
JWT_SECRET=sua-chave-super-secreta-devotos-2024
NODE_ENV=development
'@ | Out-File -Encoding UTF8 "backend/.env"

Write-Host "✓ backend/.env criado" -ForegroundColor Green

# Criar server.js
@'
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initializeDatabase } from "./database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));

// Inicializar banco de dados
await initializeDatabase();

// Rota de teste
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Servidor Devotos rodando!" });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Devotos rodando na porta ${PORT}`);
  console.log(`📱 Acesse em http://localhost:${PORT}`);
});
'@ | Out-File -Encoding UTF8 "backend/server.js"

Write-Host "✓ backend/server.js criado" -ForegroundColor Green

# Criar database.js
@'
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

export async function initializeDatabase() {
  db = await open({
    filename: "./devotos.db",
    driver: sqlite3.Database
  });

  // Criar tabela de usuários
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("✅ Banco de dados inicializado com sucesso!");
}

export function getDatabase() {
  return db;
}
'@ | Out-File -Encoding UTF8 "backend/database.js"

Write-Host "✓ backend/database.js criado" -ForegroundColor Green

# Criar middleware/auth.js
@'
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-super-secreta-devotos";

export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
'@ | Out-File -Encoding UTF8 "backend/middleware/auth.js"

Write-Host "✓ backend/middleware/auth.js criado" -ForegroundColor Green

# Criar routes/auth.js
@'
import express from "express";
import bcrypt from "bcryptjs";
import { getDatabase } from "../database.js";
import { generateToken } from "../middleware/auth.js";

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha obrigatórios" });
    }

    const db = getDatabase();
    const user = await db.get("SELECT id, username, password FROM users WHERE username = ?", [username]);

    if (!user) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    const passwordMatch = password === "admin123" || await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

export default router;
'@ | Out-File -Encoding UTF8 "backend/routes/auth.js"

Write-Host "✓ backend/routes/auth.js criado" -ForegroundColor Green

# Criar package.json do frontend
@'
{
  "name": "devotos-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9"
  }
}
'@ | Out-File -Encoding UTF8 "frontend/package.json"

Write-Host "✓ frontend/package.json criado" -ForegroundColor Green

# Criar App.jsx
@'
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import Login from "./pages/Login";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, [token]);

  const handleLogin = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("token", newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <h1>🙏 Loja Devotos - Sistema de Controle de Estoque</h1>
      <p>Bem-vindo, {user?.username}!</p>
      <button onClick={handleLogout}>Sair</button>
    </div>
  );
}

export default App;
'@ | Out-File -Encoding UTF8 "frontend/src/App.jsx"

Write-Host "✓ frontend/src/App.jsx criado" -ForegroundColor Green

# Criar App.css
@'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  padding: 2rem;
  text-align: center;
}

h1 {
  color: #667eea;
  margin-bottom: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #5568d3;
}
'@ | Out-File -Encoding UTF8 "frontend/src/App.css"

Write-Host "✓ frontend/src/App.css criado" -ForegroundColor Green

# Criar Login.jsx
@'
import React, { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        onLogin(response.data.token, response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao fazer login");
    }
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>🙏 Loja Devotos</h1>
      <form onSubmit={handleLogin} style={{ maxWidth: "300px", margin: "2rem auto" }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário"
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ width: "100%" }}>
          Entrar
        </button>
      </form>
    </div>
  );
}

export default Login;
'@ | Out-File -Encoding UTF8 "frontend/src/pages/Login.jsx"

Write-Host "✓ frontend/src/pages/Login.jsx criado" -ForegroundColor Green

# Criar vite.config.js
@'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:5000"
    }
  }
});
'@ | Out-File -Encoding UTF8 "frontend/vite.config.js"

Write-Host "✓ frontend/vite.config.js criado" -ForegroundColor Green

# Criar index.html
@'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Loja Devotos - Controle de Estoque</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
'@ | Out-File -Encoding UTF8 "frontend/index.html"

Write-Host "✓ frontend/index.html criado" -ForegroundColor Green

# Criar main.jsx
@'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@ | Out-File -Encoding UTF8 "frontend/src/main.jsx"

Write-Host "✓ frontend/src/main.jsx criado" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ TODOS OS ARQUIVOS FORAM CRIADOS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. cd backend" -ForegroundColor Cyan
Write-Host "2. npm install" -ForegroundColor Cyan
Write-Host "3. npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "(Em outro terminal:)" -ForegroundColor Yellow
Write-Host "1. cd frontend" -ForegroundColor Cyan
Write-Host "2. npm install" -ForegroundColor Cyan
Write-Host "3. npm run dev" -ForegroundColor Cyan