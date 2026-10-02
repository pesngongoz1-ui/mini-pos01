'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SellPage() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // โหลดรายการสินค้าจาก Supabase
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*')
    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
  }

  // -------------------------------------------------------------
  // ฟังก์ชันสำหรับส่งข้อความแจ้งเตือนไปยัง Telegram
  // -------------------------------------------------------------
  const sendTelegramNotification = async (messageText) => {
    const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID

    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn('Telegram Config ไม่ครบถ้วน (ตรวจสอบ Environment Variables)')
      return
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
        }),
      })

      const data = await response.json()
      if (!data.ok) {
        console.error('Telegram API Error:', data.description)
      }
    } catch (err) {
      // ครอบ try-catch เพื่อไม่ให้กระทบต่อระบบขาย หากการส่ง Telegram มีปัญหา
      console.error('Failed to send Telegram notification:', err)
    }
  }

  // -------------------------------------------------------------
  // ฟังก์ชันตัดสต็อกและบันทึกการขาย
  // -------------------------------------------------------------
  const handleSell = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 1. ค้นหาสินค้าที่เลือก
      const product = products.find((p) => p.id.toString() === selectedProductId.toString())
      if (!product) {
        setMessage('❌ กรุณาเลือกสินค้า')
        setLoading(false)
        return
      }

      const qtyToSell = parseInt(quantity, 10)
      if (isNaN(qtyToSell) || qtyToSell <= 0) {
        setMessage('❌ กรุณาระบุจำนวนที่ถูกต้อง')
        setLoading(false)
        return
      }

      // ตรวจสอบว่าสต็อกพอขายหรือไม่
      if (product.stock < qtyToSell) {
        setMessage(`❌ สต็อกไม่พอ (คงเหลือ ${product.stock} ชิ้น)`)
        setLoading(false)
        return
      }

      const newStock = product.stock - qtyToSell
      const totalPrice = product.price * qtyToSell

      // 2. ตัดสต็อกสินค้าใน Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id)

      if (updateError) {
        throw updateError
      }

      // 3. (Optional) บันทึกประวัติการขายลงตาราง sales/orders
      await supabase.from('sales').insert([
        {
          product_id: product.id,
          product_name: product.name,
          quantity: qtyToSell,
          total_price: totalPrice,
          created_at: new Date().toISOString(),
        },
      ])

      // 4. แจ้งเตือนขายสำเร็จในเว็บ
      setMessage(`✅ ขายสำเร็จ! ${product.name} จำนวน ${qtyToSell} ชิ้น (ราคารวม ${totalPrice.toLocaleString()} บาท)`)

      // อัปเดต state รายการสินค้าหน้าเว็บ
      fetchProducts()
      setSelectedProductId('')
      setQuantity(1)

      // ---------------------------------------------------------
      // 5. ส่งการแจ้งเตือน Telegram (Async / Non-blocking)
      // ---------------------------------------------------------
      const currentTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })

      // งานที่ 1: แจ้งเตือน Order เข้า (New Order Alert)
      const newOrderMsg = `🛒 <b>มีรายการขายใหม่!</b>
• สินค้า: <b>${product.name}</b>
• จำนวน: <b>${qtyToSell}</b> ชิ้น
• ราคารวม: <b>${totalPrice.toLocaleString()}</b> บาท
• สต็อกคงเหลือปัจจุบัน: <b>${newStock}</b> ชิ้น
• เวลา: ${currentTime}`

      await sendTelegramNotification(newOrderMsg)

      // งานที่ 2: แจ้งเตือน Stock เหลือน้อย (Low Stock Alert <= 5)
      if (newStock <= 5) {
        const lowStockMsg = `🚨 <b>[เตือนภัย] สต็อกสินค้าเหลือน้อย!</b>
• สินค้า: <b>${product.name}</b>
• คงเหลือเพียง: <b>${newStock}</b> ชิ้น
⚠️ กรุณาเติมสต็อกสินค้าด่วน!`

        await sendTelegramNotification(lowStockMsg)
      }

    } catch (err) {
      console.error('Sale failed:', err)
      setMessage('❌ เกิดข้อผิดพลาดในการตัดสต็อกสินค้า')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🛒 ระบบขายสินค้า (POS)</h1>

      {message && (
        <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', backgroundColor: '#f0f0f0' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSell}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>เลือกสินค้า:</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          >
            <option value="">-- เลือกสินค้า --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {p.price} บาท (คงเหลือ: {p.stock} ชิ้น)
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>จำนวนที่ขาย:</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'กำลังทำรายการ...' : 'ยืนยันการขาย'}
        </button>
      </form>
    </div>
  )
}
