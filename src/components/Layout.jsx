import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const menus = [
    { path: "/dashboard", icon: "📊", title: "Dashboard" },
    { path: "/sales", icon: "👥", title: "Sales" },
    { path: "/visits", icon: "📅", title: "Kunjungan" },
    { path: "/inventory", icon: "📦", title: "Inventory" },
    { path: "/expenses", icon: "💰", title: "Pengeluaran" },
    { path: "/ai-analysis", icon: "🤖", title: "AI Analysis" },
    { path: "/reports", icon: "📈", title: "Laporan" },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f3f6fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          background: "#1565C0",
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "2px 0 10px rgba(0,0,0,0.15)",
        }}
      >
        <div>
          <div
            style={{
              padding: 25,
              borderBottom: "1px solid rgba(255,255,255,.2)",
            }}
          >
            <h2 style={{ margin: 0 }}>📊 Sales Visit</h2>
            <small>Manager System</small>
          </div>

          <div style={{ padding: 15 }}>
            {menus.map((menu) => (
              <Link
                key={menu.path}
                to={menu.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textDecoration: "none",
                  color: "white",
                  padding: "12px 15px",
                  marginBottom: 8,
                  borderRadius: 10,
                  background:
                    location.pathname === menu.path
                      ? "rgba(255,255,255,.2)"
                      : "transparent",
                  transition: ".3s",
                }}
              >
                <span style={{ fontSize: 22 }}>{menu.icon}</span>
                <span>{menu.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: 12,
              border: "none",
              borderRadius: 10,
              background: "#E53935",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <header
          style={{
            height: 70,
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 30px",
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
          }}
        >
          <h2 style={{ margin: 0 }}>
            {menus.find((m) => m.path === location.pathname)?.title ||
              "Dashboard"}
          </h2>

          <div
            style={{
              background: "#1565C0",
              color: "white",
              padding: "8px 15px",
              borderRadius: 20,
            }}
          >
            Admin
          </div>
        </header>

        {/* Isi halaman */}
        <main
          style={{
            flex: 1,
            padding: 25,
            overflow: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}