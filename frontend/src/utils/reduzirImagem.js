// Reduz a foto no proprio aparelho antes de enviar: foto de celular tem 3-5 MB,
// e pro catalogo/PDF uma de ~1000px em JPEG fica igual na tela e ocupa ~100 KB no banco.
const LADO_MAXIMO = 1000
const QUALIDADE = 0.8

export async function reduzirImagem(arquivo) {
  let bitmap
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    return arquivo // formato que o navegador nao consegue abrir: envia como veio
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // PNG com fundo transparente vira fundo branco no JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALIDADE))
  if (!blob || blob.size >= arquivo.size) return arquivo
  const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], nome, { type: 'image/jpeg' })
}
