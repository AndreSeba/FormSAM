import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import './AdminPanel.css'

export default function AdminPanel() {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 1. MEJORA: Manejo de sesión más robusto con listener
  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios en la autenticación (Login/Logout automáticos)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. MEJORA: Fetch inicial + Suscripción en Tiempo Real (Realtime)
  useEffect(() => {
    if (!user) return

    // Carga inicial de datos
    const fetchPurchases = async () => {
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setPurchases(data)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchPurchases()

    // Configurar suscripción Realtime
    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Escuchar solo nuevas inserciones
          schema: 'public',
          table: 'purchases',
        },
        (payload) => {
          // Agregar la nueva compra al principio de la lista instantáneamente
          setPurchases((currentPurchases) => [payload.new, ...currentPurchases])
        }
      )
      .subscribe()

    // Limpiar suscripción al desmontar
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // No necesitamos setUser aquí, el onAuthStateChange lo hará solo
    } catch (error) {
      setError('Credenciales incorrectas')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // No necesitamos setUser(null), el listener lo maneja
  }

  const exportToExcel = () => {
    const dataToExport = purchases.map(purchase => ({
      'ID': purchase.id,
      'Nombre': purchase.nombre || 'N/A',
      'Email': purchase.email || 'N/A',
      'Código de Referido': purchase.codigo_referido,
      'URL Comprobante': purchase.comprobante_url,
      'Fecha': new Date(purchase.created_at).toLocaleString('es-ES')
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Compras')
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    saveAs(data, `compras_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filteredPurchases = purchases.filter(purchase => 
    purchase.codigo_referido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (purchase.nombre && purchase.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (purchase.email && purchase.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">
            <div className="spinner"></div> {/* Sugiero agregar CSS para spinner */}
            Cargando...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="admin-container">
        <div className="login-card">
          <h1>Panel Administrativo</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="login-button">Iniciar Sesión</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="title-section">
            <h1>Panel Administrativo</h1>
            {/* Indicador de conexión en vivo */}
            <div className="live-indicator">
                <span className="pulse-dot"></span>
                En vivo
            </div>
        </div>
        
        <div className="header-actions">
          <button onClick={exportToExcel} className="export-button">
            📊 Exportar a Excel
          </button>
          <button onClick={handleLogout} className="logout-button">
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-label">Total de Compras</div>
            <div className="stat-value">{purchases.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hoy</div>
            <div className="stat-value">
              {purchases.filter(p => {
                const today = new Date().toDateString()
                const purchaseDate = new Date(p.created_at).toDateString()
                return today === purchaseDate
              }).length}
            </div>
          </div>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Buscar por código de referido, nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Código Referido</th>
                <th>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    No hay compras registradas
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="fade-in-row"> {/* Clase para animación */}
                    <td>{new Date(purchase.created_at).toLocaleString('es-ES')}</td>
                    <td>{purchase.nombre || 'N/A'}</td>
                    <td>{purchase.email || 'N/A'}</td>
                    <td className="codigo-referido">{purchase.codigo_referido}</td>
                    <td>
                      <button
                        className="view-image-button"
                        onClick={() => setSelectedImage(purchase.comprobante_url)}
                      >
                        Ver Imagen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSelectedImage(null)}>
              ✕
            </button>
            <img src={selectedImage} alt="Comprobante" />
            <a 
              href={selectedImage} 
              target="_blank" 
              rel="noopener noreferrer"
              className="download-link"
            >
              Abrir en nueva pestaña
            </a>
          </div>
        </div>
      )}
    </div>
  )
}