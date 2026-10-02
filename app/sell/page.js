'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SellPage() {
  const [loading, setLoading] = useState(false)

  // ==========================================
  // Helper Function: ส่งข้อความแจ้งเตือนเข้า Telegram
  // ==========================================
  const sendTelegramMessage = async (messageText) => {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID

    // หากไม่มีการตั้งค่า Config ให้ข้ามการส่งทันทีโดยไม่ให้กระทบระบบขาย
    if (!botToken || !chatId) {
      console.warn('Telegram Config is missing in environment variables.')
      return
    }

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
        }),
      })
    } catch (error) {
      // ดักจับ Error ไว้เพื่อไม่ให้กระทบกระบวนการขายหลัก
      console.error('Failed to send Telegram notification:', error)
    }
  }

  // ==========================================
  // Main Function: ชำระเงิน / ตัดสต็อกสินค้า
  // ==========================================
  const handleCheckout = async (product, quantity) => {
    setLoading(true)

    try {
      // 1. ดึงข้อมูลสต็อกและราคาปัจจุบันจาก Supabase
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .eq('id', product.id)
        .single()

      if (fetchError || !currentProduct) {
        throw new Error('ไม่พบข้อมูลสินค้าในระบบ')
      }

      if (currentProduct.stock < quantity) {
        throw new Error(`สินค้าในสต็อกไม่พอ (คงเหลือ ${currentProduct.stock} ชิ้น)`)
      }

      // 2. คำนวณสต็อกหลังตัด และ ราคารวม
      const updatedStock = currentProduct.stock - quantity
      const totalPrice = currentProduct.price * quantity

      // 3. อัปเดตสต็อกสินค้าใหม่ใน Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: updatedStock })
        .eq('id', product.id)

      if (updateError) throw updateError

      // 4. บันทึกประวัติการขาย (ถ้ามีตาราง sales)
      await supabase.from('sales').insert([
        {
          product_id: product.id,
          quantity: quantity,
          total_price: totalPrice,
        },
      ])

      // ==========================================
      // 5. ระบบแจ้งเตือน Telegram (Async Background Tasks)
      // ==========================================
      
      // งานที่ 1: แจ้งเตือน Order เข้า (New Order Alert)
      const orderMessage = 
        `🛍️ <b>มีรายการขายใหม่!</b>\n` +
        `- สินค้า: ${currentProduct.name}\n` +
        `- จำนวน: ${quantity} ชิ้น\n` +
        `- ราคารวม: ${totalPrice.toLocaleString()} บาท\n` +
        `- สต็อกคงเหลือปัจจุบัน: ${updatedStock} ชิ้น\n` +
        `- เวลา: ${new Date().toLocaleString('th-TH')}`

      await sendTelegramMessage(orderMessage)

      // งานที่ 2: แจ้งเตือน Stock เหลือน้อย (Low Stock Alert: Stock <= 5)
      if (updatedStock <= 5) {
        const lowStockMessage = 
          `🚨 <b>[เตือนภัย] สต็อกสินค้าใกล้หมด!</b>\n` +
          `- สินค้า: ${currentProduct.name}\n` +
          `- คงเหลือเพียง: ${updatedStock} ชิ้น\n` +
          `⚠️ กรุณาเติมสต็อกสินค้าด่วน!`

        await sendTelegramMessage(lowStockMessage)
      }

      alert('ชำระเงินและตัดสต็อกสำเร็จเรียบร้อย!')

    } catch (err) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>หน้าขายสินค้า (POS)</h1>
      {/* ส่วน UI แสดงรายการสินค้า / ปุ่มกดขายสินค้า */}
    </div>
  )
}
