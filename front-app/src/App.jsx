import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

const DEFAULT_FLAVOR = {
  nombre: '',
  descripcion: '',
  disponible: true,
}

const DEFAULT_ORDER = {
  cliente: '',
  sabor_id: '',
  tamano: 'vaso',
}

const statusOptions = ['pendiente', 'preparando', 'entregado']

const badgeClass = {
  pendiente: 'badge badge-pending',
  preparando: 'badge badge-preparing',
  entregado: 'badge badge-delivered',
  disponible: 'badge badge-available',
  noDisponible: 'badge badge-unavailable',
}

function Section({ title, intro, children }) {
  return (
    <section className="card">
      <div className="section-header">
        <h2>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      {children}
    </section>
  )
}

function Table({ columns, data, emptyMessage }) {
  if (data.length === 0) {
    return <p className="muted">{emptyMessage}</p>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id ?? row.pedido_id}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row[column.key], row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FlavorColumns = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'descripcion', label: 'Descripcion' },
  {
    key: 'disponible',
    label: 'Disponibilidad',
    render: (value) => (
      <span className={value ? badgeClass.disponible : badgeClass.noDisponible}>
        {value ? 'Disponible' : 'No disponible'}
      </span>
    ),
  },
]

const OrderColumns = [
  { key: 'id', label: 'ID' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'sabor_id', label: 'Sabor' },
  { key: 'tamano', label: 'Tamano' },
  {
    key: 'estado',
    label: 'Estado',
    render: (value) => <span className={badgeClass[value] ?? 'badge'}>{value}</span>,
  },
]

function App() {
  const [flavors, setFlavors] = useState([])
  const [orders, setOrders] = useState([])
  const [flavorsLoading, setFlavorsLoading] = useState(false)
  const [flavorsError, setFlavorsError] = useState('')
  const [ordersError, setOrdersError] = useState('')

  const [flavorForm, setFlavorForm] = useState(DEFAULT_FLAVOR)
  const [orderForm, setOrderForm] = useState(DEFAULT_ORDER)
  const [orderStatusId, setOrderStatusId] = useState('')
  const [orderStatus, setOrderStatus] = useState(null)
  const [orderStatusError, setOrderStatusError] = useState('')
  const [notifications, setNotifications] = useState([])

  const apiHeaders = useMemo(() => ({ 'Content-Type': 'application/json' }), [])

  const pushNotification = (message, variant = 'success') => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 4200)
  }

  const fetchFlavors = async () => {
    setFlavorsLoading(true)
    setFlavorsError('')
    try {
      const response = await fetch(`${API_BASE}/sabores`)
      if (!response.ok) throw new Error(`Error al cargar sabores (${response.status})`)
      const data = await response.json()
      setFlavors(data)
      return data
    } catch (error) {
      setFlavorsError(error.message)
      return []
    } finally {
      setFlavorsLoading(false)
    }
  }

  const fetchOrders = async () => {
    setOrdersError('')
    try {
      const response = await fetch(`${API_BASE}/pedidos`)
      if (!response.ok) throw new Error(`Error al cargar pedidos (${response.status})`)
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      setOrders([])
      setOrdersError(error.message)
    }
  }

  useEffect(() => {
    fetchFlavors()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleFlavorChange = (field, value) => {
    setFlavorForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleOrderChange = (field, value) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }))
  }

  const createFlavor = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/sabores`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          ...flavorForm,
          disponible: flavorForm.disponible === true || flavorForm.disponible === 'true',
        }),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail.detail ?? 'No se pudo crear el sabor')
      }
      pushNotification('Sabor creado correctamente')
      setFlavorForm(DEFAULT_FLAVOR)
      fetchFlavors()
    } catch (error) {
      pushNotification(error.message, 'error')
    }
  }

  const createOrder = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch(`${API_BASE}/pedidos`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          ...orderForm,
          sabor_id: Number(orderForm.sabor_id),
        }),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail.detail ?? 'No se pudo registrar el pedido')
      }
      const data = await response.json()
      pushNotification(`Pedido ${data.id} creado en estado ${data.estado}`)
      setOrderStatusId(String(data.id))
      setOrderForm(DEFAULT_ORDER)
      fetchOrders()
    } catch (error) {
      pushNotification(error.message, 'error')
    }
  }

  const checkOrderStatus = async (event) => {
    event?.preventDefault()
    if (!orderStatusId) return
    setOrderStatusError('')
    try {
      const response = await fetch(`${API_BASE}/pedidos/${orderStatusId}/estado`)
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail.detail ?? 'No se pudo consultar el estado')
      }
      const data = await response.json()
      setOrderStatus(data)
    } catch (error) {
      setOrderStatus(null)
      setOrderStatusError(error.message)
    }
  }

  return (
    <div className="layout">
      <div className="main-content">
        <aside className="sidebar">
          <div className="brand">
            <span role="img" aria-label="helado">
              🍦
            </span>
            Cookies & Cream Ops
          </div>
          <p className="sidebar-text">
            Usa este panel para registrar sabores y pedidos. Cada cambio se refleja en la API documentada con Mintlify.
          </p>
          <ol>
            <li>Revisa la tabla de sabores para detectar ID disponibles.</li>
            <li>Registra pedidos y consulta su estado para actualizarlos en cocina.</li>
            <li>Comparte el estado con clientes usando el ID de pedido.</li>
          </ol>
        </aside>

        <main className="container">
        <header>
          <h1>Panel Cookies & Cream</h1>
          <p>Controla sabores, pedidos y seguimiento desde una unica vista.</p>
        </header>

        {notifications.length > 0 && (
          <div className="notifications">
            {notifications.map((note) => (
              <div key={note.id} className={`toast ${note.variant}`}>
                {note.message}
              </div>
            ))}
          </div>
        )}

        <Section
          title="Catalogo de sabores"
          intro="Consulta la lista actualizada de sabores y crea nuevas opciones para integraciones omnicanal."
        >
          {flavorsLoading && <p>Cargando sabores...</p>}
          {flavorsError && <p className="error">{flavorsError}</p>}
          {!flavorsLoading && !flavorsError && (
            <>
              <Table columns={FlavorColumns} data={flavors} emptyMessage="No hay sabores registrados todavia." />
              <form className="form" onSubmit={createFlavor}>
                <h3>Registrar nuevo sabor</h3>
                <label>
                  Nombre
                  <input
                    value={flavorForm.nombre}
                    onChange={(e) => handleFlavorChange('nombre', e.target.value)}
                    placeholder="Ej. Cookies & Cream Clasico"
                    required
                  />
                </label>
                <label>
                  Descripcion
                  <textarea
                    value={flavorForm.descripcion}
                    onChange={(e) => handleFlavorChange('descripcion', e.target.value)}
                    placeholder="Describe ingredientes clave o notas de sabor"
                    required
                  />
                </label>
                <label>
                  Disponible
                  <select
                    value={String(flavorForm.disponible)}
                    onChange={(e) => handleFlavorChange('disponible', e.target.value === 'true')}
                  >
                    <option value="true">Si</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <button type="submit">Guardar sabor</button>
              </form>
            </>
          )}
        </Section>

        <Section
          title="Pedidos omnicanal"
          intro="Registra pedidos nuevos y visualiza los mas recientes para apoyar a cocina y reparto."
        >
          <div className="orders-layout">
            <form className="form" onSubmit={createOrder}>
              <h3>Registrar pedido</h3>
              <label>
                Cliente
                <input
                  value={orderForm.cliente}
                  onChange={(e) => handleOrderChange('cliente', e.target.value)}
                  placeholder="Nombre y apellido"
                  required
                />
              </label>
              <label>
                Sabor disponible
                <select
                  value={orderForm.sabor_id}
                  onChange={(e) => handleOrderChange('sabor_id', e.target.value)}
                  required
                >
                  <option value="">Selecciona un sabor</option>
                  {flavors
                    .filter((flavor) => flavor.disponible)
                    .map((flavor) => (
                      <option key={flavor.id} value={flavor.id}>
                        {flavor.nombre} (ID {flavor.id})
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Tamano
                <select value={orderForm.tamano} onChange={(e) => handleOrderChange('tamano', e.target.value)}>
                  <option value="cono">Cono</option>
                  <option value="vaso">Vaso</option>
                  <option value="litro">Litro</option>
                </select>
              </label>
              <button type="submit">Crear pedido</button>
            </form>

            <div>
              <h3>Pedidos recientes</h3>
              {ordersError ? (
                <p className="error">{ordersError}</p>
              ) : (
                <Table columns={OrderColumns} data={orders.slice(-5).reverse()} emptyMessage="Aun no hay pedidos." />
              )}
            </div>
          </div>
        </Section>

        <Section
          title="Seguimiento rapido"
          intro="Comparte el estado actual con clientes o contact center usando el ID de pedido."
        >
          <form className="form inline" onSubmit={checkOrderStatus}>
            <label>
              ID del pedido
              <input
                type="number"
                min="1"
                value={orderStatusId}
                onChange={(e) => setOrderStatusId(e.target.value)}
                placeholder="Ej. 1"
                required
              />
            </label>
            <button type="submit">Consultar</button>
          </form>

          {orderStatus && (
            <div className="status-card">
              <h4>Pedido #{orderStatus.pedido_id}</h4>
              <p>
                Estado:{' '}
                <span className={badgeClass[orderStatus.estado] ?? 'badge'}>
                  {orderStatus.estado}
                </span>
              </p>
            </div>
          )}
          {orderStatusError && <p className="error">{orderStatusError}</p>}

          <div className="status-table">
            <Table
              columns={[
                { key: 'estado', label: 'Estado' },
                { key: 'descripcion', label: 'Uso recomendado' },
              ]}
              data={statusOptions.map((estado, index) => ({
                id: index,
                estado: <span className={badgeClass[estado]}>{estado}</span>,
                descripcion:
                  estado === 'pendiente'
                    ? 'Recien tomado, aun no entra a produccion.'
                    : estado === 'preparando'
                    ? 'En cocina o ruta; notifica cuando se acerque el reparto.'
                    : 'Pedido entregado, listo para cerrar.'
              }))}
              emptyMessage=""
            />
          </div>
        </Section>
      </main>
      </div>
    </div>
  )
}

export default App
