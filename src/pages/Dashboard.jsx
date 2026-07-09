import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Users, MapPin, Receipt, AlertTriangle, BrainCircuit } from "lucide-react";

export default function Dashboard() {
  const uid = auth.currentUser?.uid;
  const [stats, setStats] = useState({
    totalSales: 0,
    kunjunganBulanIni: 0,
    pengeluaranBulanIni: 0,
    salesTerlambat: 0,
  });
  const [visitChart, setVisitChart] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);
  const [aiAlert, setAiAlert] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    fetchData();
  }, [uid]);

  const fetchData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total sales
      const salesSnap = await getDocs(
        query(collection(db, "sales"), where("uid", "==", uid))
      );
      const totalSales = salesSnap.size;

      // Kunjungan bulan ini
      const visitsSnap = await getDocs(
        query(collection(db, "visits"), where("uid", "==", uid))
      );
      const visits = visitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const kunjunganBulanIni = visits.filter((v) => {
        const t = v.tanggal?.toDate ? v.tanggal.toDate() : new Date(v.tanggal);
        return t >= startOfMonth;
      }).length;

      // Pengeluaran bulan ini
      const expSnap = await getDocs(
        query(collection(db, "expenses"), where("uid", "==", uid))
      );
      const expenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const pengeluaranBulanIni = expenses
        .filter((e) => {
          const t = e.tanggal?.toDate ? e.tanggal.toDate() : new Date(e.tanggal);
          return t >= startOfMonth;
        })
        .reduce((sum, e) => sum + (Number(e.jumlah) || 0), 0);

      // Sales terlambat (visit belum ada hari ini)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const salesWithVisitToday = new Set(
        visits
          .filter((v) => {
            const t = v.tanggal?.toDate ? v.tanggal.toDate() : new Date(v.tanggal);
            return t >= today;
          })
          .map((v) => v.salesId)
      );
      const salesTerlambat = salesSnap.docs.filter(
        (d) => !salesWithVisitToday.has(d.id)
      ).length;

      // Chart kunjungan 6 bulan terakhir
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          name: d.toLocaleString("id-ID", { month: "short" }),
          year: d.getFullYear(),
          month: d.getMonth(),
          kunjungan: 0,
        });
      }
      visits.forEach((v) => {
        const t = v.tanggal?.toDate ? v.tanggal.toDate() : new Date(v.tanggal);
        const m = months.find(
          (mo) => mo.month === t.getMonth() && mo.year === t.getFullYear()
        );
        if (m) m.kunjungan++;
      });

      // Chart pengeluaran 6 bulan terakhir
      const expMonths = months.map((m) => ({ ...m, pengeluaran: 0 }));
      expenses.forEach((e) => {
        const t = e.tanggal?.toDate ? e.tanggal.toDate() : new Date(e.tanggal);
        const m = expMonths.find(
          (mo) => mo.month === t.getMonth() && mo.year === t.getFullYear()
        );
        if (m) m.pengeluaran += Number(e.jumlah) || 0;
      });

      setStats({ totalSales, kunjunganBulanIni, pengeluaranBulanIni, salesTerlambat });
      setVisitChart(months);
      setExpenseChart(expMonths);

      // Simple AI Alert
      if (salesTerlambat > 0) {
        setAiAlert(
          `⚠️ ${salesTerlambat} sales belum melakukan kunjungan hari ini. Segera lakukan follow-up!`
        );
      } else if (pengeluaranBulanIni > 5000000) {
        setAiAlert(
          `💡 Pengeluaran bulan ini sudah mencapai Rp ${pengeluaranBulanIni.toLocaleString("id-ID")}. Pertimbangkan untuk menekan biaya operasional.`
        );
      } else {
        setAiAlert("✅ Semua sales aktif melakukan kunjungan. Performa bulan ini terlihat baik!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      label: "Total Sales",
      value: stats.totalSales,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      textColor: "text-[#1565C0]",
    },
    {
      label: "Kunjungan Bulan Ini",
      value: stats.kunjunganBulanIni,
      icon: MapPin,
      color: "bg-green-100 text-green-600",
      textColor: "text-green-600",
    },
    {
      label: "Pengeluaran Bulan Ini",
      value: `Rp ${stats.pengeluaranBulanIni.toLocaleString("id-ID")}`,
      icon: Receipt,
      color: "bg-purple-100 text-purple-600",
      textColor: "text-purple-600",
    },
    {
      label: "Sales Terlambat",
      value: stats.salesTerlambat,
      icon: AlertTriangle,
      color: "bg-red-100 text-red-500",
      textColor: "text-red-500",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ringkasan performa sales hari ini
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, textColor }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-medium">{label}</p>
              <p className={`text-2xl font-bold ${textColor}`}>{loading ? "..." : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Alert */}
      <div className="bg-gradient-to-r from-[#1565C0] to-[#1976D2] rounded-2xl p-5 flex items-start gap-4 shadow-sm">
        <div className="bg-white/20 rounded-xl p-2 mt-0.5">
          <BrainCircuit size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-1">AI Alert</p>
          <p className="text-blue-100 text-sm">{aiAlert || "Memuat analisis AI..."}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Kunjungan 6 Bulan Terakhir</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={visitChart} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="kunjungan" fill="#1565C0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Pengeluaran 6 Bulan Terakhir</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={expenseChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`}
              />
              <Line
                type="monotone"
                dataKey="pengeluaran"
                stroke="#7C3AED"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}