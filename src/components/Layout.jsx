import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const p = location.pathname

  const logout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const navStyle = (href) => ({
    flex:1,
    display:'flex',
    flexDirection:'column',
    alignItems:'center',
    justifyContent:'center',
    padding:'8px 4px',
    textDecoration:'none',
    borderTop: p===href ? '3px solid #1565C0' : '3px solid transparent'
  })

  const labelStyle = (href) => ({
    fontSize:9,
    color: p===href ? '#1565C0' : '#9CA3AF',
    fontWeight: p===href ? 600 : 400,
    marginTop:2
  })

  return (
    <div style={{minHeight:'100vh',background:'#F0F4FF',fontFamily:'system-ui,sans-serif'}}>

      <div style={{background:'#1565C0',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'fixed',top:0,left:0,right:0,zIndex:99,boxShadow:'0 2px 10px rgba(21,101,192,0.3)'}}>
        <div>
          <div style={{color:'white',fontWeight:700,fontSize:15}}>Sales Visit Manager</div>
          <div style={{color:'rgba(255,255,255,0.7)',fontSize:11}}>Kelola Toko Kelontong</div>
        </div>
        <button onClick={logout} style={{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer'}}>
          Logout
        </button>
      </div>

      <div style={{paddingTop:64,paddingBottom:70}}>
        {children}
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid #E5E7EB',display:'flex',zIndex:99,boxShadow:'0 -2px 10px rgba(0,0,0,0.08)'}}>
        <a href="/dashboard" style={navStyle('/dashboard')}>
          <span style={{fontSize:18}}>📊</span>
          <span style={labelStyle('/dashboard')}>Dashboard</span>
        </a>
        <a href="/sales" style={navStyle('/sales')}>
          <span style={{fontSize:18}}>👥</span>
          <span style={labelStyle('/sales')}>Sales</span>
        </a>
        <a href="/visits" style={navStyle('/visits')}>
          <span style={{fontSize:18}}>📅</span>
          <span style={labelStyle('/visits')}>Kunjungan</span>
        </a>
        <a href="/expenses" style={navStyle('/expenses')}>
          <span style={{fontSize:18}}>💰</span>
          <span style={labelStyle('/expenses')}>Pengeluaran</span>
        </a>
        <a href="/ai-analysis" style={navStyle('/ai-analysis')}>
          <span style={{fontSize:18}}>🤖</span>
          <span style={labelStyle('/ai-analysis')}>AI</span>
        </a>
        <a href="/reports" style={navStyle('/reports')}>
          <span style={{fontSize:18}}>📈</span>
          <span style={labelStyle('/reports')}>Laporan</span>
        </a>
      </div>

    </div>
  )
}