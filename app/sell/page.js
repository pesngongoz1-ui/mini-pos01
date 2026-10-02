'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SellPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // [{ id, name, price, unit, stock, quantity }]
  const [message, setMessage] = useState('');
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('sku', { ascending: true });
    if (data) setProducts(data);
  }

  // จำนวนที่อยู่ในตะกร้าแล้วของสินค้าแต่ละตัว (ใช้กันไม่ให้หยิบเกินสต๊อก)
  function inCart(id) {
    const item = cart.find(i => i.id === id);
    return item ? item.quantity : 0;
  }

  function addToCart(product) {
    setMessage('');
    if (inCart(product.id) >= product.stock) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(id, quantity) {
    setCart(prev =>
      prev
        .map(i => (i.id === id ? { ...i, quantity: Math.min(Math.max(quantity, 0), i.stock) } : i))
        .filter(i => i.quantity > 0)
    );
  }

  // ส่งไปให้ API Route ฝั่ง Server เป็นคนยิง Telegram (Bot Token อยู่ฝั่ง Server เท่านั้น)
  async function notifyTelegram(saleIds) {
    if (saleIds.length === 0) return;
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn('แจ้งเตือน Telegram ไม่สำเร็จ:', data.error || res.status);
      }
    } catch (err) {
      console.warn('แจ้งเตือน Telegram ไม่สำเร็จ:', err.message);
    }
  }

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  async function handleCheckout() {
    if (cart.length === 0 || selling) return;
    setSelling(true);
    setMessage('');

    // 1. ดึงสต๊อกล่าสุดจากฐานข้อมูล เผื่อมีคนอื่นขายไปก่อนหน้า
    const { data: latest, error: fetchError } = await supabase
      .from('products')
      .select('id, name, stock')
      .in('id', cart.map(i => i.id));

    if (fetchError || !latest) {
      alert('ไม่สามารถตรวจสอบสต๊อกได้ กรุณาลองใหม่');
      setSelling(false);
      return;
    }

    const shortage = cart.find(i => {
      const p = latest.find(l => l.id === i.id);
      return !p || p.stock < i.quantity;
    });
    if (shortage) {
      alert(`สินค้า "${shortage.name}" คงเหลือไม่พอ`);
      await fetchProducts();
      setSelling(false);
      return;
    }

    // 2. บันทึกรายการขาย (1 แถวต่อสินค้า 1 ชนิด) และขอ id กลับมาไว้ส่งแจ้งเตือน
    const { data: newSales, error: saleError } = await supabase
      .from('sales')
      .insert(
        cart.map(i => ({
          product_id: i.id,
          product_name: i.name,
          quantity: i.quantity,
          total_price: Number(i.price) * i.quantity,
        }))
      )
      .select('id');

    if (saleError) {
      alert('เกิดข้อผิดพลาดในการบันทึกการขาย');
      setSelling(false);
      return;
    }

    // 3. ตัดสต๊อกสินค้าทีละรายการ
    for (const i of cart) {
      const p = latest.find(l => l.id === i.id);
      await supabase.from('products').update({ stock: p.stock - i.quantity }).eq('id', i.id);
    }

    // 4. แจ้งเตือนเข้า Telegram (ยิงแล้วไม่รอผล — ถ้า Telegram มีปัญหา การขายยังสำเร็จตามปกติ)
    notifyTelegram((newSales || []).map(s => s.id));

    setMessage(`ขายสำเร็จ ${totalItems} ชิ้น รวม ฿${totalPrice.toLocaleString()}`);
    setCart([]);
    await fetchProducts();
    setSelling(false);
  }

  return (
    <div>
      {/* สรุปยอดรวม ตัวใหญ่ อยู่บนสุด ให้ทั้งคนขายและลูกค้าเห็นชัด */}
      <div className="total-banner">
        <div className="total-label">ยอดรวมทั้งหมด ({totalItems} ชิ้น)</div>
        <div className="total-amount">฿{totalPrice.toLocaleString()}</div>
        <button
          className="checkout-button"
          onClick={handleCheckout}
          disabled={cart.length === 0 || selling}
        >
          {selling ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
        </button>
      </div>

      {message && <p className="success-message">{message}</p>}

      {/* ตะกร้าสินค้า */}
      <div className="card">
        <h3>ตะกร้าสินค้า</h3>
        {cart.length === 0 ? (
          <p style={{ color: '#888', marginTop: '0.5rem' }}>ยังไม่มีสินค้าในตะกร้า — กดเลือกสินค้าด้านล่าง</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>ราคา</th>
                <th>จำนวน</th>
                <th>รวม</th>
              </tr>
            </thead>
            <tbody>
              {cart.map(i => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>฿{Number(i.price).toLocaleString()}</td>
                  <td>
                    <div className="qty-control">
                      <button onClick={() => changeQuantity(i.id, i.quantity - 1)}>−</button>
                      <span>{i.quantity}</span>
                      <button onClick={() => changeQuantity(i.id, i.quantity + 1)} disabled={i.quantity >= i.stock}>+</button>
                    </div>
                  </td>
                  <td>฿{(Number(i.price) * i.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* รายการสินค้าให้กดเพิ่มลงตะกร้า */}
      <h3>เลือกสินค้า</h3>
      <div className="product-grid">
        {products.map(p => {
          const remaining = p.stock - inCart(p.id);
          return (
            <button
              key={p.id}
              className="product-tile"
              onClick={() => addToCart(p)}
              disabled={remaining <= 0}
            >
              <span className="product-name">{p.name}</span>
              <span className="product-price">฿{Number(p.price).toLocaleString()}</span>
              <span className="product-stock">
                {remaining > 0 ? `เหลือ ${remaining} ${p.unit}` : 'หมด'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
