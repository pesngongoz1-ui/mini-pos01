'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function HistoryPage() {
  const [sales, setSales] = useState([])

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    const { data } = await supabase.from('sales').select('*').order('sold_at', { ascending: false })
    setSales(data || [])
  }

  const totalRevenue = sales.reduce((sum, item) => sum + Number(item.total_price), 0)

  return (
    <div>
      <h1>📊 ประวัติการขาย</h1>

      <div className="card" style={{ textAlign: 'center', background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
        <h3 style={{ color: '#166534' }}>ยอดขายรวมทั้งหมด (Total Revenue)</h3>
        <h1 style={{ fontSize: '40px', color: '#15803d', marginTop: '10px' }}>{totalRevenue.toLocaleString()} บาท</h1>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>วัน-เวลาที่ขาย</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id}>
                <td>{new Date(s.sold_at).toLocaleString('th-TH')}</td>
                <td>{s.product_name}</td>
                <td>{s.quantity}</td>
                <td style={{ fontWeight: 'bold' }}>{s.total_price} ฿</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
