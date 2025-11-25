import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './PurchaseForm.css'

export default function PurchaseForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    codigo_referido: '',
    comprobante: null
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'El archivo no debe superar 5MB' })
        return
      }
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Solo se permiten imágenes' })
        return
      }
      setFormData(prev => ({ ...prev, comprobante: file }))
      setMessage({ type: '', text: '' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    // Validaciones
    if (!formData.codigo_referido.trim()) {
      setMessage({ type: 'error', text: 'El código de referido es obligatorio' })
      return
    }

    if (!formData.comprobante) {
      setMessage({ type: 'error', text: 'Debes subir el comprobante de pago' })
      return
    }

    setLoading(true)

    try {
      // 1. Subir imagen a Storage
      const fileExt = formData.comprobante.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, formData.comprobante)

      if (uploadError) throw uploadError

      // 2. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath)

      // 3. Insertar en la base de datos
      const { error: insertError } = await supabase
        .from('purchases')
        .insert([
          {
            nombre: formData.nombre.trim() || null,
            email: formData.email.trim() || null,
            codigo_referido: formData.codigo_referido.trim(),
            comprobante_url: urlData.publicUrl
          }
        ])

      if (insertError) throw insertError

      // Éxito
      setMessage({ 
        type: 'success', 
        text: '¡Compra registrada exitosamente! Pronto verificaremos tu pago.' 
      })
      
      // Resetear formulario
      setFormData({
        nombre: '',
        email: '',
        codigo_referido: '',
        comprobante: null
      })
      // Resetear input file
      document.getElementById('file-input').value = ''

    } catch (error) {
      console.error('Error:', error)
      setMessage({ 
        type: 'error', 
        text: 'Error al registrar la compra. Por favor intenta nuevamente.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="purchase-container">
      <a 
        href="https://superticket.bo/Sabor-a-Moda/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="buy-button"
      >
        Comprar Entrada
      </a>
      <a 
        href="/admin" 
        className="admin-button"
        title="Panel Administrativo"
      >
        🔐
      </a>

      <div className="form-card">
        <div className="icon-circle">
          <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1>Confirma tu Compra</h1>
        <p className="subtitle">Ingresa tu código de referido y carga el comprobante de pago.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre (opcional)</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              placeholder="Tu nombre"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (opcional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="codigo_referido">
              Código de Referido <span className="required">*</span>
            </label>
            <input
              type="text"
              id="codigo_referido"
              name="codigo_referido"
              value={formData.codigo_referido}
              onChange={handleInputChange}
              placeholder="Introduce tu código aquí"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="file-input">
              Comprobante de Pago <span className="required">*</span>
            </label>
            <input
              type="file"
              id="file-input"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
              required
            />
            <label htmlFor="file-input" className="file-label">
              <span className="file-button">Seleccionar archivo</span>
              <span className="file-name">
                {formData.comprobante ? formData.comprobante.name : 'Ningún archivo seleccionado'}
              </span>
            </label>
            <p className="file-hint">Carga la imagen de tu comprobante aquí.</p>
          </div>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  )
}