import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const EMPTY_PRODUCT = { nama: '', qty: '', hargaSatuan: '' }
const EMPTY_FORM = { salesId: '', visitDate: '', notes: '' }

// Toast Component
function Toast({ toast }) {
  if (!toast) return null
  const config = {
    success: { bg: 'bg-green-500', icon: '✅' },
    error: { bg: 'bg-red-500', icon: '❌' },
    warning: { bg: 'bg-amber-500', icon: '⚠️' },
  }
  const { bg, icon } = config[toast.type] || config.success
  return (
    <div className={`fixed top-5 right-5 z-[100] ${bg} text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all`}>
      <span className="text-lg">{icon}</span>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  )
}

// Confirm Modal
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
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600">Ya, Hapus</button>
        </div>
      </div>
    </div>
  )
}

export default function Visits() {
  const [visits, setVisits] = useState([])
  const [sales, setSales] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filterSales, setFilterSales] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [products, setProducts] = useState([{ ...EMPTY_PRODUCT }])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState({ show: false, id: null })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const [vs, ss] = await Promise.all([
      getDocs(query(collection(db, 'visits'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'sales'), where('userId', '==', uid))),
    ])
    setVisits(vs.docs.map(d => ({ id: d.id, ...d.data() })))
    setSales(ss.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchData() }, [])

  const addProductRow = () => setProducts([...products, { ...EMPTY_PRODUCT }])

  const removeProductRow = (i) => {
    if (products.length === 1) return
    setProducts(products.filter((_, idx) => idx !== i))
  }

  const updateProduct = (i, key, value) => {
    const updated = [...products]
    updated[i][key] = value
    setProducts(updated)
  }

  const getJumlah = (p) => (Number(p.qty) || 0) * (Number(p.hargaSatuan) || 0)
  const totalHarga = products.reduce((sum, p) => sum + getJumlah(p), 0)

  const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID') : '-'

  const handleSubmit = async () => {
    if (!form.salesId || !form.visitDate) return showToast('Pilih sales dan tanggal kunjungan!', 'warning')
    if (products.some(p => !p.nama)) return showToast('Nama produk wajib diisi!', 'warning')
    setLoading(true)
    try {
      const uid = auth.currentUser?.uid
      const selectedSales = sales.find(s => s.id === form.salesId)
      await addDoc(collection(db, 'visits'), {
        ...form,
        salesName: selectedSales?.name || '',
        products: products.map(p => ({ ...p, qty: Number(p.qty), hargaSatuan: Number(p.hargaSatuan), jumlah: getJumlah(p) })),
        offerPrice: totalHarga,
        productsOffered: products.map(p => p.nama).join(', '),
        userId: uid,
        createdAt: new Date()
      })
      showToast('Kunjungan berhasil ditambahkan!')
      setShowForm(false)
      setForm(EMPTY_FORM)
      setProducts([{ ...EMPTY_PRODUCT }])
      fetchData()
    } catch {
      showToast('Terjadi kesalahan!', 'error')
    }
    setLoading(false)
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'visits', confirm.id))
      showToast('Kunjungan berhasil dihapus.')
      fetchData()
    } catch {
      showToast('Gagal menghapus!', 'error')
    }
    setConfirm({ show: false, id: null })
  }

  const filtered = visits.filter(v => filterSales ? v.salesId === filterSales : true)

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} />
      <ConfirmModal
        show={confirm.show}
        message="Hapus data kunjungan ini? Data tidak bisa dikembalikan."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm({ show: false, id: null })}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Kunjungan Sales</h2>
          <p className="text-sm text-gray-400 mt-0.5">Rekap kunjungan tim sales</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + Tambah Kunjungan
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterSales}
          onChange={e => setFilterSales(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Semua Sales</option>
          {sales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nama Sales', 'Tanggal', 'Produk Ditawarkan', 'Total Harga', 'Catatan', 'Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-300 text-sm">
                  <div className="text-3xl mb-2">📅</div>
                  Belum ada data kunjungan
                </td>
              </tr>
            ) : filtered.map(v => (
              <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">{v.salesName}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(v.visitDate)}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                  {v.products ? (
                    <ul className="space-y-0.5">
                      {v.products.map((p, i) => (
                        <li key={i} className="text-xs">{p.nama} <span className="text-gray-400">x{p.qty}</span></li>
                      ))}
                    </ul>
                  ) : v.productsOffered}
                </td>
                <td className="px-4 py-3 text-gray-700 font-semibold">{formatRp(v.offerPrice)}</td>
                <td className="px-4 py-3 text-gray-500">{v.notes || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setConfirm({ show: true, id: v.id })} className="text-red-400 hover:text-red-600 text-xs font-medium">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">Tambah Kunjungan</h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Pilih Sales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Sales</label>
                <select
                  value={form.salesId}
                  onChange={e => setForm({ ...form, salesId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Sales --</option>
                  {sales.map(s => <option key={s.id} value={s.id}>{s.name} - {s.distributor}</option>)}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kunjungan</label>
                <input
                  type="date"
                  value={form.visitDate}
                  onChange={e => setForm({ ...form, visitDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Produk */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Produk Ditawarkan</label>
                  <button
                    onClick={addProductRow}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 font-medium"
                  >
                    + Tambah Produk
                  </button>
                </div>

                {/* Header kolom */}
                <div className="grid grid-cols-12 gap-1.5 mb-1.5 px-1">
                  <div className="col-span-5 text-xs text-gray-400 font-medium">Nama Produk</div>
                  <div className="col-span-2 text-xs text-gray-400 font-medium">QTY</div>
                  <div className="col-span-3 text-xs text-gray-400 font-medium">Harga Satuan</div>
                  <div className="col-span-2 text-xs text-gray-400 font-medium">Jumlah</div>
                </div>

                <div className="space-y-2">
                  {products.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        placeholder="Nama produk"
                        value={p.nama}
                        onChange={e => updateProduct(i, 'nama', e.target.value)}
                        className="col-span-5 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={p.qty}
                        onChange={e => updateProduct(i, 'qty', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="0"
                        value={p.hargaSatuan}
                        onChange={e => updateProduct(i, 'hargaSatuan', e.target.value)}
                        className="col-span-3 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium truncate">
                          {getJumlah(p) > 0 ? formatRp(getJumlah(p)).replace('Rp\u00a0', '') : '-'}
                        </span>
                        {products.length > 1 && (
                          <button onClick={() => removeProductRow(i)} className="text-red-400 hover:text-red-600 ml-1 text-xs">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="text-sm font-bold text-blue-600">{formatRp(totalHarga)}</span>
                </div>
              </div>

              {/* Catatan */}
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

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setProducts([{ ...EMPTY_PRODUCT }]) }}
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