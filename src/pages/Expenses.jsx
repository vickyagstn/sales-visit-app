import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { Toast, ConfirmModal, useToast } from '../components/Toast'

const KATEGORI = ['Kulakan', 'Listrik', 'Air', 'Gas', 'Transportasi', 'Lainnya']
const EMPTY = { category: '', amount: '', date: '', notes: '' }

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState({ show: false, message: '', id: null })
  const { toast, showToast } = useToast()

  const fetchData = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const snap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', uid)))
    setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async () => {
    if (!form.category || !form.amount || !form.date) return showToast('Kategori, jumlah, dan tanggal wajib diisi!', 'warning')
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      await addDoc(collection(db, 'expenses'), {
        ...form,
        amount: Number(form.amount),
        userId: uid,
        createdAt: new Date()
      })
      showToast('Pengeluaran berhasil ditambahkan!')
      setShowForm(false)
      setForm(EMPTY)
      fetchData()
    } catch {
      showToast('Terjadi kesalahan!', 'error')
    }
    setLoading(false)
  }

  const handleDeleteClick = (id, category) => {
    setConfirm({ show: true, message: `Hapus pengeluaran kategori "${category}"? Data tidak bisa dikembalikan.`, id })
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'expenses', confirm.id))
      showToast('Pengeluaran berhasil dihapus.')
      fetchData()
    } catch {
      showToast('Gagal menghapus!', 'error')
    }
    setConfirm({ show: false, message: '', id: null })
  }

  const filtered = expenses.filter(e => filterMonth ? e.date?.startsWith(filterMonth) : true)
  const total = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID') : '-'

  const badgeColor = (cat) => {
    const map = {
      Kulakan: 'bg-blue-100 text-blue-700',
      Listrik: 'bg-yellow-100 text-yellow-700',
      Air: 'bg-cyan-100 text-cyan-700',
      Gas: 'bg-orange-100 text-orange-700',
      Transportasi: 'bg-green-100 text-green-700',
      Lainnya: 'bg-gray-100 text-gray-600',
    }
    return map[cat] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} />
      <ConfirmModal
        show={confirm.show}
        message={confirm.message}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm({ show: false, message: '', id: null })}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pengeluaran</h2>
          <p className="text-sm text-gray-400 mt-0.5">Catat semua pengeluaran toko</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + Tambah Pengeluaran
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <span className="text-xs text-blue-500 font-medium">Total: </span>
          <span className="text-sm font-bold text-blue-700">{formatRp(total)}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Tanggal', 'Kategori', 'Jumlah', 'Catatan', 'Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-300 text-sm">
                  <div className="text-3xl mb-2">💰</div>
                  Belum ada data pengeluaran
                </td>
              </tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor(e.category)}`}>
                    {e.category}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{formatRp(e.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{e.notes || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDeleteClick(e.id, e.category)} className="text-red-400 hover:text-red-600 text-xs font-medium">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tambah Pengeluaran</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {KATEGORI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  placeholder="Catatan tambahan..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY) }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}