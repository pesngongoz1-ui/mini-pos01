'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SellPage() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cart, setCart] = useState([])

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  function addToCart() {
    if (!selectedProductId) return
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    const existing = cart.find(item => item.id === product.id)
    const currentQtyInCart = existing ? existing.qty : 0
    const newQty = currentQtyInCart + Number(quantity)

    if (newQty > product.stock) {
      alert(`สต๊อกไม่พอ! มีสินค้าเหลือเพียง ${product.stock} ${product.unit}`)
      return
    }

    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: newQty } : item))
    } else {
      setCart([...cart, { ...product, qty: Number(quantity) }])
    }
    setQuantity(1)
  }

  function removeFromCart(id) {
    setCart(cart.filter(item => item.id !== id))
  }

  const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)

  async function handleCheckout() {
    if (cart.length === 0) return

    for (const item of cart) {
      // 1. ตรวจสอบสต๊อกล่าสุดก่อนขาย
      const { data: p } = await supabase.from('products').select('stock').eq('id', item.id).single()
      if (!p || p.stock < item.qty) {
        alert(`สินค้า ${item.name} มีสต๊อกไม่พอในการขาย`)
        return
      }

      // 2. ลงตาราง sales
      await supabase.from('sales').insert([{
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        total_price: item.price * item.qty
      }])

      // 3. ตัดสต๊อก
      await supabase.from('products').update({
        stock: p.stock - item.qty
      }).eq('id', item.id)
    }

    alert('✅ ยืนยันการขายสำเร็จ!')
    setCart([])
    fetchProducts()
  }

  return (
    <div>
      <h1>🛒 หน้าขายสินค้า</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div>
          <div className="card">
            <h3>เลือกสินค้า</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                <option value="">-- เลือกรายการสินค้า --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} ({p.price} ฿) - คงเหลือ {p.stock} {p.unit}
                  </option>
                ))}
              </select>
              <input type="number" min="1" style={{ width: '80px' }} value={quantity} onChange={e => setQuantity(e.target.value)} />
              <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={addToCart}>+ เพิ่มเข้าตะกร้า</button>
            </div>
          </div>

          <div className="card">
            <h3>รายการในตะกร้า</h3>
            <table>
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>ราคา</th>
                  <th>จำนวน</th>
                  <th>รวม</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.price} ฿</td>
                    <td>{item.qty}</td>
                    <td>{item.price * item.qty} ฿</td>
                    <td><button className="btn-danger" onClick={() => removeFromCart(item.id)}>ลบ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card" style={{ textAlign: 'center', background: '#eff6ff', border: '2px solid #bfdbfe' }}>
            <h2>ยอดขายรวมทั้งหมด</h2>
            <h1 style={{ fontSize: '48px', color: '#2563eb', margin: '15px 0' }}>{grandTotal.toLocaleString()} ฿</h1>
            <button className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '18px' }} onClick={handleCheckout} disabled={cart.length === 0}>
              ✅ ยืนยันการขาย
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
