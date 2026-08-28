// Em desenvolvimento local usa o backend na porta 5000.
// Em producao, defina VITE_API_URL nas variaveis de ambiente do Render/Vercel
// apontando para a URL do backend publicado (ex: https://devotos-backend.onrender.com)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
