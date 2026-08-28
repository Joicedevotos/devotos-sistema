import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { TIPOS_PRODUTO, TAMANHOS_POR_TIPO } from '../constants/produtoOpcoes'
import { formatarMoeda } from '../utils/formatters'

const API_URL = 'http://localhost:5000'

const FORM_VAZIO = { tipo: '', tamanho: '', descricao: '', codigo_barras: '', valor_custo: '', valor_venda: '', quantidade: '' }

function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [form, setForm] = useState(FORM_VAZIO)
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [imagemAtual, setImagemAtual] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const fileInputRef = useRef(null)

  const carregarProdutos = async () => {
    try {
      console.log('Carregando produtos...')
      const res = await axios.get(`${API_URL}/api/produtos`)
      console.log('Resposta:', res.data)
      setProdutos(res.data)
    } catch (error) {
      console.error('Erro ao carregar:', error)
    }
  }

  useEffect(() => {
    carregarProdutos()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'tipo') {
      // ao trocar o produto, o tamanho selecionado pode nao existir mais nas opcoes
      setForm({ ...form, tipo: value, tamanho: '' })
      return
    }
    setForm({ ...form, [name]: value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) {
      setImagem(null)
      setPreview(null)
      return
    }
    setImagem(file)
    setPreview(URL.createObjectURL(file))
  }

  const limparForm = () => {
    setForm(FORM_VAZIO)
    setImagem(null)
    setPreview(null)
    setEditingId(null)
    setImagemAtual(null)
    setMostrarForm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const iniciarEdicao = (produto) => {
    setMostrarForm(true)
    setEditingId(produto.id)
    setForm({
      tipo: produto.tipo || '',
      tamanho: produto.tamanho || '',
      descricao: produto.descricao || '',
      codigo_barras: produto.codigo_barras || '',
      valor_custo: produto.valor_custo ?? '',
      valor_venda: produto.valor_venda ?? '',
      quantidade: produto.quantidade ?? ''
    })
    setImagemAtual(produto.imagem || null)
    setImagem(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const dados = new FormData()
      dados.append('tipo', form.tipo)
      dados.append('tamanho', form.tamanho)
      dados.append('descricao', form.descricao)
      dados.append('codigo_barras', form.codigo_barras)
      dados.append('valor_custo', form.valor_custo)
      dados.append('valor_venda', form.valor_venda)
      dados.append('quantidade', form.quantidade)
      if (imagem) dados.append('imagem', imagem)

      if (editingId) {
        await axios.put(`${API_URL}/api/produtos/${editingId}`, dados)
        alert('Produto atualizado com sucesso!')
      } else {
        await axios.post(`${API_URL}/api/produtos`, dados)
        alert('Produto cadastrado!')
      }
      limparForm()
      carregarProdutos()
    } catch (error) {
      alert('Erro: ' + error.message)
    }
  }

  return (
    <div className="page">
      <h2>Gestao de Produtos</h2>

      {!mostrarForm && (
        <button onClick={() => setMostrarForm(true)} style={{ marginBottom: '20px' }}>
          + Cadastrar Novo Produto
        </button>
      )}

      {mostrarForm && (
      <div className="form-section">
        <h3>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
        <form onSubmit={handleSubmit}>
          <select name="tipo" value={form.tipo} onChange={handleChange} required>
            <option value="">Selecione o Produto</option>
            {TIPOS_PRODUTO.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select name="tamanho" value={form.tamanho} onChange={handleChange} required disabled={!form.tipo}>
            <option value="">{form.tipo ? 'Selecione o Tamanho' : 'Selecione o Produto primeiro'}</option>
            {(TAMANHOS_POR_TIPO[form.tipo] || []).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <input type="text" name="descricao" placeholder="Descricao" value={form.descricao} onChange={handleChange} />
          <input type="text" name="codigo_barras" placeholder="Codigo de Barras" value={form.codigo_barras} onChange={handleChange} />
          <input type="number" step="0.01" name="valor_custo" placeholder="Valor Custo" value={form.valor_custo} onChange={handleChange} required />
          <input type="number" step="0.01" name="valor_venda" placeholder="Valor Venda" value={form.valor_venda} onChange={handleChange} required />
          <input type="number" name="quantidade" placeholder="Quantidade" value={form.quantidade} onChange={handleChange} required />

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#333' }}>
              Imagem do Produto
            </label>
            <input type="file" name="imagem" accept="image/png, image/jpeg, image/jpg, image/gif, image/webp" capture="environment" onChange={handleFileChange} ref={fileInputRef} />
            <small style={{ display: 'block', color: '#888', marginTop: '4px' }}>
              {editingId ? 'Selecione uma nova imagem apenas se quiser trocar a atual' : 'Tire uma foto do produto ou escolha uma imagem do dispositivo'}
            </small>
          </div>

          {preview ? (
            <div>
              <img
                src={preview}
                alt="Preview"
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
          ) : imagemAtual ? (
            <div>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>Imagem atual:</p>
              <img
                src={`${API_URL}/${imagemAtual}`}
                alt="Imagem atual"
                style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit">{editingId ? 'Atualizar Cadastro' : 'Salvar'}</button>
            <button type="button" onClick={limparForm} style={{ background: '#999' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
      )}

      <h3>Produtos Cadastrados ({produtos.length})</h3>
      {produtos.length > 0 ? (
        <table className="products-table">
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Produto</th>
              <th>Tamanho</th>
              <th>Descricao</th>
              <th>Cod. Barras</th>
              <th>Valor Custo</th>
              <th>Valor Venda</th>
              <th>Quantidade</th>
              <th>Acao</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.imagem ? (
                    <img
                      src={`${API_URL}/${p.imagem}`}
                      alt={p.nome}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '6px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>
                      sem foto
                    </div>
                  )}
                </td>
                <td>{p.tipo}</td>
                <td>{p.tamanho}</td>
                <td>{p.descricao}</td>
                <td>{p.codigo_barras || '-'}</td>
                <td>{formatarMoeda(p.valor_custo)}</td>
                <td>{formatarMoeda(p.valor_venda)}</td>
                <td>{p.quantidade}</td>
                <td>
                  <button onClick={() => iniciarEdicao(p)} style={{background: '#667eea', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum produto</p>
      )}
    </div>
  )
}

export default Produtos
