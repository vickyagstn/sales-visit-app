import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ itemName: '', category: '', currentStock: '', minimumStock: '' })
  const [loading, setLoading] = useState(false)

  const fetchItems = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const q = query(collection(db, 'inventory'), where('userId', '==', uid))
    const snap = await getDocs(q)
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchItems() }, [])

  const handleSubmit = async () => {
    if (!form.itemName) return alert('Nama barang wajib diisi!')
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      const data = {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        minimumStock: Number(form.minimumStock) || 0,
        userId: uid,
        updatedAt: new Date()
      }
      if (editId) {
        await updateDoc(doc(db, 'inventory', editId), data)
        alert('Stok berhasil diupdate!')
      } else {
        await addDoc(collection(db, 'inventory'), data)
        alert('Barang berhasil ditambahkan!')
      }
      setShowForm(false)
      setEditId(null)
      setForm({ itemName: '', category: '', currentStock: '', minimumStock: '' })
      fetchItems()
    } catch { alert('Terjadi kesalahan!') }
    setLoading(false)
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setForm({ itemName: item.itemName, category: item.category, currentStock: item.currentStock, minimumStock: item.minimumStock })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus barang ini?')) return
    await deleteDoc(doc(db, 'inventory', id))
    alert('Barang berhasil dihapus!')
    fetchItems()
  }

  const filtered = items.filter(i =>
    i.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Stok Barang</h2>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ itemName: '', category: '', currentStock: '', minimumStock: '' }) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + Tambah Barang
        </button>
      </div>

      <input
        type="text"
        placeholder="Cari nama barang atau kategori..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-800">{items.length}</p>
          <p className="text-xs text-gray-500">Total Barang</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-red-500">{items.filter(i => i.currentStock <= i.minimumStock).length}</p>
          <p className="text-xs text-gray-500">Stok Kritis</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-500">{items.filter(i => i.currentStock > i.minimumStock).length}</p>
          <p className="text-xs text-gray-500">Stok Aman</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Nama Barang', 'Kategori', 'Stok Saat Ini', 'Stok Minimum', 'Status', 'Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{item.itemName}</td>
                <td className="px-4 py-3 text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-gray-600">{item.currentStock}</td>
                <td className="px-4 py-3 text-gray-600">{item.minimumStock}</td>
                <td className="px-4 py-3">
                  {item.currentStock <= item.minimumStock ? (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">⚠️ Kritis</span>
                  ) : (
                    <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">✅ Aman</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-xs">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-gray-300">Belum ada data stok barang</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editId ? 'Edit Barang' : 'Tambah Barang'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
                <input type="text" placeholder="Nama barang" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Pilih Kategori --</option>
                  {['Makanan', 'Minuman', 'Sembako', 'Kebersihan', 'Kesehatan', 'Lainnya'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Saat Ini</label>
                <input type="number" placeholder="0" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Minimum</label>
                <input type="number" placeholder="0" value={form.minimumStock} onChange={e => setForm({ ...form, minimumStock: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm">Batal</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">{loading ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}