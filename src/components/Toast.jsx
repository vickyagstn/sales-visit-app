import { useState } from 'react'

export function Toast({ toast }) {
  if (!toast) return null
  const styles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
  }
  return (
    <div className={`fixed top-5 right-5 z-[100] ${styles[toast.type]} text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3`}>
      <span className="text-lg">
        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
      </span>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  )
}

export function ConfirmModal({ show, message, onConfirm, onCancel }) {
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

export function useToast() {
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, showToast }
}