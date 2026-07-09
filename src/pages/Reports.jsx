import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']
const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export default function Reports() {
  const [visits, setVisits] = useState([])
  const [expenses, setExpenses] = useState([])
  const [sales, setSales] = useState([])
  const [exporting, setExporting] = useState(false)
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const [ss, vs, es] = await Promise.all([
      getDocs(query(collection(db, 'sales'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'visits'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))),
    ])
    setSales(ss.docs.map(d => ({ id: d.id, ...d.data() })))
    setVisits(vs.docs.map(d => ({ id: d.id, ...d.data() })))
    setExpenses(es.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const filteredVisits = visits.filter(v => v.visitDate?.startsWith(filterMonth))
  const filteredExpenses = expenses.filter(e => e.date?.startsWith(filterMonth))

  const totalExpense = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  const visitPerSales = sales.map(s => ({
    name: s.name,
    kunjungan: filteredVisits.filter(v => v.salesId === s.id).length,
  })).filter(s => s.kunjungan > 0)

  const expPerCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0)
    return acc
  }, {})
  const pieData = Object.entries(expPerCategory).map(([name, value]) => ({ name, value }))

  const visitPerDay = filteredVisits.reduce((acc, v) => {
    const day = v.visitDate?.split('-')[2] || '-'
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {})
  const visitDayData = Object.entries(visitPerDay)
    .map(([day, jumlah]) => ({ day, jumlah }))
    .sort((a, b) => Number(a.day) - Number(b.day))

  const handleExportPDF = () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      const monthLabel = new Date(filterMonth + '-01').toLocaleString('id-ID', { month: 'long', year: 'numeric' })

      doc.setFillColor(21, 101, 192)
      doc.rect(0, 0, 210, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Sales Visit Manager', 14, 12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Laporan Bulanan — ${monthLabel}`, 14, 21)
      doc.setTextColor(0, 0, 0)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Ringkasan', 14, 38)
      autoTable(doc, {
        startY: 42,
        head: [['Keterangan', 'Nilai']],
        body: [
          ['Total Kunjungan', `${filteredVisits.length} kunjungan`],
          ['Sales Aktif', `${visitPerSales.length} orang`],
          ['Total Pengeluaran', formatRp(totalExpense)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
      })

      if (visitPerSales.length > 0) {
        const y1 = doc.lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Kunjungan per Sales', 14, y1)
        autoTable(doc, {
          startY: y1 + 4,
          head: [['Nama Sales', 'Jumlah Kunjungan']],
          body: visitPerSales.map(s => [s.name, s.kunjungan]),
          theme: 'grid',
          headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
        })
      }

      if (pieData.length > 0) {
        const y2 = doc.lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Pengeluaran per Kategori', 14, y2)
        autoTable(doc, {
          startY: y2 + 4,
          head: [['Kategori', 'Total']],
          body: pieData.map(p => [p.name, formatRp(p.value)]),
          theme: 'grid',
          headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
        })
      }

      if (filteredExpenses.length > 0) {
        const y3 = doc.lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Detail Pengeluaran', 14, y3)
        autoTable(doc, {
          startY: y3 + 4,
          head: [['Tanggal', 'Kategori', 'Jumlah', 'Catatan']],
          body: filteredExpenses.map(e => [e.date, e.category, formatRp(e.amount), e.notes || '-']),
          theme: 'grid',
          headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9 },
          foot: [['', 'TOTAL', formatRp(totalExpense), '']],
          footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        })
      }

      if (filteredVisits.length > 0) {
        const y4 = doc.lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Detail Kunjungan', 14, y4)
        autoTable(doc, {
          startY: y4 + 4,
          head: [['Tanggal', 'Nama Sales', 'Produk', 'Catatan']],
          body: filteredVisits.map(v => [
            v.visitDate,
            v.salesName,
            v.productsOffered || '-',
            v.notes || '-',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8 },
        })
      }

      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Sales Visit Manager — ${monthLabel} | Halaman ${i} dari ${pageCount}`, 14, 290)
      }

      doc.save(`Laporan-${filterMonth}.pdf`)
      alert('PDF berhasil diexport!')
    } catch (err) {
      alert('Gagal export PDF: ' + err.message)
    }
    setExporting(false)
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Laporan</h2>
          <p className="text-sm text-gray-400 mt-0.5">Ringkasan performa toko per bulan</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center gap-2"
          >
            {exporting ? '⏳ Exporting...' : '📄 Export PDF'}
          </button>
        </div>
      </div>

      {/* Summary Cards — 3 kolom */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Kunjungan', value: filteredVisits.length, icon: '📅', color: 'bg-blue-50 text-blue-700' },
          { label: 'Sales Aktif', value: visitPerSales.length, icon: '👥', color: 'bg-green-50 text-green-700' },
          { label: 'Total Pengeluaran', value: formatRp(totalExpense), icon: '💰', color: 'bg-red-50 text-red-700' },
        ].map(c => (
          <div key={c.label} className={`${c.color} rounded-2xl p-4 border border-gray-100`}>
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-lg font-bold">{c.value}</p>
            <p className="text-xs mt-0.5 opacity-70">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Chart Kunjungan — sejajar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Kunjungan per Sales</h3>
          {visitPerSales.length === 0 ? (
            <p className="text-center text-gray-300 text-sm py-8">Belum ada data kunjungan bulan ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={visitPerSales} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="kunjungan" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Kunjungan per Hari</h3>
          {visitDayData.length === 0 ? (
            <p className="text-center text-gray-300 text-sm py-8">Belum ada data kunjungan bulan ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={visitDayData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="jumlah" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <h3 className="font-semibold text-gray-800 mb-4">Pengeluaran per Kategori</h3>
        {pieData.length === 0 ? (
          <p className="text-center text-gray-300 text-sm py-8">Belum ada data pengeluaran bulan ini</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatRp(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabel Detail Pengeluaran */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Detail Pengeluaran</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Tanggal', 'Kategori', 'Jumlah', 'Catatan'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-300 text-sm">
                  <div className="text-3xl mb-2">📋</div>
                  Belum ada pengeluaran bulan ini
                </td>
              </tr>
            ) : filteredExpenses.map(e => (
              <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-gray-500">{e.date}</td>
                <td className="px-4 py-3">
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{e.category}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{formatRp(e.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{e.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredExpenses.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-500">Total {filteredExpenses.length} transaksi</span>
            <span className="text-sm font-bold text-gray-800">{formatRp(totalExpense)}</span>
          </div>
        )}
      </div>
    </div>
  )
}