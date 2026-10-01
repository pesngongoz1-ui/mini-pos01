import './globals.css'

export const metadata = {
  title: 'Mini POS System',
  description: 'ระบบขายสินค้าหน้าร้าน',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <nav style={{ background: '#1e293b', padding: '15px 0', color: 'white' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
            <h2 style={{ margin: 0 }}>🍞 Mini POS</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="/" style={{ color: 'white', textDecoration: 'none' }}>📦 สินค้า</a>
              <a href="/sell" style={{ color: 'white', textDecoration: 'none' }}>🛒 ขายสินค้า</a>
              <a href="/history" style={{ color: 'white', textDecoration: 'none' }}>📊 ประวัติการขาย</a>
            </div>
          </div>
        </nav>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
}
