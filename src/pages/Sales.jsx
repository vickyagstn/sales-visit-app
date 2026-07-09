import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const EMPTY = { name: '', distributor: '', phone: '', products: '', lastVisitDate: '' }

// Komponen Toast
function Toast({ toast }) {
  if (!toast) return null
  const styles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
  }
  return (
    <div className={`fixed top-5 right-5 z-[100] ${styles[toast.type]} text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-bounce-in`}>
      <span className="text-lg">
        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
      </span>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  )
}

// Komponen Confirm Modal
function ConfirmModal({ show, message, onConfirm, onCancel }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🗑️</span>
          </div>
          <h3 className="font-bold text-gray-800 text-lg">Konfirmasi Hapus</h3>
          <p className="text-gray-500 text-sm mt-1">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sales() {
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState({ show: false, message: '', id: null })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchSales = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const snap = await getDocs(query(collection(db, 'sales'), where('userId', '==', uid)))
    setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchSales() }, [])

  const openAdd = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = (s) => { setForm({ name: s.name, distributor: s.distributor, phone: s.phone, products: s.products, lastVisitDate: s.lastVisitDate }); setEditId(s.id); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY) }

  const handleSubmit = async () => {
    if (!form.name || !form.distributor) return showToast('Nama dan distributor wajib diisi!', 'warning')
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      if (editId) {
        await updateDoc(doc(db, 'sales', editId), { ...form, userId: uid })
        showToast('Data sales berhasil diupdate!')
      } else {
        await addDoc(collection(db, 'sales'), { ...form, userId: uid, createdAt: new Date() })
        showToast('Sales baru berhasil ditambahkan!')
      }
      closeForm()
      fetchSales()
    } catch {
      showToast('Terjadi kesalahan!', 'error')
    }
    setLoading(false)
  }

  const handleDeleteClick = (id, name) => {
    setConfirm({ show: true, message: `Hapus sales "${name}"? Data tidak bisa dikembalikan.`, id })
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'sales', confirm.id))
      showToast('Sales berhasil dihapus.')
      fetchSales()
    } catch {
      showToast('Gagal menghapus!', 'error')
    }
    setConfirm({ show: false, message: '', id: null })
  }

  const filtered = sales.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.distributor?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} />
      <ConfirmModal
        show={confirm.show}
        message={confirm.message}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm({ show: false, message: '', id: null })}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Data Sales</h2>
          <p className="text-sm text-gray-400 mt-0.5">Kelola data tim sales Anda</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + Tambah Sales
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Cari nama sales atau distributor..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nama Sales', 'Distributor', 'No HP', 'Produk', 'Terakhir Kunjungan', 'Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-300 text-sm">
                  <div className="text-3xl mb-2">👥</div>
                  Belum ada data sales
                </td>
              </tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.distributor}</td>
                <td className="px-4 py-3 text-gray-500">{s.phone}</td>
                <td className="px-4 py-3 text-gray-500">{s.products}</td>
                <td className="px-4 py-3 text-gray-500">{s.lastVisitDate}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>
                    <button onClick={() => handleDeleteClick(s.id, s.name)} className="text-red-400 hover:text-red-600 text-xs font-medium">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editId ? 'Edit Sales' : 'Tambah Sales Baru'}
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Nama Sales', key: 'name', placeholder: 'Nama lengkap sales' },
                { label: 'Distributor', key: 'distributor', placeholder: 'Nama distributor' },
                { label: 'No HP', key: 'phone', placeholder: '08xxxxxxxxxx' },
                { label: 'Produk', key: 'products', placeholder: 'Produk yang dijual' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kunjungan Terakhir</label>
                <input
                  type="date"
                  value={form.lastVisitDate}
                  onChange={e => setForm({ ...form, lastVisitDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={closeForm} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60">
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}