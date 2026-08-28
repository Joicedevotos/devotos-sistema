// Em desenvolvimento local usa o backend na porta 5000.
// Em producao (build feito pelo Render), usa direto o backend publicado.
// Se algum dia a hospedagem passar a suportar VITE_API_URL como variavel de
// ambiente de novo, ela continua tendo prioridade sobre os dois valores abaixo.
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://devotos-backend.onrender.com' : 'http://localhost:5000')
