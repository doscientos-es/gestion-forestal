import { useState, type FormEvent } from 'react'

import type { Purchase, Workshop } from '../domain/model'
import { addProduct, addPurchase, receivePurchase } from '../domain/workshop'
import { Badge, Empty, Field, ProjectSelect, Section, eurosToCents, money, uid, type Change } from './shared'

export function InventoryPage({ state, change }: { state: Workshop; change: Change }) {
  const [adding, setAdding] = useState(false)
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (change((current) => addProduct(current, { id: uid(), name: String(data.get('name')).trim(), sku: String(data.get('sku')).trim(), supplier: String(data.get('supplier')).trim(), location: String(data.get('location')).trim(), stock: Number(data.get('stock')), minimum: Number(data.get('minimum')), cost: eurosToCents(String(data.get('cost'))) }))) setAdding(false)
  }
  return <div className="rr-stack"><div className="rr-heading"><div><span className="rr-eyebrow">PIEZAS Y CONSUMIBLES</span><h1>Inventario</h1><p>Existencias, ubicación y coste de las piezas del taller.</p></div><button className="rr-button" onClick={() => setAdding(!adding)}>{adding ? 'Cancelar' : '+ Nueva pieza'}</button></div>
    {adding && <Section title="Nueva pieza"><form className="rr-form-grid" onSubmit={save}><Field label="Referencia"><input name="sku" required /></Field><Field label="Pieza"><input name="name" required /></Field><Field label="Proveedor"><input name="supplier" required /></Field><Field label="Ubicación"><input name="location" required /></Field><Field label="Stock inicial"><input name="stock" type="number" min="0" step="1" defaultValue="0" required /></Field><Field label="Stock mínimo"><input name="minimum" type="number" min="0" step="1" defaultValue="1" required /></Field><Field label="Coste unitario (€)"><input name="cost" type="number" min="0" step="0.01" required /></Field><button className="rr-button">Guardar pieza</button></form></Section>}
    <Section title="Almacén" subtitle="El consumo desde un parte descuenta stock; la recepción confirmada lo incrementa."><div className="rr-table-wrap"><table><thead><tr><th>Referencia / pieza</th><th>Proveedor</th><th>Ubicación</th><th>Existencias</th><th>Coste</th><th>Estado</th></tr></thead><tbody>{state.products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.sku}</small></td><td>{product.supplier}</td><td>{product.location}</td><td>{product.stock} <small>mín. {product.minimum}</small></td><td>{money(product.cost)}</td><td>{product.stock <= product.minimum ? <Badge tone="amber">Reponer</Badge> : <Badge tone="green">Disponible</Badge>}</td></tr>)}</tbody></table></div></Section>
  </div>
}

export function PurchasesPage({ state, change }: { state: Workshop; change: Change }) {
  const [adding, setAdding] = useState(false)
  const [projectId, setProjectId] = useState('')
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const purchase: Purchase = { id: uid(), reference: `PED-${String(Date.now()).slice(-6)}`, projectId: projectId || null, productId: String(data.get('product')), quantity: Number(data.get('quantity')), received: null, status: 'pendiente' }
    if (change((current) => addPurchase(current, purchase))) { setAdding(false); setProjectId('') }
  }
  return <div className="rr-stack"><div className="rr-heading"><div><span className="rr-eyebrow">PROVEEDORES Y RECEPCIONES</span><h1>Compras</h1><p>Pedidos vinculados a proyectos y comprobación de albaranes.</p></div><button className="rr-button" onClick={() => setAdding(!adding)}>{adding ? 'Cancelar' : '+ Nuevo pedido'}</button></div>
    {adding && <Section title="Nuevo pedido" subtitle="Registro interno de ejemplo; no se envía al proveedor."><form className="rr-form-grid" onSubmit={save}><Field label="Pieza"><select name="product" required defaultValue=""><option value="">Selecciona una pieza</option>{state.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.supplier}</option>)}</select></Field><Field label="Cantidad"><input name="quantity" type="number" min="1" step="1" defaultValue="1" required /></Field><Field label="Proyecto (opcional)"><ProjectSelect projects={state.projects} value={projectId} onChange={setProjectId} placeholder="Compra general" /></Field><button className="rr-button">Crear pedido</button></form></Section>}
    <Section title="Pedidos y recepciones" subtitle="Una pieza por pedido en esta demo. Confirma diferencias antes de modificar el stock.">{state.purchases.length ? <div className="rr-list">{state.purchases.map((purchase) => <PurchaseRow key={purchase.id} purchase={purchase} state={state} change={change} />)}</div> : <Empty>No hay pedidos todavía.</Empty>}</Section>
  </div>
}

function PurchaseRow({ purchase, state, change }: { purchase: Purchase; state: Workshop; change: Change }) {
  const [receiving, setReceiving] = useState(false)
  const [quantity, setQuantity] = useState(String(purchase.quantity))
  const [confirmed, setConfirmed] = useState(false)
  const product = state.products.find((item) => item.id === purchase.productId)
  const project = state.projects.find((item) => item.id === purchase.projectId)
  const different = Number(quantity) !== purchase.quantity
  return <div className="rr-purchase"><div className="rr-list-row"><div><strong>{purchase.reference} · {product?.name ?? 'Pieza no disponible'}</strong><p>{product?.supplier} · {project ? `${project.reference} · ${project.vehicle}` : 'Compra general'} · Pedido: {purchase.quantity} uds.</p>{purchase.status === 'recibido' && <p>Recibido: {purchase.received} uds. {purchase.received !== purchase.quantity && '· Diferencia confirmada'}</p>}</div><div className="rr-actions"><Badge tone={purchase.status === 'pendiente' ? 'amber' : 'green'}>{purchase.status}</Badge>{purchase.status === 'pendiente' && <button className="rr-button rr-button-light" onClick={() => setReceiving(!receiving)}>{receiving ? 'Cerrar' : 'Revisar recepción'}</button>}</div></div>
    {receiving && <form className="rr-receipt" onSubmit={(event) => { event.preventDefault(); if (change((current) => receivePurchase(current, purchase.id, Number(quantity), confirmed))) setReceiving(false) }}><Field label="Cantidad recibida"><input type="number" min="0" step="1" required value={quantity} onChange={(event) => { setQuantity(event.target.value); setConfirmed(false) }} /></Field>{different && <label className="rr-warning"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Hay una diferencia respecto a las {purchase.quantity} unidades pedidas. Confirmo cerrar la recepción con {quantity || '0'} unidades.</label>}<button className="rr-button" type="submit">Confirmar recepción</button><small>Se sumará solo la cantidad recibida. Esta demo cierra el pedido; no gestiona entregas pendientes.</small></form>}
  </div>
}