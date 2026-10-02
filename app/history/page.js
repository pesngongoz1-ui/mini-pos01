'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function HistoryPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    setLoading(true)
    // เปลี่ยนจาก sold_at เป็น created_at ให้ตรงกับหน้าขาย (app/sell/page.js)
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales:', error.message)
    } else {
      setSales(data || [])
    }
    setLoading(false)
  }

  const totalRevenue = sales.reduce((sum, item) => sum + Number(item.total_price || 0), 0)

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>📊 ประวัติการขาย</h1>

      <div className="card" style={{ textAlign: 'center', background: '#f0fdf4', border: '2px solid #bbf7d0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#166534', margin: 0 }}>ยอดขายรวมทั้งหมด (Total Revenue)</h3>
        <h1 style={{ fontSize: '40px', color: '#15803d', marginTop: '10px', marginBottom: 0 }}>
          {totalRevenue.toLocaleString()} บาท
        </h1>
      </div>

      <div className="card" style={{ padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        {loading ? (
          <p style={{ textAlign: 'center' }}>กำลังโหลดข้อมูล...</p>
        ) : sales.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>ยังไม่มีประวัติการขาย</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>วัน-เวลาที่ขาย</th>
                <th style={{ padding: '8px' }}>ชื่อสินค้า</th>
                <th style={{ padding: '8px' }}>จำนวน</th>
                <th style={{ padding: '8px' }}>ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleString('th-TH') : '-'}
                  </td>
                  <td style={{ padding: '8px' }}>{s.product_name || '-'}</td>
                  <td style={{ padding: '8px' }}>{s.quantity}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>
                    {Number(s.total_price).toLocaleString()} ฿
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
