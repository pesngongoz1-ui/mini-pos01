'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ sku: '', name: '', price: '', stock: '', unit: 'ชิ้น' })
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editId) {
      await supabase.from('products').update({
        sku: form.sku,
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        unit: form.unit
      }).eq('id', editId)
      setEditId(null)
    } else {
      await supabase.from('products').insert([{
        sku: form.sku,
        name: form.name,
        price: Number(form.price),
        stock: Number(form.stock),
        unit: form.unit
      }])
    }
    setForm({ sku: '', name: '', price: '', stock: '', unit: 'ชิ้น' })
    fetchProducts()
  }

  function handleEdit(p) {
    setEditId(p.id)
    setForm({ sku: p.sku, name: p.name, price: p.price, stock: p.stock, unit: p.unit })
  }

  async function handleDelete(id) {
    if (confirm('ต้องการลบสินค้านี้ใช่หรือไม่?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProducts()
    }
  }

  return (
    <div>
      <h1>📦 จัดการรายการสินค้า</h1>
      
      <div className="card">
        <h3>{editId ? '✏️ แก้ไขสินค้า' : '➕ เพิ่มสินค้าใหม่'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <input placeholder="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required />
          <input placeholder="ชื่อสินค้า" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input type="number" placeholder="ราคา" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
          <input type="number" placeholder="สต๊อก" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
          <input placeholder="หน่วย" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} required />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">{editId ? 'อัปเดต' : 'บันทึก'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); setForm({ sku: '', name: '', price: '', stock: '', unit: 'ชิ้น' }) }}>ยกเลิก</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อสินค้า</th>
              <th>ราคา</th>
              <th>คงเหลือ</th>
              <th>หน่วย</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.price} ฿</td>
                <td>{p.stock}</td>
                <td>{p.unit}</td>
                <td>
                  <button className="btn-warning" style={{ marginRight: '5px' }} onClick={() => handleEdit(p)}>แก้ไข</button>
                  <button className="btn-danger" onClick={() => handleDelete(p.id)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
