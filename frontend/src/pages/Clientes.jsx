import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL } from '../config'

const FORM_VAZIO = { nome: '', cpf: '', telefone: '', endereco: '', data_aniversario: '' }

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORM_VAZIO)
  const [editingId, setEditingId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    carregarClientes()
  }, [])

  const carregarClientes = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/clientes`)
      setClientes(res.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Erro:', error)
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const limparForm = () => {
    setForm(FORM_VAZIO)
    setEditingId(null)
    setMostrarForm(false)
  }

  const iniciarEdicao = (cliente) => {
    setMostrarForm(true)
    setEditingId(cliente.id)
    setForm({
      nome: cliente.nome || '',
      cpf: cliente.cpf || '',
      telefone: cliente.telefone || '',
      endereco: cliente.endereco || '',
      data_aniversario: cliente.data_aniversario || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/clientes/${editingId}`, form)
        alert('Cliente atualizado com sucesso!')
      } else {
        await axios.post(`${API_URL}/api/clientes`, form)
        alert('Cliente cadastrado com sucesso!')
      }
      limparForm()
      carregarClientes()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar')
    }
  }

  return (
    <div className="page">
      <h2>Gestao de Clientes</h2>

      {!mostrarForm && (
        <button onClick={() => setMostrarForm(true)} style={{ marginBottom: '20px' }}>
          + Cadastrar Novo Cliente
        </button>
      )}

      {mostrarForm && (
      <div className="form-section">
        <h3>{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
        <form onSubmit={handleSubmit}>
          <input type="text" name="nome" placeholder="Nome Completo" value={form.nome} onChange={handleChange} required />
          <input type="text" name="cpf" placeholder="CPF" value={form.cpf} onChange={handleChange} />
          <input type="tel" name="telefone" placeholder="Telefone" value={form.telefone} onChange={handleChange} required />
          <input type="text" name="endereco" placeholder="Endereco" value={form.endereco} onChange={handleChange} required />
          <input type="date" name="data_aniversario" placeholder="Data de Aniversario" value={form.data_aniversario} onChange={handleChange} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit">{editingId ? 'Atualizar Cadastro' : 'Salvar'}</button>
            <button type="button" onClick={limparForm} style={{ background: '#999' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
      )}

      <h3>Clientes Cadastrados</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : clientes && clientes.length > 0 ? (
        <table className="clients-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Endereco</th>
              <th>Aniversario</th>
              <th>Acao</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(cliente => (
              <tr key={cliente.id}>
                <td>{cliente.nome}</td>
                <td>{cliente.cpf}</td>
                <td>{cliente.telefone}</td>
                <td>{cliente.endereco}</td>
                <td>{cliente.data_aniversario}</td>
                <td>
                  <button onClick={() => iniciarEdicao(cliente)} style={{background: '#667eea', color: 'white', padding: '5px 10px', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum cliente cadastrado</p>
      )}
    </div>
  )
}

export default Clientes
