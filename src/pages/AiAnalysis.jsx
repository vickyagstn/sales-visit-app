import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

const askAI = async (prompt) => {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Tidak ada respons dari AI.'
}

const MENUS = [
  { key: 'prediksiKunjungan', icon: '📅', label: 'Prediksi Kunjungan Sales', desc: 'Prediksi kapan sales akan datang kembali', color: 'bg-blue-50', iconBg: 'bg-blue-100' },
  { key: 'salesTerlambat', icon: '⚠️', label: 'Sales Terlambat Berkunjung', desc: 'Lihat sales yang sudah lama tidak datang', color: 'bg-red-50', iconBg: 'bg-red-100' },
  { key: 'prediksiPengeluaran', icon: '💰', label: 'Prediksi Pengeluaran', desc: 'Perkiraan pengeluaran bulan berikutnya', color: 'bg-purple-50', iconBg: 'bg-purple-100' },
  { key: 'rekomendasiKulakan', icon: '🛒', label: 'Rekomendasi Kulakan', desc: 'AI merekomendasikan barang untuk dikulak', color: 'bg-green-50', iconBg: 'bg-green-100' },
  { key: 'analisisPengeluaran', icon: '📊', label: 'Analisis Pengeluaran', desc: 'Lihat kategori pengeluaran terbesar', color: 'bg-orange-50', iconBg: 'bg-orange-100' },
]

export default function AiAnalysis() {
  const [activeMenu, setActiveMenu] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState({})
  const [ringkasan, setRingkasan] = useState('')
  const [ringkasanLoading, setRingkasanLoading] = useState(false)
  const [appData, setAppData] = useState({ sales: [], visits: [], expenses: [] })
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => { fetchAppData() }, [])

  const fetchAppData = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const [ss, vs, es] = await Promise.all([
      getDocs(query(collection(db, 'sales'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'visits'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))),
    ])
    setAppData({
      sales: ss.docs.map(d => ({ id: d.id, ...d.data() })),
      visits: vs.docs.map(d => ({ id: d.id, ...d.data() })),
      expenses: es.docs.map(d => ({ id: d.id, ...d.data() })),
    })
    setDataLoaded(true)
  }

  const buildContext = () => {
    const { sales, visits, expenses } = appData
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const visitsThisMonth = visits.filter(v => new Date(v.visitDate) >= firstDay).length
    const expThisMonth = expenses.filter(e => new Date(e.date) >= firstDay).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const lateSales = sales.filter(s => {
      if (!s.lastVisitDate) return false
      return Math.floor((now - new Date(s.lastVisitDate)) / (1000 * 60 * 60 * 24)) > 7
    })
    const expByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0)
      return acc
    }, {})
    return { sales, visits, visitsThisMonth, expThisMonth, totalExpenses, lateSales, expByCategory, now }
  }

  const buildPrompt = (key) => {
    const { sales, visits, visitsThisMonth, expThisMonth, totalExpenses, lateSales, expByCategory } = buildContext()
    const ctx = `Data toko kelontong:
- Total sales: ${sales.length} orang
- Kunjungan bulan ini: ${visitsThisMonth}
- Total kunjungan: ${visits.length}
- Sales terlambat (>7 hari): ${lateSales.length} orang (${lateSales.map(s => s.name).join(', ') || '-'})
- Pengeluaran bulan ini: Rp ${expThisMonth.toLocaleString('id-ID')}
- Total pengeluaran: Rp ${totalExpenses.toLocaleString('id-ID')}
- Per kategori: ${JSON.stringify(expByCategory)}
Jawab Bahasa Indonesia, singkat dan praktis maksimal 5 kalimat.`

    const prompts = {
      prediksiKunjungan: `${ctx}\n\nPrediksi kunjungan sales bulan depan dan rekomendasinya.`,
      salesTerlambat: `${ctx}\n\nAnalisis sales terlambat dan rekomendasi tindakan untuk pemilik toko.`,
      prediksiPengeluaran: `${ctx}\n\nPrediksi pengeluaran bulan depan dan kategori yang perlu dihemat.`,
      rekomendasiKulakan: `${ctx}\n\nRekomendasi strategi kulakan berdasarkan data kunjungan dan pengeluaran toko.`,
      analisisPengeluaran: `${ctx}\n\nAnalisis pola pengeluaran toko dan berikan saran efisiensi biaya.`,
      ringkasan: `${ctx}\n\nRingkasan kondisi toko secara keseluruhan dan 3 rekomendasi utama untuk meningkatkan performa.`,
    }
    return prompts[key]
  }

  const handleOpenMenu = async (key) => {
    setActiveMenu(key)
    if (results[key]) return
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const result = await askAI(buildPrompt(key))
      setResults(prev => ({ ...prev, [key]: result }))
    } catch {
      setResults(prev => ({ ...prev, [key]: 'Gagal memuat analisis. Cek API key atau koneksi.' }))
    }
    setLoading(prev => ({ ...prev, [key]: false }))
  }

  const handleRingkasan = async () => {
    setRingkasanLoading(true)
    try {
      const result = await askAI(buildPrompt('ringkasan'))
      setRingkasan(result)
    } catch {
      setRingkasan('Gagal memuat ringkasan. Cek API key atau koneksi.')
    }
    setRingkasanLoading(false)
  }

  const activeData = MENUS.find(m => m.key === activeMenu)

  // Tampilan Detail
  if (activeMenu) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveMenu(null)}
            className="text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-xl p-2 transition"
          >
            ←
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{activeData?.label}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{activeData?.desc}</p>
          </div>
        </div>

        <div className={`border rounded-2xl p-5 ${activeData?.color} border-gray-100`}>
          {loading[activeMenu] ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">AI sedang menganalisis data toko Anda...</p>
            </div>
          ) : results[activeMenu] ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{activeData?.icon}</span>
                <h3 className="font-semibold text-gray-800">Hasil Analisis AI</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{results[activeMenu]}</p>
              <button
                onClick={() => {
                  setResults(prev => ({ ...prev, [activeMenu]: null }))
                  handleOpenMenu(activeMenu)
                }}
                className="mt-4 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                🔄 Analisis Ulang
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-8">Memuat analisis...</p>
          )}
        </div>
      </div>
    )
  }

  // Tampilan Utama (Grid + Ringkasan)
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Analisis AI</h2>
        <p className="text-sm text-gray-400 mt-0.5">Insight cerdas untuk toko Anda</p>
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {MENUS.map(({ key, icon, label, desc, color, iconBg }) => (
          <button
            key={key}
            onClick={() => handleOpenMenu(key)}
            disabled={!dataLoaded}
            className={`${color} rounded-2xl p-4 text-left hover:opacity-80 transition disabled:opacity-50 border border-gray-100`}
          >
            <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center text-xl mb-3`}>
              {icon}
            </div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </button>
        ))}
      </div>

      {/* Ringkasan AI — tetap di halaman utama */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h3 className="font-semibold text-gray-800">Ringkasan AI</h3>
          </div>
          <button
            onClick={handleRingkasan}
            disabled={!dataLoaded || ringkasanLoading}
            className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
          >
            {ringkasanLoading ? 'Memuat...' : ringkasan ? '🔄 Perbarui' : 'Buat Ringkasan'}
          </button>
        </div>

        {ringkasanLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            AI sedang membuat ringkasan...
          </div>
        ) : ringkasan ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{ringkasan}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Klik "Buat Ringkasan" untuk mendapatkan analisis menyeluruh dari AI.</p>
        )}
      </div>
    </div>
  )
}