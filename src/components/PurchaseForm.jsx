import { useState, useRef } from 'react' // 1. Importamos useRef
import { Link } from 'react-router-dom'   // 2. Importamos Link
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
  
  // Referencia para limpiar el input file sin usar document.getElementById
  const fileInputRef = useRef(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'El archivo no debe superar 5MB' })
        // Limpiamos el input si el archivo es muy grande
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Solo se permiten imágenes' })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setFormData(prev => ({ ...prev, comprobante: file }))
      setMessage({ type: '', text: '' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

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
      // Sanear el nombre del archivo para evitar caracteres raros
      const fileExt = formData.comprobante.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, formData.comprobante)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath)

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

      setMessage({ 
        type: 'success', 
        text: '¡Compra registrada exitosamente! Pronto verificaremos tu pago.' 
      })
      
      setFormData({
        nombre: '',
        email: '',
        codigo_referido: '',
        comprobante: null
      })
      
      // Limpiar el input file usando la referencia (Forma correcta en React)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Error details:', error) // Mejor debug
      setMessage({ 
        type: 'error', 
        text: 'Error al registrar la compra. Intenta nuevamente.' 
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
      
      {/* CAMBIO: Usamos Link en lugar de <a> para navegación interna */}
      <Link 
        to="/admin" 
        className="admin-button"
        title="Panel Administrativo"
      >
        🔐
      </Link>

      <div className="form-card">
        <div className="icon-circle">
          <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1>Confirma tu Compra</h1>
        <p className="subtitle">Ingresa tu código de referido y carga el comprobante de pago.</p>

        <form onSubmit={handleSubmit}>
          {/* ... (Inputs de nombre y email igual que antes) ... */}
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
              ref={fileInputRef}  // Agregamos la referencia aquí
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